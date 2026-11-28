@echo off
setlocal
chcp 65001 >nul
rem ============================================================
rem  CAP NHAT Phan mem quan ly nhan su - ban day du (du lieu giu nguyen)
rem  Tu tai ban moi nhat tu quantritute.com (du phong: GitHub cong khai), dua len Cloudflare.
rem  Nen tai ban sao luu truoc (phan mem: Cai dat - Du lieu va sao luu).
rem  .\cap-nhat.cmd lai   : dua lai ban dang co trong thu muc (khong tai)
rem ============================================================
cd /d "%~dp0"
where node >nul 2>nul || (echo [Loi] Chua cai Node.js. Tai ban LTS tai https://nodejs.org & pause & exit /b 1)
node cap-nhat.mjs %1
pause
rem Tep cap-nhat.cmd moi (neu co) thay vao SAU CUNG roi thoat ngay tren cung dong
if exist cap-nhat.cmd.moi (copy /y cap-nhat.cmd.moi cap-nhat.cmd >nul & del cap-nhat.cmd.moi >nul & exit /b 0)
