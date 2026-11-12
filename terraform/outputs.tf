output "vpc_id" {
  description = "ID VPC project"
  value       = aws_vpc.project.id
}

output "vpc_cidr" {
  description = "CIDR block VPC project"
  value       = aws_vpc.project.cidr_block
}

output "public_subnet_id" {
  description = "ID public subnet (tempat NAT instance)"
  value       = aws_subnet.public_subnet.id
}

output "private_subnet_id" {
  description = "ID private subnet (tempat appserver & monitoring)"
  value       = aws_subnet.private_subnet.id
}

output "internet_gateway_id" {
  description = "ID internet gateway public"
  value       = aws_internet_gateway.public_igw.id
}

output "public_route_table_id" {
  description = "ID route table public"
  value       = aws_route_table.route_public.id
}

output "private_route_table_id" {
  description = "ID route table private (default route lewat NAT instance)"
  value       = aws_route_table.route_private.id
}

# =============================================================================
# Output instance
# =============================================================================

output "nat_instance_id" {
  description = "ID EC2 NAT instance"
  value       = aws_instance.nat.id
}

output "nat_public_ip" {
  description = "Elastic IP publik NAT instance"
  value       = aws_eip.nat_eip.public_ip
}

output "nat_private_ip" {
  description = "IP private NAT instance di public subnet"
  value       = aws_instance.nat.private_ip
}

output "appserver_instance_id" {
  description = "ID EC2 appserver + database (private subnet, akses via SSM)"
  value       = aws_instance.appserver.id
}

output "appserver_private_ip" {
  description = "IP private appserver di private subnet"
  value       = aws_instance.appserver.private_ip
}

output "monitoring_instance_id" {
  description = "ID EC2 monitoring server (private subnet, akses via SSM)"
  value       = aws_instance.monitoring.id
}

output "monitoring_private_ip" {
  description = "IP private monitoring server di private subnet"
  value       = aws_instance.monitoring.private_ip
}

output "instances" {
  description = "Ringkasan seluruh EC2 instance (ID dan IP)"
  value = {
    nat = {
      instance_id = aws_instance.nat.id
      public_ip   = aws_eip.nat_eip.public_ip
      private_ip  = aws_instance.nat.private_ip
    }
    appserver = {
      instance_id = aws_instance.appserver.id
      public_ip   = null
      private_ip  = aws_instance.appserver.private_ip
    }
    monitoring = {
      instance_id = aws_instance.monitoring.id
      public_ip   = null
      private_ip  = aws_instance.monitoring.private_ip
    }
  }
}

# =============================================================================
# Output security group
# =============================================================================

output "security_group_ids" {
  description = "ID seluruh security group"
  value = {
    app          = aws_security_group.aws_sg_app.id
    monitoring   = aws_security_group.aws_sg_monitoring.id
    nat          = aws_security_group.aws_sg_nat.id
    vpc_endpoint = aws_security_group.aws_sg_vpc_endpoint.id
  }
}

# =============================================================================
# Output VPC endpoint & IAM (SSM)
# =============================================================================

output "vpc_endpoint_ids" {
  description = "ID VPC endpoint interface SSM per service"
  value       = { for service, endpoint in aws_vpc_endpoint.ssm : service => endpoint.id }
}

output "ssm_instance_profile_name" {
  description = "Nama IAM instance profile SSM yang dipakai semua instance"
  value       = aws_iam_instance_profile.ssm_profile.name
}

output "ssm_role_arn" {
  description = "ARN IAM role untuk SSM"
  value       = aws_iam_role.ec2_ssm_role.arn
}

output "ssm_start_session_command" {
  description = "Contoh perintah untuk masuk ke appserver lewat SSM Session Manager"
  value       = "aws ssm start-session --target ${aws_instance.appserver.id} --region ${var.aws_region}"
}
