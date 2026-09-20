# ---------------------------------------------------------------------------
# Terraform and provider requirements.
#
# azurerm 5.x no longer registers Azure resource providers on its own
# (resource_provider_registrations defaults to "none"), so the ones this stack
# needs are listed explicitly. Registering an already-registered provider is a
# no-op, so this is safe alongside the other stacks in this subscription.
#
# This environment is deliberately tiny: a Static Web App and nothing else. No
# azapi provider is needed, because unlike the realestate stack there is no
# linked backend or free-offer SQL database to express.
# ---------------------------------------------------------------------------
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.5"
    }
  }
}

provider "azurerm" {
  resource_providers_to_register = [
    "Microsoft.Consumption",
    "Microsoft.Web",
  ]

  features {}
}
