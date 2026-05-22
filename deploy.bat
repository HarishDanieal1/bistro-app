@echo off
echo ========================================================
echo   THE INTELLIGENT BISTRO - GIT & VERCEL SETUP HELPER
echo ========================================================
echo.

echo [1/3] Initializing local Git repository...
git init
if %errorlevel% neq 0 (
    echo Error initializing Git! Make sure Git is installed.
    pause
    exit /b %errorlevel%
)

echo [2/3] Adding files to staging...
git add .

echo [3/3] Creating initial commit...
git commit -m "feat: Initial commit for The Intelligent Bistro - React Native, Express & Prisma DB"
if %errorlevel% neq 0 (
    echo.
    echo Git commit failed. Make sure your git config (user.name and user.email) is set.
    echo Run: git config --global user.name "Your Name"
    echo Run: git config --global user.email "your.email@example.com"
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   SUCCESS: Local Git Repository Initialized and Staged!
echo ========================================================
echo.
echo TO PUSH TO GITHUB:
echo   1. Create a blank repository on https://github.com
echo   2. Run the following commands in this folder:
echo      git branch -M main
echo      git remote add origin YOUR_GITHUB_REPOSITORY_URL
echo      git push -u origin main
echo.
echo TO DEPLOY TO VERCEL:
echo   1. Open a terminal in the /server directory, run "vercel"
echo   2. Navigate to the mobile client web export, build and deploy.
echo.
pause
