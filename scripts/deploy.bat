@echo off
chcp 65001 >nul
echo === DEPLOY: Git commit + push ===
echo.
cd /d "%~dp0.."

set GIT=git

%GIT% status --short
echo.
set /p MSG=Commit-Nachricht eingeben:

echo %MSG%> commitmsg.txt
%GIT% add -A
%GIT% commit -F commitmsg.txt
del commitmsg.txt
%GIT% push

echo.
echo Fertig. Cloudflare baut in 1-3 Minuten neu.
pause
