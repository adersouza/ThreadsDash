# SECURITY NOTICE - IMMEDIATE ACTION REQUIRED

## ⚠️ Exposed Credentials Detected

The `.env` file containing production Firebase credentials was previously committed to version control.

### Immediate Actions Required:

1. **Rotate Firebase API Keys:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project: `threadsdash`
   - Navigate to Project Settings > General
   - Under "Your apps" section, delete and recreate the web app to get new API keys
   - Update your local `.env` file with new credentials

2. **Generate New Encryption Key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   - Replace `VITE_ENCRYPTION_KEY` in `.env` with the new key
   - **WARNING:** Changing the encryption key will invalidate all existing encrypted tokens
   - Users will need to re-authenticate their Threads accounts

3. **Update Cloud Function Secrets:**
   ```bash
   cd functions
   firebase functions:config:set encryption.key="YOUR_NEW_ENCRYPTION_KEY"
   firebase functions:config:set threads.app_secret="YOUR_THREADS_APP_SECRET"
   firebase deploy --only functions
   ```

4. **Remove .env from Git History (Optional but Recommended):**
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   brew install bfg
   bfg --delete-files .env
   git reflog expire --expire=now --all && git gc --prune=now --aggressive

   # Force push to remote (coordinate with team first!)
   git push origin --force --all
   ```

5. **Verify .gitignore:**
   - `.env` is already in `.gitignore` (line 27) ✓
   - Ensure `.env` is never committed again

### Security Improvements Implemented:

✅ Proper AES-GCM encryption in Cloud Functions
✅ Removed insecure synchronous encryption fallbacks
✅ Mandatory encryption key validation (no defaults)
✅ CSRF protection for OAuth flows
✅ Enhanced error handling without exposing sensitive data

### Post-Rotation Checklist:

- [ ] New Firebase API keys generated and updated in `.env`
- [ ] New encryption key generated and updated in `.env`
- [ ] Cloud Functions secrets updated
- [ ] Cloud Functions redeployed
- [ ] Local development tested
- [ ] Production deployment tested
- [ ] Users notified about re-authentication requirement
- [ ] Old credentials confirmed rotated/disabled

---

**Date:** 2025-12-01
**Priority:** CRITICAL
**Status:** ACTION REQUIRED
