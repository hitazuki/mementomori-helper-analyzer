#!/usr/bin/env pwsh
# Restart mmth-analyzer service script

param(
    [string]$Config = "",       # Config file path (e.g., "../config/test_local.json")
    [switch]$NoBuild,           # Skip build step
    [int]$MaxWait = 10,         # Max seconds to wait for service stop
    [switch]$Stop               # Stop service only (no start)
)

$ErrorActionPreference = "Continue"

# Project root directory (parent of scripts/)
$script:ProjectRoot = Split-Path $PSScriptRoot -Parent

# Read port from config file, default to 5391
function Get-ConfigPort {
    param([string]$ConfigPath)

    # Default config paths to check
    $pathsToCheck = @()

    if ($ConfigPath) {
        # User specified config
        $pathsToCheck += Join-Path $script:ProjectRoot $ConfigPath
    } else {
        # Default configs
        $pathsToCheck += Join-Path $script:ProjectRoot "config/app.json"
    }

    foreach ($path in $pathsToCheck) {
        if (Test-Path $path) {
            try {
                $config = Get-Content $path | ConvertFrom-Json
                if ($config.port) {
                    return $config.port
                }
            } catch {
                # Ignore parse errors, try next
            }
        }
    }
    return "5391"
}

$script:Port = Get-ConfigPort -ConfigPath $Config

function Get-ProcessUsingPort {
    $conn = Get-NetTCPConnection -LocalPort $script:Port -ErrorAction SilentlyContinue
    if ($conn) {
        return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    }
    return $null
}

function Test-ServiceRunning {
    $process = Get-Process mmth-analyzer -ErrorAction SilentlyContinue
    $portProcess = Get-ProcessUsingPort
    return ($process -ne $null) -or ($portProcess -ne $null)
}

function Get-ServiceStatus {
    $process = Get-Process mmth-analyzer -ErrorAction SilentlyContinue
    $portProcess = Get-ProcessUsingPort

    $status = @()
    if ($process) {
        $status += "Running (PID: $($process.Id))"
    }
    if ($portProcess) {
        $status += "Port $($script:Port) by $($portProcess.Name) (PID: $($portProcess.Id))"
    }
    if ($status.Count -eq 0) {
        return "Stopped"
    }
    return $status -join ", "
}

Write-Host "=== mmth-analyzer Service Restart ===" -ForegroundColor Cyan
Write-Host "Project: $script:ProjectRoot" -ForegroundColor Gray
if ($Config) {
    Write-Host "Config: $Config" -ForegroundColor Gray
} else {
    Write-Host "Config: config/app.json (default)" -ForegroundColor Gray
}

# Check current status
$initialStatus = Get-ServiceStatus
Write-Host "Status: $initialStatus" -ForegroundColor Yellow

if (-not (Test-ServiceRunning)) {
    Write-Host "Service not running, skip stop step" -ForegroundColor Green
} else {
    # Stop service
    Write-Host "`nStopping service..." -ForegroundColor Yellow

    # Try to kill by process name
    taskkill /F /IM mmth-analyzer.exe 2>$null

    # Also kill process using the configured port
    $portProcess = Get-ProcessUsingPort
    if ($portProcess) {
        Write-Host "  Killing process using port $($script:Port): $($portProcess.Name) (PID: $($portProcess.Id))" -ForegroundColor Gray
        Stop-Process -Id $portProcess.Id -Force -ErrorAction SilentlyContinue
    }

    # Wait for stop
    Write-Host "Waiting for stop (max ${MaxWait}s)..." -ForegroundColor Yellow
    $waited = 0
    while ((Test-ServiceRunning) -and $waited -lt $MaxWait) {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "  Waiting... ($waited/$MaxWait)" -ForegroundColor Gray
    }

    if (Test-ServiceRunning) {
        Write-Error "Failed to stop service"
        exit 1
    }
    Write-Host "Service stopped" -ForegroundColor Green
}

# If stop only mode, exit here
if ($Stop) {
    Write-Host "`nStop only mode (-Stop), exiting" -ForegroundColor Yellow
    exit 0
}

# Build
if (-not $NoBuild) {
    Write-Host "`nBuilding..." -ForegroundColor Yellow
    Set-Location $script:ProjectRoot
    go build -o mmth-analyzer.exe ./cmd/server
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    Write-Host "Build success" -ForegroundColor Green
} else {
    Write-Host "`nSkip build (-NoBuild)" -ForegroundColor Yellow
}

# Start service
Write-Host "`nStarting service..." -ForegroundColor Yellow
$exePath = Join-Path $script:ProjectRoot "mmth-analyzer.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "Executable not found: $exePath"
    exit 1
}

# Build arguments
$exeArgs = @()
if ($Config) {
    $exeArgs += "-config"
    $exeArgs += $Config
}

# Start process with arguments
Start-Process -FilePath $exePath -ArgumentList $exeArgs -WorkingDirectory $script:ProjectRoot

# Wait for start
Start-Sleep -Seconds 2
$maxStartupWait = 10
$startupWaited = 0
while (-not (Test-ServiceRunning) -and $startupWaited -lt $maxStartupWait) {
    Start-Sleep -Seconds 1
    $startupWaited++
}

if (Test-ServiceRunning) {
    Write-Host "Service started!" -ForegroundColor Green
    Write-Host "Visit: http://localhost:$($script:Port)" -ForegroundColor Cyan
    Write-Host "Status: $(Get-ServiceStatus)" -ForegroundColor Gray
} else {
    Write-Error "Failed to start service"
    exit 1
}
