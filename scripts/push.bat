@echo off
chcp 65001 >nul
echo === SANITY PUSH: Lokale Werte nach Sanity schreiben ===
echo.
cd /d C:\Users\Daniel\Documents\thermowerk-website
for /f "tokens=1,* delims==" %%a in ('findstr "SANITY_API_TOKEN" .env') do set %%a=%%b
node scripts/seed-sanity.mjs
echo.
echo Fertig. Sanity-Webhook triggert Cloudflare Rebuild (1-3 Min).
pause
