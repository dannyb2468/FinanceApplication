/**
 * FinanceFlow v2.0 - Personal Finance Tracker
 */
class FinanceApp {
    constructor() {
        this.data = {
            transactions: [],
            recurring: [],
            assets: [],
            networthHistory: [],
            categories: [],
            envelopes: [],
            incomeSources: [],
            paycheckHistory: [],
            billReminders: [],
            debtPayoffPlan: {
                strategy: 'avalanche',
                extraPayment: 0,
                debtIds: [],
                createdAt: null,
                updatedAt: null
            },
            settings: { theme: 'light', currency: '$', onboardingComplete: false, userName: '', financialProfile: 'none', debtPayoffComplete: false }
        };
        this.charts = {};
        this.currentUser = null;
        this.authMode = 'signin';
        this.unsubscribeFirestore = null;
        this.isSyncing = false;
        this.transactionPage = 1;
        this.transactionsPerPage = 25;
        this.onboardingStep = 1;
        this.onboardingProfile = 'none';
        this.onboardDebts = [];
        this.onboardAccounts = [];
        this.onboardIncome = [];
        this.calendarYear = new Date().getFullYear();
        this.calendarMonth = new Date().getMonth();
        this.calendarSelectedDay = null;

        this.defaultCategories = [
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

        this.init();
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    todayLocal() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    parseDateLocal(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    formatDateLocal(dateStr) {
        const d = this.parseDateLocal(dateStr);
        return d.toLocaleDateString();
    }

    formatCurrency(amount) {
        const c = this.data.settings.currency;
        const prefix = amount < 0 ? '-' : '';
        return `${prefix}${c}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    formatAccountType(category) {
        const types = {
            'checking': 'Checking Account', 'savings': 'Savings Account', 'cash': 'Cash',
            'brokerage': 'Brokerage Account', 'crypto': 'Cryptocurrency',
            '401k': '401(k)', '403b': '403(b)', 'ira': 'Traditional IRA', 'roth-ira': 'Roth IRA',
            'pension': 'Pension', 'hsa': 'HSA', 'fsa': 'FSA', '529': '529 College Savings',
            'property': 'Property/Real Estate', 'vehicles': 'Vehicles', 'other-asset': 'Other Assets',
            'credit-card': 'Credit Card', 'auto-loan': 'Auto Loan', 'personal-loan': 'Personal Loan',
            'student-loan': 'Student Loan', 'mortgage': 'Mortgage', 'heloc': 'HELOC', 'other-debt': 'Other Debt'
        };
        return types[category] || category;
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init() {
        this.loadData();
        this.migrateData();
        this.initializeCategories();
        this.resetMonthlySpent();
        this.setupNavigation();
        this.setupTheme();
        this.setupEventListeners();
        this.updateDateDisplay();
        this.processRecurringTransactions();
        this.renderAll();
        this.setupAuth();

        document.getElementById('trans-date').value = this.todayLocal();
        document.getElementById('rec-next-date').value = this.todayLocal();

        if (!this.data.settings.onboardingComplete && this.data.transactions.length === 0 && this.data.assets.length === 0) {
            this.showOnboarding();
        }
    }

    loadData() {
        const saved = localStorage.getItem('financeflow_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
            } catch (e) { /* ignore corrupt data */ }
        }
    }

    migrateData() {
        // Always ensure new fields exist (even for v2 data)
        if (!this.data.settings) this.data.settings = {};
        if (!this.data.settings.financialProfile) this.data.settings.financialProfile = 'none';
        if (this.data.settings.debtPayoffComplete === undefined) this.data.settings.debtPayoffComplete = false;
        if (!this.data.debtPayoffPlan) {
            this.data.debtPayoffPlan = { strategy: 'avalanche', extraPayment: 0, debtIds: [], createdAt: null, updatedAt: null };
        }
        if (!this.data.billReminders) this.data.billReminders = [];

        if (this.data.version === 2) { this.saveDataLocal(); return; }

        // Migrate envelopes: accountBalances+ccPending → single balance
        (this.data.envelopes || []).forEach(env => {
            if (env.accountBalances !== undefined || env.ccPending !== undefined) {
                const acctTotal = Object.values(env.accountBalances || {}).reduce((s, v) => s + v, 0);
                env.balance = acctTotal - (env.ccPending || 0);
                delete env.accountBalances;
                delete env.ccPending;
            }
            if (env.balance === undefined) env.balance = 0;
            if (env.spent === undefined) env.spent = 0;
            if (!env.lastResetDate) env.lastResetDate = new Date().toISOString().split('T')[0];
        });

        // Migrate budgets → envelope targets
        if (this.data.budgets && this.data.budgets.length > 0) {
            this.data.budgets.forEach(budget => {
                const existing = (this.data.envelopes || []).find(e => e.linkedCategoryId === budget.categoryId);
                if (existing) {
                    if (!existing.targetAmount) existing.targetAmount = budget.amount;
                } else {
                    const cat = this.data.categories.find(c => c.id === budget.categoryId);
                    if (!this.data.envelopes) this.data.envelopes = [];
                    this.data.envelopes.push({
                        id: this.generateId(),
                        name: cat ? cat.name : 'Budget',
                        color: cat ? cat.color : '#6366f1',
                        balance: 0,
                        targetAmount: budget.amount,
                        targetFrequency: 'monthly',
                        linkedCategoryId: budget.categoryId,
                        linkedAccountId: null,
                        spent: 0,
                        lastResetDate: new Date().toISOString().split('T')[0],
                        createdAt: new Date().toISOString()
                    });
                }
            });
            delete this.data.budgets;
        }

        // Simplify income source templates
        (this.data.incomeSources || []).forEach(source => {
            if (source.allocationTemplate) {
                const newTemplate = {};
                for (const [key, val] of Object.entries(source.allocationTemplate)) {
                    newTemplate[key] = typeof val === 'object' ? val.amount : val;
                }
                source.allocationTemplate = newTemplate;
            }
        });

        // Expand settings
        if (!this.data.settings) this.data.settings = {};
        if (this.data.settings.onboardingComplete === undefined) this.data.settings.onboardingComplete = true;
        if (!this.data.settings.userName) this.data.settings.userName = '';
        if (!this.data.settings.financialProfile) this.data.settings.financialProfile = 'none';
        if (this.data.settings.debtPayoffComplete === undefined) this.data.settings.debtPayoffComplete = false;

        // Ensure debtPayoffPlan exists
        if (!this.data.debtPayoffPlan) {
            this.data.debtPayoffPlan = { strategy: 'avalanche', extraPayment: 0, debtIds: [], createdAt: null, updatedAt: null };
        }

        this.data.version = 2;
        this.saveDataLocal();
    }

    initializeCategories() {
        if (this.data.categories.length === 0) {
            this.data.categories = [...this.defaultCategories];
            this.saveData();
        }
    }

    resetMonthlySpent() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
        (this.data.envelopes || []).forEach(env => {
            if (env.lastResetDate) {
                const d = this.parseDateLocal(env.lastResetDate);
                const envMonth = `${d.getFullYear()}-${d.getMonth()}`;
                if (envMonth !== currentMonth) {
                    env.spent = 0;
                    env.lastResetDate = now.toISOString().split('T')[0];
                }
            }
        });
    }

    updateDateDisplay() {
        const el = document.querySelector('.date-display');
        if (el) el.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const greeting = document.getElementById('dashboard-greeting');
        if (greeting) {
            const hour = new Date().getHours();
            const timeGreet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
            const name = this.data.settings.userName;
            greeting.textContent = name ? `${timeGreet}, ${name}` : 'Dashboard';
        }
    }

    // ==========================================
    // DATA PERSISTENCE
    // ==========================================

    saveDataLocal() {
        localStorage.setItem('financeflow_data', JSON.stringify(this.data));
    }

    saveData() {
        this.saveDataLocal();
        if (this.currentUser) this.syncToCloud();
    }

    // ==========================================
    // FIREBASE AUTH & SYNC
    // ==========================================

    setupAuth() {
        const checkFirebase = setInterval(() => {
            if (window.firebaseAuth && window.firebaseFunctions) {
                clearInterval(checkFirebase);
                const { onAuthStateChanged } = window.firebaseFunctions;
                onAuthStateChanged(window.firebaseAuth, (user) => {
                    if (user) { this.currentUser = user; this.onUserSignedIn(user); }
                    else { this.currentUser = null; this.onUserSignedOut(); }
                });
            }
        }, 100);
    }

    onUserSignedIn(user) {
        document.getElementById('user-section').style.display = 'block';
        document.getElementById('sign-in-btn').style.display = 'none';
        document.getElementById('user-email').textContent = user.email;
        this.startFirestoreSync();
        this.showToast('Signed in as ' + user.email, 'success');
    }

    onUserSignedOut() {
        document.getElementById('user-section').style.display = 'none';
        document.getElementById('sign-in-btn').style.display = 'block';
        if (this.unsubscribeFirestore) { this.unsubscribeFirestore(); this.unsubscribeFirestore = null; }
    }

    async handleAuth(event) {
        event.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');
        try {
            errorEl.textContent = '';
            const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = window.firebaseFunctions;
            if (this.authMode === 'signin') await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            else await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            this.closeModal('auth-modal');
            document.getElementById('auth-form').reset();
        } catch (error) {
            const messages = {
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/email-already-in-use': 'Email already in use',
                'auth/weak-password': 'Password should be at least 6 characters',
                'auth/invalid-email': 'Invalid email address',
                'auth/invalid-credential': 'Invalid email or password'
            };
            errorEl.textContent = messages[error.code] || 'An error occurred';
        }
    }

    toggleAuthMode(event) {
        if (event) event.preventDefault();
        const isSignin = this.authMode === 'signin';
        this.authMode = isSignin ? 'signup' : 'signin';
        document.getElementById('auth-modal-title').textContent = isSignin ? 'Create Account' : 'Sign In';
        document.getElementById('auth-submit-btn').textContent = isSignin ? 'Sign Up' : 'Sign In';
        document.getElementById('auth-toggle-text').textContent = isSignin ? 'Already have an account?' : "Don't have an account?";
        document.getElementById('auth-toggle-link').textContent = isSignin ? 'Sign In' : 'Sign Up';
        document.getElementById('auth-error').textContent = '';
    }

    async signOut() {
        try {
            const { signOut } = window.firebaseFunctions;
            await signOut(window.firebaseAuth);
            this.showToast('Signed out', 'success');
        } catch (e) { this.showToast('Error signing out', 'error'); }
    }

    startFirestoreSync() {
        if (!this.currentUser) return;
        const { doc, onSnapshot } = window.firebaseFunctions;
        const userDocRef = doc(window.firebaseDb, 'users', this.currentUser.uid);
        this.updateSyncStatus('syncing');
        this.unsubscribeFirestore = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
                const cloudData = snap.data();
                if (cloudData.data) {
                    this.data = { ...this.data, ...cloudData.data };
                    this.migrateData();
                    this.saveDataLocal();
                    this.renderAll();
                }
            } else { this.syncToCloud(); }
            this.updateSyncStatus('synced');
        }, () => { this.updateSyncStatus('error'); });
    }

    async syncToCloud() {
        if (!this.currentUser || this.isSyncing) return;
        this.isSyncing = true;
        this.updateSyncStatus('syncing');
        try {
            const { doc, setDoc } = window.firebaseFunctions;
            await setDoc(doc(window.firebaseDb, 'users', this.currentUser.uid), {
                data: this.data, updatedAt: new Date().toISOString(), email: this.currentUser.email
            });
            this.updateSyncStatus('synced');
        } catch (e) { this.updateSyncStatus('error'); }
        finally { this.isSyncing = false; }
    }

    updateSyncStatus(status) {
        const el = document.getElementById('sync-status');
        if (!el) return;
        el.className = 'sync-status ' + status;
        const icons = { syncing: 'sync fa-spin', synced: 'cloud', error: 'exclamation-triangle' };
        const texts = { syncing: 'Syncing...', synced: 'Synced', error: 'Sync error' };
        el.innerHTML = `<i class="fas fa-${icons[status]}"></i><span>${texts[status]}</span>`;
    }

    // ==========================================
    // NAVIGATION
    // ==========================================

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => { this.navigateTo(item.dataset.page); this.closeSidebar(); });
        });
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', () => { this.navigateTo(item.dataset.page); });
        });
    }

    navigateTo(page) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
        document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `${page}-page`));
        this.renderPageContent(page);
    }

    renderPageContent(page) {
        const renderers = {
            dashboard: () => this.renderDashboard(),
            debt: () => this.renderDebtPayoff(),
            transactions: () => { this.renderTransactions(); this.renderRecurring(); },
            envelopes: () => this.renderEnvelopes(),
            accounts: () => this.renderAccounts(),
            calendar: () => this.renderCalendar(),
            reports: () => this.renderReports(),
            settings: () => this.renderSettings()
        };
        if (renderers[page]) renderers[page]();
    }

    updateNavVisibility() {
        const plan = this.data.debtPayoffPlan;
        const showDebt = this.data.settings.financialProfile === 'debt-payoff' ||
            (plan && plan.debtIds && plan.debtIds.length > 0 && !this.data.settings.debtPayoffComplete);

        const navDebt = document.getElementById('nav-debt');
        const mobileNavDebt = document.getElementById('mobile-nav-debt');
        const mobileNavEnvelopes = document.getElementById('mobile-nav-envelopes');

        if (navDebt) navDebt.style.display = showDebt ? '' : 'none';
        if (mobileNavDebt) mobileNavDebt.style.display = showDebt ? '' : 'none';
        // On mobile, if debt is shown, hide envelopes to keep nav manageable (still accessible from sidebar)
        if (mobileNavEnvelopes && showDebt) mobileNavEnvelopes.style.display = 'none';
        if (mobileNavEnvelopes && !showDebt) mobileNavEnvelopes.style.display = '';
    }

    toggleSidebar() { document.querySelector('.sidebar').classList.toggle('open'); }
    closeSidebar() { document.querySelector('.sidebar').classList.remove('open'); }

    // ==========================================
    // EVENT DELEGATION
    // ==========================================

    setupEventListeners() {
        // Global click delegation
        document.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) { e.preventDefault(); this.handleAction(actionEl.dataset.action, actionEl); return; }

            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) { this.switchTab(tabBtn); return; }

            const themeChoice = e.target.closest('.theme-choice');
            if (themeChoice) {
                document.querySelectorAll('.theme-choice').forEach(b => b.classList.remove('active'));
                themeChoice.classList.add('active');
                this.applyTheme(themeChoice.dataset.theme);
                return;
            }
        });

        // Form submissions
        const forms = {
            'transaction-form': (e) => this.saveTransaction(e),
            'recurring-form': (e) => this.saveRecurring(e),
            'asset-form': (e) => this.saveAsset(e),
            'account-action-form': (e) => this.saveAccountAction(e),
            'envelope-form': (e) => this.saveEnvelope(e),
            'paycheck-form': (e) => this.savePaycheck(e),
            'income-source-form': (e) => this.saveIncomeSource(e),
            'envelope-transfer-form': (e) => this.saveEnvelopeTransfer(e),
            'bill-reminder-form': (e) => this.saveBillReminder(e),
            'auth-form': (e) => this.handleAuth(e),
            'edit-debt-plan-form': (e) => this.saveEditDebtPlan(e)
        };
        for (const [id, handler] of Object.entries(forms)) {
            const form = document.getElementById(id);
            if (form) form.addEventListener('submit', handler);
        }

        // Radio/select change listeners
        document.querySelectorAll('input[name="trans-type"]').forEach(r => {
            r.addEventListener('change', () => { this.updateTransactionCategories(); this.updateTransactionAccountFields(); });
        });
        document.querySelectorAll('input[name="trans-contrib-type"]').forEach(r => {
            r.addEventListener('change', () => this.updateTransactionAccountFields());
        });
        document.querySelectorAll('input[name="rec-type"]').forEach(r => {
            r.addEventListener('change', () => this.updateRecurringCategories());
        });
        document.querySelectorAll('input[name="asset-type"]').forEach(r => {
            r.addEventListener('change', () => this.toggleAccountFields());
        });

        const acSel = document.getElementById('asset-category-select');
        if (acSel) acSel.addEventListener('change', () => this.toggleAccountFields());

        const transCat = document.getElementById('trans-category');
        if (transCat) transCat.addEventListener('change', () => this.suggestEnvelopeForCategory('trans-category', 'trans-envelope'));

        const quickCat = document.getElementById('quick-category');
        if (quickCat) quickCat.addEventListener('change', () => this.suggestEnvelopeForCategory('quick-category', 'quick-envelope'));

        const ps = document.getElementById('paycheck-source');
        if (ps) ps.addEventListener('change', () => this.onPaycheckSourceChange());

        const pa = document.getElementById('paycheck-amount');
        if (pa) pa.addEventListener('input', () => this.updatePaycheckUnallocated());

        const aa = document.getElementById('action-amount');
        if (aa) aa.addEventListener('input', () => { this.calculatePaymentSplit(); this.updatePaymentUnallocated(); });

        const actionEnvRows = document.getElementById('action-envelope-rows');
        if (actionEnvRows) actionEnvRows.addEventListener('input', () => this.updatePaymentUnallocated());

        const transToAcct = document.getElementById('trans-to-account');
        if (transToAcct) transToAcct.addEventListener('change', () => this.updateTransPaymentEnvelopes());

        const transAmount = document.getElementById('trans-amount');
        if (transAmount) transAmount.addEventListener('input', () => this.updateTransAllocUnallocated());

        const transAllocRows = document.getElementById('trans-envelope-alloc-rows');
        if (transAllocRows) transAllocRows.addEventListener('input', () => this.updateTransAllocUnallocated());

        document.querySelectorAll('input[name="contrib-type"]').forEach(r => {
            r.addEventListener('change', () => {
                const isPostTax = document.getElementById('contrib-posttax').checked;
                document.getElementById('action-account-group').style.display = isPostTax ? 'block' : 'none';
            });
        });

        // Filters
        ['filter-type', 'filter-category', 'filter-date-from', 'filter-date-to', 'filter-search'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(el.tagName === 'INPUT' && el.type === 'text' ? 'input' : 'change', () => this.filterTransactions());
        });

        // Settings
        const ts = document.getElementById('theme-select');
        if (ts) ts.addEventListener('change', () => this.setTheme(ts.value));

        const cs = document.getElementById('currency-select');
        if (cs) cs.addEventListener('change', () => this.setCurrency(cs.value));

        const sn = document.getElementById('settings-name');
        if (sn) sn.addEventListener('change', () => {
            this.data.settings.userName = sn.value.trim();
            this.saveData();
            this.updateDateDisplay();
        });

        const rp = document.getElementById('report-period');
        if (rp) rp.addEventListener('change', () => this.renderReports());

        const imp = document.getElementById('import-file');
        if (imp) imp.addEventListener('change', (e) => this.importData(e));

        // Paycheck allocation inputs (delegated)
        const allocContainer = document.getElementById('paycheck-allocations');
        if (allocContainer) allocContainer.addEventListener('input', () => this.updatePaycheckUnallocated());

        // Sidebar overlay
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.addEventListener('click', () => this.closeSidebar());

        // Strategy selection in onboarding
        document.querySelectorAll('input[name="onboard-strategy"]').forEach(r => {
            r.addEventListener('change', () => {
                document.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('active'));
                r.closest('.strategy-card').classList.add('active');
                this.renderOnboardDebtOrderPreview();
            });
        });
        const extraPayInput = document.getElementById('onboard-extra-payment');
        if (extraPayInput) extraPayInput.addEventListener('input', () => this.renderOnboardDebtOrderPreview());
    }

    handleAction(action, target) {
        const id = target.dataset.id;
        switch (action) {
            // Onboarding
            case 'skip': this.onboardingSkip(); break;
            case 'next': this.onboardingNext(); break;
            case 'finish': this.onboardingFinish(); break;
            case 'onboard-back': this.onboardingBack(); break;
            case 'select-profile': this.selectOnboardingProfile(target.dataset.profile); break;
            case 'add-account': this.addOnboardAccount(); break;
            case 'add-income': this.addOnboardIncome(); break;
            case 'add-debt': this.addOnboardDebt(); break;
            case 'remove-onboard-account': this.removeOnboardAccount(parseInt(target.dataset.index)); break;
            case 'remove-onboard-income': this.removeOnboardIncome(parseInt(target.dataset.index)); break;
            case 'remove-onboard-debt': this.removeOnboardDebt(parseInt(target.dataset.index)); break;

            // Navigation
            case 'toggle-sidebar': this.toggleSidebar(); break;
            case 'close-sidebar': this.closeSidebar(); break;

            // Auth
            case 'sign-out': this.signOut(); break;
            case 'open-auth': this.openModal('auth-modal'); break;
            case 'toggle-auth': this.toggleAuthMode(); break;

            // Quick actions
            case 'quick-paycheck': this.openModal('paycheck-modal'); break;
            case 'quick-transfer':
                document.getElementById('trans-transfer').checked = true;
                this.openModal('transaction-modal');
                break;
            case 'quick-payment':
                document.getElementById('trans-payment').checked = true;
                this.openModal('transaction-modal');
                break;
            case 'quick-transaction': this.openModal('transaction-modal'); break;
            case 'quick-add-save': this.quickAddTransaction(); break;

            // Modals
            case 'open-transaction': this.openModal('transaction-modal'); break;
            case 'open-recurring': this.openModal('recurring-modal'); break;
            case 'open-asset': this.openModal('asset-modal'); break;
            case 'open-envelope': this.openModal('envelope-modal'); break;
            case 'open-paycheck': this.openModal('paycheck-modal'); break;
            case 'open-income-source': this.openModal('income-source-modal'); break;
            case 'open-envelope-transfer': this.openModal('envelope-transfer-modal'); break;
            case 'close-modal': this.closeModal(target.dataset.modal || target.closest('[data-modal]')?.dataset.modal); break;

            // CRUD actions
            case 'edit-transaction': this.editTransaction(id); break;
            case 'delete-transaction': this.confirmAction('Delete Transaction', 'Are you sure you want to delete this transaction?', () => this.deleteTransaction(id)); break;
            case 'edit-recurring': this.editRecurring(id); break;
            case 'delete-recurring': this.confirmAction('Delete Recurring', 'Delete this recurring transaction?', () => this.deleteRecurring(id)); break;
            case 'edit-asset': this.editAsset(id); break;
            case 'delete-asset': this.confirmAction('Delete Account', 'Are you sure you want to delete this account?', () => this.deleteAsset(id)); break;
            case 'account-details': this.openAccountDetails(id); break;
            case 'account-contribute': this.openAccountAction(id, 'contribute'); break;
            case 'account-pay': this.openAccountAction(id, 'pay'); break;
            case 'account-withdraw': this.openAccountAction(id, 'withdraw'); break;
            case 'edit-envelope': this.editEnvelope(id); break;
            case 'delete-envelope': this.confirmAction('Delete Envelope', 'Delete this envelope? Allocated funds data will be lost.', () => this.deleteEnvelope(id)); break;
            case 'edit-income-source': this.editIncomeSource(id); break;
            case 'delete-income-source': this.confirmAction('Delete Income Source', 'Delete this income source?', () => this.deleteIncomeSource(id)); break;
            case 'delete-category': this.deleteCategory(id); break;

            // Calendar
            case 'calendar-prev-month': this.navigateCalendarMonth(-1); break;
            case 'calendar-next-month': this.navigateCalendarMonth(1); break;
            case 'calendar-today': this.navigateCalendarToday(); break;
            case 'calendar-select-day': this.selectCalendarDay(target.dataset.date); break;
            case 'calendar-jump-to-date': this.jumpCalendarToDate(target.dataset.date); break;

            // Bill Reminders
            case 'open-bill-reminder': this.openModal('bill-reminder-modal'); break;
            case 'edit-bill-reminder': this.editBillReminder(id); break;
            case 'delete-bill-reminder': this.confirmAction('Delete Due Date', 'Delete this due date reminder?', () => this.deleteBillReminder(id)); break;

            // Pagination
            case 'prev-page': this.goToTransactionPage(this.transactionPage - 1); break;
            case 'next-page': this.goToTransactionPage(this.transactionPage + 1); break;

            // Debt Payoff
            case 'open-edit-debt-plan': this.openEditDebtPlan(); break;
            case 'debt-make-payment': this.openAccountAction(id, 'pay'); break;
            case 'start-envelope-transition': this.startEnvelopeTransition(); break;

            // Settings
            case 'add-category': this.addCategory(); break;
            case 'rerun-onboarding': this.showOnboarding(); break;
            case 'clear-data': this.confirmAction('Clear All Data', 'Are you sure you want to delete all your financial data? This cannot be undone.', () => this.clearAllData()); break;
            case 'export-data': this.exportData(); break;
        }
    }

    switchTab(tabBtn) {
        const tabBar = tabBtn.closest('.tab-bar');
        const page = tabBtn.closest('.page');
        if (!tabBar || !page) return;
        const tabName = tabBtn.dataset.tab;
        tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === tabBtn));
        page.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === tabName));
    }

    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('active');
        this._previousFocus = document.activeElement;

        if (modalId === 'transaction-modal') { this.updateTransactionCategories(); this.updateTransactionAccountFields(); this.populateTransactionEnvelopeDropdown(); }
        else if (modalId === 'recurring-modal') this.updateRecurringCategories();
        else if (modalId === 'envelope-modal') this.populateEnvelopeLinkDropdowns();
        else if (modalId === 'paycheck-modal') this.populatePaycheckModal();
        else if (modalId === 'income-source-modal') this.populateIncomeSourceAccountDropdown();
        else if (modalId === 'envelope-transfer-modal') this.populateEnvelopeTransferDropdowns();
        else if (modalId === 'bill-reminder-modal') this.updateReminderAccountDropdown();

        setTimeout(() => {
            const focusable = modal.querySelectorAll('input:not([type="hidden"]):not([hidden]), select, textarea, button, [tabindex]:not([tabindex="-1"])');
            if (focusable.length) focusable[0].focus();
        }, 100);

        this._modalKeyHandler = (e) => {
            if (e.key === 'Escape') { this.closeModal(modalId); return; }
            if (e.key === 'Tab') {
                const focusable = Array.from(modal.querySelectorAll('input:not([type="hidden"]):not([hidden]), select, textarea, button, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
                if (!focusable.length) return;
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', this._modalKeyHandler);
    }

    closeModal(modalId) {
        if (!modalId) return;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
        if (this._modalKeyHandler) { document.removeEventListener('keydown', this._modalKeyHandler); this._modalKeyHandler = null; }
        if (this._previousFocus && typeof this._previousFocus.focus === 'function') { this._previousFocus.focus(); this._previousFocus = null; }

        const form = modal?.querySelector('form');
        if (form) form.reset();
        ['transaction-id', 'recurring-id', 'asset-id', 'envelope-id', 'income-source-id', 'bill-reminder-id'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (modalId === 'transaction-modal') {
            document.getElementById('trans-expense').checked = true;
            this.updateTransactionAccountFields();
        } else if (modalId === 'bill-reminder-modal') {
            document.getElementById('bill-reminder-modal-title').textContent = 'Add Due Date';
        }
    }

    confirmAction(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-action-btn').onclick = () => { this.closeModal('confirm-dialog'); callback(); };
        this.openModal('confirm-dialog');
    }

    // ==========================================
    // THEME
    // ==========================================

    setupTheme() {
        this.applyTheme(this.data.settings.theme);
        document.getElementById('theme-select').value = this.data.settings.theme;
        document.getElementById('currency-select').value = this.data.settings.currency;
    }

    setTheme(theme) {
        this.data.settings.theme = theme;
        this.applyTheme(theme);
        this.saveData();
    }

    applyTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    setCurrency(currency) {
        this.data.settings.currency = currency;
        this.saveData();
        this.renderAll();
    }

    // ==========================================
    // ONBOARDING
    // ==========================================

    getOnboardingSteps() {
        if (this.onboardingProfile === 'debt-payoff') {
            return ['1', '2', 'debt-3', 'debt-4', 'debt-5', 'debt-6'];
        } else if (this.onboardingProfile === 'envelope-ready') {
            return ['1', '2', 'env-3', 'env-4', 'env-5', 'env-6'];
        }
        return ['1', '2'];
    }

    getCurrentStepId() {
        const steps = this.getOnboardingSteps();
        return steps[this.onboardingStep - 1] || '1';
    }

    showOnboarding() {
        this.onboardingStep = 1;
        this.onboardingProfile = 'none';
        this.onboardDebts = [];
        this.onboardAccounts = [];
        this.onboardIncome = [];
        document.getElementById('onboarding-overlay').style.display = 'flex';
        this.updateOnboardingStep();
    }

    updateOnboardingStep() {
        const steps = this.getOnboardingSteps();
        const currentStepId = this.getCurrentStepId();

        // Render dynamic dots
        const progressEl = document.getElementById('onboarding-progress');
        progressEl.innerHTML = steps.map((s, i) =>
            `<span class="onboarding-dot${i < this.onboardingStep ? ' active' : ''}" data-step="${s}"></span>`
        ).join('');

        // Show the active step
        document.querySelectorAll('.onboarding-step').forEach(s => {
            s.classList.toggle('active', s.dataset.step === currentStepId);
        });
    }

    selectOnboardingProfile(profile) {
        this.onboardingProfile = profile;
        this.data.settings.financialProfile = profile;
        this.saveData();
        this.onboardingStep = 3;
        this.updateOnboardingStep();

        if (profile === 'debt-payoff') {
            this.renderOnboardDebtsList();
        }
    }

    onboardingNext() {
        const currentStepId = this.getCurrentStepId();

        // Save current step data
        if (currentStepId === '1') {
            const name = document.getElementById('onboard-name').value.trim();
            const activeTheme = document.querySelector('.theme-choice.active');
            if (name) this.data.settings.userName = name;
            if (activeTheme) { this.data.settings.theme = activeTheme.dataset.theme; this.applyTheme(activeTheme.dataset.theme); }
            this.saveData();
        } else if (currentStepId === 'debt-3') {
            if (this.onboardDebts.length === 0) { this.showToast('Add at least one debt', 'error'); return; }
        } else if (currentStepId === 'debt-4') {
            this.saveOnboardDebtStrategy();
            this.renderOnboardPlanReview();
        } else if (currentStepId === 'debt-5') {
            this.renderOnboardDebtSummary();
        } else if (currentStepId === 'env-4') {
            this.saveOnboardEnvelopes();
        } else if (currentStepId === 'env-5') {
            this.populateOnboardIncomeAccounts();
        }

        // Prepare next step
        const steps = this.getOnboardingSteps();
        const nextStepId = steps[this.onboardingStep];
        if (nextStepId === 'env-5') {
            this.populateOnboardIncomeAccounts();
        }
        if (nextStepId === 'env-6') {
            this.renderOnboardSummary();
        }
        if (nextStepId === 'debt-4') {
            this.renderOnboardDebtOrderPreview();
        }

        this.onboardingStep = Math.min(this.onboardingStep + 1, steps.length);
        this.updateOnboardingStep();
    }

    onboardingBack() {
        if (this.onboardingStep <= 1) return;
        const steps = this.getOnboardingSteps();
        const prevStepId = steps[this.onboardingStep - 2];

        // If going back to step 2 (profile selection), reset profile
        if (prevStepId === '2') {
            this.onboardingProfile = 'none';
        }

        this.onboardingStep = Math.max(this.onboardingStep - 1, 1);
        this.updateOnboardingStep();
    }

    onboardingSkip() {
        this.data.settings.onboardingComplete = true;
        if (this.data.settings.financialProfile === 'none') {
            this.data.settings.financialProfile = 'envelope-ready';
        }
        this.saveData();
        document.getElementById('onboarding-overlay').style.display = 'none';
        this.renderAll();
        this.updateDateDisplay();
    }

    onboardingFinish() {
        this.data.settings.onboardingComplete = true;
        this.saveData();
        document.getElementById('onboarding-overlay').style.display = 'none';
        this.renderAll();
        this.updateDateDisplay();
        if (this.onboardingProfile === 'debt-payoff') {
            this.showToast('Your debt payoff plan is ready!', 'success');
        } else {
            this.showToast('Welcome to FinanceFlow!', 'success');
        }
    }

    // Debt onboarding methods
    addOnboardDebt() {
        const type = document.getElementById('onboard-debt-type').value;
        const name = document.getElementById('onboard-debt-name').value.trim();
        const balance = parseFloat(document.getElementById('onboard-debt-balance').value) || 0;
        const rate = parseFloat(document.getElementById('onboard-debt-rate').value) || 0;
        const minPayment = parseFloat(document.getElementById('onboard-debt-min').value) || 0;
        if (!name) { this.showToast('Enter a debt name', 'error'); return; }
        if (balance <= 0) { this.showToast('Enter the balance owed', 'error'); return; }

        const debt = {
            id: this.generateId(), type: 'liability', name, value: balance,
            category: type, notes: '', interestRate: rate, minPayment: minPayment,
            originalAmount: balance, contributions: [], payments: [], withdrawals: [],
            updatedAt: new Date().toISOString()
        };
        this.data.assets.push(debt);
        this.onboardDebts.push(debt);
        this.saveData();

        document.getElementById('onboard-debt-name').value = '';
        document.getElementById('onboard-debt-balance').value = '';
        document.getElementById('onboard-debt-rate').value = '';
        document.getElementById('onboard-debt-min').value = '';
        this.renderOnboardDebtsList();
    }

    removeOnboardDebt(index) {
        if (index >= 0 && index < this.onboardDebts.length) {
            const removed = this.onboardDebts.splice(index, 1)[0];
            this.data.assets = this.data.assets.filter(a => a.id !== removed.id);
            this.saveData();
            this.renderOnboardDebtsList();
        }
    }

    renderOnboardDebtsList() {
        const container = document.getElementById('onboard-debts-list');
        container.innerHTML = this.onboardDebts.map((d, i) => `
            <div class="onboard-account-item">
                <span>${this.escapeHtml(d.name)}</span>
                <span>${this.formatCurrency(d.value)}</span>
                <span class="text-muted">${d.interestRate ? d.interestRate + '% APR' : 'No rate'}</span>
                <button class="btn-icon delete" data-action="remove-onboard-debt" data-index="${i}"><i class="fas fa-times"></i></button>
            </div>
        `).join('');

        // Show/hide details fields when there are debts
        const detailsEl = document.getElementById('onboard-debt-details');
        if (detailsEl) detailsEl.style.display = 'block';
    }

    sortDebtsByStrategy(debts, strategy) {
        const sorted = [...debts];
        if (strategy === 'snowball') {
            sorted.sort((a, b) => a.value - b.value);
        } else {
            sorted.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
        }
        return sorted;
    }

    saveOnboardDebtStrategy() {
        const strategy = document.querySelector('input[name="onboard-strategy"]:checked')?.value || 'avalanche';
        const extra = parseFloat(document.getElementById('onboard-extra-payment').value) || 0;

        // Use onboardDebts directly since debtIds isn't populated yet
        const ordered = this.sortDebtsByStrategy(this.onboardDebts, strategy);
        this.data.debtPayoffPlan.strategy = strategy;
        this.data.debtPayoffPlan.extraPayment = extra;
        this.data.debtPayoffPlan.debtIds = ordered.map(d => d.id);
        this.data.debtPayoffPlan.createdAt = new Date().toISOString();
        this.data.debtPayoffPlan.updatedAt = new Date().toISOString();
        this.saveData();
    }

    renderOnboardDebtOrderPreview() {
        const container = document.getElementById('onboard-debt-order-preview');
        if (!container || !this.onboardDebts.length) return;
        const strategy = document.querySelector('input[name="onboard-strategy"]:checked')?.value || 'avalanche';
        const ordered = this.sortDebtsByStrategy(this.onboardDebts, strategy);
        container.innerHTML = '<h4>Payoff order:</h4>' + ordered.map((d, i) => `
            <div class="onboard-debt-order-item">
                <span class="debt-order-num">${i + 1}</span>
                <span>${this.escapeHtml(d.name)}</span>
                <span>${this.formatCurrency(d.value)}</span>
                <span class="text-muted">${d.interestRate || 0}% APR</span>
            </div>
        `).join('');
    }

    renderOnboardPlanReview() {
        const container = document.getElementById('onboard-plan-review');
        if (!container) return;
        const debts = this.sortDebtsByStrategy(this.onboardDebts, this.data.debtPayoffPlan.strategy);
        const extra = this.data.debtPayoffPlan.extraPayment || 0;
        const projection = this.projectPayoff(debts, extra);
        const totalDebt = debts.reduce((s, d) => s + d.value, 0);
        const totalMinPayments = debts.reduce((s, d) => s + (d.minPayment || 0), 0);

        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + projection.months);
        const dateStr = payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        container.innerHTML = `
            <div class="plan-review-stats">
                <div class="plan-stat">
                    <div class="plan-stat-value">${this.formatCurrency(totalDebt)}</div>
                    <div class="plan-stat-label">Total Debt</div>
                </div>
                <div class="plan-stat">
                    <div class="plan-stat-value">${this.formatCurrency(totalMinPayments + extra)}</div>
                    <div class="plan-stat-label">Monthly Payment</div>
                </div>
                <div class="plan-stat">
                    <div class="plan-stat-value">${projection.months} months</div>
                    <div class="plan-stat-label">Time to Debt-Free</div>
                </div>
                <div class="plan-stat">
                    <div class="plan-stat-value">${dateStr}</div>
                    <div class="plan-stat-label">Projected Debt-Free</div>
                </div>
            </div>
            <div class="plan-review-interest">
                <i class="fas fa-info-circle"></i> Total interest you'll pay: <strong>${this.formatCurrency(projection.totalInterest)}</strong>
            </div>
            <h4>Payoff Order</h4>
            <div class="plan-review-debts">
                ${debts.map((d, i) => `
                    <div class="plan-review-debt-item">
                        <span class="debt-order-num">${i + 1}</span>
                        <div class="plan-review-debt-info">
                            <strong>${this.escapeHtml(d.name)}</strong>
                            <span class="text-muted">${this.formatCurrency(d.value)} at ${d.interestRate || 0}%</span>
                        </div>
                        ${i === 0 ? '<span class="focus-badge">FOCUS</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderOnboardDebtSummary() {
        const el = document.getElementById('onboard-debt-summary');
        if (!el) return;
        const debts = this.onboardDebts.length;
        const totalDebt = this.onboardDebts.reduce((s, d) => s + d.value, 0);
        const strategy = this.data.debtPayoffPlan.strategy;
        const strategyLabel = strategy === 'avalanche' ? 'Avalanche (highest interest first)' : 'Snowball (smallest balance first)';

        el.innerHTML = `
            <div class="onboard-summary-item"><i class="fas fa-file-invoice-dollar"></i> <strong>${debts}</strong> debt${debts !== 1 ? 's' : ''} totaling <strong>${this.formatCurrency(totalDebt)}</strong></div>
            <div class="onboard-summary-item"><i class="fas fa-chess-knight"></i> Strategy: <strong>${strategyLabel}</strong></div>
            <div class="onboard-summary-item"><i class="fas fa-plus-circle"></i> Extra payment: <strong>${this.formatCurrency(this.data.debtPayoffPlan.extraPayment)}/mo</strong></div>
            <div class="onboard-summary-item"><i class="fas fa-bullseye"></i> Your Debt Payoff dashboard is ready</div>
        `;
    }

    addOnboardAccount() {
        const type = document.getElementById('onboard-account-type').value;
        const name = document.getElementById('onboard-account-name').value.trim();
        const balance = parseFloat(document.getElementById('onboard-account-balance').value) || 0;
        if (!name) { this.showToast('Enter an account name', 'error'); return; }

        const typeMap = {
            'checking': { assetType: 'asset', category: 'checking' },
            'savings': { assetType: 'asset', category: 'savings' },
            'credit-card': { assetType: 'liability', category: 'credit-card' },
            'student-loan': { assetType: 'liability', category: 'student-loan' },
            'auto-loan': { assetType: 'liability', category: 'auto-loan' },
            'mortgage': { assetType: 'liability', category: 'mortgage' },
            'brokerage': { assetType: 'asset', category: 'brokerage' },
            '401k': { assetType: 'asset', category: '401k' }
        };
        const info = typeMap[type] || { assetType: 'asset', category: 'checking' };

        const asset = {
            id: this.generateId(), type: info.assetType, name, value: balance,
            category: info.category, notes: '', contributions: [], payments: [], withdrawals: [],
            updatedAt: new Date().toISOString()
        };
        this.data.assets.push(asset);
        this.onboardAccounts.push(asset);
        this.saveData();

        document.getElementById('onboard-account-name').value = '';
        document.getElementById('onboard-account-balance').value = '';
        this.renderOnboardAccountsList();
    }

    removeOnboardAccount(index) {
        if (index >= 0 && index < this.onboardAccounts.length) {
            const removed = this.onboardAccounts.splice(index, 1)[0];
            this.data.assets = this.data.assets.filter(a => a.id !== removed.id);
            this.saveData();
            this.renderOnboardAccountsList();
        }
    }

    renderOnboardAccountsList() {
        const container = document.getElementById('onboard-accounts-list');
        container.innerHTML = this.onboardAccounts.map((a, i) => `
            <div class="onboard-account-item">
                <span>${this.escapeHtml(a.name)}</span>
                <span>${this.formatCurrency(a.value)}</span>
                <span class="text-muted">${this.formatAccountType(a.category)}</span>
                <button class="btn-icon delete" data-action="remove-onboard-account" data-index="${i}"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    saveOnboardEnvelopes() {
        document.querySelectorAll('.onboard-envelope-item input[type="checkbox"]:checked').forEach(cb => {
            const name = cb.dataset.name;
            const targetInput = cb.closest('.onboard-envelope-item').querySelector('.onboard-env-target');
            const target = parseFloat(targetInput?.value) || 0;
            const color = cb.dataset.color || '#6366f1';
            const categoryId = cb.dataset.category || null;

            const exists = this.data.envelopes.some(e => e.name === name);
            if (!exists) {
                this.data.envelopes.push({
                    id: this.generateId(), name, color, balance: 0,
                    targetAmount: target, targetFrequency: 'monthly',
                    linkedCategoryId: categoryId || null, linkedAccountId: null,
                    spent: 0, lastResetDate: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString()
                });
            }
        });
        this.saveData();
    }

    addOnboardIncome() {
        const name = document.getElementById('onboard-income-name').value.trim();
        const accountId = document.getElementById('onboard-income-account').value || null;
        if (!name) { this.showToast('Enter an income source name', 'error'); return; }

        const source = {
            id: this.generateId(), name, defaultAccountId: accountId,
            allocationTemplate: {}, createdAt: new Date().toISOString()
        };
        this.data.incomeSources.push(source);
        this.onboardIncome.push(source);
        this.saveData();

        document.getElementById('onboard-income-name').value = '';
        this.renderOnboardIncomeList();
    }

    removeOnboardIncome(index) {
        if (index >= 0 && index < this.onboardIncome.length) {
            const removed = this.onboardIncome.splice(index, 1)[0];
            this.data.incomeSources = this.data.incomeSources.filter(s => s.id !== removed.id);
            this.saveData();
            this.renderOnboardIncomeList();
        }
    }

    renderOnboardIncomeList() {
        const container = document.getElementById('onboard-income-list');
        container.innerHTML = this.onboardIncome.map((s, i) => {
            const acct = s.defaultAccountId ? this.data.assets.find(a => a.id === s.defaultAccountId) : null;
            return `<div class="onboard-account-item">
                <span>${this.escapeHtml(s.name)}</span>
                <span class="text-muted">${acct ? this.escapeHtml(acct.name) : 'No default account'}</span>
                <button class="btn-icon delete" data-action="remove-onboard-income" data-index="${i}"><i class="fas fa-times"></i></button>
            </div>`;
        }).join('');
    }

    populateOnboardIncomeAccounts() {
        const select = document.getElementById('onboard-income-account');
        select.innerHTML = '<option value="">Deposit account...</option>';
        this.data.assets.filter(a => a.type === 'asset').forEach(a => {
            select.innerHTML += `<option value="${this.escapeHtml(a.id)}">${this.escapeHtml(a.name)}</option>`;
        });
    }

    renderOnboardSummary() {
        const el = document.getElementById('onboard-summary');
        const accounts = this.onboardAccounts.length;
        const envs = this.data.envelopes.length;
        const inc = this.onboardIncome.length;
        el.innerHTML = `
            <div class="onboard-summary-item"><i class="fas fa-university"></i> <strong>${accounts}</strong> account${accounts !== 1 ? 's' : ''} added</div>
            <div class="onboard-summary-item"><i class="fas fa-envelope-open-text"></i> <strong>${envs}</strong> envelope${envs !== 1 ? 's' : ''} created</div>
            <div class="onboard-summary-item"><i class="fas fa-briefcase"></i> <strong>${inc}</strong> income source${inc !== 1 ? 's' : ''} added</div>
        `;
    }

    // ==========================================
    // CATEGORIES
    // ==========================================

    populateCategorySelects() {
        const filterCat = document.getElementById('filter-category');
        if (filterCat) {
            filterCat.innerHTML = '<option value="all">All Categories</option>';
            this.data.categories.forEach(cat => {
                filterCat.innerHTML += `<option value="${this.escapeHtml(cat.id)}">${this.escapeHtml(cat.name)}</option>`;
            });
        }
        this.populateQuickAddCategories();
    }

    populateQuickAddCategories() {
        const sel = document.getElementById('quick-category');
        if (!sel) return;
        sel.innerHTML = '';
        this.data.categories.filter(c => c.type === 'expense').forEach(cat => {
            sel.innerHTML += `<option value="${this.escapeHtml(cat.id)}">${this.escapeHtml(cat.name)}</option>`;
        });
        this.populateQuickAddEnvelopes();
    }

    suggestEnvelopeForCategory(categorySelectId, envelopeSelectId) {
        const catSel = document.getElementById(categorySelectId);
        const envSel = document.getElementById(envelopeSelectId);
        if (!catSel || !envSel) return;
        const categoryId = catSel.value;
        const matches = this.data.envelopes.filter(e => e.linkedCategoryId === categoryId);
        if (matches.length === 1) envSel.value = matches[0].id;
    }

    populateTransactionEnvelopeDropdown() {
        const sel = document.getElementById('trans-envelope');
        if (!sel) return;
        sel.innerHTML = '<option value="">None</option>';
        this.data.envelopes.forEach(env => {
            sel.innerHTML += `<option value="${this.escapeHtml(env.id)}">${this.escapeHtml(env.name)}</option>`;
        });
    }

    populateQuickAddEnvelopes() {
        const sel = document.getElementById('quick-envelope');
        if (!sel) return;
        sel.innerHTML = '<option value="">No envelope</option>';
        this.data.envelopes.forEach(env => {
            sel.innerHTML += `<option value="${this.escapeHtml(env.id)}">${this.escapeHtml(env.name)}</option>`;
        });
    }

    updateTransactionCategories() {
        const type = document.querySelector('input[name="trans-type"]:checked')?.value || 'expense';
        const select = document.getElementById('trans-category');
        if (!select) return;
        select.innerHTML = '';
        const filterType = (type === 'transfer' || type === 'payment') ? 'expense' : type;
        this.data.categories.filter(c => c.type === filterType).forEach(cat => {
            select.innerHTML += `<option value="${this.escapeHtml(cat.id)}">${this.escapeHtml(cat.name)}</option>`;
        });
    }

    updateRecurringCategories() {
        const type = document.querySelector('input[name="rec-type"]:checked')?.value || 'expense';
        const select = document.getElementById('rec-category');
        if (!select) return;
        select.innerHTML = '';
        this.data.categories.filter(c => c.type === type).forEach(cat => {
            select.innerHTML += `<option value="${this.escapeHtml(cat.id)}">${this.escapeHtml(cat.name)}</option>`;
        });
    }

    getCategoryById(id) {
        return this.data.categories.find(c => c.id === id) || { name: 'Unknown', color: '#64748b' };
    }

    addCategory() {
        const name = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;
        const type = document.getElementById('new-category-type').value;
        if (!name) { this.showToast('Please enter a category name', 'error'); return; }
        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        this.data.categories.push({ id, name, color, type });
        this.saveData();
        document.getElementById('new-category-name').value = '';
        this.renderSettings();
        this.populateCategorySelects();
        this.showToast('Category added', 'success');
    }

    deleteCategory(id) {
        const inUse = this.data.transactions.some(t => t.categoryId === id) ||
                      this.data.recurring.some(r => r.categoryId === id) ||
                      this.data.envelopes.some(e => e.linkedCategoryId === id);
        if (inUse) { this.showToast('Cannot delete category that is in use', 'error'); return; }
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.saveData();
        this.renderSettings();
        this.populateCategorySelects();
        this.showToast('Category deleted', 'success');
    }

    // ==========================================
    // TRANSACTIONS
    // ==========================================

    saveTransaction(event) {
        event.preventDefault();
        const id = document.getElementById('transaction-id').value || this.generateId();
        const type = document.querySelector('input[name="trans-type"]:checked').value;
        const amount = parseFloat(document.getElementById('trans-amount').value);
        const description = document.getElementById('trans-description').value.trim();
        const categoryId = (type === 'transfer' || type === 'payment' || type === 'contribution') ? null : document.getElementById('trans-category').value;
        const date = document.getElementById('trans-date').value;
        const notes = document.getElementById('trans-notes').value;
        const isPreTax = type === 'contribution' && document.getElementById('trans-contrib-pretax')?.checked;
        const fromAccountId = isPreTax ? null : (document.getElementById('trans-from-account').value || null);
        const toAccountId = document.getElementById('trans-to-account').value || null;
        const envelopeId = document.getElementById('trans-envelope').value || null;
        const contribType = type === 'contribution' ? (isPreTax ? 'pretax' : 'posttax') : null;

        if (!amount || amount <= 0) { this.showToast('Amount must be greater than 0', 'error'); return; }
        if (!description) { this.showToast('Description cannot be empty', 'error'); return; }
        if (!date) { this.showToast('Date is required', 'error'); return; }

        const transaction = { id, type, amount, description, categoryId, date, notes, fromAccountId, toAccountId, envelopeId, contribType, createdAt: new Date().toISOString() };
        const existingIndex = this.data.transactions.findIndex(t => t.id === id);

        if (existingIndex > -1) {
            const old = this.data.transactions[existingIndex];
            this.reverseTransactionAccountEffect(old);
            this.reverseEnvelopeEffect(old);
        }

        this.applyTransactionAccountEffect(transaction);
        this.applyEnvelopeEffect(transaction);

        // Deduct from envelopes for CC payment allocations
        if (type === 'payment' && toAccountId) {
            const targetAsset = this.data.assets.find(a => a.id === toAccountId);
            if (targetAsset && targetAsset.category === 'credit-card') {
                this.data.envelopes.forEach(env => {
                    const input = document.getElementById(`trans-alloc-${env.id}`);
                    const alloc = input ? (parseFloat(input.value) || 0) : 0;
                    if (alloc > 0) {
                        env.balance -= alloc;
                        env.spent += alloc;
                    }
                });
            }
        }

        if (existingIndex > -1) {
            this.data.transactions[existingIndex] = transaction;
            this.showToast('Transaction updated', 'success');
        } else {
            this.data.transactions.push(transaction);
            this.showToast('Transaction added', 'success');
        }

        this.recordNetworthSnapshot();
        this.saveData();
        this.closeModal('transaction-modal');
        this.renderTransactions();
        this.renderDashboard();
        this.renderAccounts();
    }

    editTransaction(id) {
        const t = this.data.transactions.find(t => t.id === id);
        if (!t) return;
        document.getElementById('transaction-id').value = t.id;
        document.getElementById('transaction-modal-title').textContent = 'Edit Transaction';
        const typeRadio = document.getElementById(`trans-${t.type}`);
        if (typeRadio) typeRadio.checked = true;
        else document.getElementById('trans-expense').checked = true;
        this.updateTransactionCategories();
        this.updateTransactionAccountFields();
        document.getElementById('trans-amount').value = t.amount;
        document.getElementById('trans-description').value = t.description;
        if (t.categoryId) document.getElementById('trans-category').value = t.categoryId;
        document.getElementById('trans-date').value = t.date;
        document.getElementById('trans-notes').value = t.notes || '';
        setTimeout(() => {
            if (t.fromAccountId) document.getElementById('trans-from-account').value = t.fromAccountId;
            if (t.toAccountId) document.getElementById('trans-to-account').value = t.toAccountId;
            if (t.envelopeId) document.getElementById('trans-envelope').value = t.envelopeId;
            if (t.contribType === 'pretax') document.getElementById('trans-contrib-pretax').checked = true;
            else if (t.contribType === 'posttax') document.getElementById('trans-contrib-posttax').checked = true;
            if (t.type === 'payment') this.updateTransPaymentEnvelopes();
        }, 0);
        this.openModal('transaction-modal');
    }

    deleteTransaction(id) {
        const t = this.data.transactions.find(t => t.id === id);
        if (t) { this.reverseTransactionAccountEffect(t); this.reverseEnvelopeEffect(t); }
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        this.recordNetworthSnapshot();
        this.saveData();
        this.renderTransactions();
        this.renderDashboard();
        this.renderAccounts();
        this.showToast('Transaction deleted', 'success');
    }

    quickAddTransaction() {
        const amount = parseFloat(document.getElementById('quick-amount').value);
        const description = document.getElementById('quick-description').value.trim();
        const categoryId = document.getElementById('quick-category').value;
        const envelopeId = document.getElementById('quick-envelope').value || null;
        if (!amount || amount <= 0) { this.showToast('Enter an amount', 'error'); return; }
        if (!description) { this.showToast('Enter a description', 'error'); return; }
        const transaction = {
            id: this.generateId(), type: 'expense', amount, description, categoryId,
            date: new Date().toISOString().split('T')[0], notes: '', fromAccountId: null, toAccountId: null,
            envelopeId, createdAt: new Date().toISOString()
        };
        this.applyEnvelopeEffect(transaction);
        this.data.transactions.push(transaction);
        this.saveData();
        document.getElementById('quick-amount').value = '';
        document.getElementById('quick-description').value = '';
        this.renderTransactions();
        this.renderDashboard();
        this.showToast('Expense added', 'success');
    }

    filterTransactions() { this.transactionPage = 1; this.renderTransactions(); }

    getFilteredTransactions() {
        let txns = [...this.data.transactions];
        const type = document.getElementById('filter-type')?.value;
        const category = document.getElementById('filter-category')?.value;
        const dateFrom = document.getElementById('filter-date-from')?.value;
        const dateTo = document.getElementById('filter-date-to')?.value;
        const search = document.getElementById('filter-search')?.value?.toLowerCase();
        if (type && type !== 'all') txns = txns.filter(t => t.type === type);
        if (category && category !== 'all') txns = txns.filter(t => t.categoryId === category);
        if (dateFrom) txns = txns.filter(t => t.date >= dateFrom);
        if (dateTo) txns = txns.filter(t => t.date <= dateTo);
        if (search) txns = txns.filter(t => t.description.toLowerCase().includes(search) || this.getCategoryById(t.categoryId).name.toLowerCase().includes(search));
        return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    goToTransactionPage(page) {
        this.transactionPage = page;
        this.renderTransactions();
        document.getElementById('transactions-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ==========================================
    // TRANSACTION ACCOUNT EFFECTS
    // ==========================================

    applyTransactionAccountEffect(transaction) {
        const { type, amount, fromAccountId, toAccountId } = transaction;
        if (type === 'expense' && fromAccountId) {
            const account = this.data.assets.find(a => a.id === fromAccountId);
            if (account) {
                account.value += (account.type === 'asset') ? -amount : amount;
                account.updatedAt = new Date().toISOString();
            }
        } else if (type === 'income' && toAccountId) {
            const account = this.data.assets.find(a => a.id === toAccountId);
            if (account && account.type === 'asset') { account.value += amount; account.updatedAt = new Date().toISOString(); }
        } else if (type === 'transfer') {
            if (fromAccountId) { const a = this.data.assets.find(a => a.id === fromAccountId); if (a && a.type === 'asset') { a.value -= amount; a.updatedAt = new Date().toISOString(); } }
            if (toAccountId) { const a = this.data.assets.find(a => a.id === toAccountId); if (a && a.type === 'asset') { a.value += amount; a.updatedAt = new Date().toISOString(); } }
        } else if (type === 'payment') {
            if (fromAccountId) { const a = this.data.assets.find(a => a.id === fromAccountId); if (a && a.type === 'asset') { a.value -= amount; a.updatedAt = new Date().toISOString(); } }
            if (toAccountId) {
                const a = this.data.assets.find(a => a.id === toAccountId);
                if (a && a.type === 'liability') {
                    const isCreditCard = a.category === 'credit-card';
                    let principal, interest;
                    if (isCreditCard) { principal = amount; interest = 0; }
                    else { const monthlyRate = (a.interestRate || 0) / 100 / 12; const oldBalance = a.value; interest = oldBalance * monthlyRate; principal = Math.max(0, amount - interest); }
                    a.value = Math.max(0, a.value - principal);
                    a.updatedAt = new Date().toISOString();
                    if (!a.payments) a.payments = [];
                    a.payments.push({ id: transaction.id + '-payment', amount, principal, interest, date: transaction.date, balanceAfter: a.value, createdAt: new Date().toISOString() });
                }
            }
        } else if (type === 'contribution') {
            // Post-tax: deduct from source account
            if (fromAccountId) { const a = this.data.assets.find(a => a.id === fromAccountId); if (a && a.type === 'asset') { a.value -= amount; a.updatedAt = new Date().toISOString(); } }
            // Add to target retirement account
            if (toAccountId) {
                const a = this.data.assets.find(a => a.id === toAccountId);
                if (a && a.type === 'asset') {
                    a.value += amount; a.updatedAt = new Date().toISOString();
                    if (!a.contributions) a.contributions = [];
                    a.contributions.push({ id: transaction.id + '-contrib', amount, date: transaction.date, type: transaction.contribType || 'posttax', createdAt: new Date().toISOString() });
                    if (a.ytdContribution !== undefined) a.ytdContribution += amount;
                }
            }
        }
    }

    reverseTransactionAccountEffect(transaction) {
        const { type, amount, fromAccountId, toAccountId } = transaction;
        if (type === 'expense' && fromAccountId) {
            const a = this.data.assets.find(a => a.id === fromAccountId);
            if (a) { a.value += (a.type === 'asset') ? amount : -amount; if (a.type !== 'asset') a.value = Math.max(0, a.value); a.updatedAt = new Date().toISOString(); }
        } else if (type === 'income' && toAccountId) {
            const a = this.data.assets.find(a => a.id === toAccountId);
            if (a && a.type === 'asset') { a.value -= amount; a.updatedAt = new Date().toISOString(); }
        } else if (type === 'transfer') {
            if (fromAccountId) { const a = this.data.assets.find(a => a.id === fromAccountId); if (a && a.type === 'asset') { a.value += amount; a.updatedAt = new Date().toISOString(); } }
            if (toAccountId) { const a = this.data.assets.find(a => a.id === toAccountId); if (a && a.type === 'asset') { a.value -= amount; a.updatedAt = new Date().toISOString(); } }
        } else if (type === 'payment') {
            if (fromAccountId) { const a = this.data.assets.find(a => a.id === fromAccountId); if (a && a.type === 'asset') { a.value += amount; a.updatedAt = new Date().toISOString(); } }
            if (toAccountId) { const a = this.data.assets.find(a => a.id === toAccountId); if (a && a.type === 'liability') { a.value += amount; a.updatedAt = new Date().toISOString(); if (a.payments) a.payments = a.payments.filter(p => p.id !== transaction.id + '-payment'); } }
        } else if (type === 'contribution') {
            if (fromAccountId) { const a = this.data.assets.find(a => a.id === fromAccountId); if (a && a.type === 'asset') { a.value += amount; a.updatedAt = new Date().toISOString(); } }
            if (toAccountId) {
                const a = this.data.assets.find(a => a.id === toAccountId);
                if (a && a.type === 'asset') {
                    a.value -= amount; a.updatedAt = new Date().toISOString();
                    if (a.contributions) a.contributions = a.contributions.filter(c => c.id !== transaction.id + '-contrib');
                    if (a.ytdContribution !== undefined) a.ytdContribution = Math.max(0, a.ytdContribution - amount);
                }
            }
        }
    }

    updateTransactionAccountFields() {
        const type = document.querySelector('input[name="trans-type"]:checked')?.value || 'expense';
        const fromGroup = document.getElementById('trans-from-account-group');
        const toGroup = document.getElementById('trans-to-account-group');
        const categoryGroup = document.getElementById('trans-category-group');
        const envelopeGroup = document.getElementById('trans-envelope-group');
        const envelopeAllocEl = document.getElementById('trans-envelope-alloc');
        const contribTypeGroup = document.getElementById('trans-contrib-type-group');
        const fromLabel = fromGroup?.querySelector('label');
        const toLabel = toGroup?.querySelector('label');
        if (!fromGroup) return;
        this.populateAccountDropdowns(type);
        if (contribTypeGroup) contribTypeGroup.style.display = 'none';
        if (envelopeAllocEl) envelopeAllocEl.style.display = 'none';
        if (type === 'expense') {
            fromGroup.style.display = 'block'; toGroup.style.display = 'none'; categoryGroup.style.display = 'block';
            if (envelopeGroup) envelopeGroup.style.display = 'block';
            fromLabel.textContent = 'Pay From'; document.getElementById('trans-category').required = true;
        } else if (type === 'income') {
            fromGroup.style.display = 'none'; toGroup.style.display = 'block'; categoryGroup.style.display = 'block';
            if (envelopeGroup) envelopeGroup.style.display = 'none';
            toLabel.textContent = 'Deposit To'; document.getElementById('trans-category').required = true;
        } else if (type === 'transfer') {
            fromGroup.style.display = 'block'; toGroup.style.display = 'block'; categoryGroup.style.display = 'none';
            if (envelopeGroup) envelopeGroup.style.display = 'block';
            fromLabel.textContent = 'From Account'; toLabel.textContent = 'To Account'; document.getElementById('trans-category').required = false;
        } else if (type === 'payment') {
            fromGroup.style.display = 'block'; toGroup.style.display = 'block'; categoryGroup.style.display = 'none';
            if (envelopeGroup) envelopeGroup.style.display = 'none';
            fromLabel.textContent = 'Pay From'; toLabel.textContent = 'Pay To (Debt)'; document.getElementById('trans-category').required = false;
            this.updateTransPaymentEnvelopes();
        } else if (type === 'contribution') {
            const isPreTax = document.getElementById('trans-contrib-pretax')?.checked;
            fromGroup.style.display = isPreTax ? 'none' : 'block'; toGroup.style.display = 'block'; categoryGroup.style.display = 'none';
            if (envelopeGroup) envelopeGroup.style.display = 'none';
            if (contribTypeGroup) contribTypeGroup.style.display = 'block';
            fromLabel.textContent = 'Transfer From'; toLabel.textContent = 'To Account'; document.getElementById('trans-category').required = false;
        }
    }

    populateAccountDropdowns(transactionType) {
        const fromSelect = document.getElementById('trans-from-account');
        const toSelect = document.getElementById('trans-to-account');
        if (!fromSelect) return;
        const assets = this.data.assets.filter(a => a.type === 'asset');
        const liabilities = this.data.assets.filter(a => a.type === 'liability');
        let assetsHtml = '', liabilitiesHtml = '';
        if (assets.length) {
            assetsHtml = '<optgroup label="Bank & Investment Accounts">';
            assets.forEach(a => { const dn = a.institution ? `${this.escapeHtml(a.name)} (${this.escapeHtml(a.institution)})` : this.escapeHtml(a.name); assetsHtml += `<option value="${this.escapeHtml(a.id)}">${dn}</option>`; });
            assetsHtml += '</optgroup>';
        }
        if (liabilities.length) {
            liabilitiesHtml = '<optgroup label="Credit Cards & Loans">';
            liabilities.forEach(a => { const dn = a.institution ? `${this.escapeHtml(a.name)} (${this.escapeHtml(a.institution)})` : this.escapeHtml(a.name); liabilitiesHtml += `<option value="${this.escapeHtml(a.id)}">${dn}</option>`; });
            liabilitiesHtml += '</optgroup>';
        }
        if (transactionType === 'expense') { fromSelect.innerHTML = '<option value="">Cash</option>' + assetsHtml + liabilitiesHtml; }
        else if (transactionType === 'income') { toSelect.innerHTML = '<option value="">External</option>' + assetsHtml; }
        else if (transactionType === 'transfer') { fromSelect.innerHTML = '<option value="">Select account</option>' + assetsHtml; toSelect.innerHTML = '<option value="">Select account</option>' + assetsHtml; }
        else if (transactionType === 'payment') { fromSelect.innerHTML = '<option value="">Select account</option>' + assetsHtml; toSelect.innerHTML = '<option value="">Select debt</option>' + liabilitiesHtml; }
        else if (transactionType === 'contribution') {
            const retTypes = ['401k', '403b', 'ira', 'roth-ira', 'pension', 'hsa', '529'];
            const retirementAccounts = this.data.assets.filter(a => a.type === 'asset' && retTypes.includes(a.category));
            let retHtml = '';
            if (retirementAccounts.length) {
                retHtml = '<optgroup label="Retirement & Tax-Advantaged">';
                retirementAccounts.forEach(a => { const dn = a.institution ? `${this.escapeHtml(a.name)} (${this.escapeHtml(a.institution)})` : this.escapeHtml(a.name); retHtml += `<option value="${this.escapeHtml(a.id)}">${dn}</option>`; });
                retHtml += '</optgroup>';
            }
            fromSelect.innerHTML = '<option value="">Select account</option>' + assetsHtml;
            toSelect.innerHTML = '<option value="">Select account</option>' + retHtml;
        }
        else { fromSelect.innerHTML = '<option value="">Cash / External</option>' + assetsHtml + liabilitiesHtml; toSelect.innerHTML = '<option value="">External</option>' + assetsHtml + liabilitiesHtml; }
    }

    // ==========================================
    // ENVELOPE EFFECTS
    // ==========================================

    findEnvelopeForTransaction(transaction) {
        if (transaction.envelopeId) return this.data.envelopes.find(e => e.id === transaction.envelopeId) || null;
        return null;
    }

    applyEnvelopeEffect(transaction) {
        if (!this.data.envelopes?.length) return;
        const env = this.findEnvelopeForTransaction(transaction);
        if (!env) return;
        env.balance -= transaction.amount;
        env.spent += transaction.amount;
        if (env.balance < -0.005) this.showToast(`${env.name} envelope is overdrawn by ${this.formatCurrency(Math.abs(env.balance))}`, 'warning');
    }

    reverseEnvelopeEffect(transaction) {
        if (!this.data.envelopes?.length) return;
        const env = this.findEnvelopeForTransaction(transaction);
        if (!env) return;
        env.balance += transaction.amount;
        env.spent = Math.max(0, env.spent - transaction.amount);
    }

    // ==========================================
    // RECURRING
    // ==========================================

    saveRecurring(event) {
        event.preventDefault();
        const id = document.getElementById('recurring-id').value || this.generateId();
        const type = document.querySelector('input[name="rec-type"]:checked').value;
        const name = document.getElementById('rec-name').value.trim();
        const amount = parseFloat(document.getElementById('rec-amount').value);
        const categoryId = document.getElementById('rec-category').value;
        const frequency = document.getElementById('rec-frequency').value;
        const nextDate = document.getElementById('rec-next-date').value;
        if (!amount || amount <= 0) { this.showToast('Amount must be greater than 0', 'error'); return; }
        if (!name) { this.showToast('Name cannot be empty', 'error'); return; }
        const recurring = { id, type, name, amount, categoryId, frequency, nextDate, createdAt: new Date().toISOString() };
        const idx = this.data.recurring.findIndex(r => r.id === id);
        if (idx > -1) { this.data.recurring[idx] = recurring; this.showToast('Recurring transaction updated', 'success'); }
        else { this.data.recurring.push(recurring); this.showToast('Recurring transaction added', 'success'); }
        this.saveData();
        this.closeModal('recurring-modal');
        this.renderRecurring();
        this.renderDashboard();
    }

    editRecurring(id) {
        const r = this.data.recurring.find(r => r.id === id);
        if (!r) return;
        document.getElementById('recurring-id').value = r.id;
        document.getElementById('recurring-modal-title').textContent = 'Edit Recurring Transaction';
        document.getElementById(`rec-${r.type}`).checked = true;
        this.updateRecurringCategories();
        document.getElementById('rec-name').value = r.name;
        document.getElementById('rec-amount').value = r.amount;
        document.getElementById('rec-category').value = r.categoryId;
        document.getElementById('rec-frequency').value = r.frequency;
        document.getElementById('rec-next-date').value = r.nextDate;
        this.openModal('recurring-modal');
    }

    deleteRecurring(id) {
        this.data.recurring = this.data.recurring.filter(r => r.id !== id);
        this.saveData();
        this.renderRecurring();
        this.renderDashboard();
        this.showToast('Recurring transaction deleted', 'success');
    }

    processRecurringTransactions() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        this.data.recurring.forEach(rec => {
            let nextDate = this.parseDateLocal(rec.nextDate);
            while (nextDate <= today) {
                const transaction = {
                    id: this.generateId(), type: rec.type, amount: rec.amount,
                    description: rec.name + ' (Recurring)', categoryId: rec.categoryId,
                    date: nextDate.toISOString().split('T')[0], notes: 'Auto-generated from recurring transaction',
                    fromAccountId: null, toAccountId: null, createdAt: new Date().toISOString()
                };
                this.data.transactions.push(transaction);
                nextDate = this.getNextRecurringDate(nextDate, rec.frequency);
            }
            rec.nextDate = nextDate.toISOString().split('T')[0];
        });
        this.saveData();
    }

    getNextRecurringDate(date, frequency) {
        const next = new Date(date);
        switch (frequency) {
            case 'weekly': next.setDate(next.getDate() + 7); break;
            case 'biweekly': next.setDate(next.getDate() + 14); break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
            case 'quarterly': next.setMonth(next.getMonth() + 3); break;
            case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
        }
        return next;
    }

    getMonthlyEquivalent(amount, frequency) {
        const factors = { weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 1/3, yearly: 1/12 };
        return amount * (factors[frequency] || 1);
    }

    // ==========================================
    // ACCOUNTS / ASSETS
    // ==========================================

    saveAsset(event) {
        event.preventDefault();
        const id = document.getElementById('asset-id').value || this.generateId();
        const type = document.querySelector('input[name="asset-type"]:checked').value;
        const name = document.getElementById('asset-name').value.trim();
        const value = parseFloat(document.getElementById('asset-value').value);
        const category = document.getElementById('asset-category-select').value;
        const notes = document.getElementById('asset-notes').value;
        if (!name) { this.showToast('Name cannot be empty', 'error'); return; }
        if (isNaN(value) || value < 0) { this.showToast('Value must be 0 or greater', 'error'); return; }

        const asset = { id, type, name, value, category, notes, updatedAt: new Date().toISOString() };
        const institution = document.getElementById('asset-institution').value.trim();
        const last4 = document.getElementById('asset-account-last4').value.trim();
        if (institution) asset.institution = institution;
        if (last4) asset.accountLast4 = last4;

        const retTypes = ['401k', '403b', 'ira', 'roth-ira', 'pension', 'hsa', '529'];
        if (retTypes.includes(category)) {
            const em = parseFloat(document.getElementById('asset-employer-match').value) || 0;
            const cl = parseFloat(document.getElementById('asset-contribution-limit').value) || 0;
            const ytd = parseFloat(document.getElementById('asset-ytd-contribution').value) || 0;
            if (em > 0) asset.employerMatch = em;
            if (cl > 0) asset.contributionLimit = cl;
            asset.ytdContribution = ytd;
        }

        if (type === 'liability') {
            asset.interestRate = parseFloat(document.getElementById('asset-rate').value) || 0;
            asset.minPayment = parseFloat(document.getElementById('asset-min-payment').value) || 0;
            asset.originalAmount = parseFloat(document.getElementById('asset-original').value) || value;
            if (category === 'credit-card') { const cl = parseFloat(document.getElementById('asset-credit-limit').value) || 0; if (cl > 0) asset.creditLimit = cl; }
        }

        const idx = this.data.assets.findIndex(a => a.id === id);
        if (idx > -1) {
            asset.contributions = this.data.assets[idx].contributions || [];
            asset.payments = this.data.assets[idx].payments || [];
            asset.withdrawals = this.data.assets[idx].withdrawals || [];
            this.data.assets[idx] = asset;
            this.showToast('Updated successfully', 'success');
        } else {
            asset.contributions = []; asset.payments = []; asset.withdrawals = [];
            this.data.assets.push(asset);
            this.showToast('Added successfully', 'success');
        }
        this.recordNetworthSnapshot();
        this.saveData();
        this.closeModal('asset-modal');
        this.renderAccounts();
        this.renderDashboard();
    }

    editAsset(id) {
        const a = this.data.assets.find(a => a.id === id);
        if (!a) return;
        document.getElementById('asset-id').value = a.id;
        document.getElementById('asset-modal-title').textContent = 'Edit ' + (a.type === 'asset' ? 'Asset' : 'Liability');
        document.getElementById(`asset-${a.type}`).checked = true;
        document.getElementById('asset-name').value = a.name;
        document.getElementById('asset-value').value = a.value;
        document.getElementById('asset-category-select').value = a.category;
        document.getElementById('asset-notes').value = a.notes || '';
        document.getElementById('asset-institution').value = a.institution || '';
        document.getElementById('asset-account-last4').value = a.accountLast4 || '';
        document.getElementById('asset-employer-match').value = a.employerMatch || '';
        document.getElementById('asset-contribution-limit').value = a.contributionLimit || '';
        document.getElementById('asset-ytd-contribution').value = a.ytdContribution || '';
        if (a.type === 'liability') {
            document.getElementById('asset-rate').value = a.interestRate || '';
            document.getElementById('asset-min-payment').value = a.minPayment || '';
            document.getElementById('asset-original').value = a.originalAmount || '';
            document.getElementById('asset-credit-limit').value = a.creditLimit || '';
        }
        this.toggleAccountFields();
        this.openModal('asset-modal');
    }

    deleteAsset(id) {
        this.data.assets = this.data.assets.filter(a => a.id !== id);
        this.recordNetworthSnapshot();
        this.saveData();
        this.renderAccounts();
        this.renderDashboard();
        this.showToast('Deleted successfully', 'success');
    }

    toggleAccountFields() {
        const category = document.getElementById('asset-category-select').value;
        const isLiability = document.getElementById('asset-liability').checked;
        document.getElementById('account-fields').style.display = ['checking','savings','brokerage','401k','403b','ira','roth-ira','hsa','pension','crypto','529','fsa'].includes(category) ? 'block' : 'none';
        document.getElementById('retirement-fields').style.display = ['401k','403b','ira','roth-ira','pension','hsa','529'].includes(category) ? 'block' : 'none';
        document.getElementById('debt-fields').style.display = isLiability ? 'block' : 'none';
        const clg = document.getElementById('credit-limit-group');
        if (clg) clg.style.display = (isLiability && category === 'credit-card') ? 'block' : 'none';
    }

    recordNetworthSnapshot() {
        const totalAssets = this.data.assets.filter(a => a.type === 'asset').reduce((s, a) => s + a.value, 0);
        const totalLiabilities = this.data.assets.filter(a => a.type === 'liability').reduce((s, a) => s + a.value, 0);
        const today = new Date().toISOString().split('T')[0];
        this.data.networthHistory = this.data.networthHistory.filter(h => h.date !== today);
        this.data.networthHistory.push({ date: today, assets: totalAssets, liabilities: totalLiabilities, networth: totalAssets - totalLiabilities });
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        this.data.networthHistory = this.data.networthHistory.filter(h => new Date(h.date) >= oneYearAgo);
    }

    calculatePayoffDate(debt) {
        if (!debt.interestRate || !debt.minPayment || debt.minPayment <= 0) return null;
        let balance = debt.value;
        const monthlyRate = debt.interestRate / 100 / 12;
        let months = 0;
        while (balance > 0 && months < 360) {
            const interest = balance * monthlyRate;
            const principal = debt.minPayment - interest;
            if (principal <= 0) return null;
            balance -= principal;
            months++;
        }
        if (months >= 360) return null;
        const d = new Date(); d.setMonth(d.getMonth() + months);
        return d;
    }

    // ==========================================
    // DEBT PAYOFF ENGINE
    // ==========================================

    getPayoffOrder() {
        const plan = this.data.debtPayoffPlan;
        const debts = this.data.assets.filter(a => a.type === 'liability' && plan.debtIds.includes(a.id));

        if (plan.strategy === 'snowball') {
            debts.sort((a, b) => a.value - b.value);
        } else {
            debts.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
        }
        return debts;
    }

    projectPayoff(debts, extraPayment) {
        if (!debts.length) return { months: 0, totalInterest: 0, totalPaid: 0, timeline: [] };

        // Clone balances so we don't mutate actual data
        const balances = {};
        const rates = {};
        const minimums = {};
        debts.forEach(d => {
            balances[d.id] = d.value;
            rates[d.id] = (d.interestRate || 0) / 100 / 12;
            minimums[d.id] = d.minPayment || 0;
        });

        let months = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        const timeline = [];
        let freedAmount = 0;

        while (months < 360) {
            const activeIds = debts.filter(d => balances[d.id] > 0.01).map(d => d.id);
            if (activeIds.length === 0) break;

            months++;
            const monthBalances = {};

            // Pay minimum on all active debts
            for (const id of activeIds) {
                const interest = balances[id] * rates[id];
                totalInterest += interest;
                balances[id] += interest;

                const minPay = Math.min(minimums[id], balances[id]);
                balances[id] -= minPay;
                totalPaid += minPay;
            }

            // Apply extra + freed minimums to active debts in order (cascade leftover)
            let remainingExtra = extraPayment + freedAmount;
            for (const id of activeIds) {
                if (remainingExtra <= 0 || balances[id] <= 0) break;
                const applied = Math.min(remainingExtra, balances[id]);
                balances[id] -= applied;
                totalPaid += applied;
                remainingExtra -= applied;
            }

            // Check if any debts just got paid off — free their minimums
            for (const id of activeIds) {
                if (balances[id] <= 0.01) {
                    balances[id] = 0;
                    freedAmount += minimums[id];
                }
            }

            // Record timeline snapshot every month
            debts.forEach(d => { monthBalances[d.id] = Math.max(0, balances[d.id]); });
            timeline.push({ month: months, balances: { ...monthBalances } });
        }

        return { months, totalInterest, totalPaid, timeline };
    }

    recalculatePayoffPlan() {
        const plan = this.data.debtPayoffPlan;
        if (!plan.debtIds.length) return;

        // Re-sort based on current strategy and balances
        const debts = this.data.assets.filter(a => a.type === 'liability' && plan.debtIds.includes(a.id));
        if (plan.strategy === 'snowball') {
            debts.sort((a, b) => a.value - b.value);
        } else {
            debts.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
        }
        plan.debtIds = debts.map(d => d.id);
        plan.updatedAt = new Date().toISOString();
        this.saveData();
    }

    getDebtPayoffProgress() {
        const plan = this.data.debtPayoffPlan;
        const debts = this.data.assets.filter(a => a.type === 'liability' && plan.debtIds.includes(a.id));
        if (!debts.length) return null;

        const totalOriginal = debts.reduce((s, d) => s + (d.originalAmount || d.value), 0);
        const totalRemaining = debts.reduce((s, d) => s + d.value, 0);
        const totalPaid = Math.max(0, totalOriginal - totalRemaining);
        const percentPaid = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;

        // Focus debt is the first one in order that still has a balance
        const ordered = this.getPayoffOrder();
        const focusDebt = ordered.find(d => d.value > 0.01) || null;

        // Project payoff date
        const projection = this.projectPayoff(ordered.filter(d => d.value > 0.01), plan.extraPayment || 0);
        const projectedPayoffDate = new Date();
        projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + projection.months);

        return { totalOriginal, totalRemaining, totalPaid, percentPaid, focusDebt, projectedPayoffDate, projection };
    }

    // ==========================================
    // DEBT PAYOFF PAGE
    // ==========================================

    renderDebtPayoff() {
        const container = document.getElementById('debt-payoff-content');
        if (!container) return;
        const plan = this.data.debtPayoffPlan;

        if (!plan.debtIds || plan.debtIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h3>No Debt Payoff Plan</h3>
                    <p>You haven't set up a debt payoff plan yet. Add your debts and choose a strategy to get started.</p>
                    <button class="btn-primary" data-action="rerun-onboarding"><i class="fas fa-plus"></i> Set Up Plan</button>
                </div>
            `;
            return;
        }

        const progress = this.getDebtPayoffProgress();
        if (!progress) { container.innerHTML = '<p>No debts found in your plan.</p>'; return; }

        const { totalOriginal, totalRemaining, totalPaid, percentPaid, focusDebt, projectedPayoffDate, projection } = progress;
        const dateStr = projectedPayoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const ordered = this.getPayoffOrder();
        const totalMinPayments = ordered.reduce((s, d) => s + (d.minPayment || 0), 0);
        const strategyLabel = plan.strategy === 'avalanche' ? 'Avalanche' : 'Snowball';

        let html = `
            <div class="debt-overview-card">
                <h3>Overall Progress</h3>
                <div class="debt-progress-bar-container">
                    <div class="debt-progress-bar">
                        <div class="debt-progress-fill ${percentPaid >= 100 ? 'complete' : ''}" style="width: ${Math.min(percentPaid, 100)}%"></div>
                    </div>
                    <span class="debt-progress-pct">${percentPaid}% paid</span>
                </div>
                <div class="debt-overview-stats">
                    <div class="debt-stat">
                        <span class="debt-stat-value">${this.formatCurrency(totalPaid)}</span>
                        <span class="debt-stat-label">Paid Off</span>
                    </div>
                    <div class="debt-stat">
                        <span class="debt-stat-value">${this.formatCurrency(totalRemaining)}</span>
                        <span class="debt-stat-label">Remaining</span>
                    </div>
                    <div class="debt-stat">
                        <span class="debt-stat-value">${projection.months > 0 ? dateStr : 'Done!'}</span>
                        <span class="debt-stat-label">Projected Debt-Free</span>
                    </div>
                </div>
            </div>
        `;

        // Focus debt card
        if (focusDebt) {
            const focusOriginal = focusDebt.originalAmount || focusDebt.value;
            const focusPaid = Math.max(0, focusOriginal - focusDebt.value);
            const focusPct = focusOriginal > 0 ? Math.round((focusPaid / focusOriginal) * 100) : 0;
            html += `
                <div class="focus-debt-card">
                    <div class="focus-debt-header">
                        <span class="focus-badge">FOCUS</span>
                        <h3>${this.escapeHtml(focusDebt.name)}</h3>
                    </div>
                    <div class="focus-debt-details">
                        <span>${this.formatCurrency(focusDebt.value)} remaining</span>
                        <span>${focusDebt.interestRate || 0}% APR</span>
                        <span>${this.formatCurrency(focusDebt.minPayment || 0)}/mo minimum</span>
                    </div>
                    <div class="debt-progress-bar-container">
                        <div class="debt-progress-bar">
                            <div class="debt-progress-fill" style="width: ${focusPct}%"></div>
                        </div>
                        <span class="debt-progress-pct">${focusPct}% paid</span>
                    </div>
                    <button class="btn-primary" data-action="debt-make-payment" data-id="${focusDebt.id}"><i class="fas fa-credit-card"></i> Make Payment</button>
                </div>
            `;
        }

        // All debts list
        html += '<div class="debt-list-section"><h3>All Debts <span class="text-muted">(in payoff order)</span></h3><div class="debt-list">';
        ordered.forEach((d, i) => {
            const original = d.originalAmount || d.value;
            const paid = Math.max(0, original - d.value);
            const pct = original > 0 ? Math.round((paid / original) * 100) : 0;
            const isPaidOff = d.value <= 0.01;
            const isFocus = focusDebt && d.id === focusDebt.id;
            html += `
                <div class="debt-list-item ${isPaidOff ? 'paid-off' : ''} ${isFocus ? 'is-focus' : ''}">
                    <div class="debt-list-num">${i + 1}</div>
                    <div class="debt-list-info">
                        <div class="debt-list-name">
                            ${isPaidOff ? '<i class="fas fa-check-circle"></i> ' : ''}${this.escapeHtml(d.name)}
                            ${isFocus ? '<span class="focus-badge-sm">FOCUS</span>' : ''}
                        </div>
                        <div class="debt-progress-bar small">
                            <div class="debt-progress-fill" style="width: ${pct}%"></div>
                        </div>
                    </div>
                    <div class="debt-list-details">
                        <span>${this.formatCurrency(d.value)}</span>
                        <span class="text-muted">${d.interestRate || 0}%</span>
                    </div>
                    <button class="btn-icon" data-action="debt-make-payment" data-id="${d.id}" ${isPaidOff ? 'disabled' : ''}><i class="fas fa-dollar-sign"></i></button>
                </div>
            `;
        });
        html += '</div></div>';

        // Payoff timeline chart
        html += `
            <div class="debt-chart-section">
                <h3>Payoff Timeline</h3>
                <canvas id="debt-payoff-chart" height="250"></canvas>
            </div>
        `;

        // Strategy footer
        html += `
            <div class="debt-plan-footer">
                <span><i class="fas fa-chess-knight"></i> Strategy: <strong>${strategyLabel}</strong></span>
                <span><i class="fas fa-plus-circle"></i> Extra: <strong>${this.formatCurrency(plan.extraPayment || 0)}/mo</strong></span>
                <span><i class="fas fa-coins"></i> Total monthly: <strong>${this.formatCurrency(totalMinPayments + (plan.extraPayment || 0))}</strong></span>
            </div>
        `;

        container.innerHTML = html;

        // Render Chart.js timeline
        this.renderDebtPayoffChart(ordered, projection);
    }

    renderDebtPayoffChart(debts, projection) {
        const canvas = document.getElementById('debt-payoff-chart');
        if (!canvas || !projection.timeline.length) return;

        if (this.charts.debtPayoff) this.charts.debtPayoff.destroy();

        // Sample the timeline to avoid too many data points (max 36 points)
        const timeline = projection.timeline;
        const step = Math.max(1, Math.floor(timeline.length / 36));
        const sampled = timeline.filter((_, i) => i % step === 0 || i === timeline.length - 1);

        const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
        const datasets = debts.map((d, i) => ({
            label: d.name,
            data: sampled.map(t => t.balances[d.id] || 0),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length] + '20',
            fill: true,
            tension: 0.3,
            pointRadius: 0
        }));

        const labels = sampled.map(t => {
            const date = new Date();
            date.setMonth(date.getMonth() + t.month);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        this.charts.debtPayoff = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => this.data.settings.currency + v.toLocaleString() }
                    }
                },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    openEditDebtPlan() {
        const plan = this.data.debtPayoffPlan;
        const strategyRadio = document.querySelector(`input[name="edit-strategy"][value="${plan.strategy}"]`);
        if (strategyRadio) strategyRadio.checked = true;
        document.getElementById('edit-extra-payment').value = plan.extraPayment || 0;
        this.openModal('edit-debt-plan-modal');
    }

    saveEditDebtPlan(event) {
        event.preventDefault();
        const strategy = document.querySelector('input[name="edit-strategy"]:checked')?.value || 'avalanche';
        const extra = parseFloat(document.getElementById('edit-extra-payment').value) || 0;

        this.data.debtPayoffPlan.strategy = strategy;
        this.data.debtPayoffPlan.extraPayment = extra;
        this.recalculatePayoffPlan();
        this.closeModal('edit-debt-plan-modal');
        this.renderDebtPayoff();
        this.showToast('Payoff plan updated', 'success');
    }

    checkDebtFreeStatus() {
        const plan = this.data.debtPayoffPlan;
        if (!plan.debtIds || plan.debtIds.length === 0) return;
        if (this.data.settings.debtPayoffComplete) return;

        const debts = this.data.assets.filter(a => a.type === 'liability' && plan.debtIds.includes(a.id));
        const allPaid = debts.every(d => d.value <= 0.01);
        if (allPaid) {
            this.data.settings.debtPayoffComplete = true;
            this.saveData();
            this.openModal('debt-free-modal');
        }
    }

    startEnvelopeTransition() {
        this.data.settings.financialProfile = 'envelope-ready';
        this.saveData();
        this.closeModal('debt-free-modal');
        // Show onboarding for just the envelope steps
        this.onboardingProfile = 'envelope-ready';
        this.onboardingStep = 3;
        this.onboardAccounts = [];
        this.onboardIncome = [];
        document.getElementById('onboarding-overlay').style.display = 'flex';
        this.updateOnboardingStep();
        this.showToast('Let\'s set up your envelopes!', 'success');
    }

    // ==========================================
    // UNIFIED ACCOUNT ACTION
    // ==========================================

    openAccountAction(assetId, actionType) {
        const asset = this.data.assets.find(a => a.id === assetId);
        if (!asset) return;
        document.getElementById('action-asset-id').value = assetId;
        document.getElementById('action-type').value = actionType;
        document.getElementById('action-date').value = this.todayLocal();
        document.getElementById('action-amount').value = '';

        const infoEl = document.getElementById('action-info');
        const amountLabel = document.getElementById('action-amount-label');
        const accountLabel = document.getElementById('action-account-label');
        const accountGroup = document.getElementById('action-account-group');
        const splitEl = document.getElementById('action-payment-split');
        const submitBtn = document.getElementById('action-submit-btn');
        const accountSelect = document.getElementById('action-account');

        const contribTypeGroup = document.getElementById('action-contrib-type-group');
        const retTypes = ['401k', '403b', 'ira', 'roth-ira', 'pension', 'hsa', '529'];
        const isRetirement = retTypes.includes(asset.category);

        const envelopeAllocEl = document.getElementById('action-envelope-alloc');

        if (actionType === 'contribute') {
            document.getElementById('account-action-modal-title').textContent = 'Add Contribution';
            infoEl.innerHTML = `<strong>${this.escapeHtml(asset.name)}</strong><br>Balance: ${this.formatCurrency(asset.value)}`;
            amountLabel.textContent = 'Amount to Add';
            accountLabel.textContent = 'Transfer From';
            splitEl.style.display = 'none';
            if (envelopeAllocEl) envelopeAllocEl.style.display = 'none';
            submitBtn.textContent = 'Add Contribution';
            const others = this.data.assets.filter(a => a.type === 'asset' && a.id !== assetId);
            accountSelect.innerHTML = '<option value="">Cash / External</option>';
            others.forEach(a => { accountSelect.innerHTML += `<option value="${this.escapeHtml(a.id)}">${this.escapeHtml(a.name)}</option>`; });

            if (isRetirement) {
                contribTypeGroup.style.display = 'block';
                document.getElementById('contrib-pretax').checked = true;
                accountGroup.style.display = 'none';
            } else {
                contribTypeGroup.style.display = 'none';
                accountGroup.style.display = 'block';
            }
        } else if (actionType === 'pay') {
            contribTypeGroup.style.display = 'none';
            const isCreditCard = asset.category === 'credit-card';
            document.getElementById('account-action-modal-title').textContent = 'Make Payment';
            if (isCreditCard) {
                infoEl.innerHTML = `<strong>${this.escapeHtml(asset.name)}</strong><br>Balance: ${this.formatCurrency(asset.value)}`;
            } else {
                infoEl.innerHTML = `<strong>${this.escapeHtml(asset.name)}</strong><br>Balance: ${this.formatCurrency(asset.value)} &bull; Rate: ${asset.interestRate || 0}%`;
            }
            amountLabel.textContent = 'Payment Amount';
            accountLabel.textContent = 'Pay From';
            accountGroup.style.display = 'block';
            splitEl.style.display = isCreditCard ? 'none' : 'block';
            submitBtn.textContent = 'Make Payment';
            document.getElementById('action-amount').value = isCreditCard ? asset.value : (asset.minPayment || '');
            const bankAccounts = this.data.assets.filter(a => a.type === 'asset');
            accountSelect.innerHTML = '<option value="">Cash / External</option>';
            bankAccounts.forEach(a => { accountSelect.innerHTML += `<option value="${this.escapeHtml(a.id)}">${this.escapeHtml(a.name)}</option>`; });
            this.currentDebt = asset;
            if (!isCreditCard) this.calculatePaymentSplit();

            if (isCreditCard && this.data.envelopes.length) {
                if (envelopeAllocEl) envelopeAllocEl.style.display = 'block';
                this.buildPaymentEnvelopeAllocations();
                this.updatePaymentUnallocated();
            } else {
                if (envelopeAllocEl) envelopeAllocEl.style.display = 'none';
            }
        } else if (actionType === 'withdraw') {
            contribTypeGroup.style.display = 'none';
            if (envelopeAllocEl) envelopeAllocEl.style.display = 'none';
            document.getElementById('account-action-modal-title').textContent = 'Withdraw Funds';
            infoEl.innerHTML = `<strong>${this.escapeHtml(asset.name)}</strong><br>Balance: ${this.formatCurrency(asset.value)}`;
            amountLabel.textContent = 'Amount to Withdraw';
            accountLabel.textContent = 'Deposit To';
            accountGroup.style.display = 'block';
            splitEl.style.display = 'none';
            submitBtn.textContent = 'Withdraw';
            const others = this.data.assets.filter(a => a.type === 'asset' && a.id !== assetId);
            accountSelect.innerHTML = '<option value="">Cash / External</option>';
            others.forEach(a => { accountSelect.innerHTML += `<option value="${this.escapeHtml(a.id)}">${this.escapeHtml(a.name)}</option>`; });
        }
        this.openModal('account-action-modal');
    }

    calculatePaymentSplit() {
        const actionType = document.getElementById('action-type')?.value;
        if (actionType !== 'pay' || !this.currentDebt) return;
        const payment = parseFloat(document.getElementById('action-amount').value) || 0;
        const monthlyRate = (this.currentDebt.interestRate || 0) / 100 / 12;
        const interest = this.currentDebt.value * monthlyRate;
        const principal = Math.max(0, payment - interest);
        document.getElementById('action-principal').textContent = this.formatCurrency(principal);
        document.getElementById('action-interest').textContent = this.formatCurrency(interest);
    }

    buildPaymentEnvelopeAllocations() {
        const container = document.getElementById('action-envelope-rows');
        if (!container) return;
        const envelopes = this.data.envelopes;
        if (!envelopes.length) { container.innerHTML = '<p class="empty-state">No envelopes created yet.</p>'; return; }
        container.innerHTML = envelopes.map(env => {
            const balClass = env.balance < -0.005 ? 'negative' : 'positive';
            return `<div class="paycheck-alloc-row">
                <div class="paycheck-alloc-info"><span class="color-dot" style="background:${this.escapeHtml(env.color)}"></span><span class="alloc-name">${this.escapeHtml(env.name)}</span></div>
                <span class="alloc-balance ${balClass}">${this.formatCurrency(env.balance)}</span>
                <input type="number" id="pay-alloc-${this.escapeHtml(env.id)}" class="alloc-input" step="0.01" min="0" value="0">
            </div>`;
        }).join('');
    }

    updatePaymentUnallocated() {
        const total = parseFloat(document.getElementById('action-amount')?.value) || 0;
        let allocated = 0;
        this.data.envelopes.forEach(env => {
            const input = document.getElementById(`pay-alloc-${env.id}`);
            if (input) allocated += parseFloat(input.value) || 0;
        });
        const el = document.getElementById('action-unallocated');
        if (el) {
            el.textContent = this.formatCurrency(total - allocated);
            el.className = 'paycheck-unallocated-value' + ((total - allocated) < -0.005 ? ' negative' : '');
        }
    }

    updateTransPaymentEnvelopes() {
        const type = document.querySelector('input[name="trans-type"]:checked')?.value;
        if (type !== 'payment') return;
        const toId = document.getElementById('trans-to-account')?.value;
        const asset = toId ? this.data.assets.find(a => a.id === toId) : null;
        const isCreditCard = asset && asset.category === 'credit-card';
        const allocEl = document.getElementById('trans-envelope-alloc');
        if (!allocEl) return;
        if (isCreditCard && this.data.envelopes.length) {
            allocEl.style.display = 'block';
            this.buildTransPaymentAllocations();
            this.updateTransAllocUnallocated();
        } else {
            allocEl.style.display = 'none';
        }
    }

    buildTransPaymentAllocations() {
        const container = document.getElementById('trans-envelope-alloc-rows');
        if (!container) return;
        const envelopes = this.data.envelopes;
        if (!envelopes.length) { container.innerHTML = '<p class="empty-state">No envelopes created yet.</p>'; return; }
        container.innerHTML = envelopes.map(env => {
            const balClass = env.balance < -0.005 ? 'negative' : 'positive';
            return `<div class="paycheck-alloc-row">
                <div class="paycheck-alloc-info"><span class="color-dot" style="background:${this.escapeHtml(env.color)}"></span><span class="alloc-name">${this.escapeHtml(env.name)}</span></div>
                <span class="alloc-balance ${balClass}">${this.formatCurrency(env.balance)}</span>
                <input type="number" id="trans-alloc-${this.escapeHtml(env.id)}" class="alloc-input" step="0.01" min="0" value="0">
            </div>`;
        }).join('');
    }

    updateTransAllocUnallocated() {
        const total = parseFloat(document.getElementById('trans-amount')?.value) || 0;
        let allocated = 0;
        this.data.envelopes.forEach(env => {
            const input = document.getElementById(`trans-alloc-${env.id}`);
            if (input) allocated += parseFloat(input.value) || 0;
        });
        const el = document.getElementById('trans-alloc-unallocated');
        if (el) {
            el.textContent = this.formatCurrency(total - allocated);
            el.className = 'paycheck-unallocated-value' + ((total - allocated) < -0.005 ? ' negative' : '');
        }
    }

    saveAccountAction(event) {
        event.preventDefault();
        const assetId = document.getElementById('action-asset-id').value;
        const actionType = document.getElementById('action-type').value;
        const amount = parseFloat(document.getElementById('action-amount').value);
        const accountId = document.getElementById('action-account').value || null;
        const date = document.getElementById('action-date').value;
        const asset = this.data.assets.find(a => a.id === assetId);
        if (!asset) return;
        if (!amount || amount <= 0) { this.showToast('Amount must be greater than 0', 'error'); return; }

        if (actionType === 'contribute') {
            const isPreTax = document.getElementById('contrib-pretax').checked;
            const contribTypeGroup = document.getElementById('action-contrib-type-group');
            const isRetirementContrib = contribTypeGroup.style.display !== 'none';

            asset.value += amount;
            asset.updatedAt = new Date().toISOString();

            if (isRetirementContrib && isPreTax) {
                // Pre-tax: company deducts from paycheck, only retirement account increases
                if (!asset.contributions) asset.contributions = [];
                asset.contributions.push({ id: this.generateId(), amount, date, type: 'pretax', createdAt: new Date().toISOString() });
                const txn = { id: this.generateId(), type: 'transfer', amount, description: `Pre-tax contribution to ${asset.name}`, categoryId: null, date, notes: 'Pre-tax: deducted from paycheck by employer', fromAccountId: null, toAccountId: assetId, createdAt: new Date().toISOString() };
                this.data.transactions.push(txn);
            } else {
                // Post-tax or non-retirement: transfer from bank account
                if (accountId) { const from = this.data.assets.find(a => a.id === accountId); if (from) { from.value -= amount; from.updatedAt = new Date().toISOString(); } }
                if (!asset.contributions) asset.contributions = [];
                asset.contributions.push({ id: this.generateId(), amount, date, type: 'posttax', createdAt: new Date().toISOString() });
                const txn = { id: this.generateId(), type: 'transfer', amount, description: `Contribution to ${asset.name}`, categoryId: null, date, notes: 'Post-tax contribution', fromAccountId: accountId, toAccountId: assetId, createdAt: new Date().toISOString() };
                this.applyEnvelopeEffect(txn);
                this.data.transactions.push(txn);
            }

            if (asset.ytdContribution !== undefined) asset.ytdContribution += amount;
            this.showToast(`Added ${this.formatCurrency(amount)} to ${asset.name}`, 'success');

        } else if (actionType === 'pay') {
            if (amount > asset.value) { this.showToast('Payment exceeds debt balance', 'error'); return; }
            const isCreditCard = asset.category === 'credit-card';
            let principal, interest;
            if (isCreditCard) {
                principal = amount;
                interest = 0;
            } else {
                const rate = asset.interestRate || 0;
                const monthlyRate = rate / 100 / 12;
                interest = asset.value * monthlyRate;
                principal = Math.max(0, amount - interest);
            }
            asset.value = Math.max(0, asset.value - principal);
            asset.updatedAt = new Date().toISOString();
            if (accountId) { const from = this.data.assets.find(a => a.id === accountId); if (from) { from.value -= amount; from.updatedAt = new Date().toISOString(); } }
            if (!asset.payments) asset.payments = [];
            asset.payments.push({ id: this.generateId(), amount, principal, interest, date, balanceAfter: asset.value, createdAt: new Date().toISOString() });
            const notes = isCreditCard ? '' : `Principal: ${this.formatCurrency(principal)}, Interest: ${this.formatCurrency(interest)}`;
            const txn = { id: this.generateId(), type: 'payment', amount, description: `Payment to ${asset.name}`, categoryId: null, date, notes, fromAccountId: accountId, toAccountId: assetId, createdAt: new Date().toISOString() };
            if (!isCreditCard) this.applyEnvelopeEffect(txn);
            this.data.transactions.push(txn);

            // Deduct from envelopes based on allocations (credit card payments)
            if (isCreditCard) {
                this.data.envelopes.forEach(env => {
                    const input = document.getElementById(`pay-alloc-${env.id}`);
                    const alloc = input ? (parseFloat(input.value) || 0) : 0;
                    if (alloc > 0) {
                        env.balance -= alloc;
                        env.spent += alloc;
                    }
                });
            }

            if (asset.value === 0) this.showToast(`Congratulations! ${asset.name} is paid off!`, 'success');
            else this.showToast(`Payment recorded. Remaining: ${this.formatCurrency(asset.value)}`, 'success');

        } else if (actionType === 'withdraw') {
            if (amount > asset.value) { this.showToast('Withdrawal exceeds account balance', 'error'); return; }
            asset.value -= amount;
            asset.updatedAt = new Date().toISOString();
            if (accountId) { const to = this.data.assets.find(a => a.id === accountId); if (to) { to.value += amount; to.updatedAt = new Date().toISOString(); } }
            if (!asset.withdrawals) asset.withdrawals = [];
            asset.withdrawals.push({ id: this.generateId(), amount, date, createdAt: new Date().toISOString() });
            const txn = { id: this.generateId(), type: accountId ? 'transfer' : 'income', amount, description: `Withdrawal from ${asset.name}`, categoryId: accountId ? null : 'other-income', date, notes: 'Auto-created from withdrawal', fromAccountId: assetId, toAccountId: accountId, createdAt: new Date().toISOString() };
            this.data.transactions.push(txn);
            this.showToast(`Withdrew ${this.formatCurrency(amount)} from ${asset.name}`, 'success');
        }

        this.currentDebt = null;
        this.recordNetworthSnapshot();
        this.saveData();
        this.closeModal('account-action-modal');
        this.renderAccounts();
        this.renderDashboard();
        this.renderDebtPayoff();
        this.checkDebtFreeStatus();
    }

    // ==========================================
    // ACCOUNT DETAILS
    // ==========================================

    openAccountDetails(assetId) {
        const asset = this.data.assets.find(a => a.id === assetId);
        if (!asset) return;
        document.getElementById('account-details-title').textContent = asset.name;

        let summaryHtml = `<div class="summary-item"><span class="label">Current Value</span><span class="value ${asset.type === 'asset' ? 'positive' : 'negative'}">${this.formatCurrency(asset.value)}</span></div>
            <div class="summary-item"><span class="label">Account Type</span><span class="value">${this.formatAccountType(asset.category)}</span></div>`;
        if (asset.institution) summaryHtml += `<div class="summary-item"><span class="label">Institution</span><span class="value">${this.escapeHtml(asset.institution)}</span></div>`;
        if (asset.accountLast4) summaryHtml += `<div class="summary-item"><span class="label">Account #</span><span class="value">****${this.escapeHtml(asset.accountLast4)}</span></div>`;
        if (asset.contributionLimit) {
            const ytd = asset.ytdContribution || 0;
            const pct = (ytd / asset.contributionLimit) * 100;
            summaryHtml += `<div class="summary-item full-width"><span class="label">YTD Contributions</span><span class="value">${this.formatCurrency(ytd)} / ${this.formatCurrency(asset.contributionLimit)}</span><div class="contribution-progress-bar"><div class="contribution-progress-fill" style="width:${Math.min(pct,100)}%"></div></div></div>`;
        }
        if (asset.creditLimit) {
            const util = (asset.value / asset.creditLimit) * 100;
            summaryHtml += `<div class="summary-item"><span class="label">Credit Limit</span><span class="value">${this.formatCurrency(asset.creditLimit)}</span></div><div class="summary-item"><span class="label">Utilization</span><span class="value ${util > 30 ? 'negative' : 'positive'}">${util.toFixed(1)}%</span></div>`;
        }
        if (asset.type === 'liability' && asset.originalAmount) {
            const paidOff = asset.originalAmount - asset.value;
            summaryHtml += `<div class="summary-item"><span class="label">Original Amount</span><span class="value">${this.formatCurrency(asset.originalAmount)}</span></div><div class="summary-item"><span class="label">Paid Off</span><span class="value positive">${((paidOff / asset.originalAmount) * 100).toFixed(1)}%</span></div>`;
        }
        document.getElementById('account-summary').innerHTML = summaryHtml;

        const actionsEl = document.getElementById('account-actions');
        if (asset.type === 'asset') {
            actionsEl.innerHTML = `<button class="btn-primary" data-action="account-contribute" data-id="${asset.id}"><i class="fas fa-plus"></i> Add</button>
                <button class="btn-secondary btn-withdraw" data-action="account-withdraw" data-id="${asset.id}"><i class="fas fa-minus"></i> Withdraw</button>`;
        } else {
            actionsEl.innerHTML = `<button class="btn-primary" data-action="account-pay" data-id="${asset.id}"><i class="fas fa-credit-card"></i> Pay</button>`;
        }
        // Wire up detail modal action buttons to close this modal first
        actionsEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal('account-details-modal'));
        });

        // Transaction history
        let history = [];
        this.data.transactions.forEach(t => {
            const isFrom = t.fromAccountId === asset.id;
            const isTo = t.toAccountId === asset.id;
            if (!isFrom && !isTo) return;
            let isPositive, icon, color, description;
            if (t.type === 'expense') { isPositive = false; icon = 'shopping-cart'; color = '#ef4444'; description = t.description; }
            else if (t.type === 'income') { isPositive = true; icon = 'arrow-down'; color = '#10b981'; description = t.description; }
            else if (t.type === 'transfer') {
                const otherId = isFrom ? t.toAccountId : t.fromAccountId;
                const other = this.data.assets.find(a => a.id === otherId);
                isPositive = !isFrom; icon = 'exchange-alt'; color = '#6366f1';
                description = isFrom ? `Transfer to ${other?.name || 'External'}` : `Transfer from ${other?.name || 'External'}`;
            } else if (t.type === 'payment') {
                const otherId = isFrom ? t.toAccountId : t.fromAccountId;
                const other = this.data.assets.find(a => a.id === otherId);
                isPositive = !isFrom; icon = 'credit-card'; color = '#10b981';
                description = isFrom ? `Payment to ${other?.name || 'External'}` : `Payment from ${other?.name || 'External'}`;
            } else return;
            history.push({ date: t.date, description, amount: t.amount, icon, color, isPositive });
        });
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        const historyEl = document.getElementById('account-history');
        if (!history.length) historyEl.innerHTML = '<div class="empty-state"><p>No transaction history yet</p></div>';
        else historyEl.innerHTML = history.slice(0, 30).map(h => `
            <div class="history-item">
                <div class="history-icon" style="background:${h.color}20;color:${h.color}"><i class="fas fa-${h.icon}"></i></div>
                <div class="history-details"><span class="history-description">${this.escapeHtml(h.description)}</span><span class="history-date">${this.formatDateLocal(h.date)}</span></div>
                <span class="history-amount ${h.isPositive ? 'positive' : ''}">${h.isPositive ? '+' : '-'}${this.formatCurrency(h.amount)}</span>
            </div>`).join('');
        this.openModal('account-details-modal');
    }

    // ==========================================
    // ENVELOPES
    // ==========================================

    saveEnvelope(event) {
        event.preventDefault();
        const id = document.getElementById('envelope-id').value || this.generateId();
        const name = document.getElementById('envelope-name').value.trim();
        const linkedCategoryId = document.getElementById('envelope-category').value || null;
        const targetAmount = parseFloat(document.getElementById('envelope-target').value) || 0;
        const targetFrequency = document.getElementById('envelope-frequency').value;
        const color = document.getElementById('envelope-color').value;
        if (!name) { this.showToast('Envelope name is required', 'error'); return; }

        const idx = this.data.envelopes.findIndex(e => e.id === id);
        const envelope = idx > -1 ? { ...this.data.envelopes[idx] } : {
            id, balance: 0, spent: 0, lastResetDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString()
        };
        Object.assign(envelope, { name, linkedCategoryId, linkedAccountId: null, targetAmount, targetFrequency, color });

        if (idx > -1) { this.data.envelopes[idx] = envelope; this.showToast('Envelope updated', 'success'); }
        else { this.data.envelopes.push(envelope); this.showToast('Envelope created', 'success'); }
        this.saveData();
        this.closeModal('envelope-modal');
        this.renderEnvelopes();
    }

    editEnvelope(id) {
        const env = this.data.envelopes.find(e => e.id === id);
        if (!env) return;
        document.getElementById('envelope-id').value = env.id;
        document.getElementById('envelope-name').value = env.name;
        document.getElementById('envelope-target').value = env.targetAmount || '';
        document.getElementById('envelope-frequency').value = env.targetFrequency || 'monthly';
        document.getElementById('envelope-color').value = env.color || '#6366f1';
        this.openModal('envelope-modal');
        setTimeout(() => {
            if (env.linkedCategoryId) document.getElementById('envelope-category').value = env.linkedCategoryId;
        }, 50);
    }

    deleteEnvelope(id) {
        this.data.envelopes = this.data.envelopes.filter(e => e.id !== id);
        this.saveData();
        this.renderEnvelopes();
        this.showToast('Envelope deleted', 'success');
    }

    populateEnvelopeLinkDropdowns() {
        const catSelect = document.getElementById('envelope-category');
        if (catSelect) {
            catSelect.innerHTML = '<option value="">None</option>';
            this.data.categories.filter(c => c.type === 'expense')
                .forEach(cat => { catSelect.innerHTML += `<option value="${this.escapeHtml(cat.id)}">${this.escapeHtml(cat.name)}</option>`; });
        }
    }

    onEnvelopeLinkTypeChange() {}

    getEnvelopeCCSpent(envelopeId) {
        const ccIds = new Set(this.data.assets.filter(a => a.category === 'credit-card').map(a => a.id));
        if (!ccIds.size) return 0;
        const now = new Date();
        const cm = now.getMonth(), cy = now.getFullYear();
        return this.data.transactions.filter(t => {
            if (t.envelopeId !== envelopeId) return false;
            if (t.type !== 'expense') return false;
            if (!t.fromAccountId || !ccIds.has(t.fromAccountId)) return false;
            const d = this.parseDateLocal(t.date);
            return d.getMonth() === cm && d.getFullYear() === cy;
        }).reduce((sum, t) => sum + t.amount, 0);
    }

    getEnvelopeMonthlyTarget(env) {
        const a = env.targetAmount || 0;
        const f = { weekly: 52/12, biweekly: 26/12, monthly: 1, quarterly: 1/3, yearly: 1/12 };
        return a * (f[env.targetFrequency] || 1);
    }

    getEnvelopePerPaycheckTarget(env) {
        const a = env.targetAmount || 0;
        const f = { weekly: 52/26, biweekly: 1, monthly: 12/26, quarterly: 4/26, yearly: 1/26 };
        return a * (f[env.targetFrequency] || 12/26);
    }

    // ==========================================
    // INCOME SOURCES
    // ==========================================

    saveIncomeSource(event) {
        event.preventDefault();
        const id = document.getElementById('income-source-id').value || this.generateId();
        const name = document.getElementById('income-source-name').value.trim();
        const defaultAccountId = document.getElementById('income-source-account').value || null;
        if (!name) { this.showToast('Income source name is required', 'error'); return; }
        const idx = this.data.incomeSources.findIndex(s => s.id === id);
        const source = idx > -1 ? { ...this.data.incomeSources[idx] } : { id, allocationTemplate: {}, createdAt: new Date().toISOString() };
        source.name = name;
        source.defaultAccountId = defaultAccountId;
        if (idx > -1) { this.data.incomeSources[idx] = source; this.showToast('Income source updated', 'success'); }
        else { this.data.incomeSources.push(source); this.showToast('Income source added', 'success'); }
        this.saveData();
        this.closeModal('income-source-modal');
        this.renderEnvelopes();
    }

    editIncomeSource(id) {
        const s = this.data.incomeSources.find(s => s.id === id);
        if (!s) return;
        document.getElementById('income-source-id').value = s.id;
        document.getElementById('income-source-name').value = s.name;
        this.openModal('income-source-modal');
        setTimeout(() => {
            this.populateIncomeSourceAccountDropdown();
            document.getElementById('income-source-account').value = s.defaultAccountId || '';
        }, 50);
    }

    deleteIncomeSource(id) {
        this.data.incomeSources = this.data.incomeSources.filter(s => s.id !== id);
        this.saveData();
        this.renderEnvelopes();
        this.showToast('Income source deleted', 'success');
    }

    populateIncomeSourceAccountDropdown() {
        const select = document.getElementById('income-source-account');
        if (!select) return;
        select.innerHTML = '<option value="">None</option>';
        this.buildAccountOptionsHtml(select);
    }

    buildAccountOptionsHtml(select) {
        const assets = this.data.assets.filter(a => a.type === 'asset');
        if (assets.length) {
            let html = '<optgroup label="Bank & Investment Accounts">';
            assets.forEach(a => { const dn = a.institution ? `${this.escapeHtml(a.name)} (${this.escapeHtml(a.institution)})` : this.escapeHtml(a.name); html += `<option value="${this.escapeHtml(a.id)}">${dn}</option>`; });
            select.innerHTML += html + '</optgroup>';
        }
    }

    // ==========================================
    // PAYCHECK
    // ==========================================

    populatePaycheckModal() {
        const sourceSelect = document.getElementById('paycheck-source');
        sourceSelect.innerHTML = '<option value="">Select income source...</option>';
        this.data.incomeSources.forEach(s => { sourceSelect.innerHTML += `<option value="${this.escapeHtml(s.id)}">${this.escapeHtml(s.name)}</option>`; });
        const accountSelect = document.getElementById('paycheck-account');
        accountSelect.innerHTML = '<option value="">Select deposit account...</option>';
        this.buildAccountOptionsHtml(accountSelect);
        document.getElementById('paycheck-date').value = this.todayLocal();
        this.buildPaycheckAllocationTable();
        this.updatePaycheckUnallocated();
    }

    onPaycheckSourceChange() {
        const sourceId = document.getElementById('paycheck-source').value;
        const source = sourceId ? this.data.incomeSources.find(s => s.id === sourceId) : null;
        if (source?.defaultAccountId) document.getElementById('paycheck-account').value = source.defaultAccountId;
        this.data.envelopes.forEach(env => {
            const input = document.getElementById(`paycheck-alloc-${env.id}`);
            if (!input) return;
            if (source?.allocationTemplate?.[env.id] !== undefined) {
                input.value = source.allocationTemplate[env.id];
            } else {
                input.value = this.getEnvelopePerPaycheckTarget(env).toFixed(2);
            }
        });
        this.updatePaycheckUnallocated();
    }

    buildPaycheckAllocationTable() {
        const container = document.getElementById('paycheck-allocations');
        const envelopes = this.data.envelopes;
        if (!envelopes.length) { container.innerHTML = '<p class="empty-state">No envelopes created yet.</p>'; return; }
        container.innerHTML = envelopes.map(env => {
            const perPaycheck = this.getEnvelopePerPaycheckTarget(env);
            const balClass = env.balance < -0.005 ? 'negative' : 'positive';
            return `<div class="paycheck-alloc-row">
                <div class="paycheck-alloc-info"><span class="color-dot" style="background:${this.escapeHtml(env.color)}"></span><span class="alloc-name">${this.escapeHtml(env.name)}</span></div>
                <span class="alloc-balance ${balClass}">${this.formatCurrency(env.balance)}</span>
                <input type="number" id="paycheck-alloc-${this.escapeHtml(env.id)}" class="alloc-input" step="0.01" min="0" value="${perPaycheck.toFixed(2)}">
            </div>`;
        }).join('');
    }

    updatePaycheckUnallocated() {
        const total = parseFloat(document.getElementById('paycheck-amount')?.value) || 0;
        let allocated = 0;
        this.data.envelopes.forEach(env => {
            const input = document.getElementById(`paycheck-alloc-${env.id}`);
            if (input) allocated += parseFloat(input.value) || 0;
        });
        const el = document.getElementById('paycheck-unallocated');
        if (el) {
            el.textContent = this.formatCurrency(total - allocated);
            el.className = 'paycheck-unallocated-value' + ((total - allocated) < -0.005 ? ' negative' : '');
        }
    }

    savePaycheck(event) {
        event.preventDefault();
        const sourceId = document.getElementById('paycheck-source').value || null;
        const totalAmount = parseFloat(document.getElementById('paycheck-amount').value);
        const depositAccountId = document.getElementById('paycheck-account').value || null;
        const date = document.getElementById('paycheck-date').value;
        if (!totalAmount || totalAmount <= 0) { this.showToast('Paycheck amount must be greater than 0', 'error'); return; }
        if (!date) { this.showToast('Date is required', 'error'); return; }

        const allocations = [];
        let totalAllocated = 0;
        this.data.envelopes.forEach(env => {
            const input = document.getElementById(`paycheck-alloc-${env.id}`);
            const amount = input ? parseFloat(input.value) || 0 : 0;
            if (amount > 0) { allocations.push({ envelopeId: env.id, amount }); totalAllocated += amount; }
        });
        if (totalAllocated > totalAmount + 0.005) { this.showToast('Allocations exceed paycheck amount', 'error'); return; }

        // Income transaction
        const source = sourceId ? this.data.incomeSources.find(s => s.id === sourceId) : null;
        const sourceName = source ? source.name : 'Paycheck';
        const txnId = this.generateId();
        const transaction = { id: txnId, type: 'income', amount: totalAmount, description: `${sourceName} paycheck`, categoryId: 'salary', date, notes: `Envelope allocations: ${allocations.length} envelopes`, fromAccountId: null, toAccountId: depositAccountId, createdAt: new Date().toISOString() };
        this.applyTransactionAccountEffect(transaction);
        this.data.transactions.push(transaction);

        // Update envelope balances
        allocations.forEach(alloc => {
            const env = this.data.envelopes.find(e => e.id === alloc.envelopeId);
            if (env) env.balance += alloc.amount;
        });

        // Save template
        if (source) {
            source.allocationTemplate = {};
            allocations.forEach(a => { source.allocationTemplate[a.envelopeId] = a.amount; });
        }

        // Record history
        this.data.paycheckHistory.push({ id: txnId + '-paycheck', incomeSourceId: sourceId, incomeSourceName: sourceName, totalAmount, depositAccountId, allocations, unallocated: totalAmount - totalAllocated, transactionId: txnId, date, createdAt: new Date().toISOString() });

        this.recordNetworthSnapshot();
        this.saveData();
        this.closeModal('paycheck-modal');
        this.renderEnvelopes();
        this.renderDashboard();
        this.showToast(`Paycheck of ${this.formatCurrency(totalAmount)} recorded`, 'success');
    }

    // ==========================================
    // ENVELOPE TRANSFERS
    // ==========================================

    populateEnvelopeTransferDropdowns() {
        const fromSelect = document.getElementById('transfer-from-envelope');
        const toSelect = document.getElementById('transfer-to-envelope');
        fromSelect.innerHTML = '<option value="">Select envelope...</option>';
        toSelect.innerHTML = '<option value="">Select envelope...</option>';
        this.data.envelopes.forEach(env => {
            const opt = `<option value="${this.escapeHtml(env.id)}">${this.escapeHtml(env.name)} (${this.formatCurrency(env.balance)})</option>`;
            fromSelect.innerHTML += opt;
            toSelect.innerHTML += opt;
        });
    }

    saveEnvelopeTransfer(event) {
        event.preventDefault();
        const fromId = document.getElementById('transfer-from-envelope').value;
        const toId = document.getElementById('transfer-to-envelope').value;
        const amount = parseFloat(document.getElementById('envelope-transfer-amount').value);
        if (!fromId || !toId) { this.showToast('Select both envelopes', 'error'); return; }
        if (fromId === toId) { this.showToast('Cannot transfer to same envelope', 'error'); return; }
        if (!amount || amount <= 0) { this.showToast('Amount must be greater than 0', 'error'); return; }
        const fromEnv = this.data.envelopes.find(e => e.id === fromId);
        const toEnv = this.data.envelopes.find(e => e.id === toId);
        if (!fromEnv || !toEnv) return;
        fromEnv.balance -= amount;
        toEnv.balance += amount;
        this.saveData();
        this.closeModal('envelope-transfer-modal');
        this.renderEnvelopes();
        this.showToast(`Transferred ${this.formatCurrency(amount)} between envelopes`, 'success');
    }

    // ==========================================
    // RENDERING METHODS
    // ==========================================
    // RENDERING_START

    renderAll() {
        this.renderDashboard();
        this.renderDebtPayoff();
        this.updateNavVisibility();
        this.populateCategorySelects();
        this.populateQuickAddCategories();
    }

    renderDashboard() {
        const now = new Date();
        const cm = now.getMonth(), cy = now.getFullYear();
        const monthTxns = this.data.transactions.filter(t => {
            const d = this.parseDateLocal(t.date);
            return d.getMonth() === cm && d.getFullYear() === cy;
        });
        const monthlyIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const monthlyExpenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const totalAssets = this.data.assets.filter(a => a.type === 'asset').reduce((s, a) => s + a.value, 0);
        const totalLiabilities = this.data.assets.filter(a => a.type === 'liability').reduce((s, a) => s + a.value, 0);

        document.getElementById('monthly-income').textContent = this.formatCurrency(monthlyIncome);
        document.getElementById('monthly-expenses').textContent = this.formatCurrency(monthlyExpenses);
        document.getElementById('monthly-balance').textContent = this.formatCurrency(monthlyIncome - monthlyExpenses);
        document.getElementById('total-networth').textContent = this.formatCurrency(totalAssets - totalLiabilities);

        this.renderEnvelopeStatusBars();
        this.renderSpendingPieChart();
        this.renderRecentTransactions();
        this.renderUpcomingRecurring();
    }
    renderEnvelopeStatusBars() {
        const container = document.getElementById('envelope-status-bars');
        if (!container) return;
        const envelopes = this.data.envelopes;
        if (!envelopes.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open-text"></i><p>No envelopes yet</p></div>';
            return;
        }
        container.innerHTML = envelopes.map(env => {
            const mt = this.getEnvelopeMonthlyTarget(env);
            const pct = mt > 0 ? Math.min((env.spent / mt) * 100, 100) : 0;
            const cls = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'success';
            return `<div class="envelope-bar-item">
                <div class="envelope-bar-header">
                    <span class="envelope-bar-name"><span class="color-dot" style="background:${this.escapeHtml(env.color)}"></span>${this.escapeHtml(env.name)}</span>
                    <span class="envelope-bar-values">${this.formatCurrency(env.spent)} / ${this.formatCurrency(mt)}</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
            </div>`;
        }).join('');
    }
    renderSpendingPieChart() {
        const canvas = document.getElementById('spending-pie-chart');
        if (!canvas) return;
        const now = new Date();
        const expenses = this.data.transactions.filter(t => {
            const d = this.parseDateLocal(t.date);
            return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const catMap = {};
        expenses.forEach(t => {
            const cat = this.getCategoryById(t.categoryId);
            if (!catMap[cat.name]) catMap[cat.name] = { total: 0, color: cat.color };
            catMap[cat.name].total += t.amount;
        });
        const labels = Object.keys(catMap);
        const data = labels.map(l => catMap[l].total);
        const colors = labels.map(l => catMap[l].color);
        if (this.charts.spendingPie) {
            this.charts.spendingPie.data.labels = labels;
            this.charts.spendingPie.data.datasets[0].data = data;
            this.charts.spendingPie.data.datasets[0].backgroundColor = colors;
            this.charts.spendingPie.update();
        } else if (labels.length) {
            this.charts.spendingPie = new Chart(canvas, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } } }
            });
        }
    }
    renderRecentTransactions() {
        const container = document.getElementById('recent-transactions-list');
        if (!container) return;
        const recent = [...this.data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        if (!recent.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet</p></div>';
            return;
        }
        container.innerHTML = recent.map(t => {
            const cat = this.getCategoryById(t.categoryId);
            const isInc = t.type === 'income';
            return `<div class="recent-item">
                <div class="recent-icon" style="background:${cat.color}20;color:${cat.color}"><i class="fas fa-${isInc ? 'arrow-down' : t.type === 'transfer' ? 'exchange-alt' : 'arrow-up'}"></i></div>
                <div class="recent-details"><span class="recent-desc">${this.escapeHtml(t.description)}</span><span class="recent-date">${this.formatDateLocal(t.date)}</span></div>
                <span class="recent-amount ${isInc ? 'positive' : ''}">${isInc ? '+' : '-'}${this.formatCurrency(t.amount)}</span>
            </div>`;
        }).join('');
    }
    renderUpcomingRecurring() {
        const container = document.getElementById('upcoming-recurring-list');
        if (!container) return;
        const upcoming = [...this.data.recurring].sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate)).slice(0, 5);
        if (!upcoming.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming bills</p></div>';
            return;
        }
        container.innerHTML = upcoming.map(r => {
            const cat = this.getCategoryById(r.categoryId);
            const days = Math.ceil((this.parseDateLocal(r.nextDate) - new Date().setHours(0,0,0,0)) / 86400000);
            const urg = days <= 3 ? 'urgent' : days <= 7 ? 'soon' : '';
            return `<div class="upcoming-item ${urg}">
                <div class="upcoming-icon" style="background:${cat.color}20;color:${cat.color}"><i class="fas fa-${r.type === 'income' ? 'arrow-down' : 'file-invoice-dollar'}"></i></div>
                <div class="upcoming-details"><span class="upcoming-name">${this.escapeHtml(r.name)}</span><span class="upcoming-date">${days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}</span></div>
                <span class="upcoming-amount">${this.formatCurrency(r.amount)}</span>
            </div>`;
        }).join('');
    }
    renderTransactions() {
        const filtered = this.getFilteredTransactions();
        const totalPages = Math.ceil(filtered.length / this.transactionsPerPage) || 1;
        if (this.transactionPage > totalPages) this.transactionPage = totalPages;
        const start = (this.transactionPage - 1) * this.transactionsPerPage;
        const pageItems = filtered.slice(start, start + this.transactionsPerPage);
        const tbody = document.getElementById('transactions-tbody');
        if (!tbody) return;
        if (!pageItems.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-table">No transactions found</td></tr>';
            this.renderTransactionPagination(0, 1);
            return;
        }
        tbody.innerHTML = pageItems.map(t => {
            const cat = this.getCategoryById(t.categoryId);
            const isInc = t.type === 'income';
            const typeLabel = t.type.charAt(0).toUpperCase() + t.type.slice(1);
            return `<tr>
                <td>${this.formatDateLocal(t.date)}</td>
                <td><div class="transaction-desc">${this.escapeHtml(t.description)}</div><span class="transaction-type badge-${t.type}">${typeLabel}</span></td>
                <td><span class="category-badge" style="background:${cat.color}20;color:${cat.color}">${this.escapeHtml(cat.name)}</span></td>
                <td class="${isInc ? 'positive' : ''}">${isInc ? '+' : '-'}${this.formatCurrency(t.amount)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" data-action="edit-transaction" data-id="${this.escapeHtml(t.id)}" aria-label="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon delete" data-action="delete-transaction" data-id="${this.escapeHtml(t.id)}" aria-label="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
        this.renderTransactionPagination(filtered.length, totalPages);
    }
    renderTransactionPagination(total, totalPages) {
        const table = document.getElementById('transactions-table');
        if (!table) return;
        let pagEl = table.parentElement.querySelector('.pagination-controls');
        if (!pagEl) { pagEl = document.createElement('div'); pagEl.className = 'pagination-controls'; table.parentElement.appendChild(pagEl); }
        if (totalPages <= 1) { pagEl.innerHTML = ''; return; }
        pagEl.innerHTML = `
            <button class="btn-secondary btn-sm" data-action="prev-page" ${this.transactionPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Prev</button>
            <span class="pagination-info">Page ${this.transactionPage} of ${totalPages} (${total} transactions)</span>
            <button class="btn-secondary btn-sm" data-action="next-page" ${this.transactionPage >= totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>`;
    }
    renderRecurring() {
        const recurring = this.data.recurring;
        let monthlyInc = 0, monthlyExp = 0;
        recurring.forEach(r => {
            const m = this.getMonthlyEquivalent(r.amount, r.frequency);
            if (r.type === 'income') monthlyInc += m; else monthlyExp += m;
        });
        document.getElementById('recurring-income').textContent = this.formatCurrency(monthlyInc);
        document.getElementById('recurring-expenses').textContent = this.formatCurrency(monthlyExp);
        document.getElementById('recurring-net').textContent = this.formatCurrency(monthlyInc - monthlyExp);
        const tbody = document.getElementById('recurring-tbody');
        if (!tbody) return;
        if (!recurring.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-table">No recurring transactions</td></tr>';
            return;
        }
        tbody.innerHTML = recurring.map(r => {
            const cat = this.getCategoryById(r.categoryId);
            const freq = r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1);
            const days = Math.ceil((this.parseDateLocal(r.nextDate) - new Date().setHours(0,0,0,0)) / 86400000);
            const dc = days <= 3 ? 'text-danger' : days <= 7 ? 'text-warning' : '';
            return `<tr>
                <td>${this.escapeHtml(r.name)}</td>
                <td><span class="category-badge" style="background:${cat.color}20;color:${cat.color}">${this.escapeHtml(cat.name)}</span></td>
                <td class="${r.type === 'income' ? 'positive' : ''}">${r.type === 'income' ? '+' : '-'}${this.formatCurrency(r.amount)}</td>
                <td>${freq}</td>
                <td class="${dc}">${this.formatDateLocal(r.nextDate)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" data-action="edit-recurring" data-id="${this.escapeHtml(r.id)}" aria-label="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon delete" data-action="delete-recurring" data-id="${this.escapeHtml(r.id)}" aria-label="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }
    renderEnvelopes() {
        const envelopes = this.data.envelopes;
        const totalFunded = envelopes.reduce((s, e) => s + e.balance + e.spent, 0);
        const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
        const monthlyTarget = envelopes.reduce((s, e) => s + this.getEnvelopeMonthlyTarget(e), 0);
        const perPaycheck = envelopes.reduce((s, e) => s + this.getEnvelopePerPaycheckTarget(e), 0);
        document.getElementById('env-total-balance').textContent = this.formatCurrency(totalFunded);
        document.getElementById('env-total-spent').textContent = this.formatCurrency(totalSpent);
        document.getElementById('env-monthly-target').textContent = this.formatCurrency(monthlyTarget);
        document.getElementById('env-per-paycheck').textContent = this.formatCurrency(perPaycheck);

        const overdrawn = envelopes.filter(e => e.balance < -0.005);
        const banner = document.getElementById('envelopes-overdrawn-banner');
        if (overdrawn.length) {
            banner.style.display = 'flex';
            banner.querySelector('.warning-message').textContent = `${overdrawn.length} envelope${overdrawn.length > 1 ? 's are' : ' is'} overdrawn`;
        } else { banner.style.display = 'none'; }

        const grid = document.getElementById('envelopes-grid');
        if (!envelopes.length) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open-text"></i><p>No envelopes yet. Create your first envelope to start tracking spending.</p><button class="btn-primary" data-action="open-envelope"><i class="fas fa-plus"></i> Add Envelope</button></div>';
        } else {
            grid.innerHTML = envelopes.map(env => {
                const mt = this.getEnvelopeMonthlyTarget(env);
                const pct = mt > 0 ? Math.min((env.spent / mt) * 100, 100) : 0;
                const cls = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'success';
                const funded = env.balance + env.spent;
                const fundedCls = funded < -0.005 ? 'negative' : 'positive';
                const availCls = env.balance < -0.005 ? 'negative' : 'positive';
                const ccSpent = this.getEnvelopeCCSpent(env.id);
                const showCC = ccSpent > 0;
                return `<div class="envelope-card" style="border-left: 4px solid ${this.escapeHtml(env.color)}">
                    <div class="envelope-card-header">
                        <span class="envelope-card-name">${this.escapeHtml(env.name)}</span>
                        <div class="envelope-card-actions">
                            <button class="btn-icon" data-action="edit-envelope" data-id="${this.escapeHtml(env.id)}" aria-label="Edit"><i class="fas fa-pen"></i></button>
                            <button class="btn-icon delete" data-action="delete-envelope" data-id="${this.escapeHtml(env.id)}" aria-label="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="envelope-card-stats">
                        <div class="env-stat">
                            <span class="env-stat-label">Funded</span>
                            <span class="env-stat-value ${fundedCls}">${this.formatCurrency(funded)}</span>
                        </div>
                        <div class="env-stat">
                            <span class="env-stat-label">Spent</span>
                            <span class="env-stat-value">${this.formatCurrency(env.spent)}</span>
                        </div>
                        ${showCC ? `<div class="env-stat">
                            <span class="env-stat-label"><i class="fas fa-credit-card"></i> On CC</span>
                            <span class="env-stat-value">${this.formatCurrency(ccSpent)}</span>
                        </div>` : ''}
                        <div class="env-stat ${showCC ? 'env-stat-highlight' : ''}">
                            <span class="env-stat-label">Available</span>
                            <span class="env-stat-value ${availCls}">${this.formatCurrency(env.balance)}</span>
                        </div>
                    </div>
                    <div class="env-progress-section">
                        <div class="env-progress-labels">
                            <span>${this.formatCurrency(env.spent)} of ${this.formatCurrency(mt)}</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
                    </div>
                </div>`;
            }).join('');
        }
        this.renderIncomeSources();
        this.renderPaycheckHistory();
    }
    renderIncomeSources() {
        const container = document.getElementById('income-sources-list');
        if (!container) return;
        const sources = this.data.incomeSources;
        if (!sources.length) {
            container.innerHTML = '<div class="empty-state"><p>No income sources yet</p></div>';
            return;
        }
        container.innerHTML = sources.map(s => {
            const acct = s.defaultAccountId ? this.data.assets.find(a => a.id === s.defaultAccountId) : null;
            return `<div class="income-source-item">
                <div class="income-source-info">
                    <span class="income-source-name">${this.escapeHtml(s.name)}</span>
                    ${acct ? `<span class="income-source-account"><i class="fas fa-university"></i> ${this.escapeHtml(acct.name)}</span>` : ''}
                </div>
                <div class="income-source-actions">
                    <button class="btn-icon" data-action="edit-income-source" data-id="${this.escapeHtml(s.id)}" aria-label="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon delete" data-action="delete-income-source" data-id="${this.escapeHtml(s.id)}" aria-label="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }
    renderPaycheckHistory() {
        const container = document.getElementById('paycheck-history-list');
        if (!container) return;
        const history = [...this.data.paycheckHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        if (!history.length) {
            container.innerHTML = '<div class="empty-state"><p>No paychecks recorded yet</p></div>';
            return;
        }
        container.innerHTML = history.map(p => `
            <div class="paycheck-history-item">
                <div class="paycheck-history-info">
                    <span class="paycheck-source-name">${this.escapeHtml(p.incomeSourceName || 'Paycheck')}</span>
                    <span class="paycheck-date">${this.formatDateLocal(p.date)}</span>
                </div>
                <span class="paycheck-amount positive">+${this.formatCurrency(p.totalAmount)}</span>
            </div>`).join('');
    }
    renderAccounts() {
        const assets = this.data.assets;
        const totalAssets = assets.filter(a => a.type === 'asset').reduce((s, a) => s + a.value, 0);
        const totalLiabilities = assets.filter(a => a.type === 'liability').reduce((s, a) => s + a.value, 0);
        document.getElementById('total-assets').textContent = this.formatCurrency(totalAssets);
        document.getElementById('total-liabilities').textContent = this.formatCurrency(totalLiabilities);
        document.getElementById('networth-value').textContent = this.formatCurrency(totalAssets - totalLiabilities);

        const groups = [
            { title: 'Bank Accounts', icon: 'university', categories: ['checking', 'savings', 'cash'] },
            { title: 'Investments & Retirement', icon: 'chart-line', categories: ['brokerage', 'crypto', '401k', '403b', 'ira', 'roth-ira', 'pension', 'hsa', 'fsa', '529'] },
            { title: 'Credit Cards', icon: 'credit-card', categories: ['credit-card'] },
            { title: 'Loans', icon: 'file-invoice-dollar', categories: ['auto-loan', 'personal-loan', 'student-loan', 'mortgage', 'heloc', 'other-debt'] },
            { title: 'Other Assets', icon: 'gem', categories: ['property', 'vehicles', 'other-asset'] }
        ];
        const sectionsEl = document.getElementById('accounts-sections');
        if (!assets.length) {
            sectionsEl.innerHTML = '<div class="empty-state"><i class="fas fa-university"></i><p>No accounts yet. Add your first account to start tracking your net worth.</p><button class="btn-primary" data-action="open-asset"><i class="fas fa-plus"></i> Add Account</button></div>';
        } else {
            sectionsEl.innerHTML = groups.map(g => {
                const ga = assets.filter(a => g.categories.includes(a.category));
                if (!ga.length) return '';
                return `<div class="accounts-section">
                    <h3 class="accounts-section-title"><i class="fas fa-${g.icon}"></i> ${g.title}</h3>
                    <div class="accounts-grid">${ga.map(a => this.renderAccountCard(a)).join('')}</div>
                </div>`;
            }).join('');
        }
        this.renderNetworthChart();
    }

    renderAccountCard(asset) {
        const isDebt = asset.type === 'liability';
        const valCls = isDebt ? 'negative' : 'positive';
        let actions;
        if (isDebt) {
            actions = `<button class="btn-primary btn-sm" data-action="account-pay" data-id="${this.escapeHtml(asset.id)}"><i class="fas fa-credit-card"></i> Pay</button>`;
        } else {
            actions = `<button class="btn-primary btn-sm" data-action="account-contribute" data-id="${this.escapeHtml(asset.id)}"><i class="fas fa-plus"></i> Add</button>
                <button class="btn-secondary btn-sm" data-action="account-withdraw" data-id="${this.escapeHtml(asset.id)}"><i class="fas fa-minus"></i></button>`;
        }
        let subtitle = this.formatAccountType(asset.category);
        if (asset.institution) subtitle += ` &bull; ${this.escapeHtml(asset.institution)}`;
        return `<div class="account-card">
            <div class="account-card-header">
                <div class="account-card-info" data-action="account-details" data-id="${this.escapeHtml(asset.id)}">
                    <span class="account-card-name">${this.escapeHtml(asset.name)}</span>
                    <span class="account-card-type">${subtitle}</span>
                </div>
                <div class="account-card-actions">
                    <button class="btn-icon" data-action="edit-asset" data-id="${this.escapeHtml(asset.id)}" aria-label="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon delete" data-action="delete-asset" data-id="${this.escapeHtml(asset.id)}" aria-label="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="account-card-balance ${valCls}">${isDebt ? '-' : ''}${this.formatCurrency(asset.value)}</div>
            <div class="account-card-quick-actions">${actions}</div>
        </div>`;
    }
    renderNetworthChart() {
        const canvas = document.getElementById('networth-chart');
        if (!canvas) return;
        const history = [...this.data.networthHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
        if (history.length < 2) return;
        const labels = history.map(h => this.parseDateLocal(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const data = history.map(h => h.networth);
        if (this.charts.networth) {
            this.charts.networth.data.labels = labels;
            this.charts.networth.data.datasets[0].data = data;
            this.charts.networth.update();
        } else {
            this.charts.networth = new Chart(canvas, {
                type: 'line',
                data: { labels, datasets: [{ label: 'Net Worth', data, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => this.formatCurrency(v) } } } }
            });
        }
    }
    renderReports() {
        const { start, end } = this.getReportDateRange();
        this.renderBudgetCompliance();
        this.renderIncomeExpenseChart(start, end);
        this.renderExpenseBreakdownChart(start, end);
        this.renderSpendingTrendChart(start, end);
        this.renderSavingsChart(start, end);
        this.renderCategoryStats(start, end);
    }
    getReportDateRange() {
        const period = document.getElementById('report-period')?.value || 'thisMonth';
        const now = new Date();
        let start, end = new Date();
        switch (period) {
            case 'thisMonth': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'lastMonth': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
            case 'last3Months': start = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
            case 'last6Months': start = new Date(now.getFullYear(), now.getMonth() - 6, 1); break;
            case 'thisYear': start = new Date(now.getFullYear(), 0, 1); break;
            case 'allTime': start = new Date(2000, 0, 1); break;
            default: start = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        return { start, end };
    }
    renderBudgetCompliance() {
        const summaryEl = document.getElementById('budget-compliance-summary');
        const barsEl = document.getElementById('budget-compliance-bars');
        if (!summaryEl || !barsEl) return;
        const withTarget = this.data.envelopes.filter(e => e.targetAmount > 0);
        if (!withTarget.length) {
            summaryEl.innerHTML = '';
            barsEl.innerHTML = '<div class="empty-state"><p>Set envelope targets to see budget compliance</p></div>';
            return;
        }
        let onTrack = 0, overBudget = 0;
        const bars = withTarget.map(env => {
            const mt = this.getEnvelopeMonthlyTarget(env);
            const pct = mt > 0 ? (env.spent / mt) * 100 : 0;
            if (pct <= 100) onTrack++; else overBudget++;
            const cls = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'success';
            return `<div class="compliance-bar-item">
                <div class="compliance-bar-header">
                    <span><span class="color-dot" style="background:${this.escapeHtml(env.color)}"></span>${this.escapeHtml(env.name)}</span>
                    <span>${this.formatCurrency(env.spent)} / ${this.formatCurrency(mt)}</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>
            </div>`;
        });
        summaryEl.innerHTML = `<div class="compliance-stat on-track"><i class="fas fa-check-circle"></i> ${onTrack} on track</div>
            <div class="compliance-stat over-budget"><i class="fas fa-exclamation-circle"></i> ${overBudget} over budget</div>`;
        barsEl.innerHTML = bars.join('');
    }
    renderIncomeExpenseChart(start, end) {
        const canvas = document.getElementById('income-expense-chart');
        if (!canvas) return;
        const txns = this.data.transactions.filter(t => { const d = this.parseDateLocal(t.date); return d >= start && d <= end; });
        const months = {};
        txns.forEach(t => {
            const d = this.parseDateLocal(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { income: 0, expenses: 0 };
            if (t.type === 'income') months[key].income += t.amount;
            else if (t.type === 'expense') months[key].expenses += t.amount;
        });
        const keys = Object.keys(months).sort();
        const labels = keys.map(k => { const [y, m] = k.split('-'); return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }); });
        const incData = keys.map(k => months[k].income);
        const expData = keys.map(k => months[k].expenses);
        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.data.labels = labels;
            this.charts.incomeExpense.data.datasets[0].data = incData;
            this.charts.incomeExpense.data.datasets[1].data = expData;
            this.charts.incomeExpense.update();
        } else {
            this.charts.incomeExpense = new Chart(canvas, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Income', data: incData, backgroundColor: '#10b981' }, { label: 'Expenses', data: expData, backgroundColor: '#ef4444' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: v => this.formatCurrency(v) } } } }
            });
        }
    }
    renderExpenseBreakdownChart(start, end) {
        const canvas = document.getElementById('expense-breakdown-chart');
        if (!canvas) return;
        const expenses = this.data.transactions.filter(t => { const d = this.parseDateLocal(t.date); return t.type === 'expense' && d >= start && d <= end; });
        const catMap = {};
        expenses.forEach(t => {
            const cat = this.getCategoryById(t.categoryId);
            if (!catMap[cat.name]) catMap[cat.name] = { total: 0, color: cat.color };
            catMap[cat.name].total += t.amount;
        });
        const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
        const labels = sorted.map(([k]) => k);
        const data = sorted.map(([, v]) => v.total);
        const colors = sorted.map(([, v]) => v.color);
        if (this.charts.expenseBreakdown) {
            this.charts.expenseBreakdown.data.labels = labels;
            this.charts.expenseBreakdown.data.datasets[0].data = data;
            this.charts.expenseBreakdown.data.datasets[0].backgroundColor = colors;
            this.charts.expenseBreakdown.update();
        } else if (labels.length) {
            this.charts.expenseBreakdown = new Chart(canvas, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } } }
            });
        }
    }
    renderSpendingTrendChart(start, end) {
        const canvas = document.getElementById('spending-trend-chart');
        if (!canvas) return;
        const expenses = this.data.transactions.filter(t => { const d = this.parseDateLocal(t.date); return t.type === 'expense' && d >= start && d <= end; });
        const months = {};
        expenses.forEach(t => {
            const d = this.parseDateLocal(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months[key] = (months[key] || 0) + t.amount;
        });
        const keys = Object.keys(months).sort();
        const labels = keys.map(k => { const [y, m] = k.split('-'); return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }); });
        const data = keys.map(k => months[k]);
        if (this.charts.spendingTrend) {
            this.charts.spendingTrend.data.labels = labels;
            this.charts.spendingTrend.data.datasets[0].data = data;
            this.charts.spendingTrend.update();
        } else if (labels.length) {
            this.charts.spendingTrend = new Chart(canvas, {
                type: 'line',
                data: { labels, datasets: [{ label: 'Spending', data, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => this.formatCurrency(v) } } } }
            });
        }
    }
    renderSavingsChart(start, end) {
        const canvas = document.getElementById('savings-chart');
        if (!canvas) return;
        const txns = this.data.transactions.filter(t => { const d = this.parseDateLocal(t.date); return d >= start && d <= end; });
        const months = {};
        txns.forEach(t => {
            const d = this.parseDateLocal(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { income: 0, expenses: 0 };
            if (t.type === 'income') months[key].income += t.amount;
            else if (t.type === 'expense') months[key].expenses += t.amount;
        });
        const keys = Object.keys(months).sort();
        const labels = keys.map(k => { const [y, m] = k.split('-'); return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }); });
        const data = keys.map(k => { const m = months[k]; return m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0; });
        if (this.charts.savings) {
            this.charts.savings.data.labels = labels;
            this.charts.savings.data.datasets[0].data = data;
            this.charts.savings.update();
        } else if (labels.length) {
            this.charts.savings = new Chart(canvas, {
                type: 'line',
                data: { labels, datasets: [{ label: 'Savings Rate %', data, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' }, suggestedMin: 0, suggestedMax: 100 } } }
            });
        }
    }
    renderCategoryStats(start, end) {
        const tbody = document.getElementById('category-stats-tbody');
        if (!tbody) return;
        const expenses = this.data.transactions.filter(t => { const d = this.parseDateLocal(t.date); return t.type === 'expense' && d >= start && d <= end; });
        const total = expenses.reduce((s, t) => s + t.amount, 0);
        const catMap = {};
        expenses.forEach(t => {
            const cat = this.getCategoryById(t.categoryId);
            if (!catMap[cat.name]) catMap[cat.name] = { total: 0, count: 0, color: cat.color };
            catMap[cat.name].total += t.amount;
            catMap[cat.name].count++;
        });
        const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
        if (!sorted.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-table">No expense data for this period</td></tr>';
            return;
        }
        tbody.innerHTML = sorted.map(([name, d]) => {
            const pct = total > 0 ? ((d.total / total) * 100).toFixed(1) : 0;
            return `<tr>
                <td><span class="category-badge" style="background:${d.color}20;color:${d.color}">${this.escapeHtml(name)}</span></td>
                <td>${this.formatCurrency(d.total)}</td>
                <td>${d.count}</td>
                <td>${this.formatCurrency(d.total / d.count)}</td>
                <td>${pct}%</td>
            </tr>`;
        }).join('');
    }
    renderSettings() {
        const nameInput = document.getElementById('settings-name');
        if (nameInput) nameInput.value = this.data.settings.userName || '';
        document.getElementById('theme-select').value = this.data.settings.theme;
        document.getElementById('currency-select').value = this.data.settings.currency;

        // Financial profile display
        const profileBadge = document.getElementById('settings-financial-profile');
        const switchBtn = document.getElementById('settings-switch-to-envelopes');
        if (profileBadge) {
            const profile = this.data.settings.financialProfile;
            const labels = { 'debt-payoff': 'Debt Payoff Mode', 'envelope-ready': 'Envelope Budgeting', 'none': 'Not Set' };
            const icons = { 'debt-payoff': 'fa-bullseye', 'envelope-ready': 'fa-envelope-open-text', 'none': 'fa-question-circle' };
            profileBadge.innerHTML = `<i class="fas ${icons[profile] || icons['none']}"></i> ${labels[profile] || labels['none']}`;
        }
        if (switchBtn) {
            switchBtn.style.display = this.data.settings.financialProfile === 'debt-payoff' ? '' : 'none';
        }
        const list = document.getElementById('categories-list');
        if (!list) return;
        const grouped = { income: [], expense: [] };
        this.data.categories.forEach(cat => { (grouped[cat.type] || grouped.expense).push(cat); });
        list.innerHTML = ['income', 'expense'].map(type => {
            const cats = grouped[type];
            if (!cats.length) return '';
            return `<div class="category-group-label">${type === 'income' ? 'Income' : 'Expense'} Categories</div>` +
                cats.map(cat => `<div class="category-item">
                    <span class="category-color" style="background:${this.escapeHtml(cat.color)}"></span>
                    <span class="category-name">${this.escapeHtml(cat.name)}</span>
                    <button class="btn-icon delete" data-action="delete-category" data-id="${this.escapeHtml(cat.id)}" aria-label="Delete category"><i class="fas fa-times"></i></button>
                </div>`).join('');
        }).join('');
    }

    // RENDERING_END

    // ==========================================
    // DATA MANAGEMENT
    // ==========================================

    exportData() {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financeflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.transactions && imported.categories) {
                    this.data = { ...this.data, ...imported };
                    this.migrateData();
                    this.saveData();
                    this.renderAll();
                    this.showToast('Data imported successfully', 'success');
                } else { this.showToast('Invalid file format', 'error'); }
            } catch (err) { this.showToast('Error reading file', 'error'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    clearAllData() {
        localStorage.removeItem('financeflow_data');
        this.data = {
            transactions: [], recurring: [], assets: [], networthHistory: [],
            categories: [...this.defaultCategories], envelopes: [], incomeSources: [],
            paycheckHistory: [], billReminders: [],
            debtPayoffPlan: { strategy: 'avalanche', extraPayment: 0, debtIds: [], createdAt: null, updatedAt: null },
            settings: { theme: 'light', currency: '$', onboardingComplete: false, userName: '', financialProfile: 'none', debtPayoffComplete: false },
            version: 2
        };
        this.saveData();
        this.closeModal('confirm-dialog');
        this.renderAll();
        this.showToast('All data cleared', 'success');
    }

    // ==========================================
    // TOAST
    // ==========================================
    // CALENDAR
    // ==========================================

    getPreviousRecurringDate(date, frequency) {
        const prev = new Date(date);
        switch (frequency) {
            case 'weekly': prev.setDate(prev.getDate() - 7); break;
            case 'biweekly': prev.setDate(prev.getDate() - 14); break;
            case 'monthly': prev.setMonth(prev.getMonth() - 1); break;
            case 'quarterly': prev.setMonth(prev.getMonth() - 3); break;
            case 'yearly': prev.setFullYear(prev.getFullYear() - 1); break;
        }
        return prev;
    }

    getRecurringOccurrencesForMonth(year, month) {
        const occurrences = new Map();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const daysInMonth = monthEnd.getDate();

        this.data.recurring.forEach(rec => {
            if (!rec.nextDate) return;
            let d = this.parseDateLocal(rec.nextDate);

            // Walk backward until before month start
            while (d >= monthStart) {
                d = this.getPreviousRecurringDate(d, rec.frequency);
            }
            // Walk forward, collecting dates in this month
            d = this.getNextRecurringDate(d, rec.frequency);
            while (d <= monthEnd) {
                if (d >= monthStart) {
                    const day = d.getDate();
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (!occurrences.has(day)) occurrences.set(day, []);
                    occurrences.get(day).push({ recurring: rec, dateStr });
                }
                d = this.getNextRecurringDate(d, rec.frequency);
            }
        });

        // Bill reminders
        (this.data.billReminders || []).forEach(rem => {
            const day = Math.min(rem.dueDay, daysInMonth);
            let showThisMonth = false;
            if (rem.frequency === 'monthly') {
                showThisMonth = true;
            } else if (rem.frequency === 'quarterly') {
                // Show every 3 months based on createdAt month, or January if no createdAt
                const refMonth = rem.createdAt ? new Date(rem.createdAt).getMonth() : 0;
                showThisMonth = (month - refMonth + 12) % 3 === 0;
            } else if (rem.frequency === 'yearly') {
                const refMonth = rem.createdAt ? new Date(rem.createdAt).getMonth() : 0;
                showThisMonth = month === refMonth;
            }
            if (showThisMonth) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (!occurrences.has(day)) occurrences.set(day, []);
                occurrences.get(day).push({ reminder: rem, dateStr });
            }
        });

        return occurrences;
    }

    navigateCalendarMonth(delta) {
        this.calendarMonth += delta;
        if (this.calendarMonth > 11) { this.calendarMonth = 0; this.calendarYear++; }
        else if (this.calendarMonth < 0) { this.calendarMonth = 11; this.calendarYear--; }
        this.calendarSelectedDay = null;
        this.renderCalendar();
    }

    navigateCalendarToday() {
        const now = new Date();
        this.calendarYear = now.getFullYear();
        this.calendarMonth = now.getMonth();
        this.calendarSelectedDay = null;
        this.renderCalendar();
    }

    jumpCalendarToDate(dateStr) {
        const d = this.parseDateLocal(dateStr);
        this.calendarYear = d.getFullYear();
        this.calendarMonth = d.getMonth();
        this.calendarSelectedDay = dateStr;
        this.navigateTo('calendar');
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const label = document.getElementById('calendar-month-label');
        if (!grid || !label) return;

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        label.textContent = `${monthNames[this.calendarMonth]} ${this.calendarYear}`;

        const occurrences = this.getRecurringOccurrencesForMonth(this.calendarYear, this.calendarMonth);

        const firstDay = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
        const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.calendarYear, this.calendarMonth, 0).getDate();

        const today = new Date();
        const todayStr = this.todayLocal();

        let html = '<div class="calendar-header-row">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
            html += `<div class="calendar-weekday">${d}</div>`;
        });
        html += '</div><div class="calendar-days">';

        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day outside"><span class="calendar-day-number">${day}</span></div>`;
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.calendarYear}-${String(this.calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === this.calendarSelectedDay;
            const dayOccurrences = occurrences.get(day) || [];

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';
            if (dayOccurrences.length > 0) classes += ' has-bills';

            let dots = '';
            let totalAmount = 0;
            if (dayOccurrences.length > 0) {
                dots = '<div class="calendar-dots">';
                dayOccurrences.forEach(occ => {
                    if (occ.recurring) {
                        const cat = this.getCategoryById(occ.recurring.categoryId);
                        dots += `<span class="calendar-dot" style="background:${cat.color}" title="${this.escapeHtml(occ.recurring.name)}"></span>`;
                        totalAmount += occ.recurring.amount;
                    } else if (occ.reminder) {
                        dots += `<span class="calendar-dot" style="background:${occ.reminder.color || '#3b82f6'}" title="${this.escapeHtml(occ.reminder.name)}"></span>`;
                        totalAmount += occ.reminder.amount || 0;
                    }
                });
                dots += '</div>';
            }

            const amountLabel = totalAmount > 0 ? `<span class="calendar-day-amount">${this.formatCurrency(totalAmount)}</span>` : '';

            html += `<div class="${classes}" data-action="calendar-select-day" data-date="${dateStr}">
                <span class="calendar-day-number${isToday ? ' today-circle' : ''}">${day}</span>
                ${dots}${amountLabel}
            </div>`;
        }

        // Next month leading days
        const totalCells = firstDay + daysInMonth;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day outside"><span class="calendar-day-number">${i}</span></div>`;
        }

        html += '</div>';
        grid.innerHTML = html;

        this.renderCalendarUpcoming();
        const detail = document.getElementById('calendar-day-detail');
        if (this.calendarSelectedDay) {
            this.renderCalendarDayDetail(this.calendarSelectedDay);
            if (detail) detail.style.display = '';
        } else {
            if (detail) detail.style.display = 'none';
        }
    }

    selectCalendarDay(dateStr) {
        if (this.calendarSelectedDay === dateStr) {
            this.calendarSelectedDay = null;
        } else {
            this.calendarSelectedDay = dateStr;
        }
        // Update visual selection without full re-render
        document.querySelectorAll('#calendar-grid .calendar-day').forEach(el => {
            el.classList.toggle('selected', el.dataset.date === this.calendarSelectedDay);
        });
        const detail = document.getElementById('calendar-day-detail');
        if (this.calendarSelectedDay) {
            this.renderCalendarDayDetail(this.calendarSelectedDay);
            if (detail) detail.style.display = '';
        } else {
            if (detail) detail.style.display = 'none';
        }
    }

    renderCalendarDayDetail(dateStr) {
        const container = document.getElementById('calendar-detail-list');
        const title = document.getElementById('calendar-detail-title');
        if (!container) return;

        const d = this.parseDateLocal(dateStr);
        const day = d.getDate();
        title.textContent = `Bills Due - ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

        const occurrences = this.getRecurringOccurrencesForMonth(d.getFullYear(), d.getMonth());
        const dayItems = occurrences.get(day) || [];

        if (!dayItems.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No bills due on this day</p></div>';
            return;
        }

        let total = 0;
        let html = dayItems.map(occ => {
            if (occ.recurring) {
                const cat = this.getCategoryById(occ.recurring.categoryId);
                const freq = occ.recurring.frequency.charAt(0).toUpperCase() + occ.recurring.frequency.slice(1);
                total += occ.recurring.amount;
                return `<div class="calendar-bill-item">
                    <div class="calendar-bill-icon" style="background:${cat.color}20;color:${cat.color}">
                        <i class="fas fa-${occ.recurring.type === 'income' ? 'arrow-down' : 'file-invoice-dollar'}"></i>
                    </div>
                    <div class="calendar-bill-info">
                        <span class="calendar-bill-name">${this.escapeHtml(occ.recurring.name)}</span>
                        <span class="calendar-bill-meta">${this.escapeHtml(cat.name)} &middot; ${freq}</span>
                    </div>
                    <span class="calendar-bill-amount ${occ.recurring.type === 'income' ? 'positive' : ''}">${occ.recurring.type === 'income' ? '+' : '-'}${this.formatCurrency(occ.recurring.amount)}</span>
                </div>`;
            } else if (occ.reminder) {
                const rem = occ.reminder;
                const freq = rem.frequency.charAt(0).toUpperCase() + rem.frequency.slice(1);
                const acct = rem.accountId ? this.data.assets.find(a => a.id === rem.accountId) : null;
                const acctLabel = acct ? ` &middot; ${this.escapeHtml(acct.name)}` : '';
                total += rem.amount || 0;
                return `<div class="calendar-bill-item">
                    <div class="calendar-bill-icon" style="background:${rem.color}20;color:${rem.color}">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="calendar-bill-info">
                        <span class="calendar-bill-name">${this.escapeHtml(rem.name)} <span class="reminder-badge">Due Date</span></span>
                        <span class="calendar-bill-meta">${freq}${acctLabel}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${rem.amount ? `<span class="calendar-bill-amount">${this.formatCurrency(rem.amount)}</span>` : ''}
                        <button class="btn-icon" data-action="edit-bill-reminder" data-id="${rem.id}" aria-label="Edit due date"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon delete" data-action="delete-bill-reminder" data-id="${rem.id}" aria-label="Delete due date"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }
            return '';
        }).join('');

        html += `<div class="calendar-bill-total">
            <span>Total</span>
            <span>${this.formatCurrency(total)}</span>
        </div>`;

        container.innerHTML = html;
    }

    renderCalendarUpcoming() {
        const container = document.getElementById('calendar-upcoming-list');
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sixMonthsOut = new Date(today);
        sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);

        const upcoming = [];
        this.data.recurring.forEach(rec => {
            if (!rec.nextDate) return;
            let d = this.parseDateLocal(rec.nextDate);
            // Walk forward from nextDate collecting up to 10 total occurrences
            let count = 0;
            while (d <= sixMonthsOut && count < 10) {
                if (d >= today) {
                    upcoming.push({
                        recurring: rec,
                        date: new Date(d),
                        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    });
                    count++;
                }
                d = this.getNextRecurringDate(d, rec.frequency);
            }
        });

        // Bill reminders upcoming
        (this.data.billReminders || []).forEach(rem => {
            let d = new Date(today);
            for (let i = 0; i < 12 && d <= sixMonthsOut; i++) {
                const yr = d.getFullYear();
                const mo = d.getMonth();
                let showThisMonth = false;
                if (rem.frequency === 'monthly') {
                    showThisMonth = true;
                } else if (rem.frequency === 'quarterly') {
                    const refMonth = rem.createdAt ? new Date(rem.createdAt).getMonth() : 0;
                    showThisMonth = (mo - refMonth + 12) % 3 === 0;
                } else if (rem.frequency === 'yearly') {
                    const refMonth = rem.createdAt ? new Date(rem.createdAt).getMonth() : 0;
                    showThisMonth = mo === refMonth;
                }
                if (showThisMonth) {
                    const daysInMo = new Date(yr, mo + 1, 0).getDate();
                    const day = Math.min(rem.dueDay, daysInMo);
                    const occDate = new Date(yr, mo, day);
                    if (occDate >= today && occDate <= sixMonthsOut) {
                        upcoming.push({
                            reminder: rem,
                            date: occDate,
                            dateStr: `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        });
                    }
                }
                d = new Date(yr, mo + 1, 1);
            }
        });

        upcoming.sort((a, b) => a.date - b.date);
        const display = upcoming.slice(0, 15);

        if (!display.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming bills</p></div>';
            return;
        }

        container.innerHTML = display.map(item => {
            const days = Math.ceil((item.date - today) / 86400000);
            let urgClass = '';
            if (days <= 3) urgClass = 'urgent';
            else if (days <= 7) urgClass = 'soon';

            const dateLabel = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
            const dateFormatted = item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (item.recurring) {
                const cat = this.getCategoryById(item.recurring.categoryId);
                return `<div class="calendar-upcoming-item ${urgClass}" data-action="calendar-jump-to-date" data-date="${item.dateStr}">
                    <div class="calendar-upcoming-dot" style="background:${cat.color}"></div>
                    <div class="calendar-upcoming-info">
                        <span class="calendar-upcoming-name">${this.escapeHtml(item.recurring.name)}</span>
                        <span class="calendar-upcoming-date">${dateFormatted} &middot; ${dateLabel}</span>
                    </div>
                    <span class="calendar-upcoming-amount">${this.formatCurrency(item.recurring.amount)}</span>
                </div>`;
            } else if (item.reminder) {
                return `<div class="calendar-upcoming-item ${urgClass}" data-action="calendar-jump-to-date" data-date="${item.dateStr}">
                    <div class="calendar-upcoming-dot" style="background:${item.reminder.color || '#3b82f6'}"></div>
                    <div class="calendar-upcoming-info">
                        <span class="calendar-upcoming-name">${this.escapeHtml(item.reminder.name)} <span class="reminder-badge">Due Date</span></span>
                        <span class="calendar-upcoming-date">${dateFormatted} &middot; ${dateLabel}</span>
                    </div>
                    ${item.reminder.amount ? `<span class="calendar-upcoming-amount">${this.formatCurrency(item.reminder.amount)}</span>` : ''}
                </div>`;
            }
            return '';
        }).join('');
    }

    // ==========================================
    // BILL REMINDERS
    // ==========================================

    updateReminderAccountDropdown() {
        const sel = document.getElementById('reminder-account');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">None</option>';
        this.data.assets.forEach(a => {
            sel.innerHTML += `<option value="${a.id}">${this.escapeHtml(a.name)} (${this.formatAccountType(a.category)})</option>`;
        });
        sel.value = current;
    }

    saveBillReminder(event) {
        event.preventDefault();
        const id = document.getElementById('bill-reminder-id').value || this.generateId();
        const name = document.getElementById('reminder-name').value.trim();
        const amount = parseFloat(document.getElementById('reminder-amount').value) || 0;
        const dueDay = parseInt(document.getElementById('reminder-due-day').value);
        const frequency = document.getElementById('reminder-frequency').value;
        const color = document.getElementById('reminder-color').value;
        const accountId = document.getElementById('reminder-account').value || null;
        const notes = document.getElementById('reminder-notes').value.trim();

        if (!name) { this.showToast('Name cannot be empty', 'error'); return; }
        if (!dueDay || dueDay < 1 || dueDay > 31) { this.showToast('Due day must be between 1 and 31', 'error'); return; }

        const reminder = { id, name, amount, dueDay, frequency, color, accountId, notes, createdAt: new Date().toISOString() };
        const idx = this.data.billReminders.findIndex(r => r.id === id);
        if (idx > -1) { this.data.billReminders[idx] = reminder; this.showToast('Due date updated', 'success'); }
        else { this.data.billReminders.push(reminder); this.showToast('Due date added', 'success'); }
        this.saveData();
        this.closeModal('bill-reminder-modal');
        this.renderCalendar();
    }

    editBillReminder(id) {
        const r = this.data.billReminders.find(r => r.id === id);
        if (!r) return;
        document.getElementById('bill-reminder-id').value = r.id;
        document.getElementById('bill-reminder-modal-title').textContent = 'Edit Due Date';
        document.getElementById('reminder-name').value = r.name;
        document.getElementById('reminder-amount').value = r.amount || '';
        document.getElementById('reminder-due-day').value = r.dueDay;
        document.getElementById('reminder-frequency').value = r.frequency;
        document.getElementById('reminder-color').value = r.color || '#3b82f6';
        document.getElementById('reminder-notes').value = r.notes || '';
        this.openModal('bill-reminder-modal');
        document.getElementById('reminder-account').value = r.accountId || '';
    }

    deleteBillReminder(id) {
        this.data.billReminders = this.data.billReminders.filter(r => r.id !== id);
        this.saveData();
        this.renderCalendar();
        this.showToast('Due date deleted', 'success');
    }

    // ==========================================

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle' };
        toast.innerHTML = `<i class="fas fa-${icons[type]} toast-icon"></i><span class="toast-message">${this.escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideInRight 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
}

// Initialize the app
const app = new FinanceApp();
