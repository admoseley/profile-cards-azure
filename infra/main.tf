# ---------------------------------------------------------------------------
# profile-cards production environment.
#
#   GitHub Actions (every 6h) ──renders SVGs──▶ Static Web App (Free)
#                                                   │
#                                       GitHub camo ▼
#                                            profile README
#
# That is the whole architecture. There is no compute, no database, no cache
# and no secret in Azure: rendering happens in GitHub Actions and Azure only
# serves static files. The design is described in the repository README.
# ---------------------------------------------------------------------------

data "azurerm_subscription" "current" {}

locals {
  tags = merge(
    {
      app        = "profile-cards"
      managed_by = "terraform"
      repository = "admoseley/profile-cards-azure"
    },
    var.tags,
  )
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.name_prefix}-prod"
  location = var.location
  tags     = local.tags
}
