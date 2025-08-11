terraform {
  required_version = ">= 1.0" # Specifies the required Terraform core version

  required_providers {
    aws = {
      source  = "hashicorp/aws" # Defines the source of the AWS provider
      version = "~> 6.0"      # Specifies the required version of the AWS provider
    }
  }
}
