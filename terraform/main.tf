resource "aws_vpc" "project" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name    = "vpc-project"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.project.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  tags = {
    Name    = "public-subnet"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

resource "aws_subnet" "private_subnet" {
  vpc_id     = aws_vpc.project.id
  cidr_block = var.private_subnet_cidr
  tags = {
    Name    = "private-subnet"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

resource "aws_internet_gateway" "public_igw" {
  vpc_id = aws_vpc.project.id
  tags = {
    Name    = "public-igw"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

resource "aws_route_table" "route_public" {
  vpc_id = aws_vpc.project.id
}

resource "aws_route" "route_public_igw" {
  route_table_id         = aws_route_table.route_public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.public_igw.id
}


resource "aws_route_table_association" "public_subnet" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.route_public.id
  depends_on     = [aws_internet_gateway.public_igw]
}

resource "aws_route_table" "route_private" {
  vpc_id = aws_vpc.project.id
  tags = {
    Name    = "private-route-table"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

resource "aws_route_table_association" "private_subnet" {
  subnet_id      = aws_subnet.private_subnet.id
  route_table_id = aws_route_table.route_private.id
}

# Route all internet-bound traffic from the private subnet through the NAT instance.
resource "aws_route" "route_private_nat" {
  route_table_id         = aws_route_table.route_private.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat.primary_network_interface_id
}

# Security group bastion + web dihapus karena bastion/web proxy tidak dipakai lagi.
# Akses ke instance sekarang hanya lewat SSM Session Manager.

resource "aws_security_group" "aws_sg_app" {
  name        = "aws_sg_app"
  description = "Security group for app server"
  vpc_id      = aws_vpc.project.id
  tags = {
    Name    = "aws_sg_app"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

# Ingress dari web proxy (bastion) dihapus karena bastion sudah tidak ada.
# Appserver tetap bisa diakses lewat SSM Port Forwarding.

resource "aws_vpc_security_group_egress_rule" "app_egress" {
  security_group_id = aws_security_group.aws_sg_app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all"
}

resource "aws_security_group" "aws_sg_monitoring" {
  name        = "aws_sg_monitoring"
  description = "Security group for monitoring server"
  vpc_id      = aws_vpc.project.id
}

# Ingress monitoring dari bastion dihapus karena bastion sudah tidak ada.
# Monitoring tetap bisa diakses lewat SSM Session Manager / port forwarding.

resource "aws_vpc_security_group_egress_rule" "monitoring_egress" {
  security_group_id = aws_security_group.aws_sg_monitoring.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all"
}

resource "aws_security_group" "aws_sg_nat" {
  name        = "aws_sg_nat"
  description = "Security group for NAT instance"
  vpc_id      = aws_vpc.project.id
  tags = {
    Name    = "aws_sg_nat"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

# Hosts in the private subnet send their internet-bound traffic through the NAT instance.
resource "aws_vpc_security_group_ingress_rule" "nat_ingress_private_subnet" {
  security_group_id = aws_security_group.aws_sg_nat.id
  cidr_ipv4         = var.private_subnet_cidr
  ip_protocol       = "-1"
  description       = "Allow all traffic from private subnet"
}

resource "aws_vpc_security_group_egress_rule" "nat_egress" {
  security_group_id = aws_security_group.aws_sg_nat.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all outbound traffic for NAT"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_security_group" "aws_sg_vpc_endpoint" {
  name        = "aws_sg_vpc_endpoint"
  description = "Security group for VPC endpoints (SSM)"
  vpc_id      = aws_vpc.project.id
  tags = {
    Name    = "aws_sg_vpc_endpoint"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

# Hanya port 443 yang dibuka, sumbernya dari CIDR VPC.
resource "aws_vpc_security_group_ingress_rule" "vpc_endpoint_https" {
  security_group_id = aws_security_group.aws_sg_vpc_endpoint.id
  cidr_ipv4         = var.vpc_cidr
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "Allow HTTPS from VPC CIDR"
}

resource "aws_vpc_security_group_egress_rule" "vpc_endpoint_https" {
  security_group_id = aws_security_group.aws_sg_vpc_endpoint.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow HTTPS to VPC CIDR"
}

locals {
  ssm_vpc_endpoint_services = toset(["ssm", "ssmmessages", "ec2messages"])
}

# Endpoint interface ditempatkan di private subnet agar appserver & monitoring bisa akses SSM.
resource "aws_vpc_endpoint" "ssm" {
  for_each = local.ssm_vpc_endpoint_services

  vpc_id              = aws_vpc.project.id
  service_name        = "com.amazonaws.${var.aws_region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_subnet.id]
  security_group_ids  = [aws_security_group.aws_sg_vpc_endpoint.id]
  private_dns_enabled = true

  tags = {
    Name    = "vpc-endpoint-${each.value}"
    Project = "Microservice-On-Kube-with-CICD"
  }
}

# Instance bastion (web proxy) beserta EIP-nya dihapus untuk penghematan biaya.
# Akses ke appserver/monitoring sekarang hanya lewat SSM Session Manager.

resource "aws_instance" "nat" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_subnet.id
  vpc_security_group_ids      = [aws_security_group.aws_sg_nat.id]
  key_name                    = var.key_name
  associate_public_ip_address = true
  source_dest_check           = false
  iam_instance_profile        = aws_iam_instance_profile.ssm_profile.name
  tags = {
    Name    = "nat-instance"
    Project = "Microservice-On-Kube-with-CICD"
  }

  # AMI dikunci ke yang sudah dipakai agar tidak memicu penggantian instance
  # hanya karena data.aws_ami.ubuntu mengambil image terbaru.
  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_ec2_instance_state" "nat" {
  instance_id = aws_instance.nat.id
  state       = "running"
}

resource "aws_eip" "nat_eip" {
  instance = aws_instance.nat.id
  domain   = "vpc"
}

resource "aws_instance" "appserver" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.private_subnet.id
  vpc_security_group_ids = [aws_security_group.aws_sg_app.id]
  key_name               = var.key_name
  iam_instance_profile   = aws_iam_instance_profile.ssm_profile.name
  tags = {
    Name    = "appserver and databases"
    Project = "Microservice-On-Kube-with-CICD"
  }

  # AMI dikunci agar k3s, database, dan data di disk tidak terhapus.
  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_ec2_instance_state" "appserver" {
  instance_id = aws_instance.appserver.id
  state       = "running"
}

resource "aws_instance" "monitoring" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.private_subnet.id
  vpc_security_group_ids = [aws_security_group.aws_sg_monitoring.id]
  key_name               = var.key_name
  iam_instance_profile   = aws_iam_instance_profile.ssm_profile.name
  tags = {
    Name    = "monitoring server"
    Project = "Microservice-On-Kube-with-CICD"
  }

  # AMI dikunci agar data monitoring tidak terhapus.
  lifecycle {
    ignore_changes = [ami]
  }
}

#Disini menggunakan NAT instance untuk private Subnet terhubung dengan Internet untuk download dependency
#Alangkah baiknya menggunakan NAT Gateway untuk best practicenya

resource "aws_ec2_instance_state" "monitoring" {
  instance_id = aws_instance.monitoring.id
  state       = "running"
}

resource "aws_iam_role" "ec2_ssm_role" {
  name = "ssm_role_sementara"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_profile" {
  name = "ssm_instance_profile"
  role = aws_iam_role.ec2_ssm_role.name
}
