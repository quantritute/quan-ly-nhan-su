@echo off
chcp 65001 >nul
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
set "G=%~dp0.."
set "NODE_NO_WARNINGS=1"
title Khoi dong lai - Quan ly nhan su
"%G%\QuanLyNhanSu.exe" restart
timeout /t 5 >nul
"%G%\QuanLyNhanSu.exe" status
pause
