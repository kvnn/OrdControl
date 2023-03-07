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

resource "aws_instance" "ord_server" {
  ami           = "ami-095413544ce52437d"
  instance_type = var.instance_type
  availability_zone = var.availability_zone
  user_data     = data.cloudinit_config.post_deploy.rendered
  key_name      = aws_key_pair.kp.key_name
  security_groups = [aws_security_group.ord_server_ssh_sg.name]

  tags = {
    Name = var.instance_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo 'window.OrdServer = window.OrdServer || {};' > client/js/env.js
      echo 'window.OrdServer.password="${random_password.password.result}";' >> client/js/env.js
      echo 'window.OrdServer.wsurl="${aws_instance.ord_server.public_dns}";' >> client/js/env.js
      cp client/js/env.js server/client-env.js.txt
    EOT
  }

  provisioner "file" {
    source      = "server"
    destination = "/home/ubuntu/OrdServer"

    connection {
      type        = "ssh"
      host        = aws_instance.ord_server.public_ip
      user        = "ubuntu"
      private_key = file("~/.ssh/ord_server_${tls_private_key.pk.id}.pem")
      insecure    = true
    }
  }
}


resource "aws_ebs_volume" "bitcoin_ord_data" {
  # ~ $10 / month
  # This snapshot is from February 22 2023, & contains fully synced bitcoind & ord data dirs
  snapshot_id = var.snapshot_id
  availability_zone = var.availability_zone
  type = "gp3"

  size = 3123
  iops = 4000
}

resource "aws_volume_attachment" "bitcoin_ord_data_att" {
  # note that this device_name is not respected by the instance types that use nvme
  device_name = "/dev/xvdh"
  volume_id   = aws_ebs_volume.bitcoin_ord_data.id
  instance_id = aws_instance.ord_server.id
}
