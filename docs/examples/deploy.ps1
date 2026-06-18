param(
  [string]$Environment = "dev"
)

$services = @("viewer", "companion")
foreach ($service in $services) {
  Write-Host "Deploying $service to $Environment"
}
