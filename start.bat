@echo off
setlocal
cd /d "%~dp0"
title Cente

set "EXE_ROOT=%~dp0cente.exe"
set "EXE_RELEASE=%~dp0src-tauri\target\release\cente.exe"

tasklist /FI "IMAGENAME eq cente.exe" 2>nul | find /I "cente.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo [Cente] Already running in background/tray, bringing to front...
    if exist "%EXE_ROOT%" start "" "%EXE_ROOT%"
    exit /b 0
)

if exist "%EXE_ROOT%" (
    echo [Cente] Starting Cente...
    start "" "%EXE_ROOT%"
    exit /b 0
)

if exist "%EXE_RELEASE%" (
    echo [Cente] Starting Cente from release target...
    start "" "%EXE_RELEASE%"
    exit /b 0
)

echo [Cente] Executable not found. Please run build.bat first.
pause
