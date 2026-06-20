targetScope = 'resourceGroup'

@description('The environment name (dev, staging, prod)')
param environment string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name used as prefix for resource names')
param appName string = 'myapp'

@description('Storage account SKU')
param storageSku string = 'Standard_LRS'

var storageAccountName = '${appName}${environment}storage'
var appServicePlanName = '${appName}-${environment}-plan'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: storageSku
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: false
  }
}

output storageAccountId string = storageAccount.id
output storageAccountName string = storageAccount.name
output appServicePlanId string = appServicePlan.id
