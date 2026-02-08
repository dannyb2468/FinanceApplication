# FinanceFlow - Project Context

## Quick Summary
Personal finance tracking web app with cloud sync. Built for cross-device use (desktop + iPhone).

## Project Location
```
C:\Users\danie\FinanceTracker\
```

## GitHub Repository
- URL: https://github.com/dannyb2468/FinanceApplication
- Live Site: https://dannyb2468.github.io/FinanceApplication/

## Tech Stack
- Pure HTML/CSS/JavaScript (no build tools)
- Firebase Authentication (email/password)
- Firebase Firestore (cloud database)
- Chart.js (visualizations)
- PWA (offline support, installable)

## Firebase Config
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBwMWhiUNZ5XxR3SMW6hId42ljPCYFZOjI",
    authDomain: "financeflow-b93f4.firebaseapp.com",
    projectId: "financeflow-b93f4",
    storageBucket: "financeflow-b93f4.firebasestorage.app",
    messagingSenderId: "433074497981",
    appId: "1:433074497981:web:b4edcc9d0d02e07b54cad4"
};
```

## File Structure
```
FinanceTracker/
├── index.html          # Main app HTML (all pages in single file)
├── styles.css          # All CSS including mobile responsive
├── app.js              # Main application logic (FinanceApp class)
├── sw.js               # Service worker for offline/PWA
├── manifest.json       # PWA manifest
└── icons/
    ├── icon.svg        # Base SVG icon
    └── generate-icons.html  # Tool to generate PNG icons
```

## Features Implemented
1. **Dashboard** - Monthly overview, stats, budget bars, spending chart
2. **Transactions** - Add/edit/delete, filter by type/category/date/search
3. **Budgets** - Set monthly limits per category, track progress
4. **Recurring** - Subscriptions/bills, auto-generate transactions when due
5. **Net Worth** - Track assets & liabilities, historical chart
6. **Reports** - Income vs expenses, spending trends, savings rate
7. **Settings** - Theme (light/dark), currency, custom categories
8. **Cloud Sync** - Firebase auth + Firestore real-time sync
9. **Mobile Nav** - Bottom navigation bar for phones
10. **PWA** - Installable, offline capable

## Current Issue (UNRESOLVED)
**GitHub Pages not deploying new code.**

- Code is on GitHub (verified via raw.githubusercontent.com)
- But live site serves old version without mobile navigation
- User cannot navigate on iPhone - sidebar hidden, no bottom nav visible

### Troubleshooting Done
- Bumped service worker cache version (v1 → v2)
- Made commits to trigger redeploy
- Waited several minutes
- Verified code exists on GitHub main branch

### Next Steps to Fix
1. Check GitHub Pages settings (Settings > Pages)
   - Ensure Source is set to "main" branch, "/ (root)"
2. Check GitHub Actions for failed deployments
3. May need to disable and re-enable GitHub Pages
4. Alternative: Use Netlify or Vercel instead (drag & drop deploy)

## Data Structure (stored in localStorage + Firestore)
```javascript
{
    transactions: [{ id, type, amount, description, categoryId, date, notes }],
    budgets: [{ id, categoryId, amount }],
    recurring: [{ id, type, name, amount, categoryId, frequency, nextDate }],
    assets: [{ id, type, name, value, category, notes }],
    networthHistory: [{ date, assets, liabilities, networth }],
    categories: [{ id, name, color, type }],
    settings: { theme, currency }
}
```

## Key Code Locations
- **Auth handling**: `app.js` lines ~56-170 (setupAuth, handleAuth, signOut, etc.)
- **Firestore sync**: `app.js` lines ~170-230 (startFirestoreSync, syncToCloud)
- **Mobile nav setup**: `app.js` setupNavigation() function
- **Mobile CSS**: `styles.css` search for "Mobile Bottom Navigation"

## User's GitHub Username
dannyb2468

## Commands to Resume
```bash
cd "C:\Users\danie\FinanceTracker"
git status
git log --oneline -5
```

## To Test Locally
Just open index.html in a browser. For full functionality, use a local server:
```bash
cd "C:\Users\danie\FinanceTracker"
python -m http.server 8000
# Then open http://localhost:8000
```
