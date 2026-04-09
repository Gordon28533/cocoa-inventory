$ErrorActionPreference = 'SilentlyContinue'

$mysqlBase = Join-Path $env:LOCALAPPDATA 'cocoa-inventory-mysql'
$dataDir = Join-Path $mysqlBase 'data'
$configPath = Join-Path $mysqlBase 'my.ini'
$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'mysqld.exe' -and (
    $_.CommandLine -like "*$dataDir*" -or
    $_.CommandLine -like "*$configPath*" -or
    $_.CommandLine -like '*cocoa-inventory-mysql*'
  )
}

foreach ($target in $targets) {
  Stop-Process -Id $target.ProcessId -Force
}

Start-Sleep -Seconds 1
Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess
