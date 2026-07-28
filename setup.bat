@echo off
title Project Setup

echo ========================================
echo   Running npm install...
echo ========================================
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed!
    goto :end
)

echo.
echo Setup completed successfully!
:end
echo.
echo Press any key to exit...
pause >nul