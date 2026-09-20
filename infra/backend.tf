# ---------------------------------------------------------------------------
# Remote state, sharing the storage account used by the other environments
# (created out of band; see admoseley/Terraform_ADM scripts/bootstrap-state.sh)
# under its own key. The azurerm backend takes a blob lease, so two concurrent
# applies can't corrupt state.
#
# Backend blocks can't use variables, so these values are static. The account
# name isn't a secret; access comes from your Azure CLI sign-in at runtime.
# ---------------------------------------------------------------------------
terraform {
  backend "azurerm" {
    resource_group_name  = "Moseley_Terraform_State"
    storage_account_name = "moseleytfstate3d4427"
    container_name       = "tfstate"
    key                  = "profile-cards.terraform.tfstate"
  }
}
