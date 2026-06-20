#Requires -Version 5.1
#Requires -Modules ActiveDirectory, Pester

<#
.SYNOPSIS
    Sample PowerShell deployment script with module imports and utility functions.

.DESCRIPTION
    Demonstrates PowerShell script structure including functions, param blocks,
    Import-Module statements, and common cmdlet patterns.

.PARAMETER Environment
    Target environment (dev, staging, prod).

.PARAMETER LogPath
    Path where log files will be written.

.PARAMETER Force
    Skip confirmation prompts.
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $false)]
    [string]$LogPath = "$PSScriptRoot\logs",

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

Import-Module Az.Accounts -MinimumVersion '2.0'
Import-Module Az.Storage
Import-Module .\modules\DeploymentHelpers.psm1

$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$script:StartTime = Get-Date
$script:LogFile = Join-Path $LogPath "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [ValidateSet('INFO', 'WARN', 'ERROR')]
        [string]$Level = 'INFO'
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $entry = "[$timestamp] [$Level] $Message"
    Write-Verbose $entry
    Add-Content -Path $script:LogFile -Value $entry
}

function Initialize-Environment {
    param(
        [string]$EnvName
    )

    Write-Log "Initializing environment: $EnvName"

    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
        Write-Log "Created log directory: $LogPath"
    }

    $configPath = Join-Path $PSScriptRoot "config\$EnvName.json"
    if (-not (Test-Path $configPath)) {
        throw "Configuration file not found: $configPath"
    }

    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Log "Loaded configuration from $configPath"
    return $config
}

function Deploy-Application {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AppName,

        [Parameter(Mandatory = $true)]
        [string]$Version,

        [string]$TargetPath = 'C:\Apps',

        [switch]$DryRun
    )

    Write-Log "Deploying $AppName version $Version to $TargetPath"

    if (-not $Force -and -not $DryRun) {
        $confirm = Read-Host "Deploy $AppName $Version to $Environment? (y/N)"
        if ($confirm -ne 'y') {
            Write-Log "Deployment cancelled by user" -Level 'WARN'
            return $false
        }
    }

    try {
        $artifactPath = Get-ArtifactPath -AppName $AppName -Version $Version
        $destination = Join-Path $TargetPath $AppName

        if ($DryRun) {
            Write-Log "DRY RUN: Would copy $artifactPath to $destination"
            return $true
        }

        Copy-Item -Path $artifactPath -Destination $destination -Recurse -Force
        Set-ItemProperty -Path $destination -Name LastDeployed -Value (Get-Date)
        Write-Log "Successfully deployed $AppName $Version"
        return $true
    }
    catch {
        Write-Log "Deployment failed: $_" -Level 'ERROR'
        throw
    }
}

function Test-Deployment {
    param(
        [string]$AppName,
        [string]$HealthUrl
    )

    Write-Log "Running health check for $AppName"

    $maxAttempts = 5
    $attempt = 0

    do {
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "Health check passed on attempt $attempt"
                return $true
            }
        }
        catch {
            Write-Log "Health check attempt $attempt failed: $_" -Level 'WARN'
        }
        Start-Sleep -Seconds 5
    } while ($attempt -lt $maxAttempts)

    Write-Log "Health check failed after $maxAttempts attempts" -Level 'ERROR'
    return $false
}

function Get-DeploymentSummary {
    $elapsed = (Get-Date) - $script:StartTime
    return [PSCustomObject]@{
        Environment = $Environment
        StartTime   = $script:StartTime
        Duration    = $elapsed.TotalSeconds
        LogFile     = $script:LogFile
    }
}

# Main execution
try {
    Write-Log "Starting deployment to $Environment"
    $config = Initialize-Environment -EnvName $Environment

    foreach ($app in $config.applications) {
        $result = Deploy-Application -AppName $app.name -Version $app.version -TargetPath $config.deployPath
        if ($result) {
            $healthy = Test-Deployment -AppName $app.name -HealthUrl $app.healthUrl
            if (-not $healthy) {
                Write-Log "Deployment verification failed for $($app.name)" -Level 'ERROR'
            }
        }
    }

    $summary = Get-DeploymentSummary
    Write-Log "Deployment complete. Duration: $($summary.Duration)s"
    Write-Output $summary | ConvertTo-Json
}
catch {
    Write-Log "Deployment failed: $_" -Level 'ERROR'
    exit 1
}
