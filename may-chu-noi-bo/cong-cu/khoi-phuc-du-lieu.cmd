@echo off
chcp 65001 >nul
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
set "G=%~dp0.."
set "NODE_NO_WARNINGS=1"
title Khoi phuc du lieu - Quan ly nhan su
echo Cac ban sao luu hien co (moi nhat o cuoi):
echo.
dir /b /ad /on "%ProgramData%\QuanLyNhanSu\sao-luu"
echo.
set "TEN="
set /p TEN=Go (hoac dan) TEN thu muc sao luu muon khoi phuc roi bam Enter: 
if "%TEN%"=="" exit /b
if not exist "%ProgramData%\QuanLyNhanSu\sao-luu\%TEN%" (echo Khong thay thu muc "%TEN%". & pause & exit /b 1)
echo.
echo CANH BAO: du lieu hien tai se duoc thay bang ban sao luu "%TEN%".
echo (Du lieu hien tai van duoc tu sao luu lai truoc khi thay, ten co duoi -truoc-khoi-phuc.)
set "OK="
set /p OK=Go CO roi bam Enter de tiep tuc: 
if /i not "%OK%"=="CO" exit /b
"%G%\QuanLyNhanSu.exe" stop
timeout /t 3 >nul
"%G%\node.exe" "%G%\may-chu.mjs" --khoi-phuc "%ProgramData%\QuanLyNhanSu\sao-luu\%TEN%"
"%G%\QuanLyNhanSu.exe" start
pause
