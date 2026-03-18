output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "kubernetes_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "postgres_server_name" {
  value = azurerm_postgresql_flexible_server.psql.name
}

output "postgres_database_name" {
  value = azurerm_postgresql_flexible_server_database.appdb.name
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.psql.fqdn
}

output "storage_account_name" {
  value = azurerm_storage_account.sa.name
}

output "storage_account_primary_connection_string" {
  value     = azurerm_storage_account.sa.primary_connection_string
  sensitive = true
}

output "blob_container_name" {
  value = azurerm_storage_container.blob.name
}
