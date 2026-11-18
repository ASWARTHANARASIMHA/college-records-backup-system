@echo off
echo ========================================================
echo   Pushing College Records System to your GitHub...
echo   Target: https://github.com/ASWARTHANARASIMHA/college-records-backup-system
echo ========================================================
cd /d "%~dp0"
git branch -M main
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! Pushed to your GitHub profile:
    echo   https://github.com/ASWARTHANARASIMHA/college-records-backup-system
    echo ========================================================
) else (
    echo.
    echo If it failed with "repository not found", please create the repo first:
    echo 1. Open: https://github.com/new
    echo 2. Set Repository name to: college-records-backup-system
    echo 3. Click "Create repository" (leave it empty)
    echo 4. Run this script again!
)
pause
