@echo off
echo ========================================================
echo   Deploying College Records Backup System to Vercel...
echo ========================================================
cd /d "%~dp0"
npx vercel --prod
pause
