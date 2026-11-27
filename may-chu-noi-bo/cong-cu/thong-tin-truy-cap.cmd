@echo off
chcp 65001 >nul
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
set "G=%~dp0.."
set "NODE_NO_WARNINGS=1"
title Thong tin truy cap - Quan ly nhan su
"%G%\node.exe" "%G%\may-chu.mjs" --thong-tin
echo.
"%G%\QuanLyNhanSu.exe" status
echo.
pause
