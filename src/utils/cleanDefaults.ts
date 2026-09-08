import { Company, BusinessProfile, AppUser, AccountHead } from '../types';
import { DEFAULT_SIGNATURE_DATA_URL, normalizeSignatureUrl } from './formatters';
import { DEFAULT_BOTTOM_NAV_CONFIG } from './bottomNavDefaults';
import { DEFAULT_HEADER_CONFIG, normalizeHeaderConfig } from './headerDefaults';
import { DEFAULT_FOOTER_CONFIG, normalizeFooterConfig } from './footerDefaults';
import { DEFAULT_SUPER_ADMIN } from './rbacRules';
import { DEFAULT_LOW_STOCK_SETTINGS, normalizeLowStockSettings } from './stockUtils';
import { DEFAULT_SESSION_TIMEOUT_CONFIG, normalizeSessionTimeoutConfig } from './sessionTimeoutDefaults';
import { DEFAULT_BIOMETRIC_CONFIG, normalizeBiometricConfig } from './biometricDefaults';
import { DEFAULT_DISPATCH_SETTINGS, normalizeDispatchSettings } from './dispatchUtils';

export const cleanDefaultCompany: Company = {
  id: 'comp-main',
  name: 'My Business Enterprises',
  tradeName: 'My Enterprise',
  gstin: '07AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  businessType: 'Private Limited / Proprietorship',
  state: 'Delhi',
  stateCode: '07',
  city: 'New Delhi',
  address: 'Plot No. 1, Industrial Area',
  pincode: '110001',
  phone: '+91 98000 00000',
  email: 'accounts@mybusiness.in',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200000000000',
  ifscCode: 'HDFC0000000',
  branchName: 'Main Commercial Branch',
  upiId: 'mybusiness@upi',
  financialYear: '2026-2027',
  currency: 'INR',
  currencySymbol: '₹',
  showLogoOnInvoice: true,
  logoShape: 'rounded',
  themeColor: 'indigo',
  headerConfig: DEFAULT_HEADER_CONFIG,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  lowStockSettings: DEFAULT_LOW_STOCK_SETTINGS,
  sessionTimeoutSettings: DEFAULT_SESSION_TIMEOUT_CONFIG,
  biometricSettings: DEFAULT_BIOMETRIC_CONFIG,
  dispatchSettings: DEFAULT_DISPATCH_SETTINGS,
  createdAt: '2026-01-01T00:00:00Z',
};

export const cleanDefaultBusinessProfile: BusinessProfile = {
  name: 'My Business Enterprises',
  tradeName: 'My Enterprise',
  gstin: '07AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  phone: '+91 98000 00000',
  email: 'accounts@mybusiness.in',
  address: 'Plot No. 1, Industrial Area',
  city: 'New Delhi',
  state: 'Delhi',
  stateCode: '07',
  pincode: '110001',
  currency: 'INR',
  currencySymbol: '₹',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200000000000',
  ifscCode: 'HDFC0000000',
  branchName: 'Main Commercial Branch',
  upiId: 'mybusiness@upi',
  invoicePrefix: '',
  nextInvoiceNumber: 1,
  posInvoiceSeriesMode: 'UNIFIED',
  posInvoicePrefix: '',
  nextPosInvoiceNumber: 1,
  defaultTerms: '1. Goods once sold will not be taken back or exchanged.\n2. Interest @ 18% p.a. will be charged if payment is not received within due date.\n3. Subject to local jurisdiction only.',
  defaultNotes: 'Thank you for your valued business!',
  enableEinvoice: true,
  enableEwayBill: true,
  einvoiceThresholdCr: 5,
  signatoryName: 'Authorised Signatory',
  signatoryDesignation: 'Authorised Signatory / Director',
  showSignatureOnInvoice: true,
  showLogoOnInvoice: true,
  logoShape: 'rounded',
  signatureUrl: DEFAULT_SIGNATURE_DATA_URL,
  bottomNavConfig: DEFAULT_BOTTOM_NAV_CONFIG,
  headerConfig: DEFAULT_HEADER_CONFIG,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  lowStockSettings: DEFAULT_LOW_STOCK_SETTINGS,
  sessionTimeoutSettings: DEFAULT_SESSION_TIMEOUT_CONFIG,
  biometricSettings: DEFAULT_BIOMETRIC_CONFIG,
  dispatchSettings: DEFAULT_DISPATCH_SETTINGS,
  itemLineSettings: {
    enableDescription: true,
    enableSerialNumber: true,
    enableWarranty: true,
    enableBatchNumber: true,
    enableExpiryDate: true,
    serialNumberLabel: 'Sr. No. / IMEI',
    warrantyLabel: 'Warranty',
    defaultWarranty: '1 Year Comprehensive',
    warrantyOptions: [
      'No Warranty',
      '6 Months Replacement',
      '1 Year Comprehensive',
      '2 Years Onsite',
      '3 Years Limited Warranty',
      '5 Years Manufacturer Warranty'
    ],
    descriptionPlaceholder: 'e.g. Model specs, serial number, or warranty...',
    showOnPrint: {
      description: true,
      serialNumber: true,
      warranty: true,
      batchNumber: true,
    }
  }
};

export const cleanDefaultAdminUser: AppUser = {
  id: 'usr-admin-1',
  name: 'Business Administrator',
  email: 'admin@mybusiness.in',
  phone: '+91 98000 00000',
  role: 'ADMIN',
  roleTitle: 'Primary Administrator',
  department: 'Executive Management',
  avatarBg: 'bg-indigo-600',
  avatarText: 'BA',
  password: 'admin',
  pin: '1111',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLogin: '2026-08-20T09:00:00.000Z',
};

export const cleanDefaultUsers: AppUser[] = [
  cleanDefaultAdminUser
];

export const cleanDefaultAccountHeads: AccountHead[] = [
  { id: 'acc-1', code: '1000', name: 'Cash in Hand', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-2', code: '1010', name: 'Main Current Bank Account', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-3', code: '1020', name: 'Sundry Debtors (Accounts Receivable)', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-4', code: '1030', name: 'Stock in Trade (Inventory)', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-5', code: '1040', name: 'Input Tax Credit (ITC) CGST', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-6', code: '1050', name: 'Input Tax Credit (ITC) SGST', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-7', code: '1060', name: 'Input Tax Credit (ITC) IGST', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-8', code: '2000', name: 'Sundry Creditors (Accounts Payable)', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-9', code: '2010', name: 'Output Tax Liability CGST', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-10', code: '2020', name: 'Output Tax Liability SGST', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-11', code: '2030', name: 'Output Tax Liability IGST', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-12', code: '3000', name: 'Capital Account (Owner Equity)', category: 'EQUITY', balance: 0, isSystem: true },
  { id: 'acc-13', code: '3010', name: 'Retained Earnings', category: 'EQUITY', balance: 0, isSystem: true },
  { id: 'acc-14', code: '4000', name: 'Sales Revenue (Goods & Services)', category: 'INCOME', balance: 0, isSystem: true },
  { id: 'acc-15', code: '5000', name: 'Cost of Goods Sold (Purchases)', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-16', code: '5010', name: 'Rent & Office Expenses', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-17', code: '5020', name: 'Freight & Courier Outward', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-18', code: '5030', name: 'Utility & Electricity Expenses', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-19', code: '5040', name: 'Salaries & Staff Benefits', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-20', code: '5050', name: 'Bank Charges & Gateway Fees', category: 'EXPENSE', balance: 0, isSystem: true }
];

export const normalizeBusinessProfile = (profile?: Partial<BusinessProfile> | null): BusinessProfile => {
  const base = cleanDefaultBusinessProfile;
  if (!profile) return base;

  const itemLineSettings = {
    ...base.itemLineSettings!,
    ...(profile.itemLineSettings || {}),
    showOnPrint: {
      ...base.itemLineSettings!.showOnPrint,
      ...(profile.itemLineSettings?.showOnPrint || {})
    }
  };

  const rawBottomNav = profile.bottomNavConfig || base.bottomNavConfig;
  const bottomNavConfig = {
    ...base.bottomNavConfig!,
    ...(rawBottomNav || {}),
    showQuickActionCenter: typeof rawBottomNav?.showQuickActionCenter === 'boolean'
      ? rawBottomNav.showQuickActionCenter
      : false,
    tabs: rawBottomNav?.tabs && Array.isArray(rawBottomNav.tabs) && rawBottomNav.tabs.length > 0
      ? rawBottomNav.tabs.map((tab, idx) => ({
          id: tab.id,
          label: tab.label || '',
          customLabel: tab.customLabel || '',
          isEnabled: typeof tab.isEnabled === 'boolean' ? tab.isEnabled : true,
          order: typeof tab.order === 'number' ? tab.order : idx
        }))
      : base.bottomNavConfig!.tabs,
    quickActionItems: Array.isArray(rawBottomNav?.quickActionItems)
      ? rawBottomNav.quickActionItems
      : base.bottomNavConfig!.quickActionItems
  };

  return {
    ...base,
    ...profile,
    nextInvoiceNumber: Math.max(1, parseInt(String(profile.nextInvoiceNumber ?? base.nextInvoiceNumber), 10) || 1),
    signatureUrl: normalizeSignatureUrl(profile.signatureUrl || base.signatureUrl),
    showSignatureOnInvoice: profile.showSignatureOnInvoice !== false,
    showLogoOnInvoice: profile.showLogoOnInvoice !== false,
    logoShape: (profile.logoShape === 'circle' || profile.logoShape === 'square' || profile.logoShape === 'rounded') ? profile.logoShape : (base.logoShape || 'rounded'),
    itemLineSettings,
    bottomNavConfig,
    headerConfig: normalizeHeaderConfig(profile.headerConfig || base.headerConfig),
    footerConfig: normalizeFooterConfig(profile.footerConfig || base.footerConfig),
    lowStockSettings: normalizeLowStockSettings(profile.lowStockSettings || base.lowStockSettings),
    sessionTimeoutSettings: normalizeSessionTimeoutConfig(profile.sessionTimeoutSettings || base.sessionTimeoutSettings),
    biometricSettings: normalizeBiometricConfig(profile.biometricSettings || base.biometricSettings),
    dispatchSettings: normalizeDispatchSettings(profile.dispatchSettings || base.dispatchSettings)
  };
};

