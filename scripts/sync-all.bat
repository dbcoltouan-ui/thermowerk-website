@echo off
chcp 65001 >nul
echo === FULL SYNC: Lokal nach Sanity + Git push ===
echo.
cd /d C:\Users\Daniel\Documents\thermowerk-website

set GIT=C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe

:: 1. Sanity aktualisieren
echo [1/3] Sanity aktualisieren...
for /f "tokens=1,* delims==" %%a in ('findstr "SANITY_API_TOKEN" .env') do set %%a=%%b
node scripts/seed-sanity.mjs
echo.

:: 2. Git commit
echo [2/3] Git commit...
set /p MSG=Commit-Nachricht eingeben:
echo %MSG%> commitmsg.txt
%GIT% add -A
%GIT% commit -F commitmsg.txt
del commitmsg.txt
echo.

:: 3. Push
echo [3/3] Git push...
%GIT% push

echo.
echo Fertig. Sanity + Cloudflare werden in 1-3 Min aktualisiert.
pause
