variable "instance_name" {
  description = "Value of the Name tag for the EC2 instance"
  type        = string
  default     = "OrdServer"
}


variable "region" {
  type = string
  default = "us-west-2"
}

variable "availability_zone" {
  type = string
  default = "us-west-2c"
}


variable "instance_type" {
  type = string
  # Compute optimized, e.g. c6a.xlarge, would likely be better but I've found the
  # disk logic in those instance types to be indeterministic and time consuming to program.
  default = "t2.large" # ~$67 / month
  # default = "c6a.xlarge" # ~ $110 / month      compute-optimized   4vCPU	8GB
  # default = "x2gd.large"  # ~ $120 / month   memory-optimized    2vCPU	32GB
}