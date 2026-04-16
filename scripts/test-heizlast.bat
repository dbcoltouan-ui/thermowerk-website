@echo off
REM Doppelklick-Test: verifiziert den Heizlast-Rechenkern gegen alle Referenz-Aufgaben.
REM Erwartete Ausgabe am Ende: "Alle Tests erfolgreich." mit 49 bestandenen Tests.

cd /d "%~dp0.."
echo ================================================================
echo  Thermowerk Heizlast - Rechenkern-Test
echo ================================================================
echo.
node --experimental-strip-types scripts/test-heizlast.ts
echo.
echo ================================================================
pause
