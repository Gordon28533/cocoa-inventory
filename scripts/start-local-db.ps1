$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$mysqldExe = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
$mysqlBaseDir = 'C:/Program Files/MySQL/MySQL Server 8.0'
$mysqlBase = Join-Path $env:LOCALAPPDATA 'cocoa-inventory-mysql'
$dataDir = Join-Path $mysqlBase 'data'
$configPath = Join-Path $mysqlBase 'my.ini'
$initSql = Join-Path $projectRoot 'scripts\init-dev-db.sql'
$port = 3306

if (-not (Test-Path $mysqlBase)) {
  New-Item -ItemType Directory -Path $mysqlBase -Force | Out-Null
}

$dataDirForConfig = $dataDir -replace '\\', '/'
$configContent = @"
[mysqld]
basedir=$mysqlBaseDir
datadir=$dataDirForConfig
port=$port
bind-address=127.0.0.1
mysqlx=0
log-error=PPK-AGNESS.err
"@
Set-Content -Path $configPath -Value $configContent -Encoding ASCII

function Test-PortListening {
  param([int]$Port)
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $listener
}

function Invoke-MySql {
  param(
    [string[]]$Arguments
  )

  & $mysqlExe '-h' '127.0.0.1' @Arguments
}

function Wait-ForMySql {
  param([int]$TimeoutSeconds = 20)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

if (-not (Test-Path $mysqlExe) -or -not (Test-Path $mysqldExe)) {
  throw 'MySQL 8.0 binaries were not found in the default installation path.'
}

if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  & $mysqldExe "--defaults-file=$configPath" '--initialize-insecure' --console
}

if (-not (Test-PortListening -Port $port)) {
  Start-Process -FilePath $mysqldExe -ArgumentList @("--defaults-file=$configPath") -WindowStyle Hidden | Out-Null
}

if (-not (Wait-ForMySql)) {
  throw "Timed out waiting for MySQL to listen on port $port."
}

$envFile = Join-Path $projectRoot '.env'
$dbPass = 'Gordon28'
if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^DB_PASS=' } | Select-Object -First 1
  if ($line) {
    $dbPass = $line.Substring(8)
  }
}

$passwordSet = $false
try {
  Invoke-MySql @('-u', 'root', "-p$dbPass", '--execute=SELECT 1;') | Out-Null
  $passwordSet = $true
} catch {
  $passwordSet = $false
}

if (-not $passwordSet) {
  try {
    Invoke-MySql @('-u', 'root', "--execute=ALTER USER 'root'@'localhost' IDENTIFIED BY '$dbPass'; FLUSH PRIVILEGES;") | Out-Null
  } catch {
    throw 'Unable to configure the local MySQL root password.'
  }
}

$dbExists = $false
try {
  $dbCheck = Invoke-MySql @('-N', '-B', '-u', 'root', "-p$dbPass", "--execute=SHOW DATABASES LIKE 'CMC_Inventory';")
  $dbExists = ($dbCheck -match '^CMC_Inventory$')
} catch {
  $dbExists = $false
}

if (-not $dbExists) {
  Get-Content $initSql | Invoke-MySql @('-u', 'root', "-p$dbPass")
}

Write-Output "Local MySQL ready on 127.0.0.1:$port using data dir $dataDir"
