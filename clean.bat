@echo off
setlocal
title Cente Clean Tool
cd /d "%~dp0"

echo ========================================================
echo               Cente Clean Tool
echo ========================================================
echo.
echo Options:
echo   [1] Clean Debug Build Cache (Target\Debug)
echo   [2] Clean Entire Target Folder (Target)
echo   [3] Clean Logs and Temp Images (log\*.log)
echo   [4] Clean ALL Cache and Logs
echo.
echo ========================================================
set "CHOICE=1"
set /p "CHOICE=Select option [Default: 1, Press Enter]: "

if "%CHOICE%"=="2" goto DO_TARGET
if "%CHOICE%"=="3" goto DO_LOGS
if "%CHOICE%"=="4" goto DO_ALL
goto DO_DEBUG

:DO_DEBUG
echo [*] Cleaning debug cache...
if exist "src-tauri\target\debug" rd /s /q "src-tauri\target\debug"
if exist "preview_master_detail.png" del /f /q "preview_master_detail.png" 2>nul
echo [OK] Debug cache cleaned!
goto DONE

:DO_TARGET
echo [*] Cleaning all target cache...
if exist "src-tauri\target" rd /s /q "src-tauri\target"
if exist "preview_master_detail.png" del /f /q "preview_master_detail.png" 2>nul
echo [OK] Target cache cleaned!
goto DONE

:DO_LOGS
echo [*] Cleaning logs...
if exist "log" del /f /q "log\*.log" 2>nul
if exist "cente_logs" (
    del /f /q "cente_logs\*.log" 2>nul
    rd /s /q "cente_logs" 2>nul
)
if exist "preview_master_detail.png" del /f /q "preview_master_detail.png" 2>nul
echo [OK] Logs cleaned!
goto DONE

:DO_ALL
echo [*] Cleaning all caches and logs...
if exist "src-tauri\target" rd /s /q "src-tauri\target"
if exist "log" del /f /q "log\*.log" 2>nul
if exist "cente_logs" (
    del /f /q "cente_logs\*.log" 2>nul
    rd /s /q "cente_logs" 2>nul
)
if exist "preview_master_detail.png" del /f /q "preview_master_detail.png" 2>nul
echo [OK] All cleaned!
goto DONE

:DONE
echo.
echo ========================================================
echo Done! Core files (cente.exe, config) are safe.
echo ========================================================
echo.
pause
