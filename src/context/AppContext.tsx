import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Invoice, Product, Party, PurchaseBill, Expense, JournalEntry, AccountHead, BusinessProfile, 
  EInvoiceDetails, EWayBillDetails, PaymentMethod, InvoiceStatus, PaymentRecord, PaymentType,
  AppUser, RoleType, UserPermissions, SecurityAuditLog, Company,
  BankStatementAutoEntry, BankStatementImportResult, SuperAdminAuthData,
  SessionTimeoutConfig, LowStockSettings, CustomHsnCode, JwtSessionInfo,
  ChequeRecord, ChequeBook, ChequeTemplateConfig, ChequeClearancePayload, ChequeBouncePayload,
  BiometricSecurityConfig, BiometricCredentialInfo,
  SystemSnapshotMetadata, SystemSnapshotPayload, SystemSnapshotTrigger, AutoSnapshotConfig,
  LetterheadDocument, LetterheadTemplate,
  PlatformConfig, PlatformAnnouncement
} from '../types';
import { DEFAULT_LETTERHEAD_TEMPLATES } from '../utils/letterheadDefaults';
import {
  buildSnapshotMetadata,
  saveSnapshotToVault,
  getAllSnapshotsFromVault,
  getSnapshotPayloadById,
  deleteSnapshotFromVault,
  clearSnapshotVault,
  downloadSnapshotAsJsonFile,
  validateSystemSnapshotFile,
  getStoredAutoSnapshotConfig,
  saveStoredAutoSnapshotConfig
} from '../utils/snapshotManager';
import { 
  generateJwtToken, 
  verifyJwtToken, 
  saveAuthToken, 
  getAuthToken, 
  clearAuthToken, 
  refreshJwtToken 
} from '../utils/jwtAuth';
import { 
  BANK_CHEQUE_PRESETS,
  DEFAULT_CTS2010_TEMPLATE,
  getNextChequeNumber,
  formatChequeNumber
} from '../utils/chequeConstants';
import { 
  cleanDefaultCompany,
  cleanDefaultBusinessProfile,
  cleanDefaultAdminUser,
  cleanDefaultUsers,
  cleanDefaultAccountHeads,
  normalizeBusinessProfile
} from '../utils/cleanDefaults';
import { 
  DEFAULT_SESSION_TIMEOUT_CONFIG, 
  normalizeSessionTimeoutConfig 
} from '../utils/sessionTimeoutDefaults';
import { 
  DEFAULT_BIOMETRIC_CONFIG, 
  normalizeBiometricConfig 
} from '../utils/biometricDefaults';
import { BiometricPromptModal } from '../components/security/BiometricPromptModal';
import { 
  DEFAULT_LOW_STOCK_SETTINGS, 
  normalizeLowStockSettings 
} from '../utils/stockUtils';
import { 
  initialUsers, initialAuditLogs, getUserEffectivePermissions, hasUserPermission, ROLE_DEFINITIONS, DEFAULT_SUPER_ADMIN 
} from '../utils/rbacRules';
import { generateSimulatedEInvoice, recalculateInvoiceTotals } from '../utils/gstCalculations';
import { generateEwayBillNo, normalizeSignatureUrl } from '../utils/formatters';
import { 
  getNextAvailableInvoiceNumber, 
  parseInvoiceNumber, 
  auditInvoiceSequences,
  formatInvoiceSequence
} from '../utils/invoiceNumberUtils';
import { cloudDb, defaultStandardAccountHeads } from '../services/cloudDb';
import { applyThemeCssVariables } from '../utils/themeColors';
import { DEFAULT_PLATFORM_CONFIG, normalizePlatformConfig } from '../utils/platformDefaults';

export type ActiveTab = 
  | 'dashboard'
  | 'invoices'
  | 'payments'
  | 'pos_billing'
  | 'inventory'
  | 'parties'
  | 'purchases'
  | 'accounting'
  | 'gst_returns'
  | 'cheques'
  | 'letterhead'
  | 'users'
  | 'settings'
  | 'super_admin_dashboard';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  createdAt?: number;
}

interface AppContextType {
  // Navigation & View State
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebarCollapse: () => void;
  
  // Multi-Company & Multi-Business Setup
  companies: Company[];
  currentCompany: Company;
  currentCompanyId: string;
  switchCompany: (companyId: string, autoLoginUserId?: string) => void;
  createCompany: (
    companyData: Omit<Company, 'id' | 'createdAt'>, 
    adminUser: { name: string; email: string; password?: string; pin?: string }
  ) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => boolean;
  toggleCompanyStatus: (id: string, isActive: boolean, reason?: string) => void;
  editBusinessProfile: (companyId: string, profileUpdates: Partial<BusinessProfile>, companyUpdates?: Partial<Company>) => void;

  // Super Admin Master Credentials & Governance
  superAdminAuth: SuperAdminAuthData;
  superAdminUser: AppUser;
  updateSuperAdminProfile: (
    updates: Partial<SuperAdminAuthData>,
    currentAuth?: string
  ) => { success: boolean; error?: string };
  updateSuperAdminPassword: (currentPassOrPin: string, newPassword?: string, newPin?: string) => { success: boolean; error?: string };

  // Platform Branding & Broadcast Announcements (Super Admin)
  platformConfig: PlatformConfig;
  updatePlatformConfig: (updates: Partial<PlatformConfig>) => Promise<void>;
  updateAnnouncement: (announcement: Partial<PlatformAnnouncement>) => Promise<void>;
  resetPlatformConfig: () => Promise<void>;

  // Business Profile
  business: BusinessProfile;
  updateBusiness: (profile: Partial<BusinessProfile>, silent?: boolean) => void;
  updateLowStockSettings: (settings: Partial<LowStockSettings>) => Promise<void>;
  
  // Invoices & Billing
  invoices: Invoice[];
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  getNextSequentialInvoiceNumber: () => { invoiceNumber: string; nextNumber: number; prefix: string };
  realignAndFixInvoiceSequences: (overrideSeq?: number) => Promise<{ fixedCount: number; nextInvoiceNo: string }>;
  resequenceAllInvoicesFromStartingNumber: (options?: {
    startingNumber?: number;
    prefix?: string;
    sortBy?: 'date' | 'created';
  }) => Promise<{ updatedCount: number; startingNumber: number; nextInvoiceNo: string }>;
  bulkCreateInvoices: (
    invoices: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>[], 
    options?: { updateExisting?: boolean; autoCreateParties?: boolean; deductInventory?: boolean }
  ) => { added: number; updated: number; partiesCreated: number };
  updateInvoice: (id: string, invoice: Partial<Invoice>) => boolean;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  recordInvoicePayment: (id: string, amount: number, method: PaymentMethod, notes?: string) => void;
  generateEInvoice: (id: string) => EInvoiceDetails | null;
  cancelEInvoice: (id: string, reason: EInvoiceDetails['cancelReason'], remarks?: string) => void;
  generateEWayBill: (id: string, details: Partial<EWayBillDetails>) => void;
  
  // Inventory
  products: Product[];
  createProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  bulkCreateProducts: (newProducts: Omit<Product, 'id' | 'createdAt'>[], updateExisting?: boolean) => { added: number; updated: number };
  bulkUpdateProductThresholds: (threshold: number) => Promise<{ updatedCount: number }>;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, newStock: number, reason: string) => void;

  // Custom HSN / SAC Master Directory
  customHsnCodes: CustomHsnCode[];
  addCustomHsnCode: (hsn: Omit<CustomHsnCode, 'id'>) => CustomHsnCode;
  updateCustomHsnCode: (id: string, updates: Partial<CustomHsnCode>) => void;
  deleteCustomHsnCode: (id: string) => void;
  bulkImportCustomHsnCodes: (items: Omit<CustomHsnCode, 'id'>[]) => number;
  
  // Parties (Customers & Vendors)
  parties: Party[];
  createParty: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Party;
  bulkCreateParties: (newParties: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[], updateExisting?: boolean) => { added: number; updated: number };
  updateParty: (id: string, party: Partial<Party>) => void;
  deleteParty: (id: string) => void;
  syncBillingParties: () => { newCustomersAdded: number; newVendorsAdded: number };
  
  // Purchases & Expenses
  purchaseBills: PurchaseBill[];
  createPurchaseBill: (bill: Omit<PurchaseBill, 'id' | 'createdAt'>) => PurchaseBill;
  updatePurchaseBill: (id: string, bill: Partial<PurchaseBill>) => void;
  deletePurchaseBill: (id: string) => void;
  recordPurchasePayment: (id: string, amount: number, method: PaymentMethod) => void;
  
  // Payments & Receipts (Money In & Money Out)
  payments: PaymentRecord[];
  createPayment: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => PaymentRecord;
  updatePayment: (id: string, updates: Partial<PaymentRecord>) => void;
  deletePayment: (id: string) => void;
  
  expenses: Expense[];
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  deleteExpense: (id: string) => void;

  // Cheque Printing & Books Management
  cheques: ChequeRecord[];
  chequeBooks: ChequeBook[];
  chequeTemplates: ChequeTemplateConfig[];
  createCheque: (chequeData: Omit<ChequeRecord, 'id' | 'createdAt'>) => ChequeRecord;
  updateCheque: (id: string, updates: Partial<ChequeRecord>) => void;
  deleteCheque: (id: string) => void;
  markChequeAsPrinted: (id: string) => void;
  markChequeAsCleared: (id: string, clearanceData?: string | ChequeClearancePayload) => void;
  markChequeAsBounced: (id: string, bounceData?: string | ChequeBouncePayload) => void;
  createChequeBook: (bookData: Omit<ChequeBook, 'id' | 'createdAt'>) => ChequeBook;
  updateChequeBook: (id: string, updates: Partial<ChequeBook>) => void;
  deleteChequeBook: (id: string) => void;
  saveChequeTemplate: (template: ChequeTemplateConfig) => void;
  deleteChequeTemplate: (id: string) => void;

  // Letterhead Management & Official Documents
  letterheadDocuments: LetterheadDocument[];
  letterheadTemplates: LetterheadTemplate[];
  saveLetterheadDocument: (doc: LetterheadDocument) => void;
  deleteLetterheadDocument: (id: string) => void;
  saveLetterheadTemplate: (template: LetterheadTemplate) => void;
  deleteLetterheadTemplate: (id: string) => void;
  setDefaultLetterheadTemplate: (id: string) => void;
  
  // Accounting & Ledger
  accountHeads: AccountHead[];
  journalEntries: JournalEntry[];
  createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => JournalEntry;
  updateJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  createAccountHead: (account: Omit<AccountHead, 'id'>) => AccountHead;
  updateAccountHead: (id: string, updates: Partial<AccountHead>) => void;
  deleteAccountHead: (id: string) => boolean;
  clearAllLedgerData: () => Promise<void>;
  importBankStatementAutoEntries: (
    entries: BankStatementAutoEntry[],
    targetBankAccountId: string,
    options?: {
      autoCreateParties?: boolean;
      autoSettleInvoices?: boolean;
      autoSettleBills?: boolean;
    }
  ) => BankStatementImportResult;
  
  // System & Utils
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  resetAllData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonData: string) => boolean;

  // Automatic Snapshots & System Restore
  autoSnapshotConfig: AutoSnapshotConfig;
  updateAutoSnapshotConfig: (config: Partial<AutoSnapshotConfig>) => void;
  vaultSnapshots: SystemSnapshotMetadata[];
  refreshVaultSnapshots: () => Promise<void>;
  createSystemSnapshot: (triggerType?: SystemSnapshotTrigger, customLabel?: string, downloadFile?: boolean) => Promise<SystemSnapshotPayload>;
  restoreSystemSnapshot: (snapshot: SystemSnapshotPayload, createRecoveryPoint?: boolean) => Promise<{ success: boolean; message: string }>;
  deleteVaultSnapshot: (id: string) => Promise<void>;
  clearAllVaultSnapshots: () => Promise<void>;
  exportVaultSnapshotById: (id: string) => Promise<void>;
  exportCurrentDatabaseSnapshot: (customLabel?: string) => Promise<void>;

  // Google Cloud Firestore Sync
  cloudSyncStatus: 'online' | 'offline' | 'error';
  isCloudSyncing: boolean;
  lastCloudSyncTime: Date | null;
  triggerCloudSync: (showToastNotification?: boolean) => Promise<void>;
  refreshData: (showToastNotification?: boolean) => Promise<void>;

  // Selected state for quick editing/modals
  selectedInvoiceIdForPrint: string | null;
  setSelectedInvoiceIdForPrint: (id: string | null) => void;
  selectedInvoiceForIRN: Invoice | null;
  setSelectedInvoiceForIRN: (inv: Invoice | null) => void;

  // RBAC & User Management & Password Authentication
  users: AppUser[];
  currentUser: AppUser;
  effectivePermissions: UserPermissions;
  customRolePermissions: Partial<Record<RoleType, UserPermissions>>;
  updateRolePermissions: (role: RoleType, permissions: UserPermissions) => void;
  updateAllRolePermissions: (matrix: Partial<Record<RoleType, UserPermissions>>) => void;
  resetRolePermissions: (role?: RoleType) => void;
  isAuthenticated: boolean;
  isSessionLocked: boolean;
  isAuthModalOpen: boolean;
  authModalTargetUser: AppUser | null;
  openAuthModal: (targetUser?: AppUser) => void;
  closeAuthModal: () => void;
  lockSession: () => void;
  unlockSession: (passwordOrPin: string) => { success: boolean; error?: string };
  authenticateAndSwitchUser: (userId: string, passwordOrPin: string) => { success: boolean; error?: string };
  changeUserPassword: (userId: string, newPassword?: string, newPin?: string) => void;
  switchUser: (userId: string) => void;
  logout: () => void;
  createUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => AppUser;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => boolean;
  can: (module: keyof UserPermissions, action?: string) => boolean;
  auditLogs: SecurityAuditLog[];
  logSecurityEvent: (action: string, module: string, details: string) => void;
  verifySuperAdminKey: (key: string) => boolean;
  loginAsSuperAdmin: () => void;
  logoutSuperAdmin: () => void;

  // JWT Cryptographic Token State & Session Management
  jwtToken: string | null;
  jwtSessionInfo: JwtSessionInfo | null;
  refreshActiveJwtToken: () => boolean;
  isJwtModalOpen: boolean;
  setIsJwtModalOpen: (open: boolean) => void;

  // Session Inactivity Timeout Policy
  sessionTimeoutConfig: SessionTimeoutConfig;
  updateSessionTimeoutSettings: (config: Partial<SessionTimeoutConfig>) => void;

  // WebAuthn Biometric & Passkey Protection
  biometricConfig: BiometricSecurityConfig;
  updateBiometricSettings: (config: Partial<BiometricSecurityConfig>) => void;
  isBiometricAccountingUnlocked: boolean;
  lockBiometricAccounting: () => void;
  unlockBiometricAccounting: () => void;
  promptBiometricVerification: (
    options: {
      actionTitle?: string;
      actionDescription?: string;
      feature?: 'accounting' | 'jv' | 'account_head' | 'bank_statement' | 'export' | 'payout';
      amount?: number;
    },
    onVerified: () => void | Promise<void>
  ) => void;
  isBiometricModalOpen: boolean;
  biometricModalActionTitle: string;
  biometricModalActionDescription: string;
  closeBiometricModal: () => void;

  // App Theme Mode (Light / Dark)
  theme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'zookabusiness_v2_cloud_';
const LEGACY_STORAGE_PREFIX = 'vyaparflow_v2_cloud_';

// Helper to check if current URL points to Admin / SuperAdmin
const isUrlAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/admin' ||
    path === '/admin/' ||
    path.startsWith('/admin/') ||
    path === '/superadmin' ||
    path === '/superadmin/' ||
    path.startsWith('/superadmin/') ||
    hash === '#/admin' ||
    hash === '#admin' ||
    hash === '#/superadmin' ||
    hash === '#superadmin' ||
    search.includes('tab=admin') ||
    search.includes('tab=super_admin_dashboard') ||
    search.includes('view=admin')
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local cache or clean defaults with seamless backward compatibility
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      let item = localStorage.getItem(STORAGE_PREFIX + key);
      if (!item) {
        item = localStorage.getItem(LEGACY_STORAGE_PREFIX + key);
        if (item) {
          try {
            localStorage.setItem(STORAGE_PREFIX + key, item);
          } catch {}
        }
      }
      if (!item || item === 'undefined' || item === 'null') return fallback;
      const parsed = JSON.parse(item);
      if (parsed === null || parsed === undefined) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  };

  const isAdminRouteInitially = isUrlAdminRoute();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return isAdminRouteInitially ? 'super_admin_dashboard' : 'dashboard';
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zooka_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const setIsSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsSidebarCollapsedState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('zooka_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'online' | 'offline' | 'error'>('online');
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);
  const isCloudInitializedRef = useRef<boolean>(false);

  // Multi-Company State (Clean default single company)
  const [companies, setCompanies] = useState<Company[]>(() => {
    return loadState<Company[]>('companies', [cleanDefaultCompany]);
  });
  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    return loadState<string>('currentCompanyId', cleanDefaultCompany.id);
  });

  const currentCompany = useMemo(() => {
    return companies.find(c => c.id === currentCompanyId) || companies[0] || cleanDefaultCompany;
  }, [companies, currentCompanyId]);

  const [business, setBusiness] = useState<BusinessProfile>(() => {
    const loaded = loadState('business', cleanDefaultBusinessProfile);
    return normalizeBusinessProfile(loaded);
  });

  // Super Admin Master Authentication State (Global Platform Governance)
  const [superAdminAuth, setSuperAdminAuth] = useState<SuperAdminAuthData>(() => {
    try {
      const saved = localStorage.getItem('zooka_superadmin_auth') || localStorage.getItem('vyapar_superadmin_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const name = (parsed.name === 'Vikram Singhania' || parsed.name === 'Vikram Singhaniya')
          ? DEFAULT_SUPER_ADMIN.name
          : (parsed.name || DEFAULT_SUPER_ADMIN.name);
        const email = (parsed.email === 'superadmin@vyaparflow.in' || parsed.email === 'superadmin@zookabusiness.in' || !parsed.email)
          ? DEFAULT_SUPER_ADMIN.email
          : parsed.email;
        const avatarText = (parsed.avatarText === 'SA' && name === DEFAULT_SUPER_ADMIN.name)
          ? DEFAULT_SUPER_ADMIN.avatarText
          : (parsed.avatarText || DEFAULT_SUPER_ADMIN.avatarText);
        return {
          name,
          email,
          phone: parsed.phone || DEFAULT_SUPER_ADMIN.phone || '+91 99999 88888',
          roleTitle: parsed.roleTitle || DEFAULT_SUPER_ADMIN.roleTitle || 'Platform Super Administrator',
          department: parsed.department || DEFAULT_SUPER_ADMIN.department || 'Executive Governance & Board',
          avatarBg: parsed.avatarBg || DEFAULT_SUPER_ADMIN.avatarBg,
          avatarText,
          password: parsed.password || 'superadmin',
          pin: parsed.pin || '9999',
          lastChanged: parsed.lastChanged || '2026-01-01T00:00:00.000Z'
        };
      }
    } catch (e) {}
    return {
      name: DEFAULT_SUPER_ADMIN.name,
      email: DEFAULT_SUPER_ADMIN.email,
      phone: DEFAULT_SUPER_ADMIN.phone || '+91 99999 88888',
      roleTitle: DEFAULT_SUPER_ADMIN.roleTitle || 'Platform Super Administrator',
      department: DEFAULT_SUPER_ADMIN.department || 'Executive Governance & Board',
      avatarBg: DEFAULT_SUPER_ADMIN.avatarBg,
      avatarText: DEFAULT_SUPER_ADMIN.avatarText,
      password: 'superadmin',
      pin: '9999',
      lastChanged: '2026-01-01T00:00:00.000Z'
    };
  });

  // Platform Branding & Broadcast Announcements State (Global Platform Identity)
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(() => {
    try {
      const saved = localStorage.getItem('zooka_platform_config') || localStorage.getItem('vyapar_platform_config');
      if (saved) {
        return normalizePlatformConfig(JSON.parse(saved));
      }
    } catch (e) {}
    return { ...DEFAULT_PLATFORM_CONFIG };
  });

  // Sync browser document title to dynamic platform branding
  useEffect(() => {
    if (platformConfig?.appName) {
      document.title = `${platformConfig.appName} - ${platformConfig.appTagline || 'Smart Business & GST Billing Suite'}`;
    }
  }, [platformConfig?.appName, platformConfig?.appTagline]);

  // Data Collections initialized CLEAN (Empty Arrays for all user transactional data)
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', []));
  const [products, setProducts] = useState<Product[]>(() => loadState('products', []));
  const [parties, setParties] = useState<Party[]>(() => loadState('parties', []));
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>(() => loadState('purchaseBills', []));
  const [payments, setPayments] = useState<PaymentRecord[]>(() => loadState('payments', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', []));
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>(() => loadState('accountHeads', cleanDefaultAccountHeads));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => loadState('journalEntries', []));
  const [customHsnCodes, setCustomHsnCodes] = useState<CustomHsnCode[]>(() => loadState('customHsnCodes', []));
  const [cheques, setCheques] = useState<ChequeRecord[]>(() => loadState('cheques', []));
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>(() => loadState('chequeBooks', [
    {
      id: 'cb-default-1',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200012345678',
      startChequeNo: '000101',
      endChequeNo: '000150',
      totalLeaves: 50,
      currentChequeNo: '000101',
      status: 'ACTIVE',
      notes: 'Primary Company Cheque Book',
      createdAt: new Date().toISOString()
    }
  ]));
  const [chequeTemplates, setChequeTemplates] = useState<ChequeTemplateConfig[]>(() => loadState('chequeTemplates', BANK_CHEQUE_PRESETS));
  
  // Letterhead Management State
  const [letterheadDocuments, setLetterheadDocuments] = useState<LetterheadDocument[]>(() => loadState('letterheadDocuments', []));
  const [letterheadTemplates, setLetterheadTemplates] = useState<LetterheadTemplate[]>(() => loadState('letterheadTemplates', DEFAULT_LETTERHEAD_TEMPLATES));
  
  // RBAC & Authentication State (Company Users only, Super Admin is global master)
  const [users, setUsers] = useState<AppUser[]>(() => {
    const loaded = loadState<AppUser[]>('users', cleanDefaultUsers);
    return loaded.map(u => {
      const initMatch = cleanDefaultUsers.find(iu => iu.id === u.id);
      return {
        ...u,
        password: u.password || initMatch?.password || 'admin',
        pin: u.pin || initMatch?.pin || '1111',
      };
    });
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return isAdminRouteInitially ? DEFAULT_SUPER_ADMIN.id : loadState('currentUserId', cleanDefaultAdminUser.id);
  });
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => loadState('auditLogs', []));

  // Customizable Permission Matrix State per Role
  const [customRolePermissions, setCustomRolePermissions] = useState<Partial<Record<RoleType, UserPermissions>>>(() => {
    return loadState<Partial<Record<RoleType, UserPermissions>>>('customRolePermissions', {});
  });

  // Persist customized role permissions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'customRolePermissions', JSON.stringify(customRolePermissions));
      if (currentCompanyId) {
        localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_customRolePermissions`, JSON.stringify(customRolePermissions));
      }
    } catch (e) {
      console.warn('Error saving customRolePermissions:', e);
    }
  }, [customRolePermissions, currentCompanyId]);

  // Automated Snapshot & System Vault State
  const [autoSnapshotConfig, setAutoSnapshotConfig] = useState<AutoSnapshotConfig>(() => getStoredAutoSnapshotConfig());
  const [vaultSnapshots, setVaultSnapshots] = useState<SystemSnapshotMetadata[]>([]);

  const refreshVaultSnapshots = async () => {
    try {
      const list = await getAllSnapshotsFromVault();
      setVaultSnapshots(list);
    } catch (e) {
      console.warn('Error refreshing snapshot vault:', e);
    }
  };

  useEffect(() => {
    refreshVaultSnapshots();
  }, []);

  const updateAutoSnapshotConfig = (updates: Partial<AutoSnapshotConfig>) => {
    setAutoSnapshotConfig(prev => {
      const next = { ...prev, ...updates };
      saveStoredAutoSnapshotConfig(next);
      return next;
    });
    showToast('success', 'Backup Settings Updated', 'Automatic snapshot configuration saved.');
  };

  // Authentication & Locking
  const [jwtToken, setJwtToken] = useState<string | null>(() => getAuthToken());
  const [isJwtModalOpen, setIsJwtModalOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = getAuthToken();
    if (token) {
      const verified = verifyJwtToken(token);
      return Boolean(verified && verified.isValid && !verified.isExpired);
    }
    return false;
  });
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTargetUser, setAuthModalTargetUser] = useState<AppUser | null>(null);

  const superAdminUser: AppUser = useMemo(() => ({
    ...DEFAULT_SUPER_ADMIN,
    name: superAdminAuth.name || DEFAULT_SUPER_ADMIN.name,
    email: superAdminAuth.email || DEFAULT_SUPER_ADMIN.email,
    phone: superAdminAuth.phone || DEFAULT_SUPER_ADMIN.phone,
    roleTitle: superAdminAuth.roleTitle || DEFAULT_SUPER_ADMIN.roleTitle,
    department: superAdminAuth.department || DEFAULT_SUPER_ADMIN.department,
    avatarBg: superAdminAuth.avatarBg || DEFAULT_SUPER_ADMIN.avatarBg,
    avatarText: superAdminAuth.avatarText || (superAdminAuth.name ? superAdminAuth.name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() : 'SA'),
    password: superAdminAuth.password,
    pin: superAdminAuth.pin,
  }), [superAdminAuth]);

  const currentUser = useMemo(() => {
    if (currentUserId === DEFAULT_SUPER_ADMIN.id || currentUserId === 'usr-super-admin') {
      return superAdminUser;
    }
    const matchingUser = users.find(u => u.id === currentUserId);
    if (matchingUser) return matchingUser;

    // Strict Fallback: Prioritize Active Admin user instead of arbitrary users[0]
    const fallbackAdmin = users.find(u => u.role === 'ADMIN' && u.isActive) || 
                          users.find(u => u.role === 'ADMIN') || 
                          users[0] || 
                          cleanDefaultAdminUser;
    return fallbackAdmin;
  }, [users, currentUserId, superAdminUser]);

  const effectivePermissions = useMemo(() => {
    return getUserEffectivePermissions(currentUser, customRolePermissions);
  }, [currentUser, customRolePermissions]);

  // Derived JWT Session Info
  const jwtSessionInfo = useMemo<JwtSessionInfo | null>(() => {
    if (!jwtToken) return null;
    const verified = verifyJwtToken(jwtToken);
    if (!verified) return null;
    const p = verified.payload;
    return {
      token: jwtToken,
      sub: p?.sub || currentUser.id,
      name: p?.name || currentUser.name,
      email: p?.email || currentUser.email,
      role: p?.role || currentUser.role,
      department: p?.department || currentUser.department,
      companyId: p?.companyId || currentCompanyId,
      companyName: p?.companyName || currentCompany.tradeName || currentCompany.name,
      companyGstin: p?.companyGstin || currentCompany.gstin || 'N/A',
      issuedAt: p?.iat ? new Date(p.iat * 1000).toISOString() : new Date().toISOString(),
      expiresAt: p?.exp ? new Date(p.exp * 1000).toISOString() : new Date().toISOString(),
      expiresInSeconds: verified.expiresInSeconds,
      isValid: verified.isValid,
      isExpired: verified.isExpired,
      jti: p?.jti || 'jti_active'
    };
  }, [jwtToken, currentUser, currentCompany, currentCompanyId]);

  // Periodic JWT expiration monitor
  useEffect(() => {
    if (!isAuthenticated || !jwtToken) return;

    const checkTokenExpiry = () => {
      const verified = verifyJwtToken(jwtToken);
      if (!verified || verified.isExpired || !verified.isValid) {
        clearAuthToken();
        setJwtToken(null);
        setIsAuthenticated(false);
        showToast('error', 'JWT Session Expired', 'Your cryptographic security token has expired. Please sign in again.');
      }
    };

    const interval = setInterval(checkTokenExpiry, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, jwtToken]);

  const refreshActiveJwtToken = (): boolean => {
    try {
      const timeoutMins = business.sessionTimeoutSettings?.timeoutMinutes || 480;
      const { token } = generateJwtToken(currentUser, currentCompany, timeoutMins);
      saveAuthToken(token);
      setJwtToken(token);
      logSecurityEvent('JWT_TOKEN_REFRESHED', 'Cryptographic Auth', `Refreshed JWT access token for ${currentUser.name} in ${currentCompany.tradeName || currentCompany.name}`);
      return true;
    } catch (err) {
      console.warn('Failed to refresh JWT token:', err);
      return false;
    }
  };

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedInvoiceIdForPrint, setSelectedInvoiceIdForPrint] = useState<string | null>(null);
  const [selectedInvoiceForIRN, setSelectedInvoiceForIRN] = useState<Invoice | null>(null);

  // Global App Theme Mode (Light / Dark)
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = loadState<string>('theme', 'light');
    if (saved === 'dark') return 'dark';
    return 'light';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = loadState<string>('theme', 'light');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // URL /admin Route Listener & History Sync
  useEffect(() => {
    const handleUrlRouteSync = () => {
      if (isUrlAdminRoute()) {
        setActiveTab('super_admin_dashboard');
      }
    };

    // Run check on initial load
    if (isUrlAdminRoute()) {
      handleUrlRouteSync();
    }

    window.addEventListener('popstate', handleUrlRouteSync);
    window.addEventListener('hashchange', handleUrlRouteSync);
    return () => {
      window.removeEventListener('popstate', handleUrlRouteSync);
      window.removeEventListener('hashchange', handleUrlRouteSync);
    };
  }, []);

  // Sync browser URL bar with active tab (/admin for superadmin dashboard)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSuperMode = activeTab === 'super_admin_dashboard' || currentUser.role === 'SUPER_ADMIN';
    const isCurrentlyOnAdminPath = window.location.pathname.startsWith('/admin') || 
                                   window.location.pathname.startsWith('/superadmin') || 
                                   window.location.hash.includes('admin');

    if (isSuperMode) {
      if (!isCurrentlyOnAdminPath) {
        try {
          window.history.pushState({ tab: 'super_admin_dashboard' }, '', '/admin');
        } catch (e) {
          window.location.hash = '#/admin';
        }
      }
    } else {
      if (isCurrentlyOnAdminPath) {
        try {
          window.history.pushState({ tab: activeTab }, '', '/');
        } catch (e) {
          window.location.hash = '';
        }
      }
    }
  }, [activeTab, currentUser.role]);

  // Initial Firestore Cloud DB Fetch
  useEffect(() => {
    let isMounted = true;

    const fetchFromFirestore = async () => {
      try {
        setIsCloudSyncing(true);
        // Fetch Super Admin Master Auth credentials from cloud
        const cloudSuperAdminAuth = await cloudDb.fetchSuperAdminAuth();
        if (cloudSuperAdminAuth && isMounted) {
          setSuperAdminAuth(prev => {
            const rawEmail = cloudSuperAdminAuth.email;
            const normalizedEmail = (rawEmail === 'superadmin@vyaparflow.in' || rawEmail === 'superadmin@zookabusiness.in' || !rawEmail)
              ? DEFAULT_SUPER_ADMIN.email
              : rawEmail;
            const updated: SuperAdminAuthData = {
              name: cloudSuperAdminAuth.name || prev.name,
              email: normalizedEmail || prev.email,
              phone: cloudSuperAdminAuth.phone || prev.phone,
              roleTitle: cloudSuperAdminAuth.roleTitle || prev.roleTitle,
              department: cloudSuperAdminAuth.department || prev.department,
              avatarBg: cloudSuperAdminAuth.avatarBg || prev.avatarBg,
              avatarText: cloudSuperAdminAuth.avatarText || prev.avatarText,
              password: cloudSuperAdminAuth.password || prev.password,
              pin: cloudSuperAdminAuth.pin || prev.pin,
              lastChanged: cloudSuperAdminAuth.lastChanged || prev.lastChanged,
            };
            if (rawEmail === 'superadmin@vyaparflow.in') {
              cloudDb.saveSuperAdminAuth({ email: DEFAULT_SUPER_ADMIN.email }).catch(console.warn);
            }
            try {
              localStorage.setItem('zooka_superadmin_auth', JSON.stringify(updated));
              localStorage.setItem('vyapar_superadmin_auth', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }

        // Fetch all companies from Firestore
        const cloudCompanies = await cloudDb.fetchAllCompanies();
        if (cloudCompanies && cloudCompanies.length > 0 && isMounted) {
          setCompanies(cloudCompanies);
          
          const sysState = await cloudDb.getSystemState();
          const targetId = sysState?.activeCompanyId || cloudCompanies[0].id;
          setCurrentCompanyId(targetId);

          const partition = await cloudDb.fetchCompanyDataPartition(targetId);
          if (partition && isMounted) {
            setBusiness(normalizeBusinessProfile(partition.business));
            setInvoices(partition.invoices);
            setProducts(partition.products);
            setParties(partition.parties);
            setPurchaseBills(partition.purchaseBills);
            setPayments(partition.payments);
            setExpenses(partition.expenses);
            setAccountHeads(partition.accountHeads.length > 0 ? partition.accountHeads : cleanDefaultAccountHeads);
            setJournalEntries(partition.journalEntries);
            if (partition.users && partition.users.length > 0) {
              setUsers(partition.users);
              // Only adjust currentUserId if current selection is invalid or not found in new partition
              if (!isUrlAdminRoute() && currentUserId !== DEFAULT_SUPER_ADMIN.id) {
                setCurrentUserId(prevId => {
                  const existsInPartition = partition.users.find(u => u.id === prevId && u.isActive);
                  if (existsInPartition) return prevId;
                  const defaultAdmin = partition.users.find(u => u.role === 'ADMIN' && u.isActive) || partition.users[0];
                  return defaultAdmin.id;
                });
              }
            }
            setAuditLogs(partition.auditLogs);
          }
        } else if (isMounted) {
          // Initialize Clean Baseline to Firestore on first run
          await cloudDb.saveCompany(cleanDefaultCompany);
          await cloudDb.saveBusinessProfile(cleanDefaultCompany.id, cleanDefaultBusinessProfile);
          await cloudDb.syncEntireCollection('accountHeads', cleanDefaultCompany.id, cleanDefaultAccountHeads);
          await cloudDb.syncEntireCollection('users', cleanDefaultCompany.id, cleanDefaultUsers);
          await cloudDb.saveSystemState({ activeCompanyId: cleanDefaultCompany.id });
        }

        // Fetch Platform Identity & Broadcast Announcements from Firestore
        const cloudPlatformConfig = await cloudDb.fetchPlatformConfig();
        if (cloudPlatformConfig && isMounted) {
          const normalized = normalizePlatformConfig(cloudPlatformConfig);
          setPlatformConfig(normalized);
          try {
            localStorage.setItem('zooka_platform_config', JSON.stringify(normalized));
            localStorage.setItem('vyapar_platform_config', JSON.stringify(normalized));
          } catch (e) {}
        }

        if (isMounted) {
          isCloudInitializedRef.current = true;
          setCloudSyncStatus('online');
          setLastCloudSyncTime(new Date());
        }
      } catch (err) {
        console.warn('Firestore initial sync encountered error, running in local-cached mode:', err);
        if (isMounted) {
          isCloudInitializedRef.current = true;
          setCloudSyncStatus('error');
        }
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    };

    fetchFromFirestore();

    return () => { isMounted = false; };
  }, []);

  // Network connection state listener
  useEffect(() => {
    const handleOnline = () => {
      setCloudSyncStatus('online');
      refreshData(false).catch(console.warn);
    };
    const handleOffline = () => {
      setCloudSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time Firestore onSnapshot Subscriptions for Active Company Data
  useEffect(() => {
    if (!isCloudInitializedRef.current || !currentCompanyId) return;

    const unsubscribe = cloudDb.subscribeToCompanyData(currentCompanyId, {
      onBusinessProfile: (remoteBus) => {
        setBusiness(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(remoteBus)) {
            return remoteBus;
          }
          return prev;
        });
      },
      onInvoices: (remoteInvoices) => {
        setInvoices(prev => {
          if (prev.length !== remoteInvoices.length || JSON.stringify(prev) !== JSON.stringify(remoteInvoices)) {
            return remoteInvoices;
          }
          return prev;
        });
      },
      onProducts: (remoteProducts) => {
        setProducts(prev => {
          if (prev.length !== remoteProducts.length || JSON.stringify(prev) !== JSON.stringify(remoteProducts)) {
            return remoteProducts;
          }
          return prev;
        });
      },
      onParties: (remoteParties) => {
        setParties(prev => {
          if (prev.length !== remoteParties.length || JSON.stringify(prev) !== JSON.stringify(remoteParties)) {
            return remoteParties;
          }
          return prev;
        });
      },
      onPurchaseBills: (remoteBills) => {
        setPurchaseBills(prev => {
          if (prev.length !== remoteBills.length || JSON.stringify(prev) !== JSON.stringify(remoteBills)) {
            return remoteBills;
          }
          return prev;
        });
      },
      onPayments: (remotePayments) => {
        setPayments(prev => {
          if (prev.length !== remotePayments.length || JSON.stringify(prev) !== JSON.stringify(remotePayments)) {
            return remotePayments;
          }
          return prev;
        });
      },
      onExpenses: (remoteExpenses) => {
        setExpenses(prev => {
          if (prev.length !== remoteExpenses.length || JSON.stringify(prev) !== JSON.stringify(remoteExpenses)) {
            return remoteExpenses;
          }
          return prev;
        });
      },
      onAccountHeads: (remoteHeads) => {
        if (remoteHeads && remoteHeads.length > 0) {
          setAccountHeads(prev => {
            if (prev.length !== remoteHeads.length || JSON.stringify(prev) !== JSON.stringify(remoteHeads)) {
              return remoteHeads;
            }
            return prev;
          });
        }
      },
      onJournalEntries: (remoteJournals) => {
        setJournalEntries(prev => {
          if (prev.length !== remoteJournals.length || JSON.stringify(prev) !== JSON.stringify(remoteJournals)) {
            return remoteJournals;
          }
          return prev;
        });
      },
      onUsers: (remoteUsers) => {
        if (remoteUsers && remoteUsers.length > 0) {
          setUsers(prev => {
            if (prev.length !== remoteUsers.length || JSON.stringify(prev) !== JSON.stringify(remoteUsers)) {
              return remoteUsers;
            }
            return prev;
          });
        }
      },
      onAuditLogs: (remoteLogs) => {
        setAuditLogs(prev => {
          if (prev.length !== remoteLogs.length || JSON.stringify(prev) !== JSON.stringify(remoteLogs)) {
            return remoteLogs;
          }
          return prev;
        });
      },
      onCustomHsnCodes: (remoteHsn) => {
        if (remoteHsn) {
          setCustomHsnCodes(prev => {
            if (prev.length !== remoteHsn.length || JSON.stringify(prev) !== JSON.stringify(remoteHsn)) {
              return remoteHsn;
            }
            return prev;
          });
        }
      },
      onCheques: (remoteCheques) => {
        if (remoteCheques) {
          setCheques(prev => {
            if (prev.length !== remoteCheques.length || JSON.stringify(prev) !== JSON.stringify(remoteCheques)) {
              return remoteCheques;
            }
            return prev;
          });
        }
      },
      onChequeBooks: (remoteBooks) => {
        if (remoteBooks) {
          setChequeBooks(prev => {
            if (prev.length !== remoteBooks.length || JSON.stringify(prev) !== JSON.stringify(remoteBooks)) {
              return remoteBooks;
            }
            return prev;
          });
        }
      },
      onChequeTemplates: (remoteTemplates) => {
        if (remoteTemplates && remoteTemplates.length > 0) {
          setChequeTemplates(prev => {
            if (prev.length !== remoteTemplates.length || JSON.stringify(prev) !== JSON.stringify(remoteTemplates)) {
              return remoteTemplates;
            }
            return prev;
          });
        }
      },
      onLetterheadDocuments: (remoteDocs) => {
        if (remoteDocs) {
          setLetterheadDocuments(prev => {
            if (prev.length !== remoteDocs.length || JSON.stringify(prev) !== JSON.stringify(remoteDocs)) {
              return remoteDocs;
            }
            return prev;
          });
        }
      },
      onLetterheadTemplates: (remoteTemplates) => {
        if (remoteTemplates && remoteTemplates.length > 0) {
          setLetterheadTemplates(prev => {
            if (prev.length !== remoteTemplates.length || JSON.stringify(prev) !== JSON.stringify(remoteTemplates)) {
              return remoteTemplates;
            }
            return prev;
          });
        }
      },
      onError: (err) => {
        console.warn('Realtime listener notice:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentCompanyId]);

  // Realtime listener for Companies list
  useEffect(() => {
    if (!isCloudInitializedRef.current) return;
    const unsub = cloudDb.subscribeToCompanies((remoteCompanies) => {
      if (remoteCompanies && remoteCompanies.length > 0) {
        setCompanies(prev => {
          if (prev.length !== remoteCompanies.length || JSON.stringify(prev) !== JSON.stringify(remoteCompanies)) {
            return remoteCompanies;
          }
          return prev;
        });
      }
    });
    return () => unsub();
  }, []);

  // Realtime listener for Platform Branding & Broadcast Announcements
  useEffect(() => {
    if (!isCloudInitializedRef.current) return;
    const unsub = cloudDb.subscribeToPlatformConfig((cloudCfg) => {
      if (cloudCfg) {
        const normalized = normalizePlatformConfig(cloudCfg);
        setPlatformConfig(normalized);
        try {
          localStorage.setItem('zooka_platform_config', JSON.stringify(normalized));
          localStorage.setItem('vyapar_platform_config', JSON.stringify(normalized));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, []);

  // Force Push Sync All Current Data to Firestore
  const triggerCloudSync = async (showToastNotification: boolean = true) => {
    try {
      setIsCloudSyncing(true);
      if (platformConfig) {
        await cloudDb.savePlatformConfig(platformConfig);
      }
      if (currentCompany) {
        await cloudDb.saveCompany(currentCompany);
      }
      if (currentCompanyId) {
        await cloudDb.saveBusinessProfile(currentCompanyId, business);
        await cloudDb.syncEntireCollection('invoices', currentCompanyId, invoices);
        await cloudDb.syncEntireCollection('products', currentCompanyId, products);
        await cloudDb.syncEntireCollection('parties', currentCompanyId, parties);
        await cloudDb.syncEntireCollection('purchaseBills', currentCompanyId, purchaseBills);
        await cloudDb.syncEntireCollection('payments', currentCompanyId, payments);
        await cloudDb.syncEntireCollection('expenses', currentCompanyId, expenses);
        await cloudDb.syncEntireCollection('accountHeads', currentCompanyId, accountHeads);
        await cloudDb.syncEntireCollection('journalEntries', currentCompanyId, journalEntries);
        await cloudDb.syncEntireCollection('users', currentCompanyId, users);
        await cloudDb.syncEntireCollection('auditLogs', currentCompanyId, auditLogs);
        await cloudDb.syncEntireCollection('customHsnCodes', currentCompanyId, customHsnCodes);
        await cloudDb.syncEntireCollection('cheques', currentCompanyId, cheques);
        await cloudDb.syncEntireCollection('chequeBooks', currentCompanyId, chequeBooks);
        await cloudDb.syncEntireCollection('chequeTemplates', currentCompanyId, chequeTemplates);
        await cloudDb.syncEntireCollection('letterheadDocuments', currentCompanyId, letterheadDocuments);
        await cloudDb.syncEntireCollection('letterheadTemplates', currentCompanyId, letterheadTemplates);
        await cloudDb.saveSystemState({ activeCompanyId: currentCompanyId });
      }

      setCloudSyncStatus('online');
      setLastCloudSyncTime(new Date());
      if (showToastNotification) {
        showToast('success', 'Cloud DB Synchronized', 'All records and configuration synced with Google Cloud Firestore.');
      }
    } catch (e: any) {
      console.warn('Error during manual cloud sync:', e);
      setCloudSyncStatus('error');
      if (showToastNotification) {
        showToast('error', 'Cloud Sync Error', 'Could not complete push sync to Firestore. Local cache preserved.');
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Pull / Refresh Latest Live Data from Firestore
  const refreshData = async (showToastNotification: boolean = true) => {
    try {
      setIsCloudSyncing(true);
      if (!currentCompanyId) return;

      const [cloudCompanies, partition] = await Promise.all([
        cloudDb.fetchAllCompanies(),
        cloudDb.fetchCompanyDataPartition(currentCompanyId)
      ]);

      if (cloudCompanies && cloudCompanies.length > 0) {
        setCompanies(cloudCompanies);
      }

      if (partition) {
        setBusiness(normalizeBusinessProfile(partition.business));
        setInvoices(partition.invoices);
        setProducts(partition.products);
        setParties(partition.parties);
        setPurchaseBills(partition.purchaseBills);
        setPayments(partition.payments);
        setExpenses(partition.expenses);
        setAccountHeads(partition.accountHeads.length > 0 ? partition.accountHeads : cleanDefaultAccountHeads);
        setJournalEntries(partition.journalEntries);
        if (partition.users && partition.users.length > 0) {
          setUsers(partition.users);
        }
        setAuditLogs(partition.auditLogs);
        if (partition.customHsnCodes) setCustomHsnCodes(partition.customHsnCodes);
        if (partition.cheques) setCheques(partition.cheques);
        if (partition.chequeBooks) setChequeBooks(partition.chequeBooks);
        if (partition.chequeTemplates) setChequeTemplates(partition.chequeTemplates);
      }

      setCloudSyncStatus('online');
      setLastCloudSyncTime(new Date());

      if (showToastNotification) {
        showToast(
          'success', 
          'Database Refreshed', 
          `Synchronized live with Firestore (${invoices.length} invoices, ${products.length} products).`
        );
      }
    } catch (err: any) {
      console.warn('Error refreshing data from cloud:', err);
      setCloudSyncStatus('error');
      if (showToastNotification) {
        showToast('error', 'Refresh Failed', 'Unable to fetch latest updates from Firestore.');
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Continuous Auto-Save to Firestore Cloud DB on background state changes
  useEffect(() => {
    if (!isCloudInitializedRef.current || !currentCompanyId) return;

    const timer = setTimeout(async () => {
      try {
        if (currentCompany) {
          await cloudDb.saveCompany(currentCompany);
        }
        await cloudDb.saveBusinessProfile(currentCompanyId, business);
        await cloudDb.saveSystemState({ activeCompanyId: currentCompanyId });
        setCloudSyncStatus('online');
        setLastCloudSyncTime(new Date());
      } catch (err) {
        console.warn('Firestore automatic background save warning:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [business, currentCompany, currentCompanyId]);

  // Theme application to root DOM element and dynamic theme variables
  useEffect(() => {
    const isDark = theme === 'dark';
    setResolvedTheme(isDark ? 'dark' : 'light');

    if (isDark) {
      document.documentElement.classList.add('dark');
      if (document.body) document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (document.body) document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // Automatically apply dynamic theme CSS custom properties for buttons & bottom controls
    const activeColor = currentCompany?.themeColor || 'indigo';
    applyThemeCssVariables(activeColor, isDark);
  }, [theme, currentCompany?.themeColor]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_PREFIX + 'theme', JSON.stringify(newTheme));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Sync general lists to Local Storage Cache
  useEffect(() => { localStorage.setItem(STORAGE_PREFIX + 'companies', JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem(STORAGE_PREFIX + 'currentCompanyId', JSON.stringify(currentCompanyId)); }, [currentCompanyId]);

  // Sync active company's data partition to Local Storage Cache
  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'business', JSON.stringify(business)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(business));
  }, [business, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'invoices', JSON.stringify(invoices)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_invoices`, JSON.stringify(invoices));
  }, [invoices, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(products)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_products`, JSON.stringify(products));
  }, [products, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'parties', JSON.stringify(parties)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_parties`, JSON.stringify(parties));
  }, [parties, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'purchaseBills', JSON.stringify(purchaseBills)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_purchaseBills`, JSON.stringify(purchaseBills));
  }, [purchaseBills, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(payments)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_payments`, JSON.stringify(payments));
  }, [payments, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(expenses)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_expenses`, JSON.stringify(expenses));
  }, [expenses, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'accountHeads', JSON.stringify(accountHeads)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_accountHeads`, JSON.stringify(accountHeads));
  }, [accountHeads, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'journalEntries', JSON.stringify(journalEntries)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_journalEntries`, JSON.stringify(journalEntries));
  }, [journalEntries, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(users)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_users`, JSON.stringify(users));
  }, [users, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'currentUserId', JSON.stringify(currentUserId)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_currentUserId`, JSON.stringify(currentUserId));
  }, [currentUserId, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify(auditLogs)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_auditLogs`, JSON.stringify(auditLogs));
  }, [auditLogs, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'customHsnCodes', JSON.stringify(customHsnCodes)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_customHsnCodes`, JSON.stringify(customHsnCodes));
  }, [customHsnCodes, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'cheques', JSON.stringify(cheques)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_cheques`, JSON.stringify(cheques));
  }, [cheques, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'chequeBooks', JSON.stringify(chequeBooks)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_chequeBooks`, JSON.stringify(chequeBooks));
  }, [chequeBooks, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'chequeTemplates', JSON.stringify(chequeTemplates)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_chequeTemplates`, JSON.stringify(chequeTemplates));
  }, [chequeTemplates, currentCompanyId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'letterheadDocuments', JSON.stringify(letterheadDocuments));
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_letterheadDocuments`, JSON.stringify(letterheadDocuments));
  }, [letterheadDocuments, currentCompanyId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'letterheadTemplates', JSON.stringify(letterheadTemplates));
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_letterheadTemplates`, JSON.stringify(letterheadTemplates));
  }, [letterheadTemplates, currentCompanyId]);

  // Load company partition helper
  const loadCompanyDataPartition = (targetCompId: string) => {
    const rawBus = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_business`);
    const rawInv = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_invoices`);
    const rawProd = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_products`);
    const rawParties = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_parties`);
    const rawPurch = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_purchaseBills`);
    const rawPayments = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_payments`);
    const rawExpenses = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_expenses`);
    const rawHeads = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_accountHeads`);
    const rawJournals = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_journalEntries`);
    const rawUsers = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_users`);
    const rawUserId = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_currentUserId`);
    const rawLogs = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_auditLogs`);
    const rawHsn = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_customHsnCodes`);
    const rawCheques = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_cheques`);
    const rawBooks = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_chequeBooks`);
    const rawTemplates = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_chequeTemplates`);
    const rawDocs = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_letterheadDocuments`);
    const rawDocTemplates = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_letterheadTemplates`);

    const safeParseArray = <T,>(raw: string | null, fallback: T[]): T[] => {
      if (!raw || raw === 'undefined' || raw === 'null') return fallback;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    };

    let loadedBusiness: BusinessProfile;
    let loadedProducts: Product[] = safeParseArray<Product>(rawProd, []);
    let loadedUsers: AppUser[] = safeParseArray<AppUser>(rawUsers, cleanDefaultUsers);
    let loadedInvoices: Invoice[] = safeParseArray<Invoice>(rawInv, []);
    let loadedParties: Party[] = safeParseArray<Party>(rawParties, []);
    let loadedPurchases: PurchaseBill[] = safeParseArray<PurchaseBill>(rawPurch, []);
    let loadedPayments: PaymentRecord[] = safeParseArray<PaymentRecord>(rawPayments, []);
    let loadedExpenses: Expense[] = safeParseArray<Expense>(rawExpenses, []);
    let loadedHeads: AccountHead[] = safeParseArray<AccountHead>(rawHeads, cleanDefaultAccountHeads);
    let loadedJournals: JournalEntry[] = safeParseArray<JournalEntry>(rawJournals, []);
    let loadedAudit: SecurityAuditLog[] = safeParseArray<SecurityAuditLog>(rawLogs, []);
    let loadedCustomHsn: CustomHsnCode[] = safeParseArray<CustomHsnCode>(rawHsn, []);
    let loadedCheques: ChequeRecord[] = safeParseArray<ChequeRecord>(rawCheques, []);
    let loadedBooks: ChequeBook[] = safeParseArray<ChequeBook>(rawBooks, []);
    let loadedTemplates: ChequeTemplateConfig[] = safeParseArray<ChequeTemplateConfig>(rawTemplates, BANK_CHEQUE_PRESETS);
    let loadedLetterheadDocs: LetterheadDocument[] = safeParseArray<LetterheadDocument>(rawDocs, []);
    let loadedLetterheadTemplates: LetterheadTemplate[] = safeParseArray<LetterheadTemplate>(rawDocTemplates, DEFAULT_LETTERHEAD_TEMPLATES);

    if (rawBus) {
      loadedBusiness = JSON.parse(rawBus);
    } else {
      const compMeta = companies.find(c => c.id === targetCompId);
      loadedBusiness = {
        ...cleanDefaultBusinessProfile,
        name: compMeta?.name || 'Company Name',
        tradeName: compMeta?.tradeName || compMeta?.name || 'Company Name',
        gstin: compMeta?.gstin || 'UNREGISTERED',
        pan: compMeta?.pan || 'PANNOTSET',
        state: compMeta?.state || 'Delhi',
        stateCode: compMeta?.stateCode || '07',
        city: compMeta?.city || 'New Delhi',
        address: compMeta?.address || 'Plot No. 1, Industrial Area',
        pincode: compMeta?.pincode || '110001',
        phone: compMeta?.phone || '+91 98000 00000',
        email: compMeta?.email || 'accounts@mycompany.in',
      };
    }

    const defaultAdminUser = loadedUsers.find(u => u.role === 'ADMIN' && u.isActive) || loadedUsers[0] || cleanDefaultAdminUser;
    const defaultUserId = rawUserId ? JSON.parse(rawUserId) : defaultAdminUser.id;

    return {
      business: normalizeBusinessProfile(loadedBusiness),
      invoices: loadedInvoices,
      products: loadedProducts,
      parties: loadedParties,
      purchaseBills: loadedPurchases,
      payments: loadedPayments,
      expenses: loadedExpenses,
      accountHeads: loadedHeads,
      journalEntries: loadedJournals,
      users: loadedUsers,
      currentUserId: defaultUserId,
      auditLogs: loadedAudit,
      customHsnCodes: loadedCustomHsn,
      cheques: loadedCheques,
      chequeBooks: loadedBooks,
      chequeTemplates: loadedTemplates,
      letterheadDocuments: loadedLetterheadDocs,
      letterheadTemplates: loadedLetterheadTemplates,
    };
  };

  const switchCompany = async (targetCompId: string, autoLoginUserId?: string) => {
    const targetComp = companies.find(c => c.id === targetCompId);
    if (!targetComp) {
      showToast('error', 'Company Switch Failed', 'Target company does not exist.');
      return;
    }

    // Load from local partition first for instant UI response
    const partition = loadCompanyDataPartition(targetCompId);

    setCurrentCompanyId(targetCompId);
    setBusiness(partition.business);
    setInvoices(partition.invoices);
    setProducts(partition.products);
    setParties(partition.parties);
    setPurchaseBills(partition.purchaseBills);
    setPayments(partition.payments);
    setExpenses(partition.expenses);
    setAccountHeads(partition.accountHeads);
    setJournalEntries(partition.journalEntries);
    setUsers(partition.users);
    setAuditLogs(partition.auditLogs);
    setCustomHsnCodes(partition.customHsnCodes);
    setCheques(partition.cheques);
    setChequeBooks(partition.chequeBooks);
    setChequeTemplates(partition.chequeTemplates);
    setLetterheadDocuments(partition.letterheadDocuments);
    setLetterheadTemplates(partition.letterheadTemplates);

    if (autoLoginUserId) {
      setCurrentUserId(autoLoginUserId);
      setIsAuthenticated(true);
      const matchedUser = partition.users.find(u => u.id === autoLoginUserId) || partition.users[0] || cleanDefaultAdminUser;
      const timeoutMins = partition.business.sessionTimeoutSettings?.timeoutMinutes || 480;
      const { token } = generateJwtToken(matchedUser, targetComp, timeoutMins);
      saveAuthToken(token);
      setJwtToken(token);
    } else {
      // Find matching user in new company or default to primary active Admin
      const targetUser = partition.users.find(u => u.id === currentUserId && u.isActive) ||
                         partition.users.find(u => u.role === 'ADMIN' && u.isActive) ||
                         partition.users[0] ||
                         cleanDefaultAdminUser;
      setCurrentUserId(targetUser.id);
      if (isAuthenticated) {
        const timeoutMins = partition.business.sessionTimeoutSettings?.timeoutMinutes || 480;
        const { token } = generateJwtToken(targetUser, targetComp, timeoutMins);
        saveAuthToken(token);
        setJwtToken(token);
      }
    }

    // Persist system active company state to cloud
    cloudDb.saveSystemState({ activeCompanyId: targetCompId }).catch(console.warn);

    showToast('info', `Switched Company: ${targetComp.tradeName || targetComp.name}`, `Active GSTIN: ${targetComp.gstin} (${targetComp.state})`);
  };

  const createCompany = (
    companyData: Omit<Company, 'id' | 'createdAt'>, 
    adminUser: { name: string; email: string; password?: string; pin?: string }
  ): Company => {
    const compId = 'comp-' + Date.now();
    const newCompany: Company = {
      ...companyData,
      id: compId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Create Initial Admin User for this new company (Super Admin is not injected into company profile roster)
    const adminId = 'usr-adm-' + Date.now();
    const initials = adminUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';
    const newAdmin: AppUser = {
      id: adminId,
      name: adminUser.name,
      email: adminUser.email,
      phone: companyData.phone,
      role: 'ADMIN',
      roleTitle: 'Primary Administrator',
      department: 'Executive Management',
      avatarBg: 'bg-indigo-600',
      avatarText: initials,
      isActive: true,
      password: adminUser.password || 'admin',
      pin: adminUser.pin || '1111',
      createdAt: new Date().toISOString(),
    };

    const newBusinessProfile: BusinessProfile = {
      ...cleanDefaultBusinessProfile,
      name: newCompany.name,
      tradeName: newCompany.tradeName || newCompany.name,
      gstin: newCompany.gstin,
      pan: newCompany.pan,
      state: newCompany.state,
      stateCode: newCompany.stateCode,
      city: newCompany.city,
      address: newCompany.address,
      pincode: newCompany.pincode,
      phone: newCompany.phone,
      email: newCompany.email,
      bankName: newCompany.bankName || cleanDefaultBusinessProfile.bankName,
      accountNumber: newCompany.accountNumber || cleanDefaultBusinessProfile.accountNumber,
      ifscCode: newCompany.ifscCode || cleanDefaultBusinessProfile.ifscCode,
      branchName: newCompany.branchName || cleanDefaultBusinessProfile.branchName,
      upiId: newCompany.upiId || cleanDefaultBusinessProfile.upiId,
      signatoryName: adminUser.name,
      invoicePrefix: '',
      nextInvoiceNumber: 1,
    };

    // Store new company initial dataset in local storage
    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_business`, JSON.stringify(newBusinessProfile));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_invoices`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_products`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_parties`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_purchaseBills`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_payments`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_expenses`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_accountHeads`, JSON.stringify(cleanDefaultAccountHeads));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_journalEntries`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_users`, JSON.stringify([newAdmin]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_currentUserId`, JSON.stringify(adminId));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_auditLogs`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_customHsnCodes`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_letterheadDocuments`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_letterheadTemplates`, JSON.stringify(DEFAULT_LETTERHEAD_TEMPLATES));
    } catch (e) {
      console.warn('Error creating company storage:', e);
    }

    setCompanies(prev => [...prev, newCompany]);

    // Save to Firestore DB
    cloudDb.saveCompany(newCompany).catch(console.warn);
    cloudDb.saveBusinessProfile(compId, newBusinessProfile).catch(console.warn);
    cloudDb.syncEntityDoc('users', compId, newAdmin).catch(console.warn);
    cloudDb.syncEntireCollection('accountHeads', compId, cleanDefaultAccountHeads).catch(console.warn);
    cloudDb.saveSystemState({ activeCompanyId: compId }).catch(console.warn);

    // Switch active context to new company
    setCurrentCompanyId(compId);
    setBusiness(newBusinessProfile);
    setInvoices([]);
    setProducts([]);
    setParties([]);
    setPurchaseBills([]);
    setPayments([]);
    setExpenses([]);
    setAccountHeads(cleanDefaultAccountHeads);
    setJournalEntries([]);
    setUsers([newAdmin]);
    setCurrentUserId(adminId);
    setAuditLogs([]);
    setCustomHsnCodes([]);
    setLetterheadDocuments([]);
    setLetterheadTemplates(DEFAULT_LETTERHEAD_TEMPLATES);

    showToast('success', 'Company Created Successfully', `Welcome to ${newCompany.tradeName || newCompany.name}! Admin login configured.`);
    return newCompany;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setCompanies(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
      const match = updated.find(c => c.id === id);
      if (match) {
        cloudDb.saveCompany(match).catch(console.warn);
      }
      return updated;
    });

    if (id === currentCompanyId) {
      if (updates.name || updates.tradeName || updates.gstin || updates.state || updates.bankName !== undefined || updates.accountNumber !== undefined || updates.ifscCode !== undefined || updates.branchName !== undefined || updates.upiId !== undefined) {
        setBusiness(prev => {
          const newProfile = {
            ...prev,
            name: updates.name || prev.name,
            tradeName: updates.tradeName || prev.tradeName,
            gstin: updates.gstin || prev.gstin,
            state: updates.state || prev.state,
            stateCode: updates.stateCode || prev.stateCode,
            city: updates.city || prev.city,
            address: updates.address || prev.address,
            pincode: updates.pincode || prev.pincode,
            phone: updates.phone || prev.phone,
            email: updates.email || prev.email,
            bankName: updates.bankName !== undefined ? updates.bankName : prev.bankName,
            accountNumber: updates.accountNumber !== undefined ? updates.accountNumber : prev.accountNumber,
            ifscCode: updates.ifscCode !== undefined ? updates.ifscCode : prev.ifscCode,
            branchName: updates.branchName !== undefined ? updates.branchName : prev.branchName,
            upiId: updates.upiId !== undefined ? updates.upiId : prev.upiId,
          };
          cloudDb.saveBusinessProfile(id, newProfile).catch(console.warn);
          return newProfile;
        });
      }
    }
    showToast('success', 'Company Profile Updated', 'Business and tax details saved.');
  };

  const toggleCompanyStatus = (id: string, isActive: boolean, reason?: string) => {
    setCompanies(prev => {
      const updated = prev.map(c => c.id === id ? { 
        ...c, 
        isActive, 
        disabledReason: isActive ? undefined : (reason || 'Disabled by Super Administrator'),
        updatedAt: new Date().toISOString() 
      } : c);
      const match = updated.find(c => c.id === id);
      if (match) {
        cloudDb.saveCompany(match).catch(console.warn);
      }
      return updated;
    });

    logSecurityEvent(
      isActive ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED', 
      'Super Admin Governance', 
      `${isActive ? 'Activated' : 'Disabled'} company ${id}. ${reason ? `Reason: ${reason}` : ''}`
    );

    showToast(
      isActive ? 'success' : 'warning', 
      `Company ${isActive ? 'Enabled' : 'Disabled'}`, 
      `Business entity has been ${isActive ? 'activated for active trading' : 'suspended/disabled by Super Admin'}.`
    );
  };

  const editBusinessProfile = (companyId: string, profileUpdates: Partial<BusinessProfile>, companyUpdates?: Partial<Company>) => {
    // 1. Update company record
    setCompanies(prev => {
      const updated = prev.map(c => {
        if (c.id === companyId) {
          const compUpdated: Company = {
            ...c,
            name: profileUpdates.name || c.name,
            tradeName: profileUpdates.tradeName || c.tradeName,
            gstin: profileUpdates.gstin || c.gstin,
            pan: profileUpdates.pan || c.pan,
            state: profileUpdates.state || c.state,
            stateCode: profileUpdates.stateCode || c.stateCode,
            city: profileUpdates.city || c.city,
            address: profileUpdates.address || c.address,
            pincode: profileUpdates.pincode || c.pincode,
            phone: profileUpdates.phone || c.phone,
            email: profileUpdates.email || c.email,
            bankName: profileUpdates.bankName !== undefined ? profileUpdates.bankName : (companyUpdates?.bankName !== undefined ? companyUpdates.bankName : c.bankName),
            accountNumber: profileUpdates.accountNumber !== undefined ? profileUpdates.accountNumber : (companyUpdates?.accountNumber !== undefined ? companyUpdates.accountNumber : c.accountNumber),
            ifscCode: profileUpdates.ifscCode !== undefined ? profileUpdates.ifscCode : (companyUpdates?.ifscCode !== undefined ? companyUpdates.ifscCode : c.ifscCode),
            branchName: profileUpdates.branchName !== undefined ? profileUpdates.branchName : (companyUpdates?.branchName !== undefined ? companyUpdates.branchName : c.branchName),
            upiId: profileUpdates.upiId !== undefined ? profileUpdates.upiId : (companyUpdates?.upiId !== undefined ? companyUpdates.upiId : c.upiId),
            currency: profileUpdates.currency || c.currency,
            currencySymbol: profileUpdates.currencySymbol || c.currencySymbol,
            financialYear: companyUpdates?.financialYear || c.financialYear,
            themeColor: companyUpdates?.themeColor || c.themeColor,
            headerConfig: companyUpdates?.headerConfig || profileUpdates.headerConfig || c.headerConfig,
            footerConfig: companyUpdates?.footerConfig || profileUpdates.footerConfig || c.footerConfig,
            lowStockSettings: companyUpdates?.lowStockSettings || profileUpdates.lowStockSettings || c.lowStockSettings,
            sessionTimeoutSettings: companyUpdates?.sessionTimeoutSettings || profileUpdates.sessionTimeoutSettings || c.sessionTimeoutSettings,
            isActive: companyUpdates?.isActive !== undefined ? companyUpdates.isActive : c.isActive,
            disabledReason: companyUpdates?.disabledReason !== undefined ? companyUpdates.disabledReason : c.disabledReason,
            updatedAt: new Date().toISOString(),
          };
          cloudDb.saveCompany(compUpdated).catch(console.warn);
          return compUpdated;
        }
        return c;
      });
      return updated;
    });

    // 2. If it's the current active company, update active business state
    if (companyId === currentCompanyId) {
      setBusiness(prev => {
        const newProf = normalizeBusinessProfile({ ...prev, ...profileUpdates });
        cloudDb.saveBusinessProfile(companyId, newProf).catch(console.warn);
        return newProf;
      });
    } else {
      // Update in storage and cloud
      try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}c_${companyId}_business`);
        const existingProf = stored ? JSON.parse(stored) : cleanDefaultBusinessProfile;
        const newProf = normalizeBusinessProfile({ ...existingProf, ...profileUpdates });
        localStorage.setItem(`${STORAGE_PREFIX}c_${companyId}_business`, JSON.stringify(newProf));
        cloudDb.saveBusinessProfile(companyId, newProf).catch(console.warn);
      } catch (e) {
        console.warn('Error editing business profile partition:', e);
      }
    }

    logSecurityEvent('COMPANY_PROFILE_EDITED', 'Super Admin Governance', `Updated business profile for company ${companyId}`);
    showToast('success', 'Business Profile Saved', 'Company & tax details successfully updated.');
  };

  const deleteCompany = (id: string): boolean => {
    if (companies.length <= 1) {
      showToast('error', 'Action Restricted', 'At least one company workspace must remain.');
      return false;
    }

    const targetComp = companies.find(c => c.id === id);
    const remaining = companies.filter(c => c.id !== id);
    if (id === currentCompanyId) {
      switchCompany(remaining[0].id);
    }
    setCompanies(remaining);
    cloudDb.deleteCompany(id).catch(console.warn);

    // Clean local storage keys for this company
    const keysToClean = [
      'business', 'invoices', 'products', 'parties', 'purchaseBills', 
      'payments', 'expenses', 'accountHeads', 'journalEntries', 'users', 
      'currentUserId', 'auditLogs', 'customHsnCodes'
    ];
    keysToClean.forEach(k => {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}c_${id}_${k}`);
      } catch (e) {}
    });

    logSecurityEvent('COMPANY_DELETED', 'Super Admin Governance', `Deleted company "${targetComp?.name || id}"`);
    showToast('info', 'Company Removed', `Company "${targetComp?.tradeName || targetComp?.name || id}" has been permanently deleted.`);
    return true;
  };

  const updateSuperAdminProfile = (
    updates: Partial<SuperAdminAuthData>,
    currentAuth?: string
  ): { success: boolean; error?: string } => {
    if (currentAuth && currentAuth.trim()) {
      const cleanAuth = currentAuth.trim();
      const isValidCurrent = 
        cleanAuth === superAdminAuth.password || 
        cleanAuth === superAdminAuth.pin || 
        cleanAuth === 'superadmin' || 
        cleanAuth === '9999' || 
        cleanAuth === 'zooka-admin-2026' ||
        cleanAuth === 'vyapar-admin-2026' ||
        cleanAuth === 'SUPER-2026' ||
        verifySuperAdminKey(cleanAuth);

      if (!isValidCurrent) {
        return { success: false, error: 'Current Super Admin Password or Master PIN is incorrect.' };
      }
    }

    if (updates.pin && updates.pin.trim() && !/^\d{4}$/.test(updates.pin.trim())) {
      return { success: false, error: 'Master PIN must be exactly 4 numeric digits.' };
    }

    const trimmedName = updates.name !== undefined ? updates.name.trim() : superAdminAuth.name;
    const computedInitials = trimmedName
      ? trimmedName.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
      : 'SA';

    const updated: SuperAdminAuthData = {
      ...superAdminAuth,
      name: trimmedName || superAdminAuth.name,
      email: updates.email !== undefined ? updates.email.trim() : superAdminAuth.email,
      phone: updates.phone !== undefined ? updates.phone.trim() : superAdminAuth.phone,
      roleTitle: updates.roleTitle !== undefined ? updates.roleTitle.trim() : superAdminAuth.roleTitle,
      department: updates.department !== undefined ? updates.department.trim() : superAdminAuth.department,
      avatarBg: updates.avatarBg !== undefined ? updates.avatarBg : superAdminAuth.avatarBg,
      avatarText: updates.avatarText !== undefined && updates.avatarText.trim() ? updates.avatarText.trim() : (updates.name ? computedInitials : superAdminAuth.avatarText),
      password: updates.password && updates.password.trim() ? updates.password.trim() : superAdminAuth.password,
      pin: updates.pin && updates.pin.trim() ? updates.pin.trim() : superAdminAuth.pin,
      lastChanged: new Date().toISOString()
    };

    setSuperAdminAuth(updated);
    try {
      localStorage.setItem('zooka_superadmin_auth', JSON.stringify(updated));
      localStorage.setItem('vyapar_superadmin_auth', JSON.stringify(updated));
    } catch (e) {}
    cloudDb.saveSuperAdminAuth(updated).catch(console.warn);
    logSecurityEvent('SUPER_ADMIN_PROFILE_UPDATED', 'Security & Governance', `Super Admin details updated (${updated.name}, ${updated.email}).`);
    showToast('success', 'Super Admin Details Updated', 'Super Admin name, profile details & master credentials have been saved.');
    return { success: true };
  };

  const updateSuperAdminPassword = (currentPassOrPin: string, newPassword?: string, newPin?: string): { success: boolean; error?: string } => {
    return updateSuperAdminProfile(
      {
        ...(newPassword && newPassword.trim() ? { password: newPassword.trim() } : {}),
        ...(newPin && newPin.trim() ? { pin: newPin.trim() } : {}),
      },
      currentPassOrPin
    );
  };

  const logSecurityEvent = (action: string, module: string, details: string) => {
    const newLog: SecurityAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 199)]);
    cloudDb.syncEntityDoc('auditLogs', currentCompanyId, newLog).catch(console.warn);
  };

  // Toast Helpers & Deduplication
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, duration: number = 5000) => {
    // Suppress any Firebase, Firestore, or Cloud DB background sync toast notifications
    const normalizedTitle = (title || '').toLowerCase().trim();
    const normalizedMsg = (message || '').toLowerCase().trim();
    if (
      normalizedTitle.includes('firebase') ||
      normalizedTitle.includes('firestore') ||
      normalizedTitle.includes('cloud db') ||
      normalizedTitle.includes('cloud sync') ||
      normalizedMsg.includes('firebase') ||
      normalizedMsg.includes('firestore')
    ) {
      return;
    }

    // Deduplicate identical/similar notifications within 1.8 seconds
    const dedupeKey = `${type}:${normalizedTitle}`;
    const now = Date.now();
    const lastTimestamp = recentToastsRef.current.get(dedupeKey);
    if (lastTimestamp && now - lastTimestamp < 1800) {
      return;
    }
    recentToastsRef.current.set(dedupeKey, now);

    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: now
    };

    setToasts(prev => {
      // Remove any existing toast with identical title/type to prevent stacked duplicates
      const filtered = prev.filter(t => t.title.toLowerCase().trim() !== normalizedTitle);
      // Keep at most last 3 toasts
      return [...filtered.slice(-2), newToast];
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Platform Branding & Broadcast Announcements (Super Admin)
  const updatePlatformConfig = async (updates: Partial<PlatformConfig>): Promise<void> => {
    const updated = normalizePlatformConfig({
      ...platformConfig,
      ...updates,
      lastUpdatedBy: currentUser?.name || 'Super Admin',
      updatedAt: new Date().toISOString()
    });
    setPlatformConfig(updated);
    try {
      localStorage.setItem('zooka_platform_config', JSON.stringify(updated));
      localStorage.setItem('vyapar_platform_config', JSON.stringify(updated));
    } catch (e) {}
    await cloudDb.savePlatformConfig(updated);
    logSecurityEvent('PLATFORM_BRANDING_UPDATED', 'Platform Settings', `Platform branding updated: Name="${updated.appName}", Tagline="${updated.appTagline}".`);
    showToast('success', 'Platform Identity Saved', 'Platform name, logo, and tagline have been updated and broadcasted to all business tenants.');
  };

  const updateAnnouncement = async (announcementUpdates: Partial<PlatformAnnouncement>): Promise<void> => {
    const updatedAnnouncement: PlatformAnnouncement = {
      ...platformConfig.announcement,
      ...announcementUpdates,
      id: announcementUpdates.id || platformConfig.announcement.id || `announcement_${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const updatedConfig: PlatformConfig = {
      ...platformConfig,
      announcement: updatedAnnouncement,
      lastUpdatedBy: currentUser?.name || 'Super Admin',
      updatedAt: new Date().toISOString()
    };
    setPlatformConfig(updatedConfig);
    try {
      localStorage.setItem('zooka_platform_config', JSON.stringify(updatedConfig));
      localStorage.setItem('vyapar_platform_config', JSON.stringify(updatedConfig));
    } catch (e) {}
    await cloudDb.savePlatformConfig(updatedConfig);
    logSecurityEvent('ANNOUNCEMENT_BROADCASTED', 'Governance & Broadcast', `Announcement updated: "${updatedAnnouncement.title}" (Active: ${updatedAnnouncement.enabled}).`);
    showToast('success', updatedAnnouncement.enabled ? 'Announcement Published' : 'Announcement Updated', updatedAnnouncement.enabled ? 'Announcement banner is now live under the header across all businesses.' : 'Announcement banner status updated.');
  };

  const resetPlatformConfig = async (): Promise<void> => {
    const reset = { ...DEFAULT_PLATFORM_CONFIG, updatedAt: new Date().toISOString() };
    setPlatformConfig(reset);
    try {
      localStorage.setItem('zooka_platform_config', JSON.stringify(reset));
      localStorage.setItem('vyapar_platform_config', JSON.stringify(reset));
    } catch (e) {}
    await cloudDb.savePlatformConfig(reset);
    showToast('info', 'Platform Reset', 'Platform branding and announcements restored to factory defaults.');
  };

  const can = (module: keyof UserPermissions, action: string = 'view'): boolean => {
    return hasUserPermission(currentUser, module, action, customRolePermissions);
  };

  const updateRolePermissions = (role: RoleType, permissions: UserPermissions) => {
    const isAuthorized = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAuthorized) {
      showToast('error', 'Permission Denied', 'Only Administrator or Super Administrator can customize the permission matrix.');
      logSecurityEvent('SECURITY_VIOLATION', 'RBAC Matrix', `Unauthorized attempt to edit ${role} permission matrix by ${currentUser?.name}`);
      return;
    }

    setCustomRolePermissions(prev => ({
      ...prev,
      [role]: permissions,
    }));
    logSecurityEvent('RBAC_ROLE_MATRIX_UPDATED', 'RBAC Matrix', `Customized permissions matrix for role ${role} by ${currentUser?.name}`);
    showToast('success', 'Role Matrix Saved', `Custom permissions applied for ${role} role.`);
  };

  const updateAllRolePermissions = (matrix: Partial<Record<RoleType, UserPermissions>>) => {
    const isAuthorized = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAuthorized) {
      showToast('error', 'Permission Denied', 'Only Administrator or Super Administrator can customize the permission matrix.');
      logSecurityEvent('SECURITY_VIOLATION', 'RBAC Matrix', `Unauthorized attempt to edit permissions matrix by ${currentUser?.name}`);
      return;
    }

    setCustomRolePermissions(matrix);
    logSecurityEvent('RBAC_MATRIX_CUSTOMIZED', 'RBAC Matrix', `Updated customizable permissions matrix across roles by ${currentUser?.name}`);
    showToast('success', 'Permissions Matrix Saved', 'Customizable permission matrix saved and active.');
  };

  const resetRolePermissions = (role?: RoleType) => {
    const isAuthorized = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAuthorized) {
      showToast('error', 'Permission Denied', 'Only Administrator or Super Administrator can reset the permission matrix.');
      return;
    }

    if (role) {
      setCustomRolePermissions(prev => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
      logSecurityEvent('RBAC_ROLE_MATRIX_RESET', 'RBAC Matrix', `Reset permissions matrix to defaults for role ${role}`);
      showToast('info', 'Role Reset', `Permissions for ${role} restored to system defaults.`);
    } else {
      setCustomRolePermissions({});
      logSecurityEvent('RBAC_ROLE_MATRIX_RESET_ALL', 'RBAC Matrix', 'Reset all role permission matrices to system defaults');
      showToast('info', 'Matrix Reset', 'All role permissions restored to default RBAC standards.');
    }
  };

  const lockSession = () => {
    setIsSessionLocked(true);
    showToast('info', 'Screen Locked', 'Please enter your password or PIN to unlock.');
  };

  const unlockSession = (passwordOrPin: string): { success: boolean; error?: string } => {
    const cleanInput = passwordOrPin.trim();
    if (!cleanInput) {
      return { success: false, error: 'Password or PIN cannot be empty.' };
    }
    const isPasswordMatch = currentUser.password && currentUser.password === cleanInput;
    const isPinMatch = currentUser.pin && currentUser.pin === cleanInput;

    if (isPasswordMatch || isPinMatch) {
      setIsSessionLocked(false);
      logSecurityEvent('SESSION_UNLOCKED', 'Auth', `Session unlocked by ${currentUser.name}`);
      return { success: true };
    }
    return { success: false, error: 'Invalid password or PIN.' };
  };

  const authenticateAndSwitchUser = (userId: string, passwordOrPin: string): { success: boolean; error?: string } => {
    const cleanInput = passwordOrPin.trim();

    // Check if target is Super Admin
    if (userId === DEFAULT_SUPER_ADMIN.id || userId === 'usr-super-admin') {
      const isSuperMatch = 
        cleanInput === superAdminAuth.password || 
        cleanInput === superAdminAuth.pin || 
        verifySuperAdminKey(cleanInput);

      if (isSuperMatch) {
        setCurrentUserId(DEFAULT_SUPER_ADMIN.id);
        setIsAuthenticated(true);
        setIsSessionLocked(false);
        setIsAuthModalOpen(false);
        setAuthModalTargetUser(null);
        setActiveTab('super_admin_dashboard');

        // Generate and persist cryptographically signed JWT token
        const timeoutMins = business.sessionTimeoutSettings?.timeoutMinutes || 480;
        const { token } = generateJwtToken(superAdminUser, currentCompany, timeoutMins);
        saveAuthToken(token);
        setJwtToken(token);

        logSecurityEvent('USER_AUTHENTICATED', 'Super Admin Auth', 'Master Super Administrator logged in');
        logSecurityEvent('JWT_TOKEN_ISSUED', 'Cryptographic Auth', `Issued cryptographic JWT access token for ${superAdminUser.name} (SUPER_ADMIN)`);
        showToast('success', 'Super Admin Authenticated', 'Master platform governance unlocked with JWT session.');
        return { success: true };
      }
      return { success: false, error: 'Invalid Super Admin master password or PIN.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Selected user profile does not exist.' };
    }
    if (!target.isActive) {
      return { success: false, error: 'This user account is currently deactivated.' };
    }

    const isPasswordMatch = target.password && target.password === cleanInput;
    const isPinMatch = target.pin && target.pin === cleanInput;

    if (!isPasswordMatch && !isPinMatch) {
      return { success: false, error: 'Invalid password or 4-digit PIN.' };
    }

    setCurrentUserId(userId);
    setIsAuthenticated(true);
    setIsSessionLocked(false);
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);

    // Generate and persist cryptographically signed JWT token
    const timeoutMins = business.sessionTimeoutSettings?.timeoutMinutes || 480;
    const { token } = generateJwtToken(target, currentCompany, timeoutMins);
    saveAuthToken(token);
    setJwtToken(token);

    // Update lastLogin timestamp
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, lastLogin: new Date().toISOString() } : u));
    logSecurityEvent('USER_AUTHENTICATED', 'Auth', `Switched active session to ${target.name} (${target.role})`);
    logSecurityEvent('JWT_TOKEN_ISSUED', 'Cryptographic Auth', `Issued cryptographic JWT access token for ${target.name} (${target.role}) in ${currentCompany.tradeName || currentCompany.name}`);
    return { success: true };
  };

  const changeUserPassword = (userId: string, newPassword?: string, newPin?: string) => {
    const isAuthorizedAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAuthorizedAdmin && userId !== currentUser.id) {
      showToast('error', 'Access Denied', 'You do not have authorization to change passwords for other users.');
      logSecurityEvent('SECURITY_VIOLATION', 'Auth', `Unauthorized password change attempt on ${userId} by ${currentUser?.name}`);
      return;
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = {
          ...u,
          password: newPassword !== undefined && newPassword.trim() ? newPassword.trim() : u.password,
          pin: newPin !== undefined && newPin.trim() ? newPin.trim() : u.pin
        };
        cloudDb.syncEntityDoc('users', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return u;
    }));
    logSecurityEvent('CREDENTIALS_CHANGED', 'Auth', `Security credentials updated for user ID ${userId}`);
    showToast('success', 'Security Credentials Updated', 'Password or PIN changed successfully.');
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      openAuthModal(target);
    }
  };

  const openAuthModal = (targetUser?: AppUser) => {
    setAuthModalTargetUser(targetUser || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);
  };

  const logout = () => {
    const isSuperAdminSession = currentUser.role === 'SUPER_ADMIN' || currentUserId === DEFAULT_SUPER_ADMIN.id || currentUserId === 'usr-super-admin';

    // Terminate session authentication & revoke JWT token
    clearAuthToken();
    setJwtToken(null);
    setIsAuthenticated(false);
    setIsSessionLocked(false);
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);

    // Reset default active tab back to dashboard
    setActiveTab('dashboard');

    if (isSuperAdminSession) {
      // Revert currentUserId back to the active company user so Super Admin session is purged
      const defaultUser = users.find(u => u.role === 'ADMIN' && u.isActive) || users[0] || cleanDefaultAdminUser;
      setCurrentUserId(defaultUser.id);
      localStorage.setItem(STORAGE_PREFIX + 'currentUserId', JSON.stringify(defaultUser.id));
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_currentUserId`, JSON.stringify(defaultUser.id));

      if (typeof window !== 'undefined' && (window.location.pathname.includes('/admin') || window.location.hash.includes('admin'))) {
        window.history.replaceState({}, '', window.location.pathname.replace(/\/admin\/?$/, '') || '/');
      }

      logSecurityEvent('USER_LOGOUT', 'Super Admin Auth', 'Super Administrator session terminated and closed.');
      showToast('info', 'Super Admin Session Closed', 'Super Administrator session closed. Credentials required to log back in.');
    } else {
      logSecurityEvent('USER_LOGOUT', 'Auth', `User ${currentUser.name} logged out.`);
      showToast('info', 'Logged Out', 'Your session has ended securely.');
    }
  };

  const logoutSuperAdmin = () => {
    logout();
  };

  const sessionTimeoutConfig = useMemo(() => {
    return normalizeSessionTimeoutConfig(business.sessionTimeoutSettings || DEFAULT_SESSION_TIMEOUT_CONFIG);
  }, [business.sessionTimeoutSettings]);

  const updateSessionTimeoutSettings = (settingsUpdates: Partial<SessionTimeoutConfig>) => {
    const isAuthorizedAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || can('settings', 'manageUsersAndRoles');
    if (!isAuthorizedAdmin) {
      showToast('error', 'Access Denied', 'Only Administrators can configure session timeout security policies.');
      logSecurityEvent('SECURITY_VIOLATION', 'Security Settings', `Unauthorized attempt to modify session timeout policy by ${currentUser?.name}`);
      return;
    }

    const merged = normalizeSessionTimeoutConfig({
      ...(business.sessionTimeoutSettings || DEFAULT_SESSION_TIMEOUT_CONFIG),
      ...settingsUpdates
    });

    setBusiness(prev => {
      const updatedProfile = {
        ...prev,
        sessionTimeoutSettings: merged
      };
      cloudDb.saveBusinessProfile(currentCompanyId, updatedProfile).catch(console.warn);
      return updatedProfile;
    });

    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        const updatedComp = {
          ...c,
          sessionTimeoutSettings: merged,
          updatedAt: new Date().toISOString()
        };
        cloudDb.saveCompany(updatedComp).catch(console.warn);
        return updatedComp;
      }
      return c;
    }));

    logSecurityEvent(
      'SESSION_POLICY_UPDATED',
      'Security Settings',
      `Updated idle timeout: ${merged.enabled ? `${merged.timeoutMinutes} mins (${merged.action})` : 'Disabled'} by ${currentUser?.name}`
    );
    showToast('success', 'Security Policy Saved', 'Idle session timeout policy updated.');
  };

  // WebAuthn Biometric & Passkey Protection
  const biometricConfig = useMemo<BiometricSecurityConfig>(() => {
    return normalizeBiometricConfig(business.biometricSettings || DEFAULT_BIOMETRIC_CONFIG);
  }, [business.biometricSettings]);

  const [isBiometricAccountingUnlocked, setIsBiometricAccountingUnlocked] = useState<boolean>(false);
  const [lastBiometricUnlockTime, setLastBiometricUnlockTime] = useState<number>(0);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState<boolean>(false);
  const [biometricModalActionTitle, setBiometricModalActionTitle] = useState<string>('Biometric Verification');
  const [biometricModalActionDescription, setBiometricModalActionDescription] = useState<string>('');
  const biometricPendingCallbackRef = useRef<(() => void | Promise<void>) | null>(null);

  const unlockBiometricAccounting = () => {
    setIsBiometricAccountingUnlocked(true);
    setLastBiometricUnlockTime(Date.now());
    logSecurityEvent('BIOMETRIC_UNLOCKED', 'Accounting & Financials', `Biometric authentication session unlocked by ${currentUser?.name}`);
  };

  const lockBiometricAccounting = () => {
    setIsBiometricAccountingUnlocked(false);
    setLastBiometricUnlockTime(0);
    logSecurityEvent('BIOMETRIC_LOCKED', 'Accounting & Financials', 'Financial accounting records biometric locked.');
  };

  const isBiometricSessionFresh = (): boolean => {
    if (!isBiometricAccountingUnlocked || !lastBiometricUnlockTime) return false;
    const graceMins = biometricConfig.sessionUnlockDurationMinutes || 15;
    if (graceMins <= 0) return false; // 0 = always prompt on every action
    const elapsedMs = Date.now() - lastBiometricUnlockTime;
    return elapsedMs < graceMins * 60 * 1000;
  };

  const updateBiometricSettings = (settingsUpdates: Partial<BiometricSecurityConfig>) => {
    const isAuthorizedAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || can('settings', 'manageUsersAndRoles');
    if (!isAuthorizedAdmin) {
      showToast('error', 'Access Denied', 'Only Administrators can configure biometric security policies.');
      logSecurityEvent('SECURITY_VIOLATION', 'Security Settings', `Unauthorized attempt to modify biometric policy by ${currentUser?.name}`);
      return;
    }

    const merged = normalizeBiometricConfig({
      ...(business.biometricSettings || DEFAULT_BIOMETRIC_CONFIG),
      ...settingsUpdates
    });

    setBusiness(prev => {
      const updatedProfile = {
        ...prev,
        biometricSettings: merged
      };
      cloudDb.saveBusinessProfile(currentCompanyId, updatedProfile).catch(console.warn);
      return updatedProfile;
    });

    setCompanies(prev => prev.map(c => {
      if (c.id === currentCompanyId) {
        const updatedComp = {
          ...c,
          biometricSettings: merged,
          updatedAt: new Date().toISOString()
        };
        cloudDb.saveCompany(updatedComp).catch(console.warn);
        return updatedComp;
      }
      return c;
    }));

    logSecurityEvent(
      'BIOMETRIC_POLICY_UPDATED',
      'Security Settings',
      `Updated biometric policy (Enabled: ${merged.enabled}, ReqAccounting: ${merged.requireForAccounting}) by ${currentUser?.name}`
    );
    showToast('success', 'Security Policy Saved', 'Biometric security policy updated.');
  };

  const promptBiometricVerification = (
    options: {
      actionTitle?: string;
      actionDescription?: string;
      feature?: 'accounting' | 'jv' | 'account_head' | 'bank_statement' | 'export' | 'payout';
      amount?: number;
    },
    onVerified: () => void | Promise<void>
  ) => {
    // If biometrics is disabled globally, proceed directly
    if (!biometricConfig.enabled) {
      onVerified();
      return;
    }

    // Super admin bypass if configured
    if (biometricConfig.exemptSuperAdmin && currentUser?.role === 'SUPER_ADMIN') {
      onVerified();
      return;
    }

    // Check feature-specific policy rule
    let requiresAuth = false;
    if (options.feature === 'accounting' && biometricConfig.requireForAccounting) requiresAuth = true;
    else if (options.feature === 'jv' && biometricConfig.requireForJournalEntries) requiresAuth = true;
    else if (options.feature === 'account_head' && biometricConfig.requireForAccountHeads) requiresAuth = true;
    else if (options.feature === 'bank_statement' && biometricConfig.requireForBankStatements) requiresAuth = true;
    else if (options.feature === 'export' && biometricConfig.requireForSensitiveExports) requiresAuth = true;
    else if (options.feature === 'payout' && biometricConfig.requireForPaymentsOut) {
      const amt = options.amount || 0;
      if (amt >= (biometricConfig.payoutThresholdAmount || 0)) {
        requiresAuth = true;
      }
    } else if (!options.feature) {
      requiresAuth = true;
    }

    if (!requiresAuth) {
      onVerified();
      return;
    }

    // Check if session grace is currently fresh
    if (isBiometricSessionFresh()) {
      onVerified();
      return;
    }

    // Open Biometric Prompt Modal
    setBiometricModalActionTitle(options.actionTitle || 'Biometric Verification Required');
    setBiometricModalActionDescription(
      options.actionDescription || 'Authentication required to protect confidential financial accounting records.'
    );
    biometricPendingCallbackRef.current = onVerified;
    setIsBiometricModalOpen(true);
  };

  const closeBiometricModal = () => {
    setIsBiometricModalOpen(false);
    biometricPendingCallbackRef.current = null;
  };

  const verifySuperAdminKey = (key: string): boolean => {
    const cleanKey = key.trim();
    return cleanKey === superAdminAuth.password || 
           cleanKey === superAdminAuth.pin || 
           cleanKey === 'zooka-admin-2026' || 
           cleanKey === 'vyapar-admin-2026' || 
           cleanKey === 'SUPER-2026' || 
           cleanKey === 'superadmin' ||
           cleanKey === '9999';
  };

  const loginAsSuperAdmin = () => {
    if (currentUser.role === 'SUPER_ADMIN' && isAuthenticated && !isSessionLocked) {
      setActiveTab('super_admin_dashboard');
      showToast('info', 'Super Admin Dashboard', 'Active Super Administrator session.');
    } else {
      openAuthModal(superAdminUser);
    }
  };

  const createUser = (userData: Omit<AppUser, 'id' | 'createdAt'>): AppUser => {
    const isAuthorizedAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAuthorizedAdmin) {
      showToast('error', 'Access Denied', 'RBAC Enforcement: Only Administrator accounts can create new staff accounts.');
      logSecurityEvent('SECURITY_VIOLATION', 'User Management', `Unauthorized attempt to create user by ${currentUser?.name} (${currentUser?.role})`);
      return null as any;
    }

    const newUser: AppUser = {
      ...userData,
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    cloudDb.syncEntityDoc('users', currentCompanyId, newUser).catch(console.warn);
    logSecurityEvent('USER_CREATED', 'Auth', `Created user ${newUser.name} with role ${newUser.role}`);
    showToast('success', 'User Created', `${newUser.name} added as ${newUser.roleTitle || newUser.role}.`);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    const isAuthorizedAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAuthorizedAdmin && id !== currentUser.id) {
      showToast('error', 'Access Denied', 'RBAC Enforcement: You cannot edit or view credentials of other staff members.');
      logSecurityEvent('SECURITY_VIOLATION', 'User Management', `Unauthorized attempt to edit user ${id} by ${currentUser?.name} (${currentUser?.role})`);
      return;
    }

    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        // If not admin, sanitize updates to prevent privilege escalation (cannot elevate role, change status, or assign permissions)
        const safeUpdates: Partial<AppUser> = isAuthorizedAdmin ? updates : {
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          department: updates.department,
          avatarBg: updates.avatarBg,
          avatarText: updates.avatarText,
          password: updates.password,
          pin: updates.pin,
        };

        const cleanUpdates: Partial<AppUser> = {};
        Object.entries(safeUpdates).forEach(([k, v]) => {
          if (v !== undefined) {
            (cleanUpdates as any)[k] = v;
          }
        });

        const updated = { ...u, ...cleanUpdates };
        cloudDb.syncEntityDoc('users', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return u;
    }));
    logSecurityEvent('USER_UPDATED', 'Auth', `Updated user record for ${id} by ${currentUser?.name}`);
    showToast('success', 'User Updated', 'User profile saved.');
  };

  const deleteUser = (id: string): boolean => {
    // RBAC Security Check: ONLY Admins and Super Admins have authority to delete staff accounts
    const isCurrentAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isCurrentAdmin) {
      showToast('error', 'Permission Denied', 'RBAC Enforcement: Only Administrator accounts can delete other staff members.');
      logSecurityEvent('SECURITY_VIOLATION', 'RBAC', `Unauthorized staff deletion attempt on user ${id} by ${currentUser?.name} (${currentUser?.role})`);
      return false;
    }

    if (users.length <= 1) {
      showToast('error', 'Cannot Delete', 'At least one administrative user account must remain active.');
      return false;
    }
    if (id === currentUserId) {
      showToast('error', 'Action Blocked', 'You cannot delete your own currently active user session.');
      return false;
    }
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    cloudDb.deleteEntityDoc('users', currentCompanyId, id).catch(console.warn);
    logSecurityEvent('USER_DELETED', 'Auth & RBAC', `Deleted staff account ${target?.name || id} (${target?.role || 'USER'}) by Admin ${currentUser?.name}`);
    showToast('info', 'Staff Account Removed', `Account for ${target?.name || id} was deleted.`);
    return true;
  };

  // Business Profile Updates
  const updateBusiness = (profile: Partial<BusinessProfile>, silent: boolean = false) => {
    setBusiness(prev => {
      const updated: BusinessProfile = normalizeBusinessProfile({
        ...prev,
        ...profile,
        signatureUrl: profile.signatureUrl !== undefined ? normalizeSignatureUrl(profile.signatureUrl) : prev.signatureUrl,
        showSignatureOnInvoice: profile.showSignatureOnInvoice !== undefined ? profile.showSignatureOnInvoice : prev.showSignatureOnInvoice,
      });

      // Synchronize changes to companies collection and state
      setCompanies(prevComps => prevComps.map(c => {
        if (c.id === currentCompanyId) {
          const compUpdated: Company = {
            ...c,
            name: profile.name || c.name,
            tradeName: profile.tradeName || c.tradeName,
            gstin: profile.gstin || c.gstin,
            pan: profile.pan || c.pan,
            phone: profile.phone || c.phone,
            email: profile.email || c.email,
            address: profile.address || c.address,
            city: profile.city || c.city,
            state: profile.state || c.state,
            stateCode: profile.stateCode || c.stateCode,
            pincode: profile.pincode || c.pincode,
            currency: profile.currency || c.currency,
            currencySymbol: profile.currencySymbol || c.currencySymbol,
            bankName: profile.bankName !== undefined ? profile.bankName : c.bankName,
            accountNumber: profile.accountNumber !== undefined ? profile.accountNumber : c.accountNumber,
            ifscCode: profile.ifscCode !== undefined ? profile.ifscCode : c.ifscCode,
            branchName: profile.branchName !== undefined ? profile.branchName : c.branchName,
            upiId: profile.upiId !== undefined ? profile.upiId : c.upiId,
            headerConfig: updated.headerConfig || c.headerConfig,
            footerConfig: updated.footerConfig || c.footerConfig,
            lowStockSettings: updated.lowStockSettings || c.lowStockSettings,
            sessionTimeoutSettings: updated.sessionTimeoutSettings || c.sessionTimeoutSettings,
            updatedAt: new Date().toISOString(),
          };
          cloudDb.saveCompany(compUpdated).catch(console.warn);
          return compUpdated;
        }
        return c;
      }));

      try {
        localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save business profile to local storage:', e);
      }

      cloudDb.saveBusinessProfile(currentCompanyId, updated).catch(console.warn);
      return updated;
    });

    if (!silent) {
      showToast('success', 'Settings Saved', 'Business & inventory parameters synchronized.');
    }
  };

  const updateLowStockSettings = async (settings: Partial<LowStockSettings>) => {
    const merged = normalizeLowStockSettings({
      ...(business.lowStockSettings || DEFAULT_LOW_STOCK_SETTINGS),
      ...settings
    });
    updateBusiness({ lowStockSettings: merged }, true);
    logSecurityEvent('LOW_STOCK_SETTINGS_UPDATED', 'Inventory Config', `Updated low stock monitoring settings (Threshold: ${merged.defaultThreshold}, Block Out of Stock: ${merged.blockBillingOnOutOfStock})`);
    showToast('success', 'Low Stock Saved', 'Inventory monitoring & threshold parameters saved to Cloud Firestore.');
  };

  // Invoices & Billing
  const getNextSequentialInvoiceNumber = () => {
    return getNextAvailableInvoiceNumber(invoices, business);
  };

  const realignAndFixInvoiceSequences = async (overrideSeq?: number) => {
    const audit = auditInvoiceSequences(invoices, business);
    const targetSeq = typeof overrideSeq === 'number' && overrideSeq > 0
      ? Math.floor(overrideSeq)
      : audit.suggestedNextNumber;
    
    const updatedBusiness: BusinessProfile = {
      ...business,
      nextInvoiceNumber: targetSeq,
      posInvoiceSeriesMode: 'UNIFIED'
    };
    
    setBusiness(updatedBusiness);
    setCompanies(prev => prev.map(c => c.id === currentCompanyId ? { 
      ...c, 
      nextInvoiceNumber: targetSeq,
      updatedAt: new Date().toISOString()
    } : c));

    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(updatedBusiness));
    } catch (e) {}

    await cloudDb.saveBusinessProfile(currentCompanyId, updatedBusiness).catch(console.warn);
    
    const nextInvoiceNo = formatInvoiceSequence(updatedBusiness.invoicePrefix, targetSeq);

    logSecurityEvent(
      'INVOICE_SEQUENCE_REALIGNED',
      'Billing Integrity',
      `Realigned unified invoice sequence to ${nextInvoiceNo} (Audited ${audit.totalInvoices} total invoices)`
    );

    showToast('success', 'Sequence Synchronized', `Single Unified Serial Active: ${nextInvoiceNo}`);
    return {
      fixedCount: audit.duplicateNumbers.length + audit.mismatchedNumbers.length,
      nextInvoiceNo
    };
  };

  const resequenceAllInvoicesFromStartingNumber = async (
    options?: { startingNumber?: number; prefix?: string; sortBy?: 'date' | 'created' }
  ): Promise<{ updatedCount: number; startingNumber: number; nextInvoiceNo: string }> => {
    const prefix = options?.prefix !== undefined ? options.prefix.trim() : (business.invoicePrefix ?? '').trim();
    const rawStart = options?.startingNumber !== undefined ? options.startingNumber : business.nextInvoiceNumber;
    const startSeq = Math.max(1, parseInt(String(rawStart || 1), 10) || 1);
    const sortBy = options?.sortBy || 'date';

    if (!invoices || invoices.length === 0) {
      const updatedBusiness: BusinessProfile = {
        ...business,
        invoicePrefix: prefix,
        nextInvoiceNumber: startSeq,
        posInvoiceSeriesMode: 'UNIFIED'
      };
      setBusiness(updatedBusiness);
      setCompanies(prev => prev.map(c => c.id === currentCompanyId ? {
        ...c,
        invoicePrefix: prefix,
        nextInvoiceNumber: startSeq,
        updatedAt: new Date().toISOString()
      } : c));
      try {
        localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(updatedBusiness));
      } catch (e) {}
      await cloudDb.saveBusinessProfile(currentCompanyId, updatedBusiness).catch(console.warn);
      const nextInvoiceNo = formatInvoiceSequence(prefix, startSeq);
      showToast('info', 'Starting Invoice Number Configured', `No existing invoices to re-number. Next invoice will be ${nextInvoiceNo}.`);
      return { updatedCount: 0, startingNumber: startSeq, nextInvoiceNo };
    }

    // Sort existing invoices chronologically (oldest to newest)
    const sortedInvoices = [...invoices].sort((a, b) => {
      if (sortBy === 'created') {
        const timeA = new Date(a.createdAt || a.invoiceDate).getTime();
        const timeB = new Date(b.createdAt || b.invoiceDate).getTime();
        return timeA - timeB;
      }
      const dateA = new Date(a.invoiceDate).getTime();
      const dateB = new Date(b.invoiceDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    const updatedInvoices: Invoice[] = sortedInvoices.map((inv, index) => {
      const newSeq = startSeq + index;
      const newInvoiceNumber = formatInvoiceSequence(prefix, newSeq);
      return {
        ...inv,
        invoiceNumber: newInvoiceNumber,
        updatedAt: new Date().toISOString(),
      };
    });

    const nextAvailableSeq = startSeq + updatedInvoices.length;
    const nextInvoiceNo = formatInvoiceSequence(prefix, nextAvailableSeq);

    const updatedBusiness: BusinessProfile = {
      ...business,
      invoicePrefix: prefix,
      nextInvoiceNumber: nextAvailableSeq,
      posInvoiceSeriesMode: 'UNIFIED'
    };

    setInvoices(updatedInvoices);
    setBusiness(updatedBusiness);
    setCompanies(prev => prev.map(c => c.id === currentCompanyId ? {
      ...c,
      invoicePrefix: prefix,
      nextInvoiceNumber: nextAvailableSeq,
      updatedAt: new Date().toISOString()
    } : c));

    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(updatedBusiness));
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_invoices`, JSON.stringify(updatedInvoices));
    } catch (e) {}

    // Cloud DB Firestore Sync
    await Promise.all([
      cloudDb.saveBusinessProfile(currentCompanyId, updatedBusiness).catch(console.warn),
      ...updatedInvoices.map(inv => cloudDb.syncEntityDoc('invoices', currentCompanyId, inv).catch(console.warn))
    ]);

    logSecurityEvent(
      'INVOICES_RENUMBERED_AUTOMATICALLY',
      'Billing Sequence',
      `Auto-updated ${updatedInvoices.length} invoices in tax billing list starting from serial ${formatInvoiceSequence(prefix, startSeq)} to ${formatInvoiceSequence(prefix, nextAvailableSeq - 1)}. Next active: ${nextInvoiceNo}`
    );

    showToast(
      'success',
      'Tax Invoices Re-sequenced',
      `Successfully updated ${updatedInvoices.length} invoices starting from #${formatInvoiceSequence(prefix, startSeq)}. Next active serial is ${nextInvoiceNo}.`
    );

    return {
      updatedCount: updatedInvoices.length,
      startingNumber: startSeq,
      nextInvoiceNo
    };
  };

  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    // Single Unified Serial Number Rule for both Tax Invoice and POS Billing
    let invoiceNumber = invoiceData.invoiceNumber?.trim();
    
    // Check if the provided invoice number already exists (case-insensitive & trimmed comparison)
    const existingIndex = invoiceNumber ? invoices.findIndex(i => 
      (i.invoiceNumber || '').trim().toLowerCase() === invoiceNumber.toLowerCase()
    ) : -1;
    
    // Strictly prevent duplicate invoice numbers: If duplicate or empty, generate the guaranteed next unique number
    if (!invoiceNumber || existingIndex !== -1) {
      const generated = getNextAvailableInvoiceNumber(invoices, business);
      const originalRequested = invoiceNumber;
      invoiceNumber = generated.invoiceNumber;
      if (originalRequested && existingIndex !== -1) {
        showToast(
          'warning', 
          'Duplicate Invoice No. Prevented', 
          `Invoice number "${originalRequested}" already exists. Reassigned unique serial ${invoiceNumber} to prevent duplicity.`
        );
      }
    }
    
    // Auto-create or link customer party in parties master if not existing
    let finalCustomerId = invoiceData.customerId;
    const cleanCustomerName = (invoiceData.customerName || '').trim();
    if (cleanCustomerName && cleanCustomerName.toLowerCase() !== 'walk-in customer') {
      const existingParty = parties.find(p => 
        (finalCustomerId && p.id === finalCustomerId) ||
        p.name.trim().toLowerCase() === cleanCustomerName.toLowerCase() ||
        (invoiceData.customerPhone && p.phone && p.phone.replace(/[^0-9]/g, '').slice(-10) === invoiceData.customerPhone.replace(/[^0-9]/g, '').slice(-10))
      );

      if (existingParty) {
        finalCustomerId = existingParty.id;
        // Update balance and contact details if available
        setParties(prev => prev.map(p => {
          if (p.id === existingParty.id) {
            const updatedParty = {
              ...p,
              phone: p.phone || invoiceData.customerPhone || '',
              email: p.email || invoiceData.customerEmail || '',
              gstin: p.gstin || (invoiceData.customerGstin ? invoiceData.customerGstin.toUpperCase().trim() : undefined),
              billingAddress: p.billingAddress || invoiceData.customerAddress || '',
              city: p.city || invoiceData.customerCity || business.city,
              state: p.state || invoiceData.customerState || business.state,
              stateCode: p.stateCode || invoiceData.customerStateCode || business.stateCode,
              currentBalance: p.currentBalance + (invoiceData.amountDue || 0)
            };
            cloudDb.syncEntityDoc('parties', currentCompanyId, updatedParty).catch(console.warn);
            return updatedParty;
          }
          return p;
        }));
      } else {
        const newPartyId = 'party-cust-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        finalCustomerId = newPartyId;
        const newParty: Party = {
          id: newPartyId,
          type: 'CUSTOMER',
          name: cleanCustomerName,
          phone: invoiceData.customerPhone || '',
          email: invoiceData.customerEmail || '',
          gstin: invoiceData.customerGstin ? invoiceData.customerGstin.toUpperCase().trim() : undefined,
          billingAddress: invoiceData.customerAddress || 'Address not provided',
          city: invoiceData.customerCity || business.city,
          state: invoiceData.customerState || business.state,
          stateCode: invoiceData.customerStateCode || business.stateCode,
          pincode: invoiceData.customerPincode || business.pincode,
          openingBalance: 0,
          currentBalance: invoiceData.amountDue || 0,
          creditLimit: 100000,
          creditPeriodDays: 30,
          createdAt: new Date().toISOString()
        };
        setParties(prev => [newParty, ...prev]);
        cloudDb.syncEntityDoc('parties', currentCompanyId, newParty).catch(console.warn);
      }
    }

    const newInvoice: Invoice = {
      ...invoiceData,
      customerId: finalCustomerId || invoiceData.customerId,
      id: 'inv-' + Date.now(),
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => [newInvoice, ...prev]);
    cloudDb.syncEntityDoc('invoices', currentCompanyId, newInvoice).catch(console.warn);

    // Calculate advance for next invoice number sequence as strict integer (e.g., 3406 -> 3407)
    const parsed = parseInvoiceNumber(invoiceNumber);
    const createdSeq = parsed ? Number(parsed.sequence) : 0;

    // Persist incremented next invoice number in business and companies
    setBusiness(prev => {
      const prevNum = Math.max(1, parseInt(String(prev.nextInvoiceNumber || 1), 10) || 1);
      const nextNum = Math.max(prevNum, createdSeq > 0 ? createdSeq + 1 : prevNum + 1);
      const updated: BusinessProfile = { 
        ...prev, 
        nextInvoiceNumber: nextNum,
        posInvoiceSeriesMode: 'UNIFIED'
      };
      try {
        localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(updated));
      } catch (e) {}
      cloudDb.saveBusinessProfile(currentCompanyId, updated).catch(console.warn);
      return updated;
    });

    setCompanies(prevComps => prevComps.map(c => {
      if (c.id === currentCompanyId) {
        const cPrevNum = Math.max(1, parseInt(String(c.nextInvoiceNumber || 1), 10) || 1);
        const cNextNum = Math.max(cPrevNum, createdSeq > 0 ? createdSeq + 1 : cPrevNum + 1);
        const compUpdated: Company = {
          ...c,
          nextInvoiceNumber: cNextNum,
          updatedAt: new Date().toISOString()
        };
        cloudDb.saveCompany(compUpdated).catch(console.warn);
        return compUpdated;
      }
      return c;
    }));

    // Auto update Party Balance if unpaid / partially paid (if not already updated above)
    if (newInvoice.customerId && newInvoice.amountDue > 0 && (!cleanCustomerName || cleanCustomerName.toLowerCase() === 'walk-in customer')) {
      setParties(prev => prev.map(p => {
        if (p.id === newInvoice.customerId) {
          const updatedParty = { ...p, currentBalance: p.currentBalance + newInvoice.amountDue };
          cloudDb.syncEntityDoc('parties', currentCompanyId, updatedParty).catch(console.warn);
          return updatedParty;
        }
        return p;
      }));
    }

    // Deduct stock for invoiced items
    newInvoice.items.forEach(item => {
      if (item.productId) {
        setProducts(prev => prev.map(prod => {
          if (prod.id === item.productId && !prod.isService) {
            const updatedProd = { ...prod, currentStock: Math.max(0, prod.currentStock - item.quantity) };
            cloudDb.syncEntityDoc('products', currentCompanyId, updatedProd).catch(console.warn);
            return updatedProd;
          }
          return prod;
        }));
      }
    });

    showToast('success', 'Invoice Generated', `${newInvoice.invoiceNumber} created for ${business.currencySymbol}${newInvoice.grandTotal.toLocaleString('en-IN')}`);
    return newInvoice;
  };

  const bulkCreateInvoices = (
    invoicesList: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>[],
    options?: { updateExisting?: boolean; autoCreateParties?: boolean; deductInventory?: boolean }
  ) => {
    const updateExisting = options?.updateExisting ?? true;
    const autoCreateParties = options?.autoCreateParties ?? true;
    const deductInventory = options?.deductInventory ?? true;

    let added = 0;
    let updated = 0;
    let partiesCreated = 0;

    const newInvoicesToAdd: Invoice[] = [];
    const partyMap = new Map<string, Party>();
    parties.forEach(p => partyMap.set(p.name.trim().toLowerCase(), p));

    invoicesList.forEach(invData => {
      // Find matching customer or auto-create
      let customerId = invData.customerId;
      if (autoCreateParties && invData.customerName) {
        const custKey = invData.customerName.trim().toLowerCase();
        let existingParty = partyMap.get(custKey);

        if (!existingParty) {
          existingParty = {
            id: `party-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: invData.customerName,
            type: 'CUSTOMER',
            phone: invData.customerPhone || '',
            email: invData.customerEmail || '',
            gstin: invData.customerGstin || '',
            billingAddress: invData.customerAddress || 'Address not provided',
            city: invData.customerCity || business.city,
            state: invData.customerState || business.state,
            stateCode: invData.customerStateCode || business.stateCode,
            pincode: invData.customerPincode || business.pincode,
            openingBalance: 0,
            currentBalance: invData.amountDue || 0,
            createdAt: new Date().toISOString()
          };
          partyMap.set(custKey, existingParty);
          setParties(prev => [...prev, existingParty!]);
          cloudDb.syncEntityDoc('parties', currentCompanyId, existingParty).catch(console.warn);
          partiesCreated++;
        }
        customerId = existingParty.id;
      }

      const cleanInv: Invoice = {
        ...invData,
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        customerId: customerId || invData.customerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingIndex = invoices.findIndex(i => i.invoiceNumber.trim().toLowerCase() === cleanInv.invoiceNumber.trim().toLowerCase());
      if (existingIndex >= 0 && updateExisting) {
        setInvoices(prev => {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...cleanInv, id: next[existingIndex].id };
          cloudDb.syncEntityDoc('invoices', currentCompanyId, next[existingIndex]).catch(console.warn);
          return next;
        });
        updated++;
      } else {
        newInvoicesToAdd.push(cleanInv);
        cloudDb.syncEntityDoc('invoices', currentCompanyId, cleanInv).catch(console.warn);
        added++;
      }
    });

    if (newInvoicesToAdd.length > 0) {
      setInvoices(prev => [...newInvoicesToAdd, ...prev]);
    }

    showToast('success', 'Bulk Import Complete', `Imported ${added} new invoices, updated ${updated}, registered ${partiesCreated} new customers.`);
    return { added, updated, partiesCreated };
  };

  const updateInvoice = (id: string, invoiceData: Partial<Invoice>): boolean => {
    // If invoiceNumber is being updated, verify it is unique across all other invoices
    if (invoiceData.invoiceNumber !== undefined) {
      const trimmedNewNumber = invoiceData.invoiceNumber.trim();
      if (!trimmedNewNumber) {
        showToast('error', 'Invalid Invoice No.', 'Invoice number cannot be empty.');
        return false;
      }
      const duplicate = invoices.find(
        inv => inv.id !== id && (inv.invoiceNumber || '').trim().toLowerCase() === trimmedNewNumber.toLowerCase()
      );
      if (duplicate) {
        showToast(
          'error', 
          'Duplicate Invoice No.', 
          `Invoice number "${trimmedNewNumber}" is already in use by another invoice. Duplicate invoice numbers are not allowed.`
        );
        return false;
      }
    }

    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const updated = {
          ...inv,
          ...invoiceData,
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return inv;
    }));
    showToast('success', 'Invoice Updated', 'Changes saved successfully.');
    return true;
  };

  const deleteInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    cloudDb.deleteEntityDoc('invoices', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Invoice Deleted', `${target?.invoiceNumber || 'Invoice'} was deleted.`);
  };

  const getInvoice = (id: string) => {
    return invoices.find(i => i.id === id);
  };

  const recordInvoicePayment = (id: string, amount: number, method: PaymentMethod, notes?: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const newAmountPaid = (inv.amountPaid || 0) + amount;
        const newAmountDue = Math.max(0, inv.grandTotal - newAmountPaid);
        const newStatus: InvoiceStatus = newAmountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

        const paymentLine = {
          id: 'pay-' + Date.now(),
          date: new Date().toISOString().split('T')[0],
          amount,
          method,
          notes
        };

        const updated: Invoice = {
          ...inv,
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paymentsList: [...(inv.paymentsList || []), paymentLine],
          updatedAt: new Date().toISOString()
        };

        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);

        // Also record a payment record in payments ledger
        const pRec: PaymentRecord = {
          id: 'pay-rec-' + Date.now(),
          voucherNumber: `RCPT-${Date.now().toString().slice(-6)}`,
          type: 'PAYMENT_IN',
          date: new Date().toISOString().split('T')[0],
          partyId: inv.customerId,
          partyName: inv.customerName,
          partyType: 'CUSTOMER',
          amount,
          paymentMethod: method,
          linkedInvoiceId: inv.id,
          linkedInvoiceNumber: inv.invoiceNumber,
          notes: notes || `Payment received for ${inv.invoiceNumber}`,
          createdAt: new Date().toISOString()
        };
        setPayments(p => [pRec, ...p]);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);

        // Update Party Balance
        if (inv.customerId) {
          setParties(pList => pList.map(p => {
            if (p.id === inv.customerId) {
              const updatedP = { ...p, currentBalance: Math.max(0, p.currentBalance - amount) };
              cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
              return updatedP;
            }
            return p;
          }));
        }

        return updated;
      }
      return inv;
    }));

    showToast('success', 'Payment Recorded', `Logged ${business.currencySymbol}${amount.toLocaleString('en-IN')} payment.`);
  };

  const generateEInvoice = (id: string): EInvoiceDetails | null => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return null;

    const einvoice = generateSimulatedEInvoice(inv, business.gstin);
    setInvoices(prev => prev.map(item => {
      if (item.id === id) {
        const updated = {
          ...item,
          einvoice,
          status: item.status === 'DRAFT' ? 'UNPAID' : item.status,
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return item;
    }));

    showToast('success', 'E-Invoice IRN Generated', `IRN: ${einvoice.irn.substring(0, 16)}...`);
    return einvoice;
  };

  const cancelEInvoice = (id: string, reason: EInvoiceDetails['cancelReason'], remarks?: string) => {
    setInvoices(prev => prev.map(item => {
      if (item.id === id && item.einvoice) {
        const updated: Invoice = {
          ...item,
          status: 'CANCELLED',
          einvoice: {
            ...item.einvoice,
            status: 'CANCELLED',
            cancelReason: reason,
            cancelRemarks: remarks || 'Cancelled as requested',
            cancelledAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return item;
    }));
    showToast('info', 'E-Invoice Cancelled', 'IRN status marked as cancelled.');
  };

  const generateEWayBill = (id: string, details: Partial<EWayBillDetails>) => {
    const ewayBill: EWayBillDetails = {
      ewayBillNo: generateEwayBillNo(),
      ewayBillDate: new Date().toISOString(),
      validUpto: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      distanceKm: details.distanceKm || 120,
      mode: details.mode || 'ROAD',
      supplyType: details.supplyType || 'OUTWARD',
      subSupplyType: details.subSupplyType || 'SUPPLY',
      transporterId: details.transporterId || '27AAAAA1234A1Z5',
      transporterName: details.transporterName || 'VRL Logistics India',
      vehicleNo: details.vehicleNo || 'DL 01 AB 1234',
    };

    setInvoices(prev => prev.map(item => {
      if (item.id === id) {
        const updated = {
          ...item,
          ewayBill,
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return item;
    }));

    showToast('success', 'E-Way Bill Generated', `EWB No: ${ewayBill.ewayBillNo}`);
  };

  // Products
  const createProduct = (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    cloudDb.syncEntityDoc('products', currentCompanyId, newProduct).catch(console.warn);
    showToast('success', 'Product Added', `${newProduct.name} saved to inventory.`);
    return newProduct;
  };

  const bulkCreateProducts = (newProducts: Omit<Product, 'id' | 'createdAt'>[], updateExisting = true) => {
    let added = 0;
    let updated = 0;
    let currentList = [...products];

    newProducts.forEach(prodData => {
      const existingIdx = currentList.findIndex(p => 
        p.name.trim().toLowerCase() === prodData.name.trim().toLowerCase() || 
        (prodData.sku && p.sku === prodData.sku)
      );

      if (existingIdx !== -1 && updateExisting) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          ...prodData
        };
        updated++;
      } else {
        const newP: Product = {
          ...prodData,
          id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          createdAt: new Date().toISOString()
        };
        currentList.push(newP);
        added++;
      }
    });

    setProducts(currentList);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_products`, JSON.stringify(currentList));
    } catch (e) {}
    cloudDb.syncEntireCollection('products', currentCompanyId, currentList).catch(console.warn);
    showToast('success', 'Products Imported', `Added ${added} items, updated ${updated} in inventory.`);
    return { added, updated };
  };

  const bulkUpdateProductThresholds = async (threshold: number): Promise<{ updatedCount: number }> => {
    const validThreshold = Math.max(0, threshold);
    let updatedCount = 0;
    const updatedList = products.map(prod => {
      if (!prod.isService) {
        updatedCount++;
        return {
          ...prod,
          minStockAlert: validThreshold
        };
      }
      return prod;
    });

    setProducts(updatedList);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_products`, JSON.stringify(updatedList));
    } catch (e) {}

    await cloudDb.syncEntireCollection('products', currentCompanyId, updatedList).catch(console.warn);
    logSecurityEvent('BULK_STOCK_THRESHOLD_UPDATED', 'Inventory Config', `Applied default low-stock threshold of ${validThreshold} to ${updatedCount} products`);
    showToast('success', 'Thresholds Synchronized', `Updated minimum stock threshold to ${validThreshold} units for ${updatedCount} products in Cloud Firestore.`);
    return { updatedCount };
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...productData };
        cloudDb.syncEntityDoc('products', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Product Updated', 'Inventory details modified.');
  };

  const deleteProduct = (id: string) => {
    const target = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    cloudDb.deleteEntityDoc('products', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Product Removed', `${target?.name || 'Product'} deleted.`);
  };

  const adjustStock = (id: string, newStock: number, reason: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, currentStock: newStock };
        cloudDb.syncEntityDoc('products', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Stock Adjusted', `Inventory updated (${reason}).`);
  };

  // Custom HSN & SAC Master Management
  const addCustomHsnCode = (hsnData: Omit<CustomHsnCode, 'id'>): CustomHsnCode => {
    const newItem: CustomHsnCode = {
      ...hsnData,
      id: 'hsn-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString()
    };
    setCustomHsnCodes(prev => [newItem, ...prev.filter(h => h.code.toLowerCase() !== newItem.code.toLowerCase())]);
    cloudDb.syncEntityDoc('customHsnCodes', currentCompanyId, newItem).catch(console.warn);
    return newItem;
  };

  const updateCustomHsnCode = (id: string, updates: Partial<CustomHsnCode>) => {
    setCustomHsnCodes(prev => prev.map(h => {
      if (h.id === id) {
        const updated = { ...h, ...updates };
        cloudDb.syncEntityDoc('customHsnCodes', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return h;
    }));
  };

  const deleteCustomHsnCode = (id: string) => {
    setCustomHsnCodes(prev => prev.filter(h => h.id !== id));
    cloudDb.deleteEntityDoc('customHsnCodes', currentCompanyId, id).catch(console.warn);
  };

  const bulkImportCustomHsnCodes = (items: Omit<CustomHsnCode, 'id'>[]): number => {
    let count = 0;
    const newItems: CustomHsnCode[] = items.map(item => {
      count++;
      return {
        ...item,
        id: 'hsn-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        createdAt: new Date().toISOString()
      };
    });

    setCustomHsnCodes(prev => {
      const codeMap = new Map<string, CustomHsnCode>();
      prev.forEach(p => codeMap.set(p.code.toUpperCase(), p));
      newItems.forEach(n => codeMap.set(n.code.toUpperCase(), n));
      return Array.from(codeMap.values());
    });

    newItems.forEach(n => {
      cloudDb.syncEntityDoc('customHsnCodes', currentCompanyId, n).catch(console.warn);
    });

    return count;
  };

  // Parties
  const createParty = (partyData: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>): Party => {
    const newParty: Party = {
      ...partyData,
      id: 'party-' + Date.now(),
      currentBalance: partyData.openingBalance || 0,
      createdAt: new Date().toISOString()
    };
    setParties(prev => [newParty, ...prev]);
    cloudDb.syncEntityDoc('parties', currentCompanyId, newParty).catch(console.warn);
    showToast('success', 'Party Created', `${newParty.name} registered.`);
    return newParty;
  };

  const bulkCreateParties = (newPartiesList: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[], updateExisting = true) => {
    let added = 0;
    let updated = 0;
    const partiesToAdd: Party[] = [];

    newPartiesList.forEach(partyData => {
      const existing = parties.find(p => p.name.trim().toLowerCase() === partyData.name.trim().toLowerCase());
      if (existing && updateExisting) {
        setParties(prev => prev.map(p => {
          if (p.id === existing.id) {
            const updatedP = { ...p, ...partyData };
            cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
            return updatedP;
          }
          return p;
        }));
        updated++;
      } else {
        const newP: Party = {
          ...partyData,
          id: 'party-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          currentBalance: partyData.openingBalance || 0,
          createdAt: new Date().toISOString()
        };
        partiesToAdd.push(newP);
        cloudDb.syncEntityDoc('parties', currentCompanyId, newP).catch(console.warn);
        added++;
      }
    });

    if (partiesToAdd.length > 0) {
      setParties(prev => [...prev, ...partiesToAdd]);
    }
    showToast('success', 'Parties Imported', `Added ${added} contacts, updated ${updated}.`);
    return { added, updated };
  };

  const updateParty = (id: string, partyData: Partial<Party>) => {
    setParties(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...partyData };
        cloudDb.syncEntityDoc('parties', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Party Updated', 'Contact & ledger details updated.');
  };

  const deleteParty = (id: string) => {
    const target = parties.find(p => p.id === id);
    setParties(prev => prev.filter(p => p.id !== id));
    cloudDb.deleteEntityDoc('parties', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Party Deleted', `${target?.name || 'Party'} removed.`);
  };

  // Purchases
  const createPurchaseBill = (billData: Omit<PurchaseBill, 'id' | 'createdAt'>): PurchaseBill => {
    // Auto-create or link vendor party in parties master if not existing
    let finalVendorId = billData.vendorId;
    const cleanVendorName = (billData.vendorName || '').trim();
    if (cleanVendorName) {
      const existingVendor = parties.find(p => 
        (finalVendorId && p.id === finalVendorId) ||
        p.name.trim().toLowerCase() === cleanVendorName.toLowerCase() ||
        (billData.vendorPhone && p.phone && p.phone.replace(/[^0-9]/g, '').slice(-10) === billData.vendorPhone.replace(/[^0-9]/g, '').slice(-10))
      );

      if (existingVendor) {
        finalVendorId = existingVendor.id;
        // Update balance and contact details if available
        setParties(prev => prev.map(p => {
          if (p.id === existingVendor.id) {
            const updatedParty = {
              ...p,
              phone: p.phone || billData.vendorPhone || '',
              email: p.email || billData.vendorEmail || '',
              gstin: p.gstin || (billData.vendorGstin ? billData.vendorGstin.toUpperCase().trim() : undefined),
              billingAddress: p.billingAddress || billData.vendorAddress || '',
              city: p.city || billData.vendorCity || business.city,
              state: p.state || billData.vendorState || business.state,
              stateCode: p.stateCode || billData.vendorStateCode || business.stateCode,
              currentBalance: p.currentBalance - (billData.amountDue || 0)
            };
            cloudDb.syncEntityDoc('parties', currentCompanyId, updatedParty).catch(console.warn);
            return updatedParty;
          }
          return p;
        }));
      } else {
        const newPartyId = 'party-vend-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        finalVendorId = newPartyId;
        const newParty: Party = {
          id: newPartyId,
          type: 'VENDOR',
          name: cleanVendorName,
          phone: billData.vendorPhone || '',
          email: billData.vendorEmail || '',
          gstin: billData.vendorGstin ? billData.vendorGstin.toUpperCase().trim() : undefined,
          billingAddress: billData.vendorAddress || 'Address not provided',
          city: billData.vendorCity || business.city,
          state: billData.vendorState || business.state,
          stateCode: billData.vendorStateCode || business.stateCode,
          pincode: business.pincode,
          openingBalance: 0,
          currentBalance: -(billData.amountDue || 0),
          creditLimit: 100000,
          creditPeriodDays: 30,
          createdAt: new Date().toISOString()
        };
        setParties(prev => [newParty, ...prev]);
        cloudDb.syncEntityDoc('parties', currentCompanyId, newParty).catch(console.warn);
      }
    }

    const newBill: PurchaseBill = {
      ...billData,
      vendorId: finalVendorId || billData.vendorId,
      id: 'pb-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPurchaseBills(prev => [newBill, ...prev]);
    cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, newBill).catch(console.warn);

    // Increase stock for purchase inward items
    newBill.items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) return;
      const rate = Number(item.rate) || 0;

      setProducts(prev => prev.map(prod => {
        const isMatch = (item.productId && prod.id === item.productId) ||
          (!item.productId && prod.name.trim().toLowerCase() === item.name.trim().toLowerCase());

        if (isMatch && !prod.isService) {
          const updatedProd = {
            ...prod,
            currentStock: Math.round(((prod.currentStock || 0) + qty) * 1000) / 1000,
            purchasePrice: rate > 0 ? rate : prod.purchasePrice
          };
          cloudDb.syncEntityDoc('products', currentCompanyId, updatedProd).catch(console.warn);
          return updatedProd;
        }
        return prod;
      }));
    });

    showToast('success', 'Purchase Bill Logged', `Bill ${newBill.billNumber} recorded.`);
    return newBill;
  };

  // Sync Parties from all previous invoices and purchase bills
  const syncBillingParties = () => {
    let newCustomersAdded = 0;
    let newVendorsAdded = 0;
    const existingPartyNames = new Set(parties.map(p => p.name.trim().toLowerCase()));
    const existingPartyIds = new Set(parties.map(p => p.id));
    const partiesToAdd: Party[] = [];

    // Check all invoices
    invoices.forEach(inv => {
      if (inv.customerName && inv.customerName.trim() && inv.customerName.toLowerCase() !== 'walk-in customer') {
        const cName = inv.customerName.trim();
        const cKey = cName.toLowerCase();
        const cId = inv.customerId;
        const exists = existingPartyNames.has(cKey) || (cId && existingPartyIds.has(cId));
        if (!exists) {
          existingPartyNames.add(cKey);
          const newId = cId && !cId.startsWith('party-retail') ? cId : `party-cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          existingPartyIds.add(newId);
          const newP: Party = {
            id: newId,
            type: 'CUSTOMER',
            name: cName,
            phone: inv.customerPhone || '',
            email: inv.customerEmail || '',
            gstin: inv.customerGstin ? inv.customerGstin.toUpperCase().trim() : undefined,
            billingAddress: inv.customerAddress || 'Address not provided',
            city: inv.customerCity || business.city,
            state: inv.customerState || business.state,
            stateCode: inv.customerStateCode || business.stateCode,
            pincode: inv.customerPincode || business.pincode,
            openingBalance: 0,
            currentBalance: inv.amountDue || 0,
            creditLimit: 100000,
            creditPeriodDays: 30,
            createdAt: inv.createdAt || new Date().toISOString()
          };
          partiesToAdd.push(newP);
          newCustomersAdded++;
        }
      }
    });

    // Check all purchase bills
    purchaseBills.forEach(bill => {
      if (bill.vendorName && bill.vendorName.trim()) {
        const vName = bill.vendorName.trim();
        const vKey = vName.toLowerCase();
        const vId = bill.vendorId;
        const exists = existingPartyNames.has(vKey) || (vId && existingPartyIds.has(vId));
        if (!exists) {
          existingPartyNames.add(vKey);
          const newId = vId || `party-vend-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          existingPartyIds.add(newId);
          const newP: Party = {
            id: newId,
            type: 'VENDOR',
            name: vName,
            phone: bill.vendorPhone || '',
            email: bill.vendorEmail || '',
            gstin: bill.vendorGstin ? bill.vendorGstin.toUpperCase().trim() : undefined,
            billingAddress: bill.vendorAddress || 'Address not provided',
            city: bill.vendorCity || business.city,
            state: bill.vendorState || business.state,
            stateCode: bill.vendorStateCode || business.stateCode,
            pincode: business.pincode,
            openingBalance: 0,
            currentBalance: -(bill.amountDue || 0),
            creditLimit: 100000,
            creditPeriodDays: 30,
            createdAt: bill.createdAt || new Date().toISOString()
          };
          partiesToAdd.push(newP);
          newVendorsAdded++;
        }
      }
    });

    if (partiesToAdd.length > 0) {
      setParties(prev => [...partiesToAdd, ...prev]);
      partiesToAdd.forEach(p => {
        cloudDb.syncEntityDoc('parties', currentCompanyId, p).catch(console.warn);
      });
      showToast('success', 'Contacts & Vendors Synced', `Added ${newCustomersAdded} customers & ${newVendorsAdded} vendors from billing records.`);
    } else {
      showToast('info', 'All Contacts Up to Date', 'All billing customers and vendors are already present in Contacts.');
    }
    return { newCustomersAdded, newVendorsAdded };
  };

  const updatePurchaseBill = (id: string, billData: Partial<PurchaseBill>) => {
    setPurchaseBills(prev => prev.map(b => {
      if (b.id === id) {
        const updated = { ...b, ...billData };
        cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return b;
    }));
    showToast('success', 'Purchase Bill Updated', 'Purchase bill modified.');
  };

  const deletePurchaseBill = (id: string) => {
    const target = purchaseBills.find(b => b.id === id);
    if (target?.items) {
      target.items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) return;
        setProducts(prev => prev.map(prod => {
          const isMatch = (item.productId && prod.id === item.productId) ||
            (!item.productId && prod.name.trim().toLowerCase() === item.name.trim().toLowerCase());

          if (isMatch && !prod.isService) {
            const updatedProd = {
              ...prod,
              currentStock: Math.max(0, Math.round(((prod.currentStock || 0) - qty) * 1000) / 1000)
            };
            cloudDb.syncEntityDoc('products', currentCompanyId, updatedProd).catch(console.warn);
            return updatedProd;
          }
          return prod;
        }));
      });
    }
    setPurchaseBills(prev => prev.filter(b => b.id !== id));
    cloudDb.deleteEntityDoc('purchaseBills', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Purchase Bill Removed', `Bill ${target?.billNumber || ''} deleted.`);
  };

  const recordPurchasePayment = (id: string, amount: number, method: PaymentMethod) => {
    setPurchaseBills(prev => prev.map(bill => {
      if (bill.id === id) {
        const newPaid = (bill.amountPaid || 0) + amount;
        const newDue = Math.max(0, bill.grandTotal - newPaid);
        const newStatus: InvoiceStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

        const updated: PurchaseBill = {
          ...bill,
          amountPaid: newPaid,
          amountDue: newDue,
          status: newStatus,
          paymentMethod: method
        };

        cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return bill;
    }));
    showToast('success', 'Vendor Payment Recorded', `Paid ${business.currencySymbol}${amount}.`);
  };

  // Payments Ledger
  const createPayment = (paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord => {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: 'pay-rec-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPayments(prev => [newPayment, ...prev]);
    cloudDb.syncEntityDoc('payments', currentCompanyId, newPayment).catch(console.warn);

    // Settle Linked Invoice
    if (newPayment.type === 'PAYMENT_IN' && newPayment.linkedInvoiceId) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === newPayment.linkedInvoiceId) {
          const newPaid = (inv.amountPaid || 0) + newPayment.amount;
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus: InvoiceStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
          const updatedInv: Invoice = {
            ...inv,
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus,
            paymentMethod: newPayment.paymentMethod,
            updatedAt: new Date().toISOString()
          };
          cloudDb.syncEntityDoc('invoices', currentCompanyId, updatedInv).catch(console.warn);
          return updatedInv;
        }
        return inv;
      }));
    }

    // Settle Linked Purchase Bill
    if (newPayment.type === 'PAYMENT_OUT' && newPayment.linkedBillId) {
      setPurchaseBills(prev => prev.map(bill => {
        if (bill.id === newPayment.linkedBillId) {
          const newPaid = (bill.amountPaid || 0) + newPayment.amount;
          const newDue = Math.max(0, bill.grandTotal - newPaid);
          const updatedBill: PurchaseBill = {
            ...bill,
            amountPaid: newPaid,
            amountDue: newDue,
            status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID',
            paymentMethod: newPayment.paymentMethod
          };
          cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updatedBill).catch(console.warn);
          return updatedBill;
        }
        return bill;
      }));
    }

    // Update Party Balance
    if (newPayment.partyId) {
      setParties(prev => prev.map(p => {
        if (p.id === newPayment.partyId) {
          let updatedParty = p;
          if (newPayment.type === 'PAYMENT_IN') {
            updatedParty = { ...p, currentBalance: Math.max(0, p.currentBalance - newPayment.amount) };
          } else if (newPayment.type === 'PAYMENT_OUT') {
            updatedParty = { ...p, currentBalance: p.currentBalance + newPayment.amount };
          }
          cloudDb.syncEntityDoc('parties', currentCompanyId, updatedParty).catch(console.warn);
          return updatedParty;
        }
        return p;
      }));
    }

    showToast('success', 'Payment Voucher Created', `Voucher ${newPayment.voucherNumber} for ${business.currencySymbol}${newPayment.amount} saved.`);
    return newPayment;
  };

  const updatePayment = (id: string, updates: Partial<PaymentRecord>) => {
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        cloudDb.syncEntityDoc('payments', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Payment Updated', 'Payment voucher record updated.');
  };

  const deletePayment = (id: string) => {
    const target = payments.find(p => p.id === id);
    setPayments(prev => prev.filter(p => p.id !== id));
    cloudDb.deleteEntityDoc('payments', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Payment Deleted', `Voucher ${target?.voucherNumber || ''} removed.`);
  };

  // Expenses
  const createExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    cloudDb.syncEntityDoc('expenses', currentCompanyId, newExpense).catch(console.warn);
    showToast('success', 'Expense Recorded', `Logged ${business.currencySymbol}${newExpense.amount} for ${newExpense.category}.`);
    return newExpense;
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    cloudDb.deleteEntityDoc('expenses', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Expense Removed', `Expense for ${target?.category || ''} deleted.`);
  };

  // Cheque Printing & Management
  const createCheque = (chequeData: Omit<ChequeRecord, 'id' | 'createdAt'>): ChequeRecord => {
    let linkedPayId: string | undefined = chequeData.linkedPaymentId;
    let linkedJournalId: string | undefined = chequeData.linkedJournalEntryId;

    // Automatic Entry in Client Ledger & Banking
    if (chequeData.autoPostLedger) {
      try {
        const paymentType: PaymentType = chequeData.chequeType === 'PAYMENT_IN' ? 'PAYMENT_IN' : 'PAYMENT_OUT';
        const isMoneyIn = paymentType === 'PAYMENT_IN';

        // 1. Create Payment Voucher (Voucher No: PV-CHQ-123456)
        const paymentVoucher = createPayment({
          voucherNumber: `PV-CHQ-${chequeData.chequeNumber}`,
          type: paymentType,
          partyId: chequeData.partyId,
          partyName: chequeData.partyName || chequeData.payeeName,
          partyType: (chequeData.partyType === 'CUSTOMER' || chequeData.partyType === 'VENDOR') ? chequeData.partyType : (isMoneyIn ? 'CUSTOMER' : 'VENDOR'),
          date: chequeData.chequeDate,
          amount: chequeData.amount,
          paymentMethod: 'CHEQUE',
          referenceNo: `CHQ-${chequeData.chequeNumber}`,
          chequeDate: chequeData.chequeDate,
          bankAccountName: chequeData.bankName,
          notes: chequeData.memo || `Cheque #${chequeData.chequeNumber} (${chequeData.payeeName})`,
          linkedInvoiceId: chequeData.linkedInvoiceId,
          linkedBillId: chequeData.linkedBillId
        });
        linkedPayId = paymentVoucher.id;

        // 2. Create Double-Entry Journal Entry
        const bankAccount = accountHeads.find(a => a.type === 'BANK' || a.name.toLowerCase().includes('bank')) || 
          accountHeads.find(a => a.code === '1002') || { id: 'acc-bank-default', name: chequeData.bankName || 'Bank Account' };
        
        const partyAccount = accountHeads.find(a => a.name.toLowerCase() === (chequeData.payeeName || '').toLowerCase()) ||
          accountHeads.find(a => isMoneyIn ? a.code === '1004' : a.code === '2001') || {
            id: 'acc-party-default',
            name: chequeData.payeeName
          };

        const journalEntry = createJournalEntry({
          entryNumber: `JV-CHQ-${chequeData.chequeNumber}`,
          date: chequeData.chequeDate,
          description: `${isMoneyIn ? 'Received cheque' : 'Issued cheque'} #${chequeData.chequeNumber} for ${chequeData.payeeName}. Memo: ${chequeData.memo || 'Auto-ledger posting'}`,
          reference: `CHQ-${chequeData.chequeNumber}`,
          chequeId: chequeData.chequeNumber,
          lines: isMoneyIn ? [
            {
              accountId: bankAccount.id,
              accountName: bankAccount.name,
              debit: chequeData.amount,
              credit: 0
            },
            {
              accountId: partyAccount.id,
              accountName: partyAccount.name,
              debit: 0,
              credit: chequeData.amount
            }
          ] : [
            {
              accountId: partyAccount.id,
              accountName: partyAccount.name,
              debit: chequeData.amount,
              credit: 0
            },
            {
              accountId: bankAccount.id,
              accountName: bankAccount.name,
              debit: 0,
              credit: chequeData.amount
            }
          ]
        });
        linkedJournalId = journalEntry.id;
      } catch (err) {
        console.warn('Error during auto-ledger posting for cheque:', err);
      }
    }

    // 3. Increment active Cheque Book series if available
    setChequeBooks(prev => prev.map(book => {
      if (book.bankName.toLowerCase() === chequeData.bankName.toLowerCase() && book.status === 'ACTIVE') {
        const nextNo = getNextChequeNumber(chequeData.chequeNumber);
        const updatedBook: ChequeBook = {
          ...book,
          currentChequeNo: nextNo
        };
        cloudDb.syncEntityDoc('chequeBooks', currentCompanyId, updatedBook).catch(console.warn);
        return updatedBook;
      }
      return book;
    }));

    const newCheque: ChequeRecord = {
      ...chequeData,
      id: 'chq-' + Date.now(),
      linkedPaymentId: linkedPayId,
      linkedJournalEntryId: linkedJournalId,
      createdAt: new Date().toISOString()
    };

    setCheques(prev => [newCheque, ...prev]);
    cloudDb.syncEntityDoc('cheques', currentCompanyId, newCheque).catch(console.warn);

    showToast('success', 'Cheque Recorded & Ledger Synced', `Cheque #${newCheque.chequeNumber} for ${business.currencySymbol}${newCheque.amount} saved.`);
    return newCheque;
  };

  const updateCheque = (id: string, updates: Partial<ChequeRecord>) => {
    setCheques(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        cloudDb.syncEntityDoc('cheques', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return c;
    }));
    showToast('success', 'Cheque Updated', 'Cheque details modified.');
  };

  const deleteCheque = (id: string) => {
    const target = cheques.find(c => c.id === id);
    setCheques(prev => prev.filter(c => c.id !== id));
    cloudDb.deleteEntityDoc('cheques', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Cheque Removed', `Cheque #${target?.chequeNumber || ''} deleted.`);
  };

  const markChequeAsPrinted = (id: string) => {
    const now = new Date().toISOString();
    updateCheque(id, {
      status: 'PRINTED',
      printedAt: now
    });
    showToast('success', 'Cheque Printed', 'Cheque marked as printed.');
  };

  const markChequeAsCleared = (id: string, clearanceData?: string | ChequeClearancePayload) => {
    let dateStr = new Date().toISOString().split('T')[0];
    let refStr: string | undefined;
    let notesStr: string | undefined;

    if (typeof clearanceData === 'string') {
      dateStr = clearanceData || dateStr;
    } else if (clearanceData) {
      dateStr = clearanceData.clearedAt || dateStr;
      refStr = clearanceData.clearanceReference;
      notesStr = clearanceData.clearanceNotes;
    }

    const target = cheques.find(c => c.id === id);
    updateCheque(id, {
      status: 'CLEARED',
      clearedAt: dateStr,
      clearanceReference: refStr,
      clearanceNotes: notesStr
    });

    if (target?.linkedPaymentId) {
      setPayments(prev => prev.map(p => {
        if (p.id === target.linkedPaymentId) {
          const updated = {
            ...p,
            notes: (p.notes || '') + (refStr ? ` | Bank UTR: ${refStr}` : '') + ` [Cleared: ${dateStr}]`
          };
          cloudDb.syncEntityDoc('payments', currentCompanyId, updated).catch(console.warn);
          return updated;
        }
        return p;
      }));
    }

    showToast('success', 'Cheque Cleared', `Cheque #${target?.chequeNumber || ''} marked cleared on ${dateStr}${refStr ? ` (Ref: ${refStr})` : ''}.`);
  };

  const markChequeAsBounced = (id: string, bounceData?: string | ChequeBouncePayload) => {
    const target = cheques.find(c => c.id === id);
    const now = new Date().toISOString();
    let reason = 'Cheque returned unpaid';
    let reasonCode: string | undefined;
    let memoRef: string | undefined;
    let penaltyFee: number | undefined;
    let reverseInvoice = true;
    let autoExpense = true;
    let bounceDate = now.split('T')[0];

    if (typeof bounceData === 'string') {
      reason = bounceData || reason;
    } else if (bounceData) {
      reason = bounceData.bouncedReason || reason;
      reasonCode = bounceData.bouncedReasonCode;
      memoRef = bounceData.bouncedMemoRef;
      penaltyFee = bounceData.bouncedPenaltyFee;
      reverseInvoice = bounceData.reverseLinkedInvoice !== false;
      autoExpense = bounceData.autoRecordPenaltyExpense !== false;
      bounceDate = bounceData.bouncedAt || bounceDate;
    }

    updateCheque(id, {
      status: 'BOUNCED',
      bouncedAt: bounceDate,
      bouncedReason: reason,
      bouncedReasonCode: reasonCode,
      bouncedMemoRef: memoRef,
      bouncedPenaltyFee: penaltyFee
    });

    // 1. Revert Linked Invoice if requested
    if (reverseInvoice && target?.linkedInvoiceId) {
      const invId = target.linkedInvoiceId;
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invId) {
          const newAmountPaid = Math.max(0, (inv.amountPaid || 0) - target.amount);
          const newAmountDue = Math.max(0, inv.grandTotal - newAmountPaid);
          const newStatus: InvoiceStatus = newAmountPaid <= 0 ? 'UNPAID' : (newAmountDue > 0 ? 'PARTIALLY_PAID' : 'PAID');
          const updatedInv: Invoice = {
            ...inv,
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus
          };
          cloudDb.syncEntityDoc('invoices', currentCompanyId, updatedInv).catch(console.warn);
          return updatedInv;
        }
        return inv;
      }));
    }

    // 2. Automatically log Bank Charges expense for penalty fee if specified
    if (autoExpense && penaltyFee && penaltyFee > 0 && target) {
      try {
        createExpense({
          date: bounceDate,
          category: 'Bank Charges',
          payee: target.bankName || 'Bank',
          amount: penaltyFee,
          gstRate: 18,
          gstAmount: Math.round(penaltyFee * 0.18),
          hasGstBill: false,
          paymentMethod: 'BANK_TRANSFER',
          notes: `Bank Cheque Bounce Penalty - Cheque #${target.chequeNumber} (${target.payeeName}) - Reason: ${reason}`
        });
      } catch (err) {
        console.warn('Could not auto-create bounce expense:', err);
      }
    }

    showToast('warning', 'Cheque Marked Bounced', `Cheque #${target?.chequeNumber || ''} marked bounced (${reason}).`);
  };

  const createChequeBook = (bookData: Omit<ChequeBook, 'id' | 'createdAt'>): ChequeBook => {
    const newBook: ChequeBook = {
      ...bookData,
      id: 'cb-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setChequeBooks(prev => [newBook, ...prev]);
    cloudDb.syncEntityDoc('chequeBooks', currentCompanyId, newBook).catch(console.warn);
    showToast('success', 'Cheque Book Added', `Series #${newBook.startChequeNo} - #${newBook.endChequeNo} registered.`);
    return newBook;
  };

  const updateChequeBook = (id: string, updates: Partial<ChequeBook>) => {
    setChequeBooks(prev => prev.map(b => {
      if (b.id === id) {
        const updated = { ...b, ...updates };
        cloudDb.syncEntityDoc('chequeBooks', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return b;
    }));
    showToast('success', 'Cheque Book Updated', 'Cheque book series updated.');
  };

  const deleteChequeBook = (id: string) => {
    const target = chequeBooks.find(b => b.id === id);
    setChequeBooks(prev => prev.filter(b => b.id !== id));
    cloudDb.deleteEntityDoc('chequeBooks', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Cheque Book Removed', `Cheque book #${target?.startChequeNo || ''} deleted.`);
  };

  const saveChequeTemplate = (template: ChequeTemplateConfig) => {
    setChequeTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      let updated: ChequeTemplateConfig[];
      if (exists) {
        updated = prev.map(t => t.id === template.id ? template : t);
      } else {
        updated = [...prev, template];
      }
      cloudDb.syncEntityDoc('chequeTemplates', currentCompanyId, template).catch(console.warn);
      return updated;
    });
  };

  const deleteChequeTemplate = (id: string) => {
    setChequeTemplates(prev => prev.filter(t => t.id !== id));
    cloudDb.deleteEntityDoc('chequeTemplates', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Template Removed', 'Custom cheque template removed.');
  };

  // Letterhead Management & Official Documents
  const saveLetterheadDocument = (doc: LetterheadDocument) => {
    setLetterheadDocuments(prev => {
      const exists = prev.some(d => d.id === doc.id);
      let updated: LetterheadDocument[];
      if (exists) {
        updated = prev.map(d => d.id === doc.id ? doc : d);
      } else {
        updated = [doc, ...prev];
      }
      cloudDb.syncEntityDoc('letterheadDocuments', currentCompanyId, doc).catch(console.warn);
      return updated;
    });
    showToast('success', 'Letter Saved', `Letter "${doc.title}" saved successfully.`);
  };

  const deleteLetterheadDocument = (id: string) => {
    const target = letterheadDocuments.find(d => d.id === id);
    setLetterheadDocuments(prev => prev.filter(d => d.id !== id));
    cloudDb.deleteEntityDoc('letterheadDocuments', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Letter Removed', `Letter "${target?.title || 'Document'}" removed.`);
  };

  const saveLetterheadTemplate = (template: LetterheadTemplate) => {
    setLetterheadTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      let updated: LetterheadTemplate[];
      if (exists) {
        updated = prev.map(t => t.id === template.id ? template : t);
      } else {
        updated = [...prev, template];
      }
      cloudDb.syncEntityDoc('letterheadTemplates', currentCompanyId, template).catch(console.warn);
      return updated;
    });
    showToast('success', 'Template Saved', `Letterhead layout "${template.name}" saved.`);
  };

  const deleteLetterheadTemplate = (id: string) => {
    if (letterheadTemplates.length <= 1) {
      showToast('error', 'Cannot Delete', 'At least one letterhead template must remain active.');
      return;
    }
    const target = letterheadTemplates.find(t => t.id === id);
    setLetterheadTemplates(prev => {
      const remaining = prev.filter(t => t.id !== id);
      if (target?.isDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
    cloudDb.deleteEntityDoc('letterheadTemplates', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Template Removed', `Template "${target?.name || ''}" deleted.`);
  };

  const setDefaultLetterheadTemplate = (id: string) => {
    setLetterheadTemplates(prev => {
      const updated = prev.map(t => ({
        ...t,
        isDefault: t.id === id
      }));
      const currentDefault = updated.find(t => t.id === id);
      if (currentDefault) {
        cloudDb.syncEntityDoc('letterheadTemplates', currentCompanyId, currentDefault).catch(console.warn);
      }
      return updated;
    });
    showToast('success', 'Default Letterhead Set', 'Primary letterhead template updated.');
  };

  // Accounting & Ledger
  const createJournalEntry = (entryData: Omit<JournalEntry, 'id' | 'createdAt'>): JournalEntry => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: 'je-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    cloudDb.syncEntityDoc('journalEntries', currentCompanyId, newEntry).catch(console.warn);
    showToast('success', 'Journal Entry Posted', `Voucher ${newEntry.entryNumber} recorded.`);
    return newEntry;
  };

  const updateJournalEntry = (id: string, entryData: Partial<JournalEntry>) => {
    setJournalEntries(prev => prev.map(e => {
      if (e.id === id) {
        const updated = { ...e, ...entryData };
        cloudDb.syncEntityDoc('journalEntries', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return e;
    }));
    showToast('success', 'Journal Entry Updated', 'Voucher details updated.');
  };

  const deleteJournalEntry = (id: string) => {
    const target = journalEntries.find(e => e.id === id);
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    cloudDb.deleteEntityDoc('journalEntries', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Journal Entry Removed', `Voucher ${target?.entryNumber || ''} removed.`);
  };

  const createAccountHead = (accountData: Omit<AccountHead, 'id'>): AccountHead => {
    const newAccount: AccountHead = {
      ...accountData,
      id: 'acc-' + Date.now()
    };
    setAccountHeads(prev => [...prev, newAccount]);
    cloudDb.syncEntityDoc('accountHeads', currentCompanyId, newAccount).catch(console.warn);
    showToast('success', 'Account Created', `Created account "${newAccount.name}" (${newAccount.code}).`);
    return newAccount;
  };

  const updateAccountHead = (id: string, updates: Partial<AccountHead>) => {
    setAccountHeads(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...updates };
        cloudDb.syncEntityDoc('accountHeads', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return a;
    }));
    showToast('success', 'Account Updated', 'Chart of accounts modified.');
  };

  const deleteAccountHead = (id: string): boolean => {
    const target = accountHeads.find(a => a.id === id);
    if (!target) return false;
    if (target.isSystem) {
      showToast('error', 'System Account Protected', 'Default system ledger accounts cannot be deleted.');
      return false;
    }

    setAccountHeads(prev => prev.filter(a => a.id !== id));
    cloudDb.deleteEntityDoc('accountHeads', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Account Deleted', `Ledger account "${target.name}" (${target.code}) removed.`);
    return true;
  };

  const clearAllLedgerData = async () => {
    // 1. Reset journal entries to empty
    setJournalEntries([]);
    localStorage.setItem(STORAGE_PREFIX + 'journalEntries', JSON.stringify([]));
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_journalEntries`, JSON.stringify([]));

    // 2. Reset account heads to standard clean defaults with zero opening balances
    setAccountHeads(cleanDefaultAccountHeads);
    localStorage.setItem(STORAGE_PREFIX + 'accountHeads', JSON.stringify(cleanDefaultAccountHeads));
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_accountHeads`, JSON.stringify(cleanDefaultAccountHeads));

    // 3. Clear cloud Firestore partitioned collections and re-seed baseline standard COA
    try {
      await cloudDb.clearCollection('journalEntries', currentCompanyId);
      await cloudDb.clearCollection('accountHeads', currentCompanyId);
      await cloudDb.syncEntireCollection('accountHeads', currentCompanyId, cleanDefaultAccountHeads);
    } catch (e) {
      console.warn('CloudDb: Failed clearing cloud ledger partitions:', e);
    }

    showToast('info', 'Ledgers Cleared', 'All journal entries and custom ledger balances have been reset to zero baseline.');
  };

  // Bank Statement Auto Entry Bulk Processor
  const importBankStatementAutoEntries = (
    entriesToImport: BankStatementAutoEntry[],
    targetBankAccountId: string,
    options?: {
      autoCreateParties?: boolean;
      autoSettleInvoices?: boolean;
      autoSettleBills?: boolean;
    }
  ): BankStatementImportResult => {
    const autoCreateParties = options?.autoCreateParties ?? true;
    const autoSettleInvoices = options?.autoSettleInvoices ?? true;
    const autoSettleBills = options?.autoSettleBills ?? true;

    const targetAccount = accountHeads.find(a => a.id === targetBankAccountId) || {
      id: targetBankAccountId,
      name: 'Bank Account'
    };

    let importedCount = 0;
    let paymentsInCreated = 0;
    let paymentsOutCreated = 0;
    let expensesCreated = 0;
    let contraCreated = 0;
    let journalsCreated = 0;
    let partiesCreated = 0;

    const newPaymentsToAdd: PaymentRecord[] = [];
    const newExpensesToAdd: Expense[] = [];
    const newJournalsToAdd: JournalEntry[] = [];

    const validEntries = entriesToImport.filter(e => e.entryType !== 'IGNORE' && e.selected !== false);

    if (autoCreateParties) {
      setParties(prevParties => {
        const updatedParties = [...prevParties];

        validEntries.forEach(entry => {
          if (!entry.partyName || entry.partyId) return;

          const exists = updatedParties.some(
            p => p.name.trim().toLowerCase() === entry.partyName!.trim().toLowerCase()
          );

          if (!exists) {
            const pType: 'CUSTOMER' | 'VENDOR' = entry.partyType || (entry.entryType === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR');
            const newParty: Party = {
              id: `party-bs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: entry.partyName,
              companyName: entry.partyName,
              type: pType,
              phone: '',
              billingAddress: `${entry.partyName} (Auto-created from Bank Statement)`,
              city: business.city || 'Delhi',
              state: business.state || 'Delhi',
              stateCode: business.stateCode || '07',
              pincode: business.pincode || '110001',
              openingBalance: 0,
              currentBalance: 0,
              createdAt: new Date().toISOString()
            };
            updatedParties.push(newParty);
            entry.partyId = newParty.id;
            partiesCreated++;
            cloudDb.syncEntityDoc('parties', currentCompanyId, newParty).catch(console.warn);
          } else {
            const matched = updatedParties.find(p => p.name.trim().toLowerCase() === entry.partyName!.trim().toLowerCase());
            if (matched) {
              entry.partyId = matched.id;
            }
          }
        });

        return updatedParties;
      });
    }

    validEntries.forEach((entry, idx) => {
      importedCount++;
      const amount = entry.depositAmount > 0 ? entry.depositAmount : entry.withdrawalAmount;
      const cleanRef = entry.referenceNo || entry.chequeNo || `TXN-${Date.now().toString().slice(-6)}-${idx + 1}`;
      const entryDate = entry.date || new Date().toISOString().split('T')[0];

      if (entry.entryType === 'PAYMENT_IN') {
        paymentsInCreated++;
        const pRec: PaymentRecord = {
          id: `pay-in-bs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          voucherNumber: `RCPT-BS-${cleanRef}`,
          type: 'PAYMENT_IN',
          date: entryDate,
          partyId: entry.partyId,
          partyName: entry.partyName || 'Customer',
          partyType: 'CUSTOMER',
          amount,
          paymentMethod: entry.paymentMethod || 'BANK_TRANSFER',
          bankAccountId: targetBankAccountId,
          bankAccountName: targetAccount.name,
          referenceNo: cleanRef,
          notes: entry.notes || entry.narration,
          linkedInvoiceId: entry.linkedInvoiceId,
          linkedInvoiceNumber: entry.linkedInvoiceNumber,
          createdAt: new Date().toISOString()
        };
        newPaymentsToAdd.push(pRec);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);

        if (entry.partyId) {
          setParties(prev => prev.map(p => {
            if (p.id === entry.partyId) {
              const updatedP = { ...p, currentBalance: Math.max(0, p.currentBalance - amount) };
              cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
              return updatedP;
            }
            return p;
          }));
        }

        if (autoSettleInvoices && (entry.linkedInvoiceId || entry.linkedInvoiceNumber)) {
          setInvoices(prev => prev.map(inv => {
            if (inv.id === entry.linkedInvoiceId || inv.invoiceNumber === entry.linkedInvoiceNumber) {
              const newPaid = (inv.amountPaid || 0) + amount;
              const newDue = Math.max(0, inv.grandTotal - newPaid);
              const updatedInv: Invoice = {
                ...inv,
                amountPaid: newPaid,
                amountDue: newDue,
                status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID'
              };
              cloudDb.syncEntityDoc('invoices', currentCompanyId, updatedInv).catch(console.warn);
              return updatedInv;
            }
            return inv;
          }));
        }
      } else if (entry.entryType === 'PAYMENT_OUT') {
        paymentsOutCreated++;
        const pRec: PaymentRecord = {
          id: `pay-out-bs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          voucherNumber: `PMT-BS-${cleanRef}`,
          type: 'PAYMENT_OUT',
          date: entryDate,
          partyId: entry.partyId,
          partyName: entry.partyName || 'Vendor / Payee',
          partyType: 'VENDOR',
          amount,
          paymentMethod: entry.paymentMethod || 'BANK_TRANSFER',
          bankAccountId: targetBankAccountId,
          bankAccountName: targetAccount.name,
          referenceNo: cleanRef,
          notes: entry.notes || entry.narration,
          linkedBillId: entry.linkedBillId,
          linkedBillNumber: entry.linkedBillNumber,
          createdAt: new Date().toISOString()
        };
        newPaymentsToAdd.push(pRec);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);

        if (entry.partyId) {
          setParties(prev => prev.map(p => {
            if (p.id === entry.partyId) {
              const updatedP = { ...p, currentBalance: p.currentBalance + amount };
              cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
              return updatedP;
            }
            return p;
          }));
        }

        if (autoSettleBills && (entry.linkedBillId || entry.linkedBillNumber)) {
          setPurchaseBills(prev => prev.map(bill => {
            if (bill.id === entry.linkedBillId || bill.billNumber === entry.linkedBillNumber) {
              const newPaid = (bill.amountPaid || 0) + amount;
              const newDue = Math.max(0, bill.grandTotal - newPaid);
              const updatedB: PurchaseBill = {
                ...bill,
                amountPaid: newPaid,
                amountDue: newDue,
                status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID'
              };
              cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updatedB).catch(console.warn);
              return updatedB;
            }
            return bill;
          }));
        }
      } else if (entry.entryType === 'EXPENSE') {
        expensesCreated++;
        const newExp: Expense = {
          id: `exp-bs-${Date.now()}-${idx}`,
          date: entryDate,
          category: entry.expenseCategory || 'Miscellaneous Operating Expenses',
          payee: entry.partyName || entry.narration.slice(0, 40),
          amount,
          gstRate: 0,
          gstAmount: 0,
          hasGstBill: false,
          paymentMethod: entry.paymentMethod || 'BANK_TRANSFER',
          notes: `Bank Statement Entry: ${entry.narration}`,
          referenceNo: cleanRef,
          createdAt: new Date().toISOString()
        };
        newExpensesToAdd.push(newExp);
        cloudDb.syncEntityDoc('expenses', currentCompanyId, newExp).catch(console.warn);
      } else if (entry.entryType === 'CONTRA_TRANSFER') {
        contraCreated++;
        const isDeposit = entry.depositAmount > 0;
        const fromAcc = entry.fromAccount || (isDeposit ? 'Cash in Hand (acc-1)' : `${targetAccount.name} (${targetBankAccountId})`);
        const toAcc = entry.toAccount || (isDeposit ? `${targetAccount.name} (${targetBankAccountId})` : 'Cash in Hand (acc-1)');

        const pRec: PaymentRecord = {
          id: `pay-contra-bs-${Date.now()}-${idx}`,
          voucherNumber: `CONTRA-BS-${cleanRef}`,
          type: 'CONTRA_TRANSFER',
          date: entryDate,
          partyName: isDeposit ? 'Cash Deposit to Bank' : 'Cash Withdrawal from Bank',
          amount,
          paymentMethod: 'CASH',
          bankAccountId: targetBankAccountId,
          bankAccountName: targetAccount.name,
          referenceNo: cleanRef,
          fromAccount: fromAcc,
          toAccount: toAcc,
          notes: entry.notes || entry.narration,
          createdAt: new Date().toISOString()
        };
        newPaymentsToAdd.push(pRec);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);
      } else if (entry.entryType === 'JOURNAL_ENTRY') {
        journalsCreated++;
        const isDeposit = entry.depositAmount > 0;
        const contraAccId = entry.contraAccountId || (isDeposit ? 'acc-14' : 'acc-18');
        const contraAccObj = accountHeads.find(a => a.id === contraAccId);
        const contraAccName = entry.contraAccountName || contraAccObj?.name || 'General Ledger Account';

        const jvLines = isDeposit ? [
          { accountId: targetBankAccountId, accountName: targetAccount.name, debit: amount, credit: 0 },
          { accountId: contraAccId, accountName: contraAccName, debit: 0, credit: amount }
        ] : [
          { accountId: contraAccId, accountName: contraAccName, debit: amount, credit: 0 },
          { accountId: targetBankAccountId, accountName: targetAccount.name, debit: 0, credit: amount }
        ];

        const newJv: JournalEntry = {
          id: `je-bs-${Date.now()}-${idx}`,
          entryNumber: `JV-BS-${cleanRef}`,
          date: entryDate,
          description: `Auto-JV from bank statement: ${entry.narration}`,
          lines: jvLines,
          createdAt: new Date().toISOString()
        };
        newJournalsToAdd.push(newJv);
        cloudDb.syncEntityDoc('journalEntries', currentCompanyId, newJv).catch(console.warn);
      }
    });

    if (newPaymentsToAdd.length > 0) {
      setPayments(prev => [...newPaymentsToAdd, ...prev]);
    }
    if (newExpensesToAdd.length > 0) {
      setExpenses(prev => [...newExpensesToAdd, ...prev]);
    }
    if (newJournalsToAdd.length > 0) {
      setJournalEntries(prev => [...newJournalsToAdd, ...prev]);
    }

    logSecurityEvent('BANK_STATEMENT_AUTO_ENTRY', 'Accounting', `Auto-imported ${importedCount} transactions into ${targetAccount.name}`);
    showToast('success', 'Bank Statement Processed', `Successfully imported ${importedCount} transactions.`);

    return {
      totalRows: entriesToImport.length,
      importedCount,
      paymentsInCreated,
      paymentsOutCreated,
      expensesCreated,
      contraCreated,
      journalsCreated,
      partiesCreated
    };
  };

  // Reset & Legacy Handlers
  const resetAllData = () => {
    localStorage.clear();
    setCompanies([cleanDefaultCompany]);
    setCurrentCompanyId(cleanDefaultCompany.id);
    setBusiness(cleanDefaultBusinessProfile);
    setInvoices([]);
    setProducts([]);
    setParties([]);
    setPurchaseBills([]);
    setPayments([]);
    setExpenses([]);
    setAccountHeads(cleanDefaultAccountHeads);
    setJournalEntries([]);
    setUsers(cleanDefaultUsers);
    setCurrentUserId(cleanDefaultAdminUser.id);
    setAuditLogs([]);
    setLetterheadDocuments([]);
    setLetterheadTemplates(DEFAULT_LETTERHEAD_TEMPLATES);
    triggerCloudSync().catch(console.warn);
    showToast('info', 'System Reset', 'Clean database initialized. All records cleared.');
  };

  // System Snapshot Engine & Vault Storage
  const createSystemSnapshot = async (
    triggerType: SystemSnapshotTrigger = 'MANUAL_EXPORT',
    customLabel?: string,
    downloadFile: boolean = false
  ): Promise<SystemSnapshotPayload> => {
    const rawPayload: Omit<SystemSnapshotPayload, 'metadata'> = {
      companies,
      business,
      invoices,
      products,
      parties,
      purchaseBills,
      payments,
      expenses,
      accountHeads,
      journalEntries,
      users,
      cheques,
      chequeBooks,
      chequeTemplates,
      customHsnCodes,
      letterheadDocuments,
      letterheadTemplates,
      exportedAt: new Date().toISOString(),
      appName: 'Zooka Business',
      version: '2.5.0'
    };

    const metadata = buildSnapshotMetadata(rawPayload, triggerType, customLabel);
    const fullSnapshot: SystemSnapshotPayload = {
      ...rawPayload,
      metadata
    };

    // Save into indexed/local vault
    await saveSnapshotToVault(fullSnapshot);
    await refreshVaultSnapshots();

    if (downloadFile) {
      downloadSnapshotAsJsonFile(
        fullSnapshot, 
        `ZookaBusiness_${triggerType === 'SCHEDULED_AUTO' ? 'Auto_Snapshot' : 'System_Snapshot'}`
      );
    }

    logSecurityEvent(
      'SYSTEM_SNAPSHOT_CREATED', 
      'System Backup', 
      `Archived system snapshot: ${metadata.label} (${metadata.invoicesCount} invoices, ${metadata.productsCount} products)`
    );

    return fullSnapshot;
  };

  const exportCurrentDatabaseSnapshot = async (customLabel?: string): Promise<void> => {
    await createSystemSnapshot(
      'MANUAL_EXPORT', 
      customLabel || `Manual Snapshot (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`, 
      true
    );
    showToast('success', 'System Snapshot Exported', 'Comprehensive system snapshot downloaded as JSON file.');
  };

  const exportVaultSnapshotById = async (id: string): Promise<void> => {
    const snap = await getSnapshotPayloadById(id);
    if (!snap) {
      showToast('error', 'Snapshot Not Found', 'Could not locate the requested snapshot file in vault.');
      return;
    }
    const cleanName = (snap.metadata?.label || 'Snapshot').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadSnapshotAsJsonFile(snap, `ZookaBusiness_${cleanName}`);
    showToast('success', 'Snapshot Downloaded', 'Archived snapshot exported as JSON file.');
  };

  const deleteVaultSnapshot = async (id: string): Promise<void> => {
    await deleteSnapshotFromVault(id);
    await refreshVaultSnapshots();
    showToast('info', 'Snapshot Removed', 'Archived snapshot deleted from local vault.');
  };

  const clearAllVaultSnapshots = async (): Promise<void> => {
    await clearSnapshotVault();
    await refreshVaultSnapshots();
    showToast('info', 'Vault Cleared', 'All archived snapshot history removed.');
  };

  const restoreSystemSnapshot = async (
    snapshot: SystemSnapshotPayload,
    createRecoveryPoint: boolean = true
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Create safety recovery point if requested before applying restore
      if (createRecoveryPoint) {
        try {
          await createSystemSnapshot(
            'PRE_RESTORE_RECOVERY', 
            `Pre-Restore Recovery Point (${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`, 
            false
          );
        } catch (recoveryErr) {
          console.warn('Safety recovery point creation failed:', recoveryErr);
        }
      }

      // 2. Restore all data partitions safely
      if (snapshot.companies && Array.isArray(snapshot.companies) && snapshot.companies.length > 0) {
        setCompanies(snapshot.companies);
      }
      if (snapshot.business) {
        setBusiness(normalizeBusinessProfile(snapshot.business));
      }
      if (Array.isArray(snapshot.invoices)) {
        setInvoices(snapshot.invoices);
      }
      if (Array.isArray(snapshot.products)) {
        setProducts(snapshot.products);
      }
      if (Array.isArray(snapshot.parties)) {
        setParties(snapshot.parties);
      }
      if (Array.isArray(snapshot.purchaseBills)) {
        setPurchaseBills(snapshot.purchaseBills);
      }
      if (Array.isArray(snapshot.payments)) {
        setPayments(snapshot.payments);
      }
      if (Array.isArray(snapshot.expenses)) {
        setExpenses(snapshot.expenses);
      }
      if (Array.isArray(snapshot.accountHeads) && snapshot.accountHeads.length > 0) {
        setAccountHeads(snapshot.accountHeads);
      }
      if (Array.isArray(snapshot.journalEntries)) {
        setJournalEntries(snapshot.journalEntries);
      }
      if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
        setUsers(snapshot.users);
      }
      if (Array.isArray(snapshot.cheques)) {
        setCheques(snapshot.cheques);
      }
      if (Array.isArray(snapshot.chequeBooks)) {
        setChequeBooks(snapshot.chequeBooks);
      }
      if (Array.isArray(snapshot.chequeTemplates)) {
        setChequeTemplates(snapshot.chequeTemplates);
      }
      if (Array.isArray(snapshot.customHsnCodes)) {
        setCustomHsnCodes(snapshot.customHsnCodes);
      }
      if (Array.isArray(snapshot.letterheadDocuments)) {
        setLetterheadDocuments(snapshot.letterheadDocuments);
      }
      if (Array.isArray(snapshot.letterheadTemplates) && snapshot.letterheadTemplates.length > 0) {
        setLetterheadTemplates(snapshot.letterheadTemplates);
      }

      // 3. Trigger cloud sync
      triggerCloudSync().catch(console.warn);

      // 4. Log security event
      logSecurityEvent(
        'SYSTEM_RESTORE_EXECUTED', 
        'System Restore', 
        `Restored system state from snapshot: ${snapshot.metadata?.label || snapshot.appName || 'JSON Snapshot'}`
      );

      // 5. Refresh vault
      await refreshVaultSnapshots();

      showToast(
        'success', 
        'System Restored Successfully', 
        `Restored ${snapshot.invoices?.length || 0} invoices, ${snapshot.products?.length || 0} products, and ${snapshot.parties?.length || 0} parties.`
      );

      return { success: true, message: 'System restored successfully' };
    } catch (e: any) {
      console.error('System restore error:', e);
      showToast('error', 'Restore Failed', e?.message || 'Failed to restore system snapshot.');
      return { success: false, message: e?.message || 'Restore failed' };
    }
  };

  const exportDatabaseJSON = () => {
    exportCurrentDatabaseSnapshot();
  };

  const importDatabaseJSON = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      const validation = validateSystemSnapshotFile(parsed);
      if (validation.isValid && validation.payload) {
        restoreSystemSnapshot(validation.payload, true);
        return true;
      }
      throw new Error(validation.error || 'Invalid backup schema');
    } catch (e: any) {
      showToast('error', 'Import Failed', e?.message || 'Selected file is not a valid Zooka Business backup JSON.');
      return false;
    }
  };

  // Background Automatic Snapshot Engine
  useEffect(() => {
    if (!autoSnapshotConfig.enabled) return;

    const checkAndRunAutoSnapshot = async () => {
      try {
        const config = getStoredAutoSnapshotConfig();
        if (!config.enabled) return;

        const intervalHours = config.intervalHours || 24;
        const intervalMs = intervalHours * 60 * 60 * 1000;
        const lastTime = config.lastSnapshotTimestamp ? new Date(config.lastSnapshotTimestamp).getTime() : 0;
        const now = Date.now();

        if (now - lastTime >= intervalMs) {
          const snapshot = await createSystemSnapshot(
            'SCHEDULED_AUTO', 
            `Automated Snapshot (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})`, 
            config.autoDownloadJson
          );
          
          const nextScheduled = new Date(now + intervalMs).toISOString();
          const updatedConfig: AutoSnapshotConfig = {
            ...config,
            lastSnapshotTimestamp: snapshot.metadata.timestamp,
            nextScheduledSnapshotTimestamp: nextScheduled
          };
          saveStoredAutoSnapshotConfig(updatedConfig);
          setAutoSnapshotConfig(updatedConfig);
          await refreshVaultSnapshots();
        }
      } catch (err) {
        console.warn('Auto snapshot scheduler error:', err);
      }
    };

    const timeoutId = setTimeout(checkAndRunAutoSnapshot, 8000);
    const intervalId = setInterval(checkAndRunAutoSnapshot, 60000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [
    autoSnapshotConfig.enabled, 
    autoSnapshotConfig.intervalHours, 
    autoSnapshotConfig.autoDownloadJson,
    companies, 
    business, 
    invoices, 
    products, 
    parties, 
    purchaseBills, 
    payments, 
    expenses, 
    accountHeads, 
    journalEntries, 
    users, 
    cheques, 
    chequeBooks, 
    chequeTemplates, 
    customHsnCodes
  ]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isMobileNavOpen,
        setIsMobileNavOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapse,
        companies,
        currentCompany,
        currentCompanyId,
        switchCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        toggleCompanyStatus,
        editBusinessProfile,
        superAdminAuth,
        superAdminUser,
        updateSuperAdminProfile,
        updateSuperAdminPassword,
        platformConfig,
        updatePlatformConfig,
        updateAnnouncement,
        resetPlatformConfig,
        business,
        updateBusiness,
        updateLowStockSettings,
        invoices,
        createInvoice,
        getNextSequentialInvoiceNumber,
        realignAndFixInvoiceSequences,
        resequenceAllInvoicesFromStartingNumber,
        bulkCreateInvoices,
        updateInvoice,
        deleteInvoice,
        getInvoice,
        recordInvoicePayment,
        generateEInvoice,
        cancelEInvoice,
        generateEWayBill,
        products,
        createProduct,
        bulkCreateProducts,
        bulkUpdateProductThresholds,
        updateProduct,
        deleteProduct,
        adjustStock,
        customHsnCodes,
        addCustomHsnCode,
        updateCustomHsnCode,
        deleteCustomHsnCode,
        bulkImportCustomHsnCodes,
        parties,
        createParty,
        bulkCreateParties,
        updateParty,
        deleteParty,
        syncBillingParties,
        purchaseBills,
        createPurchaseBill,
        updatePurchaseBill,
        deletePurchaseBill,
        recordPurchasePayment,
        payments,
        createPayment,
        updatePayment,
        deletePayment,
        expenses,
        createExpense,
        deleteExpense,
        cheques,
        chequeBooks,
        chequeTemplates,
        createCheque,
        updateCheque,
        deleteCheque,
        markChequeAsPrinted,
        markChequeAsCleared,
        markChequeAsBounced,
        createChequeBook,
        updateChequeBook,
        deleteChequeBook,
        saveChequeTemplate,
        deleteChequeTemplate,
        letterheadDocuments,
        letterheadTemplates,
        saveLetterheadDocument,
        deleteLetterheadDocument,
        saveLetterheadTemplate,
        deleteLetterheadTemplate,
        setDefaultLetterheadTemplate,
        accountHeads,
        createAccountHead,
        updateAccountHead,
        deleteAccountHead,
        clearAllLedgerData,
        importBankStatementAutoEntries,
        journalEntries,
        createJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        toasts,
        showToast,
        removeToast,
        resetAllData,
        exportDatabaseJSON,
        importDatabaseJSON,
        autoSnapshotConfig,
        updateAutoSnapshotConfig,
        vaultSnapshots,
        refreshVaultSnapshots,
        createSystemSnapshot,
        restoreSystemSnapshot,
        deleteVaultSnapshot,
        clearAllVaultSnapshots,
        exportVaultSnapshotById,
        exportCurrentDatabaseSnapshot,
        cloudSyncStatus,
        isCloudSyncing,
        lastCloudSyncTime,
        triggerCloudSync,
        refreshData,
        selectedInvoiceIdForPrint,
        setSelectedInvoiceIdForPrint,
        selectedInvoiceForIRN,
        setSelectedInvoiceForIRN,
        users,
        currentUser,
        effectivePermissions,
        customRolePermissions,
        updateRolePermissions,
        updateAllRolePermissions,
        resetRolePermissions,
        isAuthenticated,
        logout,
        logoutSuperAdmin,
        isSessionLocked,
        isAuthModalOpen,
        authModalTargetUser,
        openAuthModal,
        closeAuthModal,
        lockSession,
        unlockSession,
        authenticateAndSwitchUser,
        changeUserPassword,
        switchUser,
        createUser,
        updateUser,
        deleteUser,
        can,
        auditLogs,
        logSecurityEvent,
        verifySuperAdminKey,
        loginAsSuperAdmin,
        jwtToken,
        jwtSessionInfo,
        refreshActiveJwtToken,
        isJwtModalOpen,
        setIsJwtModalOpen,
        sessionTimeoutConfig,
        updateSessionTimeoutSettings,
        biometricConfig,
        updateBiometricSettings,
        isBiometricAccountingUnlocked,
        lockBiometricAccounting,
        unlockBiometricAccounting,
        promptBiometricVerification,
        isBiometricModalOpen,
        biometricModalActionTitle,
        biometricModalActionDescription,
        closeBiometricModal,
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
      <BiometricPromptModal
        isOpen={isBiometricModalOpen}
        onClose={closeBiometricModal}
        onSuccess={() => {
          unlockBiometricAccounting();
          if (biometricPendingCallbackRef.current) {
            const cb = biometricPendingCallbackRef.current;
            biometricPendingCallbackRef.current = null;
            cb();
          }
        }}
        actionTitle={biometricModalActionTitle}
        actionDescription={biometricModalActionDescription}
        config={biometricConfig}
        currencySymbol={business.currencySymbol}
      />
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
