$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'Backend'

$files = Get-ChildItem -Path $backendRoot -Recurse -Filter *.js -File | Sort-Object FullName

foreach ($file in $files) {
  & node --check $file.FullName
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Output "Backend syntax check passed."
