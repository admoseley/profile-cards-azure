output "default_hostname" {
  description = "Generated hostname. This is the CNAME target for the custom domain, and the value to use in the profile README until the domain is bound."
  value       = azurerm_static_web_app.main.default_host_name
}

output "static_web_app_name" {
  description = "Static Web App resource name."
  value       = azurerm_static_web_app.main.name
}

output "resource_group_name" {
  description = "Resource group holding this environment."
  value       = azurerm_resource_group.main.name
}

output "custom_domain_url" {
  description = "Public URL once the custom domain is bound."
  value       = var.enable_custom_domain ? "https://${var.custom_domain}" : null
}

# The deployment token is what the GitHub Actions deploy step authenticates
# with. It is marked sensitive so it is never printed in plan or apply output;
# read it deliberately with:  terraform output -raw deployment_token
output "deployment_token" {
  description = "API token for Azure/static-web-apps-deploy. Store as the AZURE_STATIC_WEB_APPS_API_TOKEN repository secret."
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
