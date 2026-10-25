resource "aws_vpc" "project" {
    cidr_block = var.vpc_cidr
    enable_dns_hostnames = true
    enable_dns_support = true
    tags = {
        Name = "vpc-project"
        Project = "Microservice-On-Kube-with-CICD"
    }
}

resource "aws_subnet" "public_subnet" {
    vpc_id = aws_vpc.project.id
    cidr_block = var.public_subnet_cidr
    map_public_ip_on_launch = true
    tags = {
        Name = "public-subnet"
        Project = "Microservice-On-Kube-with-CICD"
    }
}

resource "aws_subnet" "private_subnet" {
    vpc_id = aws_vpc.project.id
    cidr_block = var.private_subnet_cidr
    tags = {
        Name = "private-subnet"
        Project = "Microservice-On-Kube-with-CICD"
    }
}



