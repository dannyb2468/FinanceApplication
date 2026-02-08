/**
 * FinanceFlow - Personal Finance Tracker
 * A comprehensive financial management application
 */

class FinanceApp {
    constructor() {
        this.data = {
            transactions: [],
            budgets: [],
            recurring: [],
            assets: [],
            networthHistory: [],
            categories: [],
            settings: {
                theme: 'light',
                currency: '$'
            }
        };

        this.charts = {};
        this.currentUser = null;
        this.authMode = 'signin'; // 'signin' or 'signup'
        this.unsubscribeFirestore = null;
        this.isSyncing = false;

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
    // INITIALIZATION
    // ==========================================

    init() {
        this.loadData();
        this.initializeCategories();
        this.setupNavigation();
        this.setupTheme();
        this.updateDateDisplay();
        this.processRecurringTransactions();
        this.renderAll();
        this.setupFormListeners();
        this.setupAuth();

        // Set default date to today
        document.getElementById('trans-date').valueAsDate = new Date();
        document.getElementById('rec-next-date').valueAsDate = new Date();
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
                    if (user) {
                        this.currentUser = user;
                        this.onUserSignedIn(user);
                    } else {
                        this.currentUser = null;
                        this.onUserSignedOut();
                    }
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
        if (this.unsubscribeFirestore) {
            this.unsubscribeFirestore();
            this.unsubscribeFirestore = null;
        }
    }

    async handleAuth(event) {
        event.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');

        try {
            errorEl.textContent = '';
            const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = window.firebaseFunctions;

            if (this.authMode === 'signin') {
                await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            } else {
                await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            }
            this.closeModal('auth-modal');
            document.getElementById('auth-form').reset();
        } catch (error) {
            let message = 'An error occurred';
            if (error.code === 'auth/user-not-found') message = 'No account found with this email';
            else if (error.code === 'auth/wrong-password') message = 'Incorrect password';
            else if (error.code === 'auth/email-already-in-use') message = 'Email already in use';
            else if (error.code === 'auth/weak-password') message = 'Password should be at least 6 characters';
            else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
            else if (error.code === 'auth/invalid-credential') message = 'Invalid email or password';
            errorEl.textContent = message;
        }
    }

    toggleAuthMode(event) {
        event.preventDefault();
        if (this.authMode === 'signin') {
            this.authMode = 'signup';
            document.getElementById('auth-modal-title').textContent = 'Create Account';
            document.getElementById('auth-submit-btn').textContent = 'Sign Up';
            document.getElementById('auth-toggle-text').textContent = 'Already have an account?';
            document.getElementById('auth-toggle-link').textContent = 'Sign In';
        } else {
            this.authMode = 'signin';
            document.getElementById('auth-modal-title').textContent = 'Sign In';
            document.getElementById('auth-submit-btn').textContent = 'Sign In';
            document.getElementById('auth-toggle-text').textContent = "Don't have an account?";
            document.getElementById('auth-toggle-link').textContent = 'Sign Up';
        }
        document.getElementById('auth-error').textContent = '';
    }

    async signOut() {
        try {
            const { signOut } = window.firebaseFunctions;
            await signOut(window.firebaseAuth);
            this.showToast('Signed out', 'success');
        } catch (error) {
            this.showToast('Error signing out', 'error');
        }
    }

    startFirestoreSync() {
        if (!this.currentUser) return;
        const { doc, onSnapshot } = window.firebaseFunctions;
        const userDocRef = doc(window.firebaseDb, 'users', this.currentUser.uid);

        this.updateSyncStatus('syncing');

        this.unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const cloudData = docSnapshot.data();
                if (cloudData.data) {
                    this.data = { ...this.data, ...cloudData.data };
                    this.saveDataLocal();
                    this.renderAll();
                }
            } else {
                this.syncToCloud();
            }
            this.updateSyncStatus('synced');
        }, (error) => {
            console.error('Firestore sync error:', error);
            this.updateSyncStatus('error');
        });
    }

    async syncToCloud() {
        if (!this.currentUser || this.isSyncing) return;
        this.isSyncing = true;
        this.updateSyncStatus('syncing');

        try {
            const { doc, setDoc } = window.firebaseFunctions;
            const userDocRef = doc(window.firebaseDb, 'users', this.currentUser.uid);
            await setDoc(userDocRef, {
                data: this.data,
                updatedAt: new Date().toISOString(),
                email: this.currentUser.email
            });
            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Error syncing to cloud:', error);
            this.updateSyncStatus('error');
        } finally {
            this.isSyncing = false;
        }
    }

    updateSyncStatus(status) {
        const el = document.getElementById('sync-status');
        if (!el) return;
        el.className = 'sync-status ' + status;
        if (status === 'syncing') {
            el.innerHTML = '<i class="fas fa-sync fa-spin"></i><span>Syncing...</span>';
        } else if (status === 'synced') {
            el.innerHTML = '<i class="fas fa-cloud"></i><span>Synced</span>';
        } else {
            el.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Sync error</span>';
        }
    }

    saveDataLocal() {
        localStorage.setItem('financeflow_data', JSON.stringify(this.data));
    }

    loadData() {
        const saved = localStorage.getItem('financeflow_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.data = { ...this.data, ...parsed };
        }
    }

    saveData() {
        localStorage.setItem('financeflow_data', JSON.stringify(this.data));
        // Sync to cloud if signed in
        if (this.currentUser) {
            this.syncToCloud();
        }
    }

    initializeCategories() {
        if (this.data.categories.length === 0) {
            this.data.categories = [...this.defaultCategories];
            this.saveData();
        }
    }

    setupNavigation() {
        // Desktop sidebar navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateTo(page);
                this.closeSidebar();
            });
        });

        // Mobile bottom navigation
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page === 'more') {
                    this.toggleMoreMenu();
                } else {
                    this.navigateTo(page);
                    this.closeMoreMenu();
                }
            });
        });

        // Mobile more menu items
        const moreItems = document.querySelectorAll('.mobile-more-item');
        moreItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateTo(page);
                this.closeMoreMenu();
            });
        });

        // Close more menu when clicking outside
        document.getElementById('mobile-more-menu').addEventListener('click', (e) => {
            if (e.target.id === 'mobile-more-menu') {
                this.closeMoreMenu();
            }
        });
    }

    toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('open');
    }

    closeSidebar() {
        document.querySelector('.sidebar').classList.remove('open');
    }

    toggleMoreMenu() {
        document.getElementById('mobile-more-menu').classList.toggle('active');
        document.querySelector('.mobile-nav-item[data-page="more"]').classList.toggle('active');
    }

    closeMoreMenu() {
        document.getElementById('mobile-more-menu').classList.remove('active');
        document.querySelector('.mobile-nav-item[data-page="more"]').classList.remove('active');
    }

    navigateTo(page) {
        // Update desktop nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update mobile nav
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            if (item.dataset.page !== 'more') {
                item.classList.toggle('active', item.dataset.page === page);
            }
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `${page}-page`);
        });

        // Render page-specific content
        this.renderPageContent(page);
    }

    renderPageContent(page) {
        switch(page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
            case 'budgets':
                this.renderBudgets();
                break;
            case 'recurring':
                this.renderRecurring();
                break;
            case 'networth':
                this.renderNetWorth();
                break;
            case 'reports':
                this.renderReports();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    renderAll() {
        this.renderDashboard();
        this.populateCategorySelects();
    }

    updateDateDisplay() {
        const dateEl = document.querySelector('.date-display');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = new Date().toLocaleDateString(undefined, options);
        }
    }

    setupFormListeners() {
        // Transaction type toggle - update category options
        document.querySelectorAll('input[name="trans-type"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateTransactionCategories());
        });

        document.querySelectorAll('input[name="rec-type"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateRecurringCategories());
        });
    }

    // ==========================================
    // THEME MANAGEMENT
    // ==========================================

    setupTheme() {
        const theme = this.data.settings.theme;
        this.applyTheme(theme);
        document.getElementById('theme-select').value = theme;
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

    formatCurrency(amount) {
        const currency = this.data.settings.currency;
        return `${currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');

        // Populate category selects when opening modals
        if (modalId === 'transaction-modal') {
            this.updateTransactionCategories();
        } else if (modalId === 'recurring-modal') {
            this.updateRecurringCategories();
        } else if (modalId === 'budget-modal') {
            this.populateBudgetCategories();
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        // Reset forms
        const form = document.querySelector(`#${modalId} form`);
        if (form) form.reset();

        // Reset hidden IDs
        document.getElementById('transaction-id').value = '';
        document.getElementById('budget-id').value = '';
        document.getElementById('recurring-id').value = '';
        document.getElementById('asset-id').value = '';
    }

    // ==========================================
    // CATEGORY MANAGEMENT
    // ==========================================

    populateCategorySelects() {
        // Filter category select
        const filterCat = document.getElementById('filter-category');
        filterCat.innerHTML = '<option value="all">All Categories</option>';
        this.data.categories.forEach(cat => {
            filterCat.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }

    updateTransactionCategories() {
        const type = document.querySelector('input[name="trans-type"]:checked').value;
        const select = document.getElementById('trans-category');
        select.innerHTML = '';

        this.data.categories
            .filter(c => c.type === type)
            .forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
    }

    updateRecurringCategories() {
        const type = document.querySelector('input[name="rec-type"]:checked').value;
        const select = document.getElementById('rec-category');
        select.innerHTML = '';

        this.data.categories
            .filter(c => c.type === type)
            .forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
    }

    populateBudgetCategories() {
        const select = document.getElementById('budget-category');
        select.innerHTML = '';

        // Only show expense categories that don't have a budget yet
        const existingBudgetCategories = this.data.budgets.map(b => b.categoryId);

        this.data.categories
            .filter(c => c.type === 'expense' && !existingBudgetCategories.includes(c.id))
            .forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
    }

    getCategoryById(id) {
        return this.data.categories.find(c => c.id === id) || { name: 'Unknown', color: '#64748b' };
    }

    addCategory() {
        const name = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;
        const type = document.getElementById('new-category-type').value;

        if (!name) {
            this.showToast('Please enter a category name', 'error');
            return;
        }

        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        this.data.categories.push({ id, name, color, type });
        this.saveData();

        document.getElementById('new-category-name').value = '';
        this.renderSettings();
        this.showToast('Category added successfully', 'success');
    }

    deleteCategory(id) {
        // Check if category is in use
        const inUse = this.data.transactions.some(t => t.categoryId === id) ||
                      this.data.budgets.some(b => b.categoryId === id) ||
                      this.data.recurring.some(r => r.categoryId === id);

        if (inUse) {
            this.showToast('Cannot delete category that is in use', 'error');
            return;
        }

        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.saveData();
        this.renderSettings();
        this.showToast('Category deleted', 'success');
    }

    // ==========================================
    // TRANSACTIONS
    // ==========================================

    saveTransaction(event) {
        event.preventDefault();

        const id = document.getElementById('transaction-id').value || Date.now().toString();
        const type = document.querySelector('input[name="trans-type"]:checked').value;
        const amount = parseFloat(document.getElementById('trans-amount').value);
        const description = document.getElementById('trans-description').value;
        const categoryId = document.getElementById('trans-category').value;
        const date = document.getElementById('trans-date').value;
        const notes = document.getElementById('trans-notes').value;

        const transaction = {
            id,
            type,
            amount,
            description,
            categoryId,
            date,
            notes,
            createdAt: new Date().toISOString()
        };

        const existingIndex = this.data.transactions.findIndex(t => t.id === id);
        if (existingIndex > -1) {
            this.data.transactions[existingIndex] = transaction;
            this.showToast('Transaction updated', 'success');
        } else {
            this.data.transactions.push(transaction);
            this.showToast('Transaction added', 'success');
        }

        this.saveData();
        this.closeModal('transaction-modal');
        this.renderTransactions();
        this.renderDashboard();
    }

    editTransaction(id) {
        const trans = this.data.transactions.find(t => t.id === id);
        if (!trans) return;

        document.getElementById('transaction-id').value = trans.id;
        document.getElementById('transaction-modal-title').textContent = 'Edit Transaction';

        // Set type first to populate correct categories
        document.getElementById(`trans-${trans.type}`).checked = true;
        this.updateTransactionCategories();

        document.getElementById('trans-amount').value = trans.amount;
        document.getElementById('trans-description').value = trans.description;
        document.getElementById('trans-category').value = trans.categoryId;
        document.getElementById('trans-date').value = trans.date;
        document.getElementById('trans-notes').value = trans.notes || '';

        this.openModal('transaction-modal');
    }

    deleteTransaction(id) {
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        this.saveData();
        this.renderTransactions();
        this.renderDashboard();
        this.showToast('Transaction deleted', 'success');
    }

    filterTransactions() {
        this.renderTransactions();
    }

    getFilteredTransactions() {
        let transactions = [...this.data.transactions];

        const type = document.getElementById('filter-type').value;
        const category = document.getElementById('filter-category').value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;
        const search = document.getElementById('filter-search').value.toLowerCase();

        if (type !== 'all') {
            transactions = transactions.filter(t => t.type === type);
        }

        if (category !== 'all') {
            transactions = transactions.filter(t => t.categoryId === category);
        }

        if (dateFrom) {
            transactions = transactions.filter(t => t.date >= dateFrom);
        }

        if (dateTo) {
            transactions = transactions.filter(t => t.date <= dateTo);
        }

        if (search) {
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(search) ||
                this.getCategoryById(t.categoryId).name.toLowerCase().includes(search)
            );
        }

        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    renderTransactions() {
        const tbody = document.getElementById('transactions-tbody');
        const transactions = this.getFilteredTransactions();

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <i class="fas fa-receipt"></i>
                            <p>No transactions found. Add your first transaction!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(t => {
            const category = this.getCategoryById(t.categoryId);
            const formattedDate = new Date(t.date).toLocaleDateString();
            const amountClass = t.type === 'income' ? 'income' : 'expense';
            const amountPrefix = t.type === 'income' ? '+' : '-';

            return `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${t.description}</td>
                    <td>
                        <span style="display: inline-flex; align-items: center; gap: 8px;">
                            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${category.color}"></span>
                            ${category.name}
                        </span>
                    </td>
                    <td class="transaction-amount ${amountClass}">${amountPrefix}${this.formatCurrency(t.amount)}</td>
                    <td>
                        <button class="btn-icon" onclick="app.editTransaction('${t.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="app.deleteTransaction('${t.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================
    // BUDGETS
    // ==========================================

    saveBudget(event) {
        event.preventDefault();

        const id = document.getElementById('budget-id').value || Date.now().toString();
        const categoryId = document.getElementById('budget-category').value;
        const amount = parseFloat(document.getElementById('budget-amount').value);

        const budget = {
            id,
            categoryId,
            amount,
            createdAt: new Date().toISOString()
        };

        const existingIndex = this.data.budgets.findIndex(b => b.id === id);
        if (existingIndex > -1) {
            this.data.budgets[existingIndex] = budget;
            this.showToast('Budget updated', 'success');
        } else {
            this.data.budgets.push(budget);
            this.showToast('Budget created', 'success');
        }

        this.saveData();
        this.closeModal('budget-modal');
        this.renderBudgets();
        this.renderDashboard();
    }

    editBudget(id) {
        const budget = this.data.budgets.find(b => b.id === id);
        if (!budget) return;

        document.getElementById('budget-id').value = budget.id;
        document.getElementById('budget-modal-title').textContent = 'Edit Budget';

        // Temporarily add the current category to the select
        const select = document.getElementById('budget-category');
        const category = this.getCategoryById(budget.categoryId);
        select.innerHTML = `<option value="${budget.categoryId}">${category.name}</option>`;

        document.getElementById('budget-amount').value = budget.amount;

        this.openModal('budget-modal');
    }

    deleteBudget(id) {
        this.data.budgets = this.data.budgets.filter(b => b.id !== id);
        this.saveData();
        this.renderBudgets();
        this.renderDashboard();
        this.showToast('Budget deleted', 'success');
    }

    getBudgetSpending(categoryId) {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return this.data.transactions
            .filter(t =>
                t.type === 'expense' &&
                t.categoryId === categoryId &&
                new Date(t.date) >= firstOfMonth &&
                new Date(t.date) <= lastOfMonth
            )
            .reduce((sum, t) => sum + t.amount, 0);
    }

    renderBudgets() {
        const grid = document.getElementById('budgets-grid');
        const budgets = this.data.budgets;

        // Calculate totals
        let totalBudgeted = 0;
        let totalSpent = 0;

        budgets.forEach(b => {
            totalBudgeted += b.amount;
            totalSpent += this.getBudgetSpending(b.categoryId);
        });

        document.getElementById('total-budgeted').textContent = this.formatCurrency(totalBudgeted);
        document.getElementById('total-spent').textContent = this.formatCurrency(totalSpent);
        document.getElementById('total-remaining').textContent = this.formatCurrency(totalBudgeted - totalSpent);

        if (budgets.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-piggy-bank"></i>
                    <p>No budgets set. Create your first budget to start tracking!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = budgets.map(b => {
            const category = this.getCategoryById(b.categoryId);
            const spent = this.getBudgetSpending(b.categoryId);
            const remaining = b.amount - spent;
            const percentage = Math.min((spent / b.amount) * 100, 100);

            let progressClass = 'under';
            if (percentage >= 90) progressClass = 'over';
            else if (percentage >= 75) progressClass = 'warning';

            return `
                <div class="budget-card">
                    <div class="budget-card-header">
                        <div class="budget-card-title">
                            <span class="category-dot" style="background: ${category.color}"></span>
                            <h4>${category.name}</h4>
                        </div>
                        <div class="budget-card-actions">
                            <button class="btn-icon" onclick="app.editBudget('${b.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete" onclick="app.deleteBudget('${b.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="budget-amounts">
                        <span class="budget-spent">Spent: <span>${this.formatCurrency(spent)}</span></span>
                        <span class="budget-limit">Budget: <span>${this.formatCurrency(b.amount)}</span></span>
                    </div>
                    <div class="budget-progress">
                        <div class="budget-progress-fill ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="budget-remaining">
                        ${remaining >= 0 ? `${this.formatCurrency(remaining)} remaining` : `${this.formatCurrency(Math.abs(remaining))} over budget`}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==========================================
    // RECURRING TRANSACTIONS
    // ==========================================

    saveRecurring(event) {
        event.preventDefault();

        const id = document.getElementById('recurring-id').value || Date.now().toString();
        const type = document.querySelector('input[name="rec-type"]:checked').value;
        const name = document.getElementById('rec-name').value;
        const amount = parseFloat(document.getElementById('rec-amount').value);
        const categoryId = document.getElementById('rec-category').value;
        const frequency = document.getElementById('rec-frequency').value;
        const nextDate = document.getElementById('rec-next-date').value;

        const recurring = {
            id,
            type,
            name,
            amount,
            categoryId,
            frequency,
            nextDate,
            createdAt: new Date().toISOString()
        };

        const existingIndex = this.data.recurring.findIndex(r => r.id === id);
        if (existingIndex > -1) {
            this.data.recurring[existingIndex] = recurring;
            this.showToast('Recurring transaction updated', 'success');
        } else {
            this.data.recurring.push(recurring);
            this.showToast('Recurring transaction added', 'success');
        }

        this.saveData();
        this.closeModal('recurring-modal');
        this.renderRecurring();
        this.renderDashboard();
    }

    editRecurring(id) {
        const rec = this.data.recurring.find(r => r.id === id);
        if (!rec) return;

        document.getElementById('recurring-id').value = rec.id;
        document.getElementById('recurring-modal-title').textContent = 'Edit Recurring Transaction';

        document.getElementById(`rec-${rec.type}`).checked = true;
        this.updateRecurringCategories();

        document.getElementById('rec-name').value = rec.name;
        document.getElementById('rec-amount').value = rec.amount;
        document.getElementById('rec-category').value = rec.categoryId;
        document.getElementById('rec-frequency').value = rec.frequency;
        document.getElementById('rec-next-date').value = rec.nextDate;

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.data.recurring.forEach(rec => {
            let nextDate = new Date(rec.nextDate);
            nextDate.setHours(0, 0, 0, 0);

            while (nextDate <= today) {
                // Create transaction
                const transaction = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    type: rec.type,
                    amount: rec.amount,
                    description: rec.name + ' (Recurring)',
                    categoryId: rec.categoryId,
                    date: nextDate.toISOString().split('T')[0],
                    notes: 'Auto-generated from recurring transaction',
                    createdAt: new Date().toISOString()
                };
                this.data.transactions.push(transaction);

                // Calculate next occurrence
                nextDate = this.getNextRecurringDate(nextDate, rec.frequency);
            }

            // Update next date
            rec.nextDate = nextDate.toISOString().split('T')[0];
        });

        this.saveData();
    }

    getNextRecurringDate(date, frequency) {
        const next = new Date(date);
        switch(frequency) {
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'biweekly':
                next.setDate(next.getDate() + 14);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
            case 'quarterly':
                next.setMonth(next.getMonth() + 3);
                break;
            case 'yearly':
                next.setFullYear(next.getFullYear() + 1);
                break;
        }
        return next;
    }

    getMonthlyEquivalent(amount, frequency) {
        switch(frequency) {
            case 'weekly': return amount * 4.33;
            case 'biweekly': return amount * 2.17;
            case 'monthly': return amount;
            case 'quarterly': return amount / 3;
            case 'yearly': return amount / 12;
            default: return amount;
        }
    }

    renderRecurring() {
        const tbody = document.getElementById('recurring-tbody');
        const recurring = this.data.recurring;

        // Calculate totals
        let monthlyIncome = 0;
        let monthlyExpenses = 0;

        recurring.forEach(r => {
            const monthly = this.getMonthlyEquivalent(r.amount, r.frequency);
            if (r.type === 'income') {
                monthlyIncome += monthly;
            } else {
                monthlyExpenses += monthly;
            }
        });

        document.getElementById('recurring-income').textContent = this.formatCurrency(monthlyIncome);
        document.getElementById('recurring-expenses').textContent = this.formatCurrency(monthlyExpenses);
        document.getElementById('recurring-net').textContent = this.formatCurrency(monthlyIncome - monthlyExpenses);

        if (recurring.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="fas fa-sync-alt"></i>
                            <p>No recurring transactions. Add subscriptions and regular bills here!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recurring.map(r => {
            const category = this.getCategoryById(r.categoryId);
            const amountClass = r.type === 'income' ? 'income' : 'expense';
            const amountPrefix = r.type === 'income' ? '+' : '-';
            const nextDate = new Date(r.nextDate).toLocaleDateString();

            return `
                <tr>
                    <td>${r.name}</td>
                    <td>
                        <span style="display: inline-flex; align-items: center; gap: 8px;">
                            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${category.color}"></span>
                            ${category.name}
                        </span>
                    </td>
                    <td class="transaction-amount ${amountClass}">${amountPrefix}${this.formatCurrency(r.amount)}</td>
                    <td style="text-transform: capitalize;">${r.frequency}</td>
                    <td>${nextDate}</td>
                    <td>
                        <button class="btn-icon" onclick="app.editRecurring('${r.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="app.deleteRecurring('${r.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================
    // NET WORTH
    // ==========================================

    saveAsset(event) {
        event.preventDefault();

        const id = document.getElementById('asset-id').value || Date.now().toString();
        const type = document.querySelector('input[name="asset-type"]:checked').value;
        const name = document.getElementById('asset-name').value;
        const value = parseFloat(document.getElementById('asset-value').value);
        const category = document.getElementById('asset-category-select').value;
        const notes = document.getElementById('asset-notes').value;

        const asset = {
            id,
            type,
            name,
            value,
            category,
            notes,
            updatedAt: new Date().toISOString()
        };

        const existingIndex = this.data.assets.findIndex(a => a.id === id);
        if (existingIndex > -1) {
            this.data.assets[existingIndex] = asset;
            this.showToast('Updated successfully', 'success');
        } else {
            this.data.assets.push(asset);
            this.showToast('Added successfully', 'success');
        }

        // Record net worth history
        this.recordNetworthSnapshot();

        this.saveData();
        this.closeModal('asset-modal');
        this.renderNetWorth();
        this.renderDashboard();
    }

    editAsset(id) {
        const asset = this.data.assets.find(a => a.id === id);
        if (!asset) return;

        document.getElementById('asset-id').value = asset.id;
        document.getElementById('asset-modal-title').textContent = 'Edit ' + (asset.type === 'asset' ? 'Asset' : 'Liability');

        document.getElementById(`asset-${asset.type}`).checked = true;
        document.getElementById('asset-name').value = asset.name;
        document.getElementById('asset-value').value = asset.value;
        document.getElementById('asset-category-select').value = asset.category;
        document.getElementById('asset-notes').value = asset.notes || '';

        this.openModal('asset-modal');
    }

    deleteAsset(id) {
        this.data.assets = this.data.assets.filter(a => a.id !== id);
        this.recordNetworthSnapshot();
        this.saveData();
        this.renderNetWorth();
        this.renderDashboard();
        this.showToast('Deleted successfully', 'success');
    }

    recordNetworthSnapshot() {
        const totalAssets = this.data.assets
            .filter(a => a.type === 'asset')
            .reduce((sum, a) => sum + a.value, 0);

        const totalLiabilities = this.data.assets
            .filter(a => a.type === 'liability')
            .reduce((sum, a) => sum + a.value, 0);

        const today = new Date().toISOString().split('T')[0];

        // Remove any existing entry for today
        this.data.networthHistory = this.data.networthHistory.filter(h => h.date !== today);

        // Add new snapshot
        this.data.networthHistory.push({
            date: today,
            assets: totalAssets,
            liabilities: totalLiabilities,
            networth: totalAssets - totalLiabilities
        });

        // Keep only last 365 days
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        this.data.networthHistory = this.data.networthHistory.filter(
            h => new Date(h.date) >= oneYearAgo
        );
    }

    renderNetWorth() {
        const totalAssets = this.data.assets
            .filter(a => a.type === 'asset')
            .reduce((sum, a) => sum + a.value, 0);

        const totalLiabilities = this.data.assets
            .filter(a => a.type === 'liability')
            .reduce((sum, a) => sum + a.value, 0);

        const networth = totalAssets - totalLiabilities;

        document.getElementById('total-assets').textContent = this.formatCurrency(totalAssets);
        document.getElementById('total-liabilities').textContent = this.formatCurrency(totalLiabilities);
        document.getElementById('networth-value').textContent = this.formatCurrency(networth);

        // Render assets list
        const assetsList = document.getElementById('assets-list');
        const assets = this.data.assets.filter(a => a.type === 'asset');

        if (assets.length === 0) {
            assetsList.innerHTML = '<div class="empty-state"><p>No assets added yet</p></div>';
        } else {
            assetsList.innerHTML = assets.map(a => `
                <div class="asset-item">
                    <div class="asset-info">
                        <span class="asset-name">${a.name}</span>
                        <span class="asset-category">${this.formatAssetCategory(a.category)}</span>
                    </div>
                    <span class="asset-value">${this.formatCurrency(a.value)}</span>
                    <div class="asset-actions">
                        <button class="btn-icon" onclick="app.editAsset('${a.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="app.deleteAsset('${a.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Render liabilities list
        const liabilitiesList = document.getElementById('liabilities-list');
        const liabilities = this.data.assets.filter(a => a.type === 'liability');

        if (liabilities.length === 0) {
            liabilitiesList.innerHTML = '<div class="empty-state"><p>No liabilities added yet</p></div>';
        } else {
            liabilitiesList.innerHTML = liabilities.map(a => `
                <div class="liability-item">
                    <div class="liability-info">
                        <span class="liability-name">${a.name}</span>
                        <span class="liability-category">${this.formatAssetCategory(a.category)}</span>
                    </div>
                    <span class="liability-value">${this.formatCurrency(a.value)}</span>
                    <div class="liability-actions">
                        <button class="btn-icon" onclick="app.editAsset('${a.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="app.deleteAsset('${a.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Render net worth chart
        this.renderNetworthChart();
    }

    formatAssetCategory(category) {
        const names = {
            'cash': 'Cash & Bank',
            'investments': 'Investments',
            'retirement': 'Retirement',
            'property': 'Property',
            'vehicles': 'Vehicles',
            'other-asset': 'Other',
            'credit-cards': 'Credit Cards',
            'loans': 'Loans',
            'mortgage': 'Mortgage',
            'other-liability': 'Other'
        };
        return names[category] || category;
    }

    renderNetworthChart() {
        const ctx = document.getElementById('networth-chart');
        if (!ctx) return;

        if (this.charts.networth) {
            this.charts.networth.destroy();
        }

        const history = this.data.networthHistory.slice(-12); // Last 12 data points

        if (history.length < 2) {
            ctx.parentElement.innerHTML = '<div class="empty-state"><p>Not enough data for chart. Update your assets regularly to see trends.</p></div>';
            return;
        }

        this.charts.networth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.map(h => new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Net Worth',
                    data: history.map(h => h.networth),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // ==========================================
    // DASHBOARD
    // ==========================================

    renderDashboard() {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Calculate monthly stats
        const monthlyTransactions = this.data.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= firstOfMonth && date <= lastOfMonth;
        });

        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalAssets = this.data.assets
            .filter(a => a.type === 'asset')
            .reduce((sum, a) => sum + a.value, 0);

        const totalLiabilities = this.data.assets
            .filter(a => a.type === 'liability')
            .reduce((sum, a) => sum + a.value, 0);

        document.getElementById('monthly-income').textContent = '+' + this.formatCurrency(monthlyIncome);
        document.getElementById('monthly-expenses').textContent = '-' + this.formatCurrency(monthlyExpenses);
        document.getElementById('monthly-balance').textContent = this.formatCurrency(monthlyIncome - monthlyExpenses);
        document.getElementById('total-networth').textContent = this.formatCurrency(totalAssets - totalLiabilities);

        // Render budget overview
        this.renderBudgetOverview();

        // Render spending pie chart
        this.renderSpendingPieChart(monthlyTransactions);

        // Render recent transactions
        this.renderRecentTransactions();

        // Render upcoming recurring
        this.renderUpcomingRecurring();
    }

    renderBudgetOverview() {
        const container = document.getElementById('budget-bars');
        const budgets = this.data.budgets.slice(0, 5); // Show top 5

        if (budgets.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No budgets set</p></div>';
            return;
        }

        container.innerHTML = budgets.map(b => {
            const category = this.getCategoryById(b.categoryId);
            const spent = this.getBudgetSpending(b.categoryId);
            const percentage = Math.min((spent / b.amount) * 100, 100);

            let progressClass = 'under';
            if (percentage >= 90) progressClass = 'over';
            else if (percentage >= 75) progressClass = 'warning';

            return `
                <div class="budget-bar-item">
                    <div class="budget-bar-header">
                        <span class="budget-bar-name">${category.name}</span>
                        <span class="budget-bar-amount">${this.formatCurrency(spent)} / ${this.formatCurrency(b.amount)}</span>
                    </div>
                    <div class="budget-bar-track">
                        <div class="budget-bar-fill ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSpendingPieChart(transactions) {
        const ctx = document.getElementById('spending-pie-chart');
        if (!ctx) return;

        if (this.charts.spendingPie) {
            this.charts.spendingPie.destroy();
        }

        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            ctx.parentElement.innerHTML = '<canvas id="spending-pie-chart"></canvas><div class="empty-state" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"><p>No expenses this month</p></div>';
            return;
        }

        // Group by category
        const categoryTotals = {};
        expenses.forEach(t => {
            const cat = this.getCategoryById(t.categoryId);
            if (!categoryTotals[t.categoryId]) {
                categoryTotals[t.categoryId] = { name: cat.name, color: cat.color, total: 0 };
            }
            categoryTotals[t.categoryId].total += t.amount;
        });

        const labels = Object.values(categoryTotals).map(c => c.name);
        const data = Object.values(categoryTotals).map(c => c.total);
        const colors = Object.values(categoryTotals).map(c => c.color);

        this.charts.spendingPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 12
                        }
                    }
                }
            }
        });
    }

    renderRecentTransactions() {
        const container = document.getElementById('recent-transactions-list');
        const recent = this.data.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No transactions yet</p></div>';
            return;
        }

        container.innerHTML = recent.map(t => {
            const category = this.getCategoryById(t.categoryId);
            const amountClass = t.type === 'income' ? 'income' : 'expense';
            const amountPrefix = t.type === 'income' ? '+' : '-';

            return `
                <div class="transaction-item">
                    <div class="transaction-icon" style="background: ${category.color}20; color: ${category.color}">
                        <i class="fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-description">${t.description}</div>
                        <div class="transaction-category">${category.name}</div>
                    </div>
                    <div class="transaction-amount ${amountClass}">${amountPrefix}${this.formatCurrency(t.amount)}</div>
                </div>
            `;
        }).join('');
    }

    renderUpcomingRecurring() {
        const container = document.getElementById('upcoming-recurring-list');

        const upcoming = this.data.recurring
            .map(r => ({ ...r, nextDateObj: new Date(r.nextDate) }))
            .sort((a, b) => a.nextDateObj - b.nextDateObj)
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recurring transactions</p></div>';
            return;
        }

        container.innerHTML = upcoming.map(r => {
            const amountClass = r.type === 'income' ? 'income' : 'expense';
            const amountPrefix = r.type === 'income' ? '+' : '-';
            const daysUntil = Math.ceil((r.nextDateObj - new Date()) / (1000 * 60 * 60 * 24));
            let dateText = r.nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (daysUntil === 0) dateText = 'Today';
            else if (daysUntil === 1) dateText = 'Tomorrow';
            else if (daysUntil < 0) dateText = 'Overdue';

            return `
                <div class="recurring-item">
                    <div class="recurring-info">
                        <div class="recurring-name">${r.name}</div>
                        <div class="recurring-date">${dateText}</div>
                    </div>
                    <div class="recurring-amount ${amountClass}">${amountPrefix}${this.formatCurrency(r.amount)}</div>
                </div>
            `;
        }).join('');
    }

    // ==========================================
    // REPORTS
    // ==========================================

    updateReports() {
        this.renderReports();
    }

    getReportDateRange() {
        const period = document.getElementById('report-period').value;
        const now = new Date();
        let start, end;

        switch(period) {
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last3Months':
                start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last6Months':
                start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            case 'allTime':
                start = new Date(2000, 0, 1);
                end = new Date(2100, 0, 1);
                break;
        }

        return { start, end };
    }

    renderReports() {
        const { start, end } = this.getReportDateRange();

        const transactions = this.data.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= start && date <= end;
        });

        this.renderIncomeExpenseChart(transactions, start, end);
        this.renderExpenseBreakdownChart(transactions);
        this.renderSpendingTrendChart(transactions, start, end);
        this.renderSavingsChart(transactions, start, end);
        this.renderCategoryStats(transactions);
    }

    renderIncomeExpenseChart(transactions, start, end) {
        const ctx = document.getElementById('income-expense-chart');
        if (!ctx) return;

        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }

        // Group by month
        const monthlyData = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[key]) {
                monthlyData[key] = { income: 0, expense: 0 };
            }

            if (t.type === 'income') {
                monthlyData[key].income += t.amount;
            } else {
                monthlyData[key].expense += t.amount;
            }
        });

        const labels = Object.keys(monthlyData).sort();
        const incomeData = labels.map(k => monthlyData[k].income);
        const expenseData = labels.map(k => monthlyData[k].expense);

        const formattedLabels = labels.map(l => {
            const [year, month] = l.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: formattedLabels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    renderExpenseBreakdownChart(transactions) {
        const ctx = document.getElementById('expense-breakdown-chart');
        if (!ctx) return;

        if (this.charts.expenseBreakdown) {
            this.charts.expenseBreakdown.destroy();
        }

        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            return;
        }

        const categoryTotals = {};
        expenses.forEach(t => {
            const cat = this.getCategoryById(t.categoryId);
            if (!categoryTotals[t.categoryId]) {
                categoryTotals[t.categoryId] = { name: cat.name, color: cat.color, total: 0 };
            }
            categoryTotals[t.categoryId].total += t.amount;
        });

        const sorted = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

        this.charts.expenseBreakdown = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: sorted.map(c => c.name),
                datasets: [{
                    data: sorted.map(c => c.total),
                    backgroundColor: sorted.map(c => c.color),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 8
                        }
                    }
                }
            }
        });
    }

    renderSpendingTrendChart(transactions, start, end) {
        const ctx = document.getElementById('spending-trend-chart');
        if (!ctx) return;

        if (this.charts.spendingTrend) {
            this.charts.spendingTrend.destroy();
        }

        const dailySpending = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            if (!dailySpending[t.date]) {
                dailySpending[t.date] = 0;
            }
            dailySpending[t.date] += t.amount;
        });

        const dates = Object.keys(dailySpending).sort();
        const values = dates.map(d => dailySpending[d]);

        // Calculate running average
        const avgValues = values.map((v, i) => {
            const start = Math.max(0, i - 6);
            const subset = values.slice(start, i + 1);
            return subset.reduce((a, b) => a + b, 0) / subset.length;
        });

        this.charts.spendingTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                datasets: [
                    {
                        label: 'Daily Spending',
                        data: values,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: '7-Day Average',
                        data: avgValues,
                        borderColor: '#6366f1',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    renderSavingsChart(transactions, start, end) {
        const ctx = document.getElementById('savings-chart');
        if (!ctx) return;

        if (this.charts.savings) {
            this.charts.savings.destroy();
        }

        const monthlyData = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[key]) {
                monthlyData[key] = { income: 0, expense: 0 };
            }

            if (t.type === 'income') {
                monthlyData[key].income += t.amount;
            } else {
                monthlyData[key].expense += t.amount;
            }
        });

        const labels = Object.keys(monthlyData).sort();
        const savingsRate = labels.map(k => {
            const data = monthlyData[k];
            if (data.income === 0) return 0;
            return ((data.income - data.expense) / data.income) * 100;
        });

        const formattedLabels = labels.map(l => {
            const [year, month] = l.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        this.charts.savings = new Chart(ctx, {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Savings Rate %',
                    data: savingsRate,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                }
            }
        });
    }

    renderCategoryStats(transactions) {
        const tbody = document.getElementById('category-stats-tbody');
        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>No expense data for this period</p></div></td></tr>';
            return;
        }

        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        const categoryStats = {};
        expenses.forEach(t => {
            if (!categoryStats[t.categoryId]) {
                const cat = this.getCategoryById(t.categoryId);
                categoryStats[t.categoryId] = {
                    name: cat.name,
                    color: cat.color,
                    total: 0,
                    count: 0
                };
            }
            categoryStats[t.categoryId].total += t.amount;
            categoryStats[t.categoryId].count++;
        });

        const sorted = Object.values(categoryStats).sort((a, b) => b.total - a.total);

        tbody.innerHTML = sorted.map(stat => `
            <tr>
                <td>
                    <span style="display: inline-flex; align-items: center; gap: 8px;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${stat.color}"></span>
                        ${stat.name}
                    </span>
                </td>
                <td>${this.formatCurrency(stat.total)}</td>
                <td>${stat.count}</td>
                <td>${this.formatCurrency(stat.total / stat.count)}</td>
                <td>${((stat.total / totalExpenses) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');
    }

    // ==========================================
    // SETTINGS
    // ==========================================

    renderSettings() {
        const list = document.getElementById('categories-list');

        list.innerHTML = this.data.categories.map(cat => `
            <div class="category-item">
                <span class="category-color" style="background: ${cat.color}"></span>
                <span class="category-name">${cat.name}</span>
                <span class="category-type ${cat.type}">${cat.type}</span>
                <button class="btn-icon delete" onclick="app.deleteCategory('${cat.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // ==========================================
    // DATA MANAGEMENT
    // ==========================================

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
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

                // Validate structure
                if (imported.transactions && imported.categories) {
                    this.data = { ...this.data, ...imported };
                    this.saveData();
                    this.renderAll();
                    this.showToast('Data imported successfully', 'success');
                } else {
                    this.showToast('Invalid file format', 'error');
                }
            } catch (error) {
                this.showToast('Error reading file', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    confirmClearData() {
        document.getElementById('confirm-title').textContent = 'Clear All Data';
        document.getElementById('confirm-message').textContent = 'Are you sure you want to delete all your financial data? This action cannot be undone.';
        document.getElementById('confirm-action-btn').onclick = () => this.clearAllData();
        this.openModal('confirm-dialog');
    }

    clearAllData() {
        localStorage.removeItem('financeflow_data');
        this.data = {
            transactions: [],
            budgets: [],
            recurring: [],
            assets: [],
            networthHistory: [],
            categories: [...this.defaultCategories],
            settings: {
                theme: 'light',
                currency: '$'
            }
        };
        this.saveData();
        this.closeModal('confirm-dialog');
        this.renderAll();
        this.showToast('All data cleared', 'success');
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle'
        };

        toast.innerHTML = `
            <i class="fas fa-${icons[type]} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the app
const app = new FinanceApp();
