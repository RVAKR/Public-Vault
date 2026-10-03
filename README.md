# 🔐 Public-Vault

> A fully client-side encrypted credential vault hosted on GitHub Pages.

**Repository:** [https://github.com/RVAKR/Public-Vault](https://github.com/RVAKR/Public-Vault)

## Features

✨ **Core Security**
- Client-side AES-256-GCM encryption (all processing in browser)
- PBKDF2 key derivation (SHA-256, 600,000 iterations)
- Master password never stored anywhere
- Zero-knowledge architecture

🔑 **Credential Management**
- Multiple categories (Login, Card, Note, Identity, SSH Key, API Key)
- Password generator with strength meter
- Search across all credentials
- Copy to clipboard functionality

⏰ **Smart Expiry Handling**
- Set expiry dates for credentials (perfect for API tokens, bearer tokens, etc.)
- Auto-archive expired credentials on vault unlock
- Secrets automatically cleared when expired
- Archive stores metadata only (username, URL, notes, timestamps)
- One-click restore: create new credential with auto-filled metadata

📦 **Archive System**
- View all expired credentials in "Archived" section
- Manually archive credentials anytime
- Auto-fill feature: when creating a new credential with the same title, archived data is suggested
- Perfect for rotating API tokens every 30 days

📊 **Timestamps**
- Created date
- Last modified date
- Expiry date (optional)
- Last visited tracking

🌐 **Deployment**
- 100% static site (no server required)
- GitHub Pages ready
- Public repo safe (data is encrypted)

## How it works

- All credentials are encrypted with **AES-256-GCM** entirely in the browser
- Your master password is derived into an encryption key via **PBKDF2** (600,000 iterations, SHA-256)
- Each encryption operation uses a unique random **salt** (16 bytes) and **IV** (12 bytes)
- The encrypted blob is stored in **localStorage** — nothing is sent to any server
- The repo can be **fully public** — without the master password, the data is unreadable

## Security model

| Property | Value |
|---|---|
| Encryption | AES-256-GCM |
| Key derivation | PBKDF2 (SHA-256, 600k iterations) |
| Salt size | 16 bytes (random per operation) |
| IV size | 12 bytes (random per operation) |
| Password stored? | **Never** |
| Server required? | **No** — 100% static |

## Setup

```bash
npm install
npm run dev       # local dev
npm run build     # production build → dist/
```

## Usage

### First-time Setup
1. Visit your vault URL
2. Create a strong master password (min 8 characters)
3. Click "Create Vault"

### Adding Credentials
1. Click **+ Add**
2. Fill in details:
   - **Title**: Name of the credential
   - **Username/Email**: Login identifier
   - **Password**: Use generator (✨) or enter manually
   - **URL**: Website or API endpoint
   - **Expires At**: Optional expiry date (for tokens that rotate)
   - **Notes**: Any additional info
3. Click **Add Credential**

### Managing Expired Credentials (Example: API Tokens)

**Scenario:** You have a bearer token that expires every 30 days.

**Day 1:**
- Add credential: "Company API Token"
- Set expiry: 30 days from now
- Store your current token

**Day 30+ (after expiry):**
- Unlock vault → notification: "1 expired credential auto-archived"
- Go to **📦 Archived** in sidebar
- Click on "Company API Token"
- Click **+ Create New (Auto-fill)**
- All metadata pre-filled (username, URL, notes)
- Just update the password with new token
- Set new expiry date
- Click **Add Credential**

**Result:** Full history preserved, new token secured, old token safely archived.

### Manual Archive
- Open any credential
- Click **📦 Archive** button
- Secrets cleared, metadata saved for reference

### Cross-Device Sync
1. Export vault (`📤`) → download `vault.json`
2. Commit `vault.json` to your GitHub repo
3. On another device: import the `vault.json`
4. Unlock with same master password

## Deploy to GitHub Pages

1. Go to **Settings → Pages → Source** → select **GitHub Actions**
2. Push to `main` — the workflow in `.github/workflows/deploy-gcp.yml` handles the rest
3. Your vault is live at `https://<usernamesurname>.github.io/Public-Vault/`

**Note:** Make sure to run `npm run build` locally first to verify the build works before pushing.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment checklist.

## Usage

1. First visit: create a vault with a strong master password
2. Add credentials (logins, cards, SSH keys, API keys, notes, identity)
3. Export your vault (`📤`) to get a `vault.json` — **commit this to your repo** for cross-device sync
4. On another device: import the `vault.json` and unlock with your master password
5. Lock when done (`🚪`)

## Warning

- If you **forget your master password**, your data is gone — there is no recovery
- The plaintext export (`⚙️ Settings`) is for emergency offline backup only
