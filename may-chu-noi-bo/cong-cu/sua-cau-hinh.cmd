@echo off
chcp 65001 >nul
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
set "G=%~dp0.."
set "NODE_NO_WARNINGS=1"
title Sua cau hinh - Quan ly nhan su
echo Mo file cau hinh. Sua xong: Luu (Ctrl+S), dong Notepad, cong cu se mo tuong lua va khoi dong lai.
notepad "%ProgramData%\QuanLyNhanSu\cau-hinh.json"
for /f %%p in ('"%G%\node.exe" "%G%\may-chu.mjs" --cong') do set "CONG=%%p"
netsh advfirewall firewall delete rule name="Quan ly nhan su" >nul 2>&1
netsh advfirewall firewall add rule name="Quan ly nhan su" dir=in action=allow protocol=TCP localport=%CONG% >nul
echo Da mo tuong lua cho cong %CONG%.
"%G%\QuanLyNhanSu.exe" restart
timeout /t 5 >nul
"%G%\node.exe" "%G%\may-chu.mjs" --thong-tin
pause
