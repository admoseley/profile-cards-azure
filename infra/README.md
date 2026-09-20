# Infrastructure

One Static Web App on the Free plan, a resource group, and a cost tripwire.
That is the entire environment — rendering happens in GitHub Actions, so Azure
holds no compute, no database and no secrets.

**Expected cost: $0/month.**

## Applying

`terraform apply` is owner-run. Claude drafts and validates this configuration;
creating Azure resources, DNS records, and role assignments is Adrian's action.

Sign in first:

```bash
az login
```

### Pass 1 — create the Static Web App

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # set alert_email
terraform init
terraform apply
```

Leave `enable_custom_domain = false` for this pass.

### Pass 2 — bind the custom domain

This is a real ordering constraint, not caution. The domain is validated by
CNAME delegation, so the GoDaddy record has to resolve to the Static Web App's
generated hostname — and that hostname does not exist until pass 1 has run. A
single apply cannot work.

Get the target:

```bash
terraform output default_hostname
```

Add at GoDaddy (DNS for `adrianmoseley.com`):

| Type | Name | Value |
|---|---|---|
| CNAME | `trophy.clouddev` | the `default_hostname` from above |

Wait for it to resolve, and check rather than assume:

```bash
dig +short trophy.clouddev.adrianmoseley.com CNAME
```

Then bind it:

```bash
terraform apply -var enable_custom_domain=true
```

Azure issues a managed certificate automatically; the first HTTPS request can
take a few minutes after binding.

### Wire up the deploy token

The render pipeline authenticates to the Static Web App with its deployment
token. It is marked sensitive, so read it deliberately and hand it straight to
GitHub:

```bash
terraform output -raw deployment_token | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN -R admoseley/profile-cards-azure
```

## Why Free, not Standard

Standard buys Entra sign-in with custom roles and a linked container backend.
This site has no auth and no API — it serves four SVGs and a landing page — so
Standard would cost $9/month for nothing. Custom domains and managed TLS are
included in Free.

## Why the budget is resource-group scoped

The realestate stack already owns a subscription-level budget covering the
shared credit. A second one managed from a different state file would duplicate
those alerts.

This one is scoped to this resource group and set deliberately low. The
environment should cost nothing, so the budget is an anomaly detector, not a
spending limit: if it fires, something changed that shouldn't have — the SKU
moved off Free, or a resource was added here by hand.

## Checks

CI runs `fmt`, `init -backend=false`, `validate`, tflint, and Checkov in
enforcing mode on every PR touching `infra/`. None of it contacts Azure or
needs credentials. `terraform plan` is intentionally not in CI, since it would
require Azure access for no benefit given applying is manual.
