#set up provider untuk vpc dan instance agar jalan di aws sea 3
terraform {
  required_version = ">= 1.15.0"

  required_providers {
    aws= {
       source= "hashicorp/aws"
       version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}



