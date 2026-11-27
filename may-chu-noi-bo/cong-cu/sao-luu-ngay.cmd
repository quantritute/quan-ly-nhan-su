@echo off
chcp 65001 >nul
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
set "G=%~dp0.."
set "NODE_NO_WARNINGS=1"
title Sao luu du lieu - Quan ly nhan su
echo Dang sao luu du lieu (may chu van chay binh thuong)...
"%G%\node.exe" "%G%\may-chu.mjs" --sao-luu
if errorlevel 1 (echo. & echo Sao luu KHONG thanh cong. & pause & exit /b 1)
echo.
echo Nen chep them thu muc sao luu sang o cung ngoai / NAS de phong hong may chu.
explorer "%ProgramData%\QuanLyNhanSu\sao-luu"
pause
