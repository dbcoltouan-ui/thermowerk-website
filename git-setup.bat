@echo off
cd /d C:\Users\Daniel\Documents\thermowerk-website
git add -A
git commit -m "Initial commit: Astro + Sanity CMS setup with Thermowerk design"
git remote add origin https://github.com/dbcoltouan-ui/thermowerk-website.git
git branch -M main
git push -u origin main
echo.
echo === FERTIG ===
pause
