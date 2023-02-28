output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.ord_server.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.ord_server.public_dns
}

output "ssh_connection_string" {
  description = "Connection string to connect to instance via ssh"
  # value = format("ssh -i %s ubuntu@%s", var.zone, var.cluster_name)
  value = "ssh -o 'StrictHostKeyChecking no'  -i ~/.ssh/ord_server_${tls_private_key.pk.id}.pem ubuntu@${aws_instance.ord_server.public_dns}"
}

output "bitcoin_ord_data_volume_device_name" {
  description = "Device name for our snapshot'd bitcoin and ord volume"
  value = aws_volume_attachment.bitcoin_ord_data_att.device_name
}
