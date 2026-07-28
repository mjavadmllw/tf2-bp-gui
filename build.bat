@echo off
title Build GUI executable

echo ========================================
echo   Building the GUI .exe (portable)...
echo ========================================
call npm run dist

echo.
echo Build finished. Check the "release" folder.
echo.
pause >nul
