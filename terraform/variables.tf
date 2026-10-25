#set variable instance dan region

variable "aws_region" {
  description = "region aws"
  type = string
}

variable "instance_type" {
   description = "aws ec2 instance dibentuk"
   type = string
   default = "t3.small"
}

variable "vpc_cidr" {
  description = "mendifine cidr block yang dibutuhkan"
  type = string
  default = "10.30.0.0/16"
} 

variable "public_subnet_cidr" {
  description = "Separate vpc block to 256 IP"
  type = string
  default = "10.30.1.0/24"
}

variable "private_subnet_cidr" {
  description = "Separate vpc block to 256 IP with private subnet"
  type = string
  default = "10.30.10.0/24"
}

variable "public_ip_local" {
  description = "define IP public on local"
  type = string
}

variable "key_name" {
  description = "SSH key untuk aws"
  type = string
}
  
variable "db_password" {
  description = "Password database"
  type = string
  sensitive = true
}

variable "postgres_user" {
  type    = string
  default = "postgres"
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "postgres_db" {
  type    = string
  default = "postgres"
}

variable "rabbitmq_default_user" {
  type    = string
  default = "guest"
}

variable "rabbitmq_default_pass" {
  type      = string
  sensitive = true
}



