@echo off
setlocal enabledelayedexpansion
cls

echo ====================================
echo Public-Vault Repository Cleanup
echo ====================================
echo.
echo This script will:
echo 1. Delete unused Python files
echo 2. Delete placeholder files
echo 3. Remove ALL Git history (COMPLETE WIPE)
echo 4. Remove git config
echo 5. Initialize fresh Git repository
echo 6. Create a fresh first commit
echo.
echo WARNING: This CANNOT be undone!
echo This will erase ALL Git history and commits.
echo.
pause

echo.
echo [1/6] Deleting unused Python files...
if exist vault_cli.py (
  del /f /q vault_cli.py
  echo   - Deleted vault_cli.py
)
if exist vault_client.py (
  del /f /q vault_client.py
  echo   - Deleted vault_client.py
)
if exist vault_core.py (
  del /f /q vault_core.py
  echo   - Deleted vault_core.py
)
echo Done.

echo.
echo [2/6] Deleting placeholder files...
if exist src\placeholder.ts (
  del /f /q src\placeholder.ts
  echo   - Deleted src/placeholder.ts
)
echo Done.

echo.
echo [3/6] Removing ALL Git data...
if exist .git (
  rmdir /s /q .git
  echo   - Deleted .git directory
)
if exist .gitignore (
  del /f /q .gitignore
  echo   - Deleted .gitignore
)
if exist .gitmodules (
  del /f /q .gitmodules
  echo   - Deleted .gitmodules
)
echo Done.

echo.
echo [4/6] Cleaning git config...
git config --global --unset user.name >nul 2>&1
git config --global --unset user.email >nul 2>&1
git config --local --unset user.name >nul 2>&1
git config --local --unset user.email >nul 2>&1
if exist .git\config (
  del /f /q .git\config
)
echo Done.

echo.
echo [5/6] Initializing fresh Git repository...
git init
git config user.name "RVAKR"
git config user.email "rvakr@github.local"
git branch -M main
echo Done.

echo.
echo [6/6] Creating fresh first commit...
git add .
git commit -m "Initial commit: Public-Vault - AES-256-GCM encrypted credential vault

Features:
- Client-side AES-256-GCM encryption with PBKDF2 (600k iterations)
- Zero-knowledge architecture (master password never stored)
- Credential management with categories (Login, Card, Note, Identity, SSH Key, API Key)
- Password generator with strength meter
- Expiry date tracking with visual indicators
- Last visited timestamp tracking
- Auto-archive expired credentials
- Archived credential restore with auto-fill
- Import/Export encrypted vault as JSON
- GitHub Pages deployment ready
- Pure TypeScript + Vite (no framework dependencies)
- Responsive dark UI"

echo.
echo ====================================
echo Cleanup complete!
echo ====================================
echo.
echo Your repository now has ONLY 1 commit with fresh history.
echo.
echo Next steps:
echo 1. Check git log to verify: git log --oneline
echo 2. Set remote and push to GitHub:
echo    git remote add origin https://github.com/RVAKR/Public-Vault.git
echo    git push -u origin main --force
echo.
echo 3. Wait for GitHub Actions to deploy
echo 4. Visit: https://rvakr.github.io/Public-Vault/
echo.
pause
