terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.region
}

resource "aws_security_group" "ord_server_ssh_sg" {
  name = "ord_server_ssh_sg"

  ingress { # ssh
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress { # websocket
    from_port   = 8765
    to_port     = 8765
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.resource_tag_name
  }
}

resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "kp" {
  key_name   = "ord_server_key"  # Create "ord_server_key" in AWS
  public_key = tls_private_key.pk.public_key_openssh

  provisioner "local-exec" { # Create "ord_server.pem" locally
    command = <<-EOT
      echo '${tls_private_key.pk.private_key_pem}' > ~/.ssh/ord_server_${tls_private_key.pk.id}.pem
      chmod 400  ~/.ssh/ord_server_${tls_private_key.pk.id}.pem
    EOT
  }

  tags = {
    Name = var.resource_tag_name
  }
}

resource "random_password" "password" {
  length           = 16
  special          = false
}

data "cloudinit_config" "post_deploy" {
  part {
    content_type = "text/x-shellscript"
    content      = templatefile("init.tpl", {
      # environment = var.env
    })
  }
}

resource "aws_dynamodb_table" "ord_server_table" {
  name           = "OrdControlTable"
  billing_mode   = "PROVISIONED"
  read_capacity  = 20
  write_capacity = 20
  hash_key       = "Id"
  range_key      = "DateAdded"

  attribute {
    name = "Id"
    type = "S"
  }

  attribute {
    name = "DateAdded"
    type = "S"
  }

  attribute {
    name = "Name"
    type = "S"
  }

  ttl {
    attribute_name = "TimeToExist"
    enabled        = false
  }

  global_secondary_index {
    name               = "NameIndex"
    hash_key           = "Name"
    range_key          = "DateAdded"
    write_capacity     = 10
    read_capacity      = 10
    projection_type    = "KEYS_ONLY"
    /* non_key_attributes = ["UserId"] */
  }

  tags = {
    Name = var.resource_tag_name
  }
}


# FUN WITH PERMISSIONS
# ec2-role -> policy file -> instance profile -> {instance-profile in ec2 resource}
resource "aws_iam_policy" "ordserver_ec2_policy" {
  name        = "ordserver_ec2_policy"
  description = "ordserver_ec2_policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = [
          "dynamodb:*"
        ]
        Resource  = [
          "${aws_dynamodb_table.ord_server_table.arn}"
        ]
      }
    ]
  })

  tags = {
    Name = var.resource_tag_name
  }
}

resource "aws_iam_role" "ordserver_ec2_role" {
  name = "ordserver_ec2_role"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })

  tags = {
    Name = var.resource_tag_name
  }
}

resource "aws_iam_policy_attachment" "ordserver_ec2_policy_attachment" {
  name = "ordserver_ec2_policy_attachment"
  policy_arn = aws_iam_policy.ordserver_ec2_policy.arn
  roles = [aws_iam_role.ordserver_ec2_role.name]
}

resource "aws_iam_instance_profile" "ordserver_ec2_instance_profile" {
  name = "ordserver_ec2_instance_profile"
  role = aws_iam_role.ordserver_ec2_role.name

  tags = {
    Name = var.resource_tag_name
  }
}

resource "aws_instance" "ord_server" {
  ami           = "ami-095413544ce52437d"
  instance_type = var.instance_type
  availability_zone = var.availability_zone
  user_data     = data.cloudinit_config.post_deploy.rendered
  key_name      = aws_key_pair.kp.key_name
  iam_instance_profile = aws_iam_instance_profile.ordserver_ec2_instance_profile.name
  security_groups = [aws_security_group.ord_server_ssh_sg.name]

  tags = {
    Name = var.resource_tag_name
  }

  provisioner "file" {
    source      = "server"
    destination = "/home/ubuntu/OrdControl"

    connection {
      type        = "ssh"
      host        = aws_instance.ord_server.public_ip
      user        = "ubuntu"
      private_key = file("~/.ssh/ord_server_${tls_private_key.pk.id}.pem")
      insecure    = true
    }
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo 'window.OrdControl = window.OrdControl || {};' > client/js/env.js
      echo 'window.OrdControl.password="${random_password.password.result}";' >> client/js/env.js
      echo 'window.OrdControl.wsurl="${aws_instance.ord_server.public_dns}";' >> client/js/env.js
      echo `window.OrdControl.connectionString = "ssh -o 'StrictHostKeyChecking no'  -i ~/.ssh/ord_server_${tls_private_key.pk.id}.pem ubuntu@${aws_instance.ord_server.public_dns}";` >> client/js/env.js
      cp client/js/env.js server/client-env.js.txt
    EOT
  }
}

resource "aws_ebs_volume" "bitcoin_ord_data" {
  # This snapshot is from February 27 2023, & contains fully synced bitcoind & ord data dirs
  snapshot_id = var.snapshot_id
  availability_zone = var.availability_zone
  type = "gp3"

  size = 3123
  iops = 4000

  tags = {
    Name = var.resource_tag_name
  }
}

resource "aws_volume_attachment" "bitcoin_ord_data_att" {
  # note that this device_name is not respected by the instance types that use nvme
  device_name = "/dev/xvdh"
  volume_id   = aws_ebs_volume.bitcoin_ord_data.id
  instance_id = aws_instance.ord_server.id
}
