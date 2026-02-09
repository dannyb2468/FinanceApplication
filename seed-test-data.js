/**
 * Test Data Seed Script for FinanceFlow
 *
 * Open the app in the browser, then paste this into the browser console (F12 → Console).
 * It creates realistic accounts, envelopes, income sources, transactions, and budgets.
 *
 * To reset: use Settings → Clear All Data in the app.
 */
(function seedTestData() {
    const saved = localStorage.getItem('financeflow_data');
    const data = saved ? JSON.parse(saved) : {};

    // Keep existing categories or use defaults
    if (!data.categories || data.categories.length === 0) {
        data.categories = [
            { id: 'salary', name: 'Salary', color: '#10b981', type: 'income' },
            { id: 'freelance', name: 'Freelance', color: '#059669', type: 'income' },
            { id: 'investments', name: 'Investment Returns', color: '#14b8a6', type: 'income' },
            { id: 'other-income', name: 'Other Income', color: '#0d9488', type: 'income' },
            { id: 'housing', name: 'Housing', color: '#6366f1', type: 'expense' },
            { id: 'utilities', name: 'Utilities', color: '#8b5cf6', type: 'expense' },
            { id: 'groceries', name: 'Groceries', color: '#a855f7', type: 'expense' },
            { id: 'transportation', name: 'Transportation', color: '#d946ef', type: 'expense' },
            { id: 'dining', name: 'Dining Out', color: '#ec4899', type: 'expense' },
            { id: 'entertainment', name: 'Entertainment', color: '#f43f5e', type: 'expense' },
            { id: 'shopping', name: 'Shopping', color: '#ef4444', type: 'expense' },
            { id: 'healthcare', name: 'Healthcare', color: '#f97316', type: 'expense' },
            { id: 'education', name: 'Education', color: '#f59e0b', type: 'expense' },
            { id: 'subscriptions', name: 'Subscriptions', color: '#eab308', type: 'expense' },
            { id: 'insurance', name: 'Insurance', color: '#84cc16', type: 'expense' },
            { id: 'personal', name: 'Personal Care', color: '#22c55e', type: 'expense' },
            { id: 'gifts', name: 'Gifts & Donations', color: '#3b82f6', type: 'expense' },
            { id: 'travel', name: 'Travel', color: '#0ea5e9', type: 'expense' },
            { id: 'other-expense', name: 'Other Expenses', color: '#64748b', type: 'expense' }
        ];
    }

    // ─── Accounts (Assets & Liabilities) ─────────────────────────

    data.assets = [
        {
            id: 'checking-1',
            type: 'asset',
            name: 'Primary Checking',
            value: 2847.63,
            category: 'checking',
            notes: 'Main spending account',
            institution: 'Chase',
            accountLast4: '4521',
            updatedAt: '2026-02-08T12:00:00.000Z',
            contributions: [],
            payments: [],
            withdrawals: []
        },
        {
            id: 'savings-1',
            type: 'asset',
            name: 'Emergency Fund',
            value: 8500.00,
            category: 'savings',
            notes: 'Emergency savings - 3 month target',
            institution: 'Ally Bank',
            accountLast4: '7890',
            updatedAt: '2026-02-08T12:00:00.000Z',
            contributions: [],
            payments: [],
            withdrawals: []
        },
        {
            id: 'checking-2',
            type: 'asset',
            name: 'Side Gig Account',
            value: 623.40,
            category: 'checking',
            notes: 'Separate account for gig income',
            institution: 'Chime',
            accountLast4: '3344',
            updatedAt: '2026-02-08T12:00:00.000Z',
            contributions: [],
            payments: [],
            withdrawals: []
        },
        {
            id: 'cc-chase',
            type: 'liability',
            name: 'Chase Freedom',
            value: 1245.80,
            category: 'credit-card',
            notes: 'Primary credit card - 2% cashback',
            institution: 'Chase',
            accountLast4: '9012',
            interestRate: 22.99,
            minPayment: 35.00,
            originalAmount: 1245.80,
            creditLimit: 8000.00,
            updatedAt: '2026-02-08T12:00:00.000Z',
            contributions: [],
            payments: [],
            withdrawals: []
        },
        {
            id: 'cc-discover',
            type: 'liability',
            name: 'Discover It',
            value: 387.20,
            category: 'credit-card',
            notes: 'Secondary card - rotating categories',
            institution: 'Discover',
            accountLast4: '5566',
            interestRate: 19.49,
            minPayment: 25.00,
            originalAmount: 387.20,
            creditLimit: 5000.00,
            updatedAt: '2026-02-08T12:00:00.000Z',
            contributions: [],
            payments: [],
            withdrawals: []
        },
        {
            id: 'auto-loan',
            type: 'liability',
            name: 'Auto Loan',
            value: 12400.00,
            category: 'auto-loan',
            notes: '2024 Honda Civic',
            institution: 'Capital One Auto',
            accountLast4: '2200',
            interestRate: 5.49,
            minPayment: 345.00,
            originalAmount: 22000.00,
            updatedAt: '2026-02-08T12:00:00.000Z',
            contributions: [],
            payments: [],
            withdrawals: []
        }
    ];

    // ─── Envelopes ───────────────────────────────────────────────

    data.envelopes = [
        {
            id: 'env-rent',
            name: 'Rent',
            linkedCategoryId: 'housing',
            linkedAccountId: null,
            targetAmount: 1200,
            targetFrequency: 'monthly',
            color: '#6366f1',
            accountBalances: { 'checking-1': 600 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-groceries',
            name: 'Groceries',
            linkedCategoryId: 'groceries',
            linkedAccountId: null,
            targetAmount: 400,
            targetFrequency: 'monthly',
            color: '#a855f7',
            accountBalances: { 'checking-1': 142.50 },
            ccPending: 67.30,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-gas',
            name: 'Gas & Car',
            linkedCategoryId: 'transportation',
            linkedAccountId: null,
            targetAmount: 200,
            targetFrequency: 'monthly',
            color: '#d946ef',
            accountBalances: { 'checking-1': 88.00 },
            ccPending: 45.20,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-car-insurance',
            name: 'Car Insurance',
            linkedCategoryId: 'insurance',
            linkedAccountId: null,
            targetAmount: 1100,
            targetFrequency: 'yearly',
            color: '#84cc16',
            accountBalances: { 'savings-1': 550 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-utilities',
            name: 'Utilities',
            linkedCategoryId: 'utilities',
            linkedAccountId: null,
            targetAmount: 250,
            targetFrequency: 'monthly',
            color: '#8b5cf6',
            accountBalances: { 'checking-1': 125.00 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-subscriptions',
            name: 'Subscriptions',
            linkedCategoryId: 'subscriptions',
            linkedAccountId: null,
            targetAmount: 65,
            targetFrequency: 'monthly',
            color: '#eab308',
            accountBalances: { 'checking-1': 30.00 },
            ccPending: 15.99,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-dining',
            name: 'Dining Out',
            linkedCategoryId: 'dining',
            linkedAccountId: null,
            targetAmount: 150,
            targetFrequency: 'monthly',
            color: '#ec4899',
            accountBalances: { 'checking-1': -22.40 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-auto-loan',
            name: 'Auto Loan Payment',
            linkedCategoryId: null,
            linkedAccountId: 'auto-loan',
            targetAmount: 345,
            targetFrequency: 'monthly',
            color: '#ef4444',
            accountBalances: { 'checking-1': 172.50 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-emergency',
            name: 'Emergency Fund',
            linkedCategoryId: null,
            linkedAccountId: 'savings-1',
            targetAmount: 200,
            targetFrequency: 'monthly',
            color: '#14b8a6',
            accountBalances: { 'checking-1': 100 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        },
        {
            id: 'env-cc-chase',
            name: 'Chase CC Payment',
            linkedCategoryId: null,
            linkedAccountId: 'cc-chase',
            targetAmount: 500,
            targetFrequency: 'monthly',
            color: '#3b82f6',
            accountBalances: { 'checking-1': 250 },
            ccPending: 0,
            createdAt: '2026-01-15T12:00:00.000Z'
        }
    ];

    // ─── Income Sources ──────────────────────────────────────────

    data.incomeSources = [
        {
            id: 'src-main',
            name: 'Main Job',
            defaultAccountId: 'checking-1',
            allocationTemplate: {
                'env-rent': 553.85,
                'env-groceries': 184.62,
                'env-gas': 92.31,
                'env-car-insurance': 42.31,
                'env-utilities': 115.38,
                'env-subscriptions': 30.00,
                'env-dining': 69.23,
                'env-auto-loan': 159.23,
                'env-emergency': 92.31,
                'env-cc-chase': 230.77
            },
            createdAt: '2026-01-10T12:00:00.000Z'
        },
        {
            id: 'src-uber',
            name: 'Uber',
            defaultAccountId: 'checking-2',
            allocationTemplate: {
                'env-groceries': 40.00,
                'env-gas': 30.00,
                'env-dining': 20.00
            },
            createdAt: '2026-01-10T12:00:00.000Z'
        },
        {
            id: 'src-spark',
            name: 'Walmart Spark',
            defaultAccountId: 'checking-2',
            allocationTemplate: {
                'env-groceries': 50.00,
                'env-gas': 25.00
            },
            createdAt: '2026-01-10T12:00:00.000Z'
        }
    ];

    // ─── Paycheck History ────────────────────────────────────────

    data.paycheckHistory = [
        {
            id: 'pay-001',
            incomeSourceId: 'src-main',
            incomeSourceName: 'Main Job',
            totalAmount: 1642.30,
            depositAccountId: 'checking-1',
            allocations: [
                { envelopeId: 'env-rent', amount: 553.85 },
                { envelopeId: 'env-groceries', amount: 184.62 },
                { envelopeId: 'env-gas', amount: 92.31 },
                { envelopeId: 'env-car-insurance', amount: 42.31 },
                { envelopeId: 'env-utilities', amount: 115.38 },
                { envelopeId: 'env-subscriptions', amount: 30.00 },
                { envelopeId: 'env-dining', amount: 69.23 },
                { envelopeId: 'env-auto-loan', amount: 159.23 },
                { envelopeId: 'env-emergency', amount: 92.31 },
                { envelopeId: 'env-cc-chase', amount: 230.77 }
            ],
            unallocated: 303.06,
            transactionId: 'txn-pay-001',
            date: '2026-01-24',
            createdAt: '2026-01-24T12:00:00.000Z'
        },
        {
            id: 'pay-002',
            incomeSourceId: 'src-uber',
            incomeSourceName: 'Uber',
            totalAmount: 185.40,
            depositAccountId: 'checking-2',
            allocations: [
                { envelopeId: 'env-groceries', amount: 40.00 },
                { envelopeId: 'env-gas', amount: 30.00 },
                { envelopeId: 'env-dining', amount: 20.00 }
            ],
            unallocated: 95.40,
            transactionId: 'txn-pay-002',
            date: '2026-01-28',
            createdAt: '2026-01-28T12:00:00.000Z'
        },
        {
            id: 'pay-003',
            incomeSourceId: 'src-main',
            incomeSourceName: 'Main Job',
            totalAmount: 1642.30,
            depositAccountId: 'checking-1',
            allocations: [
                { envelopeId: 'env-rent', amount: 553.85 },
                { envelopeId: 'env-groceries', amount: 184.62 },
                { envelopeId: 'env-gas', amount: 92.31 },
                { envelopeId: 'env-car-insurance', amount: 42.31 },
                { envelopeId: 'env-utilities', amount: 115.38 },
                { envelopeId: 'env-subscriptions', amount: 30.00 },
                { envelopeId: 'env-dining', amount: 69.23 },
                { envelopeId: 'env-auto-loan', amount: 159.23 },
                { envelopeId: 'env-emergency', amount: 92.31 },
                { envelopeId: 'env-cc-chase', amount: 230.77 }
            ],
            unallocated: 303.06,
            transactionId: 'txn-pay-003',
            date: '2026-02-07',
            createdAt: '2026-02-07T12:00:00.000Z'
        },
        {
            id: 'pay-004',
            incomeSourceId: 'src-spark',
            incomeSourceName: 'Walmart Spark',
            totalAmount: 122.00,
            depositAccountId: 'checking-2',
            allocations: [
                { envelopeId: 'env-groceries', amount: 50.00 },
                { envelopeId: 'env-gas', amount: 25.00 }
            ],
            unallocated: 47.00,
            transactionId: 'txn-pay-004',
            date: '2026-02-03',
            createdAt: '2026-02-03T12:00:00.000Z'
        }
    ];

    // ─── Transactions ────────────────────────────────────────────

    data.transactions = [
        // Paycheck income transactions
        { id: 'txn-pay-001', type: 'income', amount: 1642.30, description: 'Main Job paycheck', categoryId: 'salary', date: '2026-01-24', notes: 'Biweekly', fromAccountId: null, toAccountId: 'checking-1', createdAt: '2026-01-24T12:00:00.000Z' },
        { id: 'txn-pay-002', type: 'income', amount: 185.40, description: 'Uber earnings', categoryId: 'freelance', date: '2026-01-28', notes: 'Weekly payout', fromAccountId: null, toAccountId: 'checking-2', createdAt: '2026-01-28T12:00:00.000Z' },
        { id: 'txn-pay-003', type: 'income', amount: 1642.30, description: 'Main Job paycheck', categoryId: 'salary', date: '2026-02-07', notes: 'Biweekly', fromAccountId: null, toAccountId: 'checking-1', createdAt: '2026-02-07T12:00:00.000Z' },
        { id: 'txn-pay-004', type: 'income', amount: 122.00, description: 'Walmart Spark earnings', categoryId: 'freelance', date: '2026-02-03', notes: 'Weekly payout', fromAccountId: null, toAccountId: 'checking-2', createdAt: '2026-02-03T12:00:00.000Z' },

        // Rent (from bank → housing envelope)
        { id: 'txn-rent', type: 'expense', amount: 1200.00, description: 'February Rent', categoryId: 'housing', date: '2026-02-01', notes: '', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-02-01T12:00:00.000Z' },

        // Groceries - mix of bank and CC
        { id: 'txn-groc-1', type: 'expense', amount: 87.42, description: 'Walmart groceries', categoryId: 'groceries', date: '2026-01-26', notes: '', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-01-26T12:00:00.000Z' },
        { id: 'txn-groc-2', type: 'expense', amount: 67.30, description: 'Kroger groceries', categoryId: 'groceries', date: '2026-02-02', notes: 'Used Chase card', fromAccountId: 'cc-chase', toAccountId: null, createdAt: '2026-02-02T12:00:00.000Z' },
        { id: 'txn-groc-3', type: 'expense', amount: 34.18, description: 'Aldi run', categoryId: 'groceries', date: '2026-02-05', notes: '', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-02-05T12:00:00.000Z' },

        // Gas & transportation
        { id: 'txn-gas-1', type: 'expense', amount: 45.20, description: 'Shell gas station', categoryId: 'transportation', date: '2026-01-27', notes: '', fromAccountId: 'cc-chase', toAccountId: null, createdAt: '2026-01-27T12:00:00.000Z' },
        { id: 'txn-gas-2', type: 'expense', amount: 42.80, description: 'BP gas', categoryId: 'transportation', date: '2026-02-04', notes: '', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-02-04T12:00:00.000Z' },

        // Utilities (from bank)
        { id: 'txn-elec', type: 'expense', amount: 134.50, description: 'Electric bill', categoryId: 'utilities', date: '2026-02-01', notes: 'AEP Ohio', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-02-01T12:00:00.000Z' },
        { id: 'txn-water', type: 'expense', amount: 48.20, description: 'Water bill', categoryId: 'utilities', date: '2026-02-03', notes: '', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-02-03T12:00:00.000Z' },

        // Subscriptions (CC charges)
        { id: 'txn-netflix', type: 'expense', amount: 15.99, description: 'Netflix', categoryId: 'subscriptions', date: '2026-02-01', notes: '', fromAccountId: 'cc-chase', toAccountId: null, createdAt: '2026-02-01T12:00:00.000Z' },
        { id: 'txn-spotify', type: 'expense', amount: 11.99, description: 'Spotify', categoryId: 'subscriptions', date: '2026-02-01', notes: '', fromAccountId: 'cc-discover', toAccountId: null, createdAt: '2026-02-01T12:00:00.000Z' },

        // Dining out - overdrawn envelope!
        { id: 'txn-dine-1', type: 'expense', amount: 38.50, description: 'Chipotle', categoryId: 'dining', date: '2026-01-29', notes: '', fromAccountId: 'cc-chase', toAccountId: null, createdAt: '2026-01-29T12:00:00.000Z' },
        { id: 'txn-dine-2', type: 'expense', amount: 52.90, description: 'Pizza night', categoryId: 'dining', date: '2026-02-02', notes: 'Family dinner', fromAccountId: 'checking-1', toAccountId: null, createdAt: '2026-02-02T12:00:00.000Z' },

        // Shopping (no envelope linked)
        { id: 'txn-shop-1', type: 'expense', amount: 64.99, description: 'Amazon order', categoryId: 'shopping', date: '2026-02-01', notes: 'Household stuff', fromAccountId: 'cc-chase', toAccountId: null, createdAt: '2026-02-01T12:00:00.000Z' },

        // CC payment
        { id: 'txn-cc-pay', type: 'payment', amount: 500.00, description: 'Payment to Chase Freedom', categoryId: null, date: '2026-02-05', notes: 'Partial payment', fromAccountId: 'checking-1', toAccountId: 'cc-chase', linkedDebtId: 'cc-chase', createdAt: '2026-02-05T12:00:00.000Z' },

        // Auto loan payment
        { id: 'txn-auto-pay', type: 'payment', amount: 345.00, description: 'Payment to Auto Loan', categoryId: null, date: '2026-02-01', notes: 'Monthly auto pay', fromAccountId: 'checking-1', toAccountId: 'auto-loan', linkedDebtId: 'auto-loan', createdAt: '2026-02-01T12:00:00.000Z' },

        // Transfer to savings
        { id: 'txn-transfer-1', type: 'transfer', amount: 100.00, description: 'Emergency fund contribution', categoryId: null, date: '2026-02-07', notes: '', fromAccountId: 'checking-1', toAccountId: 'savings-1', createdAt: '2026-02-07T12:00:00.000Z' },
    ];

    // ─── Budgets ─────────────────────────────────────────────────

    data.budgets = [
        { id: 'bud-groceries', categoryId: 'groceries', amount: 400, createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'bud-dining', categoryId: 'dining', amount: 150, createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'bud-transport', categoryId: 'transportation', amount: 200, createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'bud-utils', categoryId: 'utilities', amount: 250, createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'bud-shopping', categoryId: 'shopping', amount: 100, createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'bud-subs', categoryId: 'subscriptions', amount: 65, createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'bud-entertainment', categoryId: 'entertainment', amount: 75, createdAt: '2026-01-01T12:00:00.000Z' },
    ];

    // ─── Recurring ───────────────────────────────────────────────

    data.recurring = [
        { id: 'rec-rent', type: 'expense', name: 'Rent', amount: 1200, categoryId: 'housing', frequency: 'monthly', nextDate: '2026-03-01', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-electric', type: 'expense', name: 'Electric Bill', amount: 135, categoryId: 'utilities', frequency: 'monthly', nextDate: '2026-03-01', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-water', type: 'expense', name: 'Water Bill', amount: 50, categoryId: 'utilities', frequency: 'monthly', nextDate: '2026-03-03', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-netflix', type: 'expense', name: 'Netflix', amount: 15.99, categoryId: 'subscriptions', frequency: 'monthly', nextDate: '2026-03-01', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-spotify', type: 'expense', name: 'Spotify', amount: 11.99, categoryId: 'subscriptions', frequency: 'monthly', nextDate: '2026-03-01', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-car-ins', type: 'expense', name: 'Car Insurance', amount: 1100, categoryId: 'insurance', frequency: 'yearly', nextDate: '2026-07-15', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-auto-loan', type: 'expense', name: 'Auto Loan Payment', amount: 345, categoryId: 'other-expense', frequency: 'monthly', nextDate: '2026-03-01', createdAt: '2026-01-01T12:00:00.000Z' },
        { id: 'rec-salary', type: 'income', name: 'Main Job Paycheck', amount: 1642.30, categoryId: 'salary', frequency: 'biweekly', nextDate: '2026-02-21', createdAt: '2026-01-01T12:00:00.000Z' },
    ];

    // ─── Net Worth History ───────────────────────────────────────

    data.networthHistory = [
        { date: '2026-01-01', assets: 10200, liabilities: 15500, networth: -5300 },
        { date: '2026-01-15', assets: 10800, liabilities: 15200, networth: -4400 },
        { date: '2026-01-24', assets: 11400, liabilities: 14900, networth: -3500 },
        { date: '2026-02-01', assets: 11200, liabilities: 14500, networth: -3300 },
        { date: '2026-02-07', assets: 11970, liabilities: 14033, networth: -2063 },
    ];

    // ─── Settings ────────────────────────────────────────────────

    data.settings = data.settings || { theme: 'light', currency: '$' };

    // ─── Save & Reload ──────────────────────────────────────────

    localStorage.setItem('financeflow_data', JSON.stringify(data));

    console.log('%c✓ Test data seeded successfully!', 'color: #10b981; font-size: 14px; font-weight: bold');
    console.log('  Accounts:', data.assets.length);
    console.log('  Envelopes:', data.envelopes.length);
    console.log('  Income Sources:', data.incomeSources.length);
    console.log('  Paychecks:', data.paycheckHistory.length);
    console.log('  Transactions:', data.transactions.length);
    console.log('  Budgets:', data.budgets.length);
    console.log('  Recurring:', data.recurring.length);
    console.log('%cReloading page...', 'color: #6366f1');

    location.reload();
})();
