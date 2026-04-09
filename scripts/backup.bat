@echo off
setlocal enabledelayedexpansion

set BACKUP_DIR=C:\backups\cocoa-inventory
set APP_DIR=C:\opt\cocoa-inventory
set DB_NAME=CMC_Inventory
set DB_USER=cocoa_user
set DB_PASS=your_secure_password
set RETENTION_DAYS=7

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%

echo Starting backup process...

echo Creating database backup...
mysqldump -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" > "%BACKUP_DIR%\database_%TIMESTAMP%.sql"

REM Optional compression step if 7-Zip is available:
REM "C:\Program Files\7-Zip\7z.exe" a "%BACKUP_DIR%\database_%TIMESTAMP%.sql.gz" "%BACKUP_DIR%\database_%TIMESTAMP%.sql"
REM del "%BACKUP_DIR%\database_%TIMESTAMP%.sql"

echo Creating application backup...
powershell -Command "Compress-Archive -Path '%APP_DIR%\*' -DestinationPath '%BACKUP_DIR%\app_%TIMESTAMP%.zip' -Exclude 'node_modules','build','.git','backups','*.log'"

echo Cleaning up old backups...
forfiles /p "%BACKUP_DIR%" /s /m database_*.sql /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul
forfiles /p "%BACKUP_DIR%" /s /m app_*.zip /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul

echo Backup completed successfully.
echo Backup location: %BACKUP_DIR%

pause
