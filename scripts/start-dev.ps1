$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectPattern = [regex]::Escape($projectRoot)
$allowedPatterns = @(
  'react-scripts',
  'Backend/server.js',
  'npm-cli.js run start',
  'npm-cli.js run start-backend',
  'npm-cli.js run dev',
  'concurrently'
)

function Stop-ProjectNodeProcesses {
  $listenerCandidates = @()
  foreach ($port in 3000, 5000) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
      $listenerCandidates += $listener.OwningProcess
    }
  }

  $candidates = Get-CimInstance Win32_Process | Where-Object {
    $commandLine = $_.CommandLine
    $isKnownProjectCommand = $false
    foreach ($pattern in $allowedPatterns) {
      if ($commandLine -like "*$pattern*") {
        $isKnownProjectCommand = $true
        break
      }
    }

    $isBackendProcess = $commandLine -like '*Backend/server.js*'
    $isProjectScoped = $commandLine -match $projectPattern -and $isKnownProjectCommand
    $isListenerOwner = $listenerCandidates -contains $_.ProcessId

    $_.Name -eq 'node.exe' -and ($isBackendProcess -or $isProjectScoped -or $isListenerOwner)
  } | Sort-Object ProcessId -Unique

  foreach ($proc in ($candidates | Sort-Object ProcessId -Descending)) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    } catch {
    }
  }
}

Stop-ProjectNodeProcesses
Start-Sleep -Seconds 2

& npm run db:start

$concurrentlyCmd = Join-Path $projectRoot 'node_modules\.bin\concurrently.cmd'
if (-not (Test-Path $concurrentlyCmd)) {
  throw 'concurrently is not installed. Run npm install first.'
}

& $concurrentlyCmd "npm run start" "npm run start-backend"
