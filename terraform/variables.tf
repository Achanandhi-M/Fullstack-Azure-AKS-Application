variable "resource_group_name" {
  type        = string
  description = "Name of the resource group."
  default     = "rg-fullstackapp-demo"
}

variable "location" {
  type        = string
  description = "Azure region."
  default     = "West US 2"
}

variable "aks_name" {
  type        = string
  description = "Name of the AKS cluster."
  default     = "aks-fullstackapp-demo"
}

variable "db_server_name" {
  type        = string
  description = "Name of the PostgreSQL flexible server."
  default     = "psql-aksdb1" 
}

variable "db_admin_username" {
  type        = string
  description = "PostgreSQL admin username."
  default     = "psqladmin"
}

variable "db_admin_password" {
  type        = string
  description = "PostgreSQL admin password."
  sensitive   = true
}

variable "storage_account_name" {
  type        = string
  description = "Name of the storage account base (suffix added automatically)."
  default     = "safullapp"
}
