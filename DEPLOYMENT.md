# 🚀 Deployment Checklist for Public-Vault

## Pre-Deployment Verification

### 1. Test Local Build
```bash
cd "I:\Projects\rvakr\My-Vault"
npm run build
```

**Expected output:**
- `dist/` folder created
- `dist/index.html` exists
- `dist/assets/` contains `.js` and `.css` files with hashes
- No TypeScript `.ts` files in `dist/`

### 2. Preview Production Build
```bash
npm run preview
```
Visit `http://localhost:4173/Public-Vault/` and test:
- ✓ Vault creation works
- ✓ Add/edit credentials works
- ✓ Expiry and archive features work
- ✓ Export/import works

## Deployment Steps

### 1. Clean Up Repository (Run the script)
```bash
cleanup-and-reset.bat
```

### 2. Commit All Changes
```bash
git add .
git commit -m "feat: Public-Vault with auto-expiry and archive system"
```

### 3. Push to GitHub
```bash
# If first time
git remote add origin https://github.com/RVAKR/Public-Vault.git
git push -u origin main --force

# Or if already set up
git push
```

### 4. Enable GitHub Pages
1. Go to: https://github.com/RVAKR/Public-Vault/settings/pages
2. Under "Build and deployment":
   - Source: **GitHub Actions**
3. Save

### 5. Monitor Deployment
1. Go to: https://github.com/RVAKR/Public-Vault/actions
2. Wait for workflow to complete (green checkmark)
3. Click on the deployment URL

### 6. Verify Live Site
Visit: **https://rvakr.github.io/Public-Vault/**

Test checklist:
- ✓ Page loads (no 404 errors in console)
- ✓ Create vault works
- ✓ Add credential works
- ✓ Export vault.json works
- ✓ Import vault.json works
- ✓ Expiry date shows correctly
- ✓ Archive section appears after expiry

## Troubleshooting

### Issue: 404 on `/src/main.ts`
**Cause**: Build didn't run or failed  
**Fix**: Check GitHub Actions logs, ensure `npm ci` and `npm run build` succeeded

### Issue: Blank page
**Cause**: Base path mismatch  
**Fix**: Verify `vite.config.ts` has `base: '/Public-Vault/'`

### Issue: Assets not loading
**Cause**: CORS or path issues  
**Fix**: Check browser console, verify all paths start with `/Public-Vault/`

### Issue: Old version still showing
**Cause**: Browser cache  
**Fix**: Hard refresh (Ctrl+Shift+R) or clear cache

## Post-Deployment

### Commit vault.json for sync
1. Export your vault from the live site
2. Save as `vault.json` in repo root (or `.github/vault-backup.json`)
3. Commit and push
4. On other devices, import this file

### Update README badges (optional)
```markdown
![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-success)
![Build](https://img.shields.io/github/actions/workflow/status/RVAKR/Public-Vault/deploy-gcp.yml?branch=main)
```

## Current Status (as of 2026-10-03)
- ✅ Vite config updated with proper base path
- ✅ GitHub Actions workflow configured
- ✅ Archive system implemented
- ✅ Auto-expiry feature working
- ⏳ Awaiting push to GitHub and deployment
