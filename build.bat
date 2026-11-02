@echo off
setlocal
cd /d "%~dp0"
title Cente Rebuild

echo ========================================================
echo               Cente Rebuild and Deploy
echo ========================================================
echo.

tasklist /FI "IMAGENAME eq cente.exe" 2>nul | find /I "cente.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo [*] Closing running Cente instance...
    taskkill /F /IM cente.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo [*] Compiling release build with Cargo...
cd /d "%~dp0src-tauri"
cargo build --release
if "%ERRORLEVEL%" neq "0" (
    echo.
    echo [ERROR] Cargo build failed.
    pause
    exit /b 1
)

set "TARGET=%~dp0src-tauri\target\release\cente.exe"
set "DEST=%~dp0cente.exe"

if exist "%TARGET%" (
    copy /y "%TARGET%" "%DEST%" >nul
    echo.
    echo ========================================================
    echo  [OK] Successfully compiled and deployed:
    echo  %DEST%
    echo ========================================================
    echo.
    cd /d "%~dp0"
    echo [*] Starting new Cente version...
    start "" "%DEST%"
) else (
    echo [ERROR] Target file not found: %TARGET%
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
exit /b 0
