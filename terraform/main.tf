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
    
}