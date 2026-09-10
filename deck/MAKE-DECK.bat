@echo off
REM ============================================================
REM  Builds "CMC Inventory System - Client Presentation.pptx"
REM  Just double-click this file. Nothing else to configure.
REM ============================================================
cd /d "%~dp0"

echo.
echo   Building the CMC client presentation...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed or not on PATH.
  echo       Install it from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\pptxgenjs" (
  echo   Installing the presentation library ^(first run only^)...
  echo.
  call npm install pptxgenjs --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   [X] Could not install pptxgenjs. Check your internet connection.
    echo.
    pause
    exit /b 1
  )
  echo.
)

REM .cjs, not .js: the project's package.json sets "type": "module", so a .js
REM file here would be treated as ESM and reject require().
node build_deck.cjs
if errorlevel 1 (
  echo.
  echo   [X] The deck failed to build. The error is shown above.
  echo.
  pause
  exit /b 1
)

echo   Done. Opening the folder...
start "" "%~dp0"
echo.
pause
