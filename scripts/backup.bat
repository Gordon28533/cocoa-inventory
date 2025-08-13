@echo off
REM Cocoa Inventory System - Windows Backup Script
REM This script creates database and file backups

setlocal enabledelayedexpansion

REM Configuration
set BACKUP_DIR=C:\backups\cocoa-inventory
set DB_NAME=cocoa_inventory_prod
set DB_USER=cocoa_user
set DB_PASS=your_secure_password
set RETENTION_DAYS=7

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Get current timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%

echo 🔄 Starting backup process...

REM Database backup
echo 📊 Creating database backup...
mysqldump -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" > "%BACKUP_DIR%\database_%TIMESTAMP%.sql"

REM Compress database backup (requires 7-Zip or similar)
REM "C:\Program Files\7-Zip\7z.exe" a "%BACKUP_DIR%\database_%TIMESTAMP%.sql.gz" "%BACKUP_DIR%\database_%TIMESTAMP%.sql"
REM del "%BACKUP_DIR%\database_%TIMESTAMP%.sql"

REM Application files backup (excluding node_modules and build)
echo 📁 Creating application backup...
REM Using PowerShell for better compression
powershell -Command "Compress-Archive -Path 'C:\opt\cocoa-inventory\*' -DestinationPath '%BACKUP_DIR%\app_%TIMESTAMP%.zip' -Exclude 'node_modules','build','.git','backups','*.log'"

REM Clean up old backups (older than 7 days)
echo 🧹 Cleaning up old backups...
forfiles /p "%BACKUP_DIR%" /s /m database_*.sql /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul
forfiles /p "%BACKUP_DIR%" /s /m app_*.zip /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul

echo ✅ Backup completed successfully!
echo 📅 Backup location: %BACKUP_DIR%

pause 