variable "resource_tag_name" {
  description = "Value of the Name tag for AWS resources"
  type        = string
  default     = "OrdControl"
}


variable "region" {
  type = string
  default = "us-west-2"
}

variable "availability_zone" {
  type = string
  default = "us-west-2c"
}

variable "snapshot_id" {
  type = string
  # march 15 2023 : data dir synced w/ bitcoind and ord
  default = "snap-053e9c0f45613d523"
}

variable "instance_type" {
  type = string
  default = "t2.medium" # t2.large is stable; t2.medium is experimental
}