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
11. **Asset Contributions** - Add to retirement/investment accounts, auto-updates value + creates transaction
12. **Debt Payments** - Track principal vs interest, calculates payoff date, auto-reduces balance
13. **Expanded Account Types** - Bank (Checking, Savings), Retirement (401k, IRA, Roth, HSA), Investments (Brokerage, Crypto), Credit Cards, Loans
14. **Account Details** - Institution tracking, account numbers, employer match, contribution limits, YTD progress
15. **Withdrawal Tracking** - Track withdrawals from any account with reason codes
16. **Credit Utilization** - Visual progress bar showing credit card usage vs limit
17. **Transaction-Account Linking** - Transactions link to accounts for automatic balance updates
18. **Smart Transaction Types** - Four types with proper accounting logic:
    - Expense: Pay from bank (decreases) or credit card (increases debt)
    - Income: Deposit to bank accounts only
    - Transfer: Move between asset accounts (one down, one up)
    - Payment: Pay debt from bank (both accounts decrease)

## Deployment Note
GitHub Pages requires manually initializing the build/deploy workflow.
Go to Settings > Pages > Source: GitHub Actions, then run the workflow.

## Current Status
All features working. App deployed and accessible on desktop and mobile.

## Data Structure (stored in localStorage + Firestore)
```javascript
{
    transactions: [{ id, type, amount, description, categoryId, date, notes, fromAccountId?, toAccountId? }],
    budgets: [{ id, categoryId, amount }],
    recurring: [{ id, type, name, amount, categoryId, frequency, nextDate, linkedAssetId? }],
    assets: [{
        id, type, name, value, category, notes,
        institution?, accountLast4?,                    // For all accounts
        employerMatch?, contributionLimit?, ytdContribution?,  // For retirement
        interestRate?, minPayment?, originalAmount?, creditLimit?,  // For liabilities
        contributions: [{ id, amount, date }],         // For assets
        withdrawals: [{ id, amount, date, reason }],   // For assets
        payments: [{ id, amount, principal, interest, date, balanceAfter }]  // For liabilities
    }],
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
