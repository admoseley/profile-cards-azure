variable "name_prefix" {
  description = "Short name used to build resource names (rg-<prefix>-prod, swa-<prefix>)."
  type        = string
  default     = "profilecards"

  validation {
    # Static Web App names allow alphanumerics and hyphens; keeping the prefix
    # lowercase alphanumeric avoids surprises when it is interpolated.
    condition     = can(regex("^[a-z0-9]{3,20}$", var.name_prefix))
    error_message = "name_prefix must be 3-20 lowercase alphanumeric characters."
  }
}

variable "location" {
  description = "Azure region. Central US matches the rest of the estate."
  type        = string
  default     = "centralus"
}

variable "custom_domain" {
  description = "Custom domain for the cards. Convention for Adrian's own side projects is <project>.clouddev.adrianmoseley.com."
  type        = string
  default     = "trophy.clouddev.adrianmoseley.com"
}

variable "enable_custom_domain" {
  description = <<-EOT
    Whether to bind the custom domain. Leave false for the first apply: the
    CNAME cannot be created until the Static Web App exists and its generated
    hostname is known. Set true once the GoDaddy record resolves.
  EOT
  type        = bool
  default     = false
}

variable "alert_email" {
  description = "Address for budget alerts. Intentionally has no default so a personal address is never committed to this public repository."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "alert_email must be a valid email address."
  }
}

variable "monthly_budget" {
  description = "Tripwire amount in USD. This environment should cost nothing, so a small value makes any real spend visible immediately."
  type        = number
  default     = 5
}

variable "budget_alert_thresholds" {
  description = "Percentages of monthly_budget at which to alert."
  type        = list(number)
  default     = [80, 100]
}

variable "budget_start_date" {
  description = "First day of the budget period, RFC3339. Azure requires the first of a month, and it cannot be more than three months in the past."
  type        = string
  default     = "2026-09-01T00:00:00Z"
}

variable "tags" {
  description = "Extra tags merged into the defaults."
  type        = map(string)
  default     = {}
}
