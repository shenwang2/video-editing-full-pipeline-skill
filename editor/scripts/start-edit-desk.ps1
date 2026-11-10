param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$editorRoot = Split-Path -Parent $PSScriptRoot
$url = 'http://127.0.0.1:4312/'
$apiUrl = "${url}api/projects"
$logRoot = Join-Path $editorRoot 'logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$launcherLog = Join-Path $logRoot 'launcher.log'
$serverOut = Join-Path $logRoot 'server.stdout.log'
$serverErr = Join-Path $logRoot 'server.stderr.log'

function Write-LauncherLog([string]$message) {
  Add-Content -LiteralPath $launcherLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message" -Encoding UTF8
}

function Test-EditDesk {
  try {
    $response = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 1
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

try {
  $running = Test-EditDesk
  if (-not $running) {
    $nodeCommand = Get-Command 'node.exe' -ErrorAction SilentlyContinue
    $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\nvm4w\nodejs\node.exe' }
    if (-not (Test-Path -LiteralPath $nodePath)) {
      throw "Node.js was not found. Install Node.js 20 or run npm install in the editor directory."
    }
    $serverScript = Join-Path $editorRoot 'server.mjs'
    Write-LauncherLog "Starting server with $nodePath"
    Start-Process -FilePath $nodePath -ArgumentList @($serverScript) -WorkingDirectory $editorRoot -WindowStyle Hidden -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr
    $deadline = (Get-Date).AddSeconds(25)
    do {
      Start-Sleep -Milliseconds 500
      $running = Test-EditDesk
    } while (-not $running -and (Get-Date) -lt $deadline)
  }

  if (-not $running) {
    throw "The edit-desk server did not start within 25 seconds. Error log: $serverErr"
  }

  Write-LauncherLog 'Editor is ready.'
  if (-not $NoBrowser) {
    Start-Process -FilePath 'explorer.exe' -ArgumentList @($url)
  }
  exit 0
} catch {
  Write-LauncherLog "ERROR: $($_.Exception.Message)"
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("Edit desk failed to start:`n$($_.Exception.Message)`n`nLog: $launcherLog", 'AI Talking-head Edit Desk') | Out-Null
  exit 1
}
