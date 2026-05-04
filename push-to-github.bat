@echo off
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1

echo.
echo  RootRecord solana site  ^>^>  git add, commit, push origin main  (Vercel deploys from this branch^)
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: Not a git repository.
  exit /b 1
)

set "BRANCH=main"
for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "CUR=%%b"
if /i not "%CUR%"=="%BRANCH%" (
  echo WARNING: You are on "%CUR%", not %BRANCH%. This script still pushes: origin %BRANCH%
  echo.
)

set "MSG=chore: push for Vercel deploy"
if not "%~1"=="" set "MSG=%*"

git add -A

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%MSG%"
  if errorlevel 1 (
    echo ERROR: git commit failed.
    exit /b 1
  )
) else (
  echo Nothing new to commit — pushing anyway so remotes stay in sync.
)

git push origin %BRANCH%
if errorlevel 1 (
  echo ERROR: git push failed.
  exit /b 1
)

echo.
echo Done. Pushed to origin %BRANCH% — Vercel builds from GitHub on push.
echo.
exit /b 0
