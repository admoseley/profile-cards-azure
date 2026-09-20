# ---------------------------------------------------------------------------
# Cost tripwire, scoped to this resource group.
#
# Deliberately NOT a subscription-level budget: the realestate stack already
# owns one of those ("budget-monthly-credit") covering the whole subscription
# and the shared credit. A second subscription-wide budget managed from a
# different state file would duplicate those alerts for no benefit.
#
# This environment should cost exactly nothing — a Free-tier Static Web App and
# nothing else. So the threshold is set very low and treated as an anomaly
# detector rather than a spending limit: if this ever fires, something has
# changed that shouldn't have (the SKU moved off Free, or a resource was added
# here by hand). A budget that can never be approached is a budget that never
# tells you anything.
# ---------------------------------------------------------------------------

resource "azurerm_consumption_budget_resource_group" "tripwire" {
  name              = "budget-${var.name_prefix}-tripwire"
  resource_group_id = azurerm_resource_group.main.id

  amount     = var.monthly_budget
  time_grain = "Monthly"

  time_period {
    start_date = var.budget_start_date
  }

  dynamic "notification" {
    for_each = var.budget_alert_thresholds
    content {
      enabled        = true
      threshold      = notification.value
      threshold_type = "Actual"
      operator       = "GreaterThanOrEqualTo"
      contact_emails = [var.alert_email]
    }
  }
}
