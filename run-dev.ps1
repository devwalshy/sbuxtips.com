param(
    [switch]$ForceInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Run-NpmInstall {
    Write-Host "Installing dependencies..."
    npm install | Write-Output
}

$shouldInstall = $ForceInstall.IsPresent -or -not (Test-Path "node_modules")

if ($shouldInstall) {
    Run-NpmInstall
} else {
    Write-Host "Skipping npm install (node_modules already exists). Use -ForceInstall to override."
}

Write-Host "Starting Vite dev server..."
npm run dev | Write-Output
