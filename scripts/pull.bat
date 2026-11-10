@echo off
chcp 65001 >nul
echo === SANITY PULL: Daten aus Sanity exportieren ===
echo.
cd /d "%~dp0.."
for /f "tokens=1,* delims==" %%a in ('findstr "SANITY_API_TOKEN" .env') do set %%a=%%b
node scripts/pull-sanity.mjs
echo.
echo Fertig. Datei: sanity-export.json
pause
