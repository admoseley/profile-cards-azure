# ---------------------------------------------------------------------------
# The site: a Static Web App on the Free plan.
#
# Free is sufficient and deliberate. The Standard plan exists for Entra sign-in
# with custom roles and for linking a container backend; this site has no auth
# and no API, so Standard would buy nothing. Free includes custom domains and
# managed TLS, which is all this needs.
# ---------------------------------------------------------------------------

resource "azurerm_static_web_app" "main" {
  name                = "swa-${var.name_prefix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku_tier            = "Free"
  sku_size            = "Free"

  # Pull-request previews would publish extra public hostnames serving the same
  # cards. The pipeline deploys main only.
  preview_environments_enabled = false

  tags = local.tags
}

# ---------------------------------------------------------------------------
# Custom domain, applied in a SECOND pass.
#
# This is a genuine ordering constraint, not caution: validation is by CNAME
# delegation, so the GoDaddy record must already resolve to this Static Web
# App's generated hostname — and that hostname does not exist until the
# resource above has been created. A single apply therefore cannot work.
#
#   1. terraform apply                      (enable_custom_domain = false)
#   2. terraform output default_hostname
#   3. add the CNAME at GoDaddy, let it propagate
#   4. terraform apply                      (enable_custom_domain = true)
#
# See infra/README.md.
# ---------------------------------------------------------------------------
resource "azurerm_static_web_app_custom_domain" "main" {
  count = var.enable_custom_domain ? 1 : 0

  static_web_app_id = azurerm_static_web_app.main.id
  domain_name       = var.custom_domain
  validation_type   = "cname-delegation"
}
