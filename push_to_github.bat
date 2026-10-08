@echo off
title Push SignSpeak AI to GitHub
echo ========================================================
echo   Pushing SignSpeak AI to GitHub
echo ========================================================
set "GIT_ASKPASS="
echo.
echo Checking git status and branch...
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/Aryarai272/SignSpeak-AI.git
echo Remote set to: https://github.com/Aryarai272/SignSpeak-AI.git
echo.
echo Staging and committing any recent changes...
git add .
git commit -m "feat: complete SignSpeak AI - Real-Time Sign Language Recognition & Fun Mode"
echo.
echo Pushing to GitHub...
echo (If prompted, log in with your GitHub account in the pop-up browser window)
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo [SUCCESS] Your project is now live on GitHub!
    echo Visit: https://github.com/Aryarai272/SignSpeak-AI
    echo ========================================================
) else (
    echo ========================================================
    echo If GitHub returned 'Repository not found':
    echo 1. Go to: https://github.com/new
    echo 2. Set Repository name to: SignSpeak-AI
    echo 3. Click 'Create repository' (leave it empty)
    echo 4. Run this script again!
    echo ========================================================
)
pause
