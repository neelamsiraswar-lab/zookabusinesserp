import { LetterheadDocument, LetterheadTemplate } from './letterhead';

export type InvoiceType = 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'QUOTATION' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'POS_SALE';

export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHEQUE' | 'MIXED';

export type GstTaxRate = 0 | 5 | 12 | 18 | 28;

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  serialNumber?: string; // Sr. No. / IMEI / MAC of product
  warranty?: string; // Warranty details e.g. 1 Year, 6 Months, 3 Years Onsite
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: GstTaxRate;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate?: number;
  cessAmount?: number;
  totalAmount: number;
  originalPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface EInvoiceDetails {
  irn: string;
  ackNo: string;
  ackDate: string;
  signedQrCode: string;
  signedInvoice?: string;
  status: 'GENERATED' | 'CANCELLED' | 'PENDING' | 'FAILED';
  cancelReason?: 'DUPLICATE' | 'DATA_ENTRY_ERROR' | 'ORDER_CANCELLED' | 'OTHER';
  cancelRemarks?: string;
  cancelledAt?: string;
  generatedAt?: string;
}

export interface EWayBillDetails {
  ewayBillNo: string;
  ewayBillDate: string;
  validUpto: string;
  transporterId?: string;
  transporterName?: string;
  transporterDocNo?: string;
  transporterDocDate?: string;
  vehicleNo?: string;
  vehicleType?: 'REGULAR' | 'OVER_DIMENSIONAL_CARGO';
  distanceKm: number;
  mode: 'ROAD' | 'RAIL' | 'AIR' | 'SHIP';
  supplyType: 'OUTWARD' | 'INWARD';
  subSupplyType: 'SUPPLY' | 'EXPORT' | 'JOB_WORK' | 'SKD_CKD' | 'RECIPIENT_NOT_KNOWN' | 'FOR_OWN_USE' | 'EXHIBITION' | 'LINE_SALES' | 'OTHERS';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  
  // Seller (Current business snapshot at invoice time)
  sellerGstin: string;
  sellerStateCode: string;
  sellerState: string;
  
  // Customer details
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerPan?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress: string;
  customerCity?: string;
  customerState: string;
  customerStateCode: string;
  customerPincode?: string;
  
  // Shipping details
  hasDifferentShippingAddress?: boolean;
  shippingName?: string;
  shippingAddress?: string;
  shippingState?: string;
  shippingStateCode?: string;
  shippingPincode?: string;
  
  // Place of supply & Tax calculation
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  isInterState: boolean;
  isReverseCharge: boolean;
  isEcommerceSupply?: boolean;
  ecommerceGstin?: string;
  
  // Line items
  items: InvoiceItem[];
  
  // Totals
  subTotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalDiscount: number;
  roundOff: number;
  grandTotal: number;
  
  // Payment info
  amountPaid: number;
  amountDue: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentsList?: {
    id: string;
    date: string;
    amount: number;
    method: PaymentMethod;
    notes?: string;
  }[];

  // E-Invoice & E-Way Bill
  isEinvoiceGenerated?: boolean;
  einvoice?: EInvoiceDetails;
  isEwayBillGenerated?: boolean;
  ewayBill?: EWayBillDetails;
  
  // Meta
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category: string;
  hsnCode: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: GstTaxRate;
  cessRate?: number;
  currentStock: number;
  minStockAlert: number;
  batches?: {
    batchNumber: string;
    mfgDate: string;
    expiryDate: string;
    stock: number;
    mrp: number;
  }[];
  isService?: boolean;
  createdAt: string;
}

export interface Party {
  id: string;
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  name: string;
  companyName?: string;
  gstin?: string;
  pan?: string;
  phone: string;
  email?: string;
  billingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  creditLimit?: number;
  creditPeriodDays?: number;
  currentBalance: number; // Positive = Receivable (Debtor), Negative = Payable (Creditor)
  openingBalance?: number;
  createdAt: string;
}

export interface PurchaseBillItem {
  id: string;
  productId?: string;
  name: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  gstRate: GstTaxRate;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorAddress?: string;
  vendorCity?: string;
  vendorState?: string;
  vendorStateCode?: string;
  billDate: string;
  dueDate: string;
  status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';
  isInterState: boolean;
  items: PurchaseBillItem[];
  subTotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  itcEligibility: 'ELIGIBLE_ALL' | 'ELIGIBLE_CAPITAL_GOODS' | 'INELIGIBLE_17_5' | 'OTHER';
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  payee: string;
  amount: number;
  gstRate: GstTaxRate;
  gstAmount: number;
  hasGstBill: boolean;
  vendorGstin?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  referenceNo?: string;
  createdAt: string;
}

export type PaymentType = 'PAYMENT_IN' | 'PAYMENT_OUT' | 'CONTRA_TRANSFER';

export interface PaymentRecord {
  id: string;
  voucherNumber: string;
  type: PaymentType;
  date: string;
  partyId?: string;
  partyName: string;
  partyType?: 'CUSTOMER' | 'VENDOR';
  amount: number;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNo?: string;
  chequeDate?: string;
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  linkedBillId?: string;
  linkedBillNumber?: string;
  fromAccount?: string;
  toAccount?: string;
  notes?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  chequeId?: string;
  lines: {
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
  createdAt: string;
}

// -------------------------------------------------------------
// Cheque Printing & Management System Models (CTS-2010 Standard)
// -------------------------------------------------------------

export type ChequeType = 'PAYMENT_OUT' | 'PAYMENT_IN' | 'SELF_CASH';
export type ChequeStatus = 'DRAFT' | 'ISSUED' | 'PRINTED' | 'CLEARED' | 'CANCELLED' | 'BOUNCED';

export interface ChequeClearancePayload {
  clearedAt: string;
  clearanceReference?: string; // UTR or Bank Ref
  clearanceNotes?: string;
}

export interface ChequeBouncePayload {
  bouncedAt: string;
  bouncedReason: string;
  bouncedReasonCode?: string; // CTS Return Code e.g. "01", "10", "02"
  bouncedMemoRef?: string; // Bank Return Memo Number
  bouncedPenaltyFee?: number; // Bank charges / penalty e.g. 250 / 500
  reverseLinkedInvoice?: boolean; // Reverse linked invoice/payment status
  autoRecordPenaltyExpense?: boolean; // Automatically log penalty fee in Expenses
}

export interface ChequeRecord {
  id: string;
  chequeNumber: string; // e.g. "004821" (6-digit CTS-2010 format)
  chequeDate: string; // YYYY-MM-DD
  payeeName: string; // Party name or "Yourself / Cash"
  partyId?: string; // Linked Customer or Vendor
  partyName?: string;
  partyType?: 'CUSTOMER' | 'VENDOR' | 'OTHER';
  partyPhone?: string;
  amount: number;
  amountInWords?: string; // e.g. "Rupees Forty-Five Thousand Eight Hundred and Fifty Only"
  bankAccountId?: string;
  bankName: string; // e.g. "HDFC Bank", "State Bank of India", "ICICI Bank"
  accountNumber: string;
  chequeType: ChequeType;
  status: ChequeStatus;
  isAccountPayeeOnly: boolean; // "A/C PAYEE ONLY" top-left crossing
  isNonNegotiable?: boolean;
  strikeBearer: boolean; // Strike out "Or Bearer"
  memo?: string;
  billReference?: string; // Reference to invoice/bill/order
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  linkedBillId?: string;
  linkedBillNumber?: string;
  linkedPaymentId?: string; // Automatically created PaymentRecord ID
  linkedJournalEntryId?: string; // Automatically created JournalEntry ID
  templateConfigId?: string; // Template used for coordinate positioning
  signatoryText?: string; // e.g. "For ACME ENTERPRISES PVT LTD"
  printedAt?: string;
  clearedAt?: string;
  clearanceReference?: string;
  clearanceNotes?: string;
  bouncedAt?: string;
  bouncedReason?: string;
  bouncedReasonCode?: string;
  bouncedMemoRef?: string;
  bouncedPenaltyFee?: number;
  reminderSentAt?: string;
  depositDate?: string;
  autoPostLedger: boolean; // Auto creates ledger & accounting entries
  createdAt: string;
  updatedAt?: string;
}

export interface ChequeBook {
  id: string;
  bankAccountId?: string;
  bankName: string;
  accountNumber: string;
  seriesPrefix?: string;
  startChequeNo: string; // e.g. "000101"
  endChequeNo: string; // e.g. "000200"
  totalLeaves: number;
  currentChequeNo: string; // Next available cheque number
  status: 'ACTIVE' | 'EXHAUSTED' | 'ARCHIVED';
  notes?: string;
  createdAt: string;
}

export interface ChequeTemplateConfig {
  id: string;
  name: string;
  bankPreset: string; // 'HDFC' | 'SBI' | 'ICICI' | 'AXIS' | 'PNB' | 'KOTAK' | 'BOB' | 'CANARA' | 'UNIVERSAL_CTS2010' | 'CUSTOM'
  widthMm: number; // Standard CTS-2010 is 203mm
  heightMm: number; // Standard CTS-2010 is 93mm
  // Coordinate positions in Millimeters (mm) from Top-Left corner of cheque
  datePositions: {
    mode: 'BOXES' | 'CONTINUOUS'; // CTS-2010 has 8 individual boxes for DD MM YYYY
    xMm: number;
    yMm: number;
    boxSpacingMm: number; // Spacing between individual digit boxes
    fontSizePt: number;
    letterSpacingMm: number;
  };
  payeePositions: {
    xMm: number;
    yMm: number;
    maxWidthMm: number;
    fontSizePt: number;
    prefixStars: boolean;
  };
  amountInWordsPositions: {
    line1: { xMm: number; yMm: number; maxWidthMm: number };
    line2: { xMm: number; yMm: number; maxWidthMm: number };
    fontSizePt: number;
    lineHeightMm: number;
    prefixRupees: boolean;
    suffixOnly: boolean;
  };
  amountInFiguresPositions: {
    xMm: number;
    yMm: number;
    fontSizePt: number;
    prefixStars: boolean;
    suffixSlash: boolean;
  };
  accountPayeePositions: {
    xMm: number;
    yMm: number;
    rotationDeg: number;
    text: string;
  };
  bearerPositions: {
    xMm: number;
    yMm: number;
    strikeOut: boolean;
  };
  signatoryPositions: {
    xMm: number;
    yMm: number;
    showCompanyName: boolean;
    fontSizePt: number;
  };
  printerOffset: {
    topOffsetMm: number;
    leftOffsetMm: number;
  };
  isDefault?: boolean;
}

export interface AccountHead {
  id: string;
  code: string;
  name: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  subCategory?: string;
  openingBalance?: number;
  openingBalanceType?: 'Dr' | 'Cr';
  description?: string;
  balance: number;
  isSystem?: boolean;
}

export type LowStockBehavior = 'WARN' | 'BLOCK' | 'ALLOW';

export interface LowStockSettings {
  enabled: boolean; // Master toggle for low stock alert subsystem
  defaultThreshold: number; // Default low stock alert threshold for items when individual alert is 0 or unset (e.g. 5 or 10)
  criticalStockThreshold: number; // Critical threshold (e.g., 2 units) for severe red alerts
  allowNegativeStock: boolean; // Allow sales/POS billing when stock is 0 or negative
  negativeStockBehavior: LowStockBehavior; // Behavior during invoicing / POS when stock is insufficient ('BLOCK' | 'WARN' | 'ALLOW')
  blockBillingOnOutOfStock?: boolean; // Quick flag to block billing when stock is <= 0
  warnOnLowStockBilling?: boolean; // Quick flag to display warning toasts when billing low stock
  showLowStockBadge: boolean; // Show alert badges on Header, Sidebar, and Mobile Nav
  showDashboardBanner: boolean; // Show prominent low stock / reorder warning card on Dashboard
  autoReorderSuggestions: boolean; // Auto generate recommended purchase order quantities in purchase bills / reports
  defaultReorderMultiplier: number; // Default replenishment unit multiplier (e.g., 20 or 50)
  notifyOnBilling: boolean; // Trigger real-time alert toast when item reaching threshold is invoiced
  emailAlertDigest?: boolean; // Periodic summary digest simulation
}

export interface Company {
  id: string;
  name: string;
  tradeName: string;
  gstin: string;
  pan: string;
  businessType?: string;
  state: string;
  stateCode: string;
  city: string;
  address: string;
  pincode: string;
  phone: string;
  email: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  financialYear: string;
  currency: string;
  currencySymbol: string;
  logoUrl?: string;
  showLogoOnInvoice?: boolean;
  logoShape?: 'square' | 'circle' | 'rounded';
  themeColor?: string;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  isActive?: boolean; // Controls whether this business is enabled or disabled
  disabledReason?: string; // Reason when disabled by Super Admin
  headerConfig?: HeaderConfig;
  footerConfig?: FooterConfig;
  lowStockSettings?: LowStockSettings;
  sessionTimeoutSettings?: SessionTimeoutConfig;
  biometricSettings?: BiometricSecurityConfig;
  dispatchSettings?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceLineSettings {
  enableDescription: boolean;
  enableSerialNumber: boolean;
  enableWarranty: boolean;
  enableBatchNumber: boolean;
  enableExpiryDate: boolean;
  serialNumberLabel: string; // e.g. "Sr. No." or "Sr. No. / IMEI"
  warrantyLabel: string; // e.g. "Warranty"
  defaultWarranty: string; // e.g. "1 Year Comprehensive"
  warrantyOptions: string[]; // List of presets: "No Warranty", "6 Months Replacement", "1 Year Comprehensive", "2 Years Onsite", "3 Years Limited"
  descriptionPlaceholder: string;
  showOnPrint: {
    description: boolean;
    serialNumber: boolean;
    warranty: boolean;
    batchNumber: boolean;
  };
}

export type StandardTemplateId = 
  | 'CENTERED_CLEAN_BLACK'
  | 'TRADE_CLASSIC_TM'
  | 'OFFICIAL_GST' 
  | 'MODERN_CLEAN' 
  | 'CLASSIC_TALLY'
  | 'EMERALD_PHARMA' 
  | 'ROYAL_SAPPHIRE' 
  | 'VIBRANT_SUNSET' 
  | 'MINIMAL_MONO' 
  | 'RUBY_CRIMSON' 
  | 'COMPACT_DENSE' 
  | 'THERMAL_POS'
  | 'CREATIVE_LUXE'
  | 'CORPORATE_TEAL';

export interface InvoiceTemplateConfig {
  id: string;
  name: string;
  category: 'STANDARD' | 'CUSTOM' | 'POS';
  description: string;
  badge?: string;
  themeColor: string; // Primary accent color (hex or tailwind base)
  secondaryColor?: string;
  headerColor?: string;
  textColor?: string;             // Primary / Body text color
  headingTextColor?: string;      // Business Name, Main Headings & Section Titles text color
  tableHeaderTextColor?: string;  // Line items table header row text color
  accentTextColor?: string;       // Accent / Highlights / Key metadata labels text color
  mutedTextColor?: string;        // Muted / Captions / Secondary text color
  headerStyle: 'BANNER' | 'MODERN_SPLIT' | 'CENTERED' | 'MINIMAL_BORDERED' | 'THERMAL' | 'TRADE_CLASSIC';
  fontFamily: 'sans' | 'serif' | 'mono';
  tableStyle: 'BORDERED' | 'STRIPED' | 'MINIMAL' | 'BOXED';
  showLogo: boolean;
  logoShape?: 'square' | 'circle' | 'rounded';
  showPaymentMode?: boolean;
  showCashDetails?: boolean;
  showUpiQr: boolean;
  showBankDetails: boolean;
  showSignature: boolean;
  showTerms: boolean;
  showNotes: boolean;
  showAmountInWords: boolean;
  showHsnSummaryTable: boolean;
  showCopyTypeBadge: boolean;
  showSerialNumber: boolean;
  showWarranty: boolean;
  showDescription: boolean;
  showBatchNumber: boolean;
  plainTextPayment?: boolean;
  cleanTableHeaders?: boolean;
  allBlackTypography?: boolean;
  watermarkText?: string;
  headerTagline?: string;
  footerDeclaration?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export type HeaderStyle = 'GLASS' | 'SOLID' | 'BORDERED' | 'MINIMAL' | 'FLOATING';
export type HeaderDensity = 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS';
export type HeaderSearchStyle = 'EXPANDED' | 'COMPACT' | 'PILL' | 'MINIMAL';

export interface HeaderConfig {
  enabled?: boolean;
  style: HeaderStyle;
  density: HeaderDensity;
  
  // Branding & Identity Display
  showLogo: boolean;
  logoShape?: 'square' | 'circle' | 'rounded';
  showTradeName: boolean;
  showLegalName: boolean;
  showGstin: boolean;
  showStateBadge: boolean;
  showLocation: boolean;
  showFinancialYear: boolean;
  customTitle?: string;
  customSubtitle?: string;
  
  // Universal Search
  showSearch: boolean;
  searchStyle: HeaderSearchStyle;
  searchPlaceholder?: string;
  
  // Quick Action CTAs
  showNewInvoiceBtn: boolean;
  newInvoiceBtnText?: string;
  showQuickPosBtn: boolean;
  quickPosBtnText?: string;
  showQuickExpenseBtn: boolean;
  showQuickPaymentBtn: boolean;
  
  // System Tools & Status
  showCloudSyncBadge: boolean;
  showThemeToggle: boolean;
  showFullScreenBtn?: boolean;
  showSidebarToggle?: boolean;
  showNotificationBell: boolean;
  showUserPersona: boolean;
  
  // Layout & Visual Styling
  customAccentColor?: 'auto' | 'indigo' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'slate' | 'cyan';
  showBorderBottom: boolean;
  shadow: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  sticky: boolean;
}

export type FooterStyle = 'CLASSIC' | 'MINIMAL' | 'DETAILED' | 'FLOATING' | 'GRADIENT' | 'MODERN_CARD';
export type FooterDensity = 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS';

export interface FooterQuickLink {
  id: string;
  label: string;
  tabId: string; // e.g. 'dashboard', 'invoices', 'inventory', 'pos_billing', 'gst_returns', 'reports', 'settings'
  isEnabled: boolean;
}

export interface FooterBadge {
  id: string;
  label: string;
  tooltip?: string;
  iconName?: 'shield' | 'lock' | 'award' | 'server' | 'check' | 'zap';
  isEnabled: boolean;
}

export interface FooterConfig {
  enabled?: boolean;
  style: FooterStyle;
  density: FooterDensity;
  
  // Branding & Copyright
  showBranding: boolean;
  customBrandName?: string;
  customTagline?: string;
  copyrightText?: string; // Supports variables {year}, {companyName}, {gstin}
  showMadeWithLove: boolean;
  customBottomNote?: string;

  // Business Credentials & Tax Compliance
  showGstin: boolean;
  showStateCode: boolean;
  showFinancialYear: boolean;
  showSecurityBadges: boolean;
  badges?: FooterBadge[];

  // Contact & Support Details
  showContactInfo: boolean;
  showPhone: boolean;
  customPhone?: string;
  showEmail: boolean;
  customEmail?: string;
  showAddress: boolean;
  customAddress?: string;
  supportHoursText?: string;

  // Quick App Navigation Links
  showQuickLinks: boolean;
  quickLinksTitle?: string;
  quickLinks?: FooterQuickLink[];

  // System Tools & Status
  showVersion: boolean;
  versionText?: string;
  showCloudSyncStatus: boolean;
  showSuperAdminPortalBadge?: boolean;
  showScrollToTop?: boolean;

  // Layout & Visual Styling
  customAccentColor?: 'auto' | 'indigo' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'slate' | 'cyan';
  showBorderTop: boolean;
  shadow: 'none' | 'xs' | 'sm' | 'md' | 'lg';
}

export type BottomNavStyle = 'LIQUID_GLASS' | 'FLOATING_PILL' | 'CLASSIC_DOCKED' | 'MODERN_CURVED' | 'COMPACT_SLIM';

export interface BottomNavTabItem {
  id: string; // matches ActiveTab
  label: string; // Display label
  customLabel?: string; // Optional user customized label
  isEnabled: boolean;
  order: number;
}

export type QuickActionType = 'invoice' | 'pos' | 'payment_in' | 'payment_out' | 'product' | 'party' | 'expense';

export interface BottomNavConfig {
  enabled: boolean;
  style: BottomNavStyle;
  showLabels: boolean;
  showBadges: boolean;
  showQuickActionCenter: boolean;
  centerActionIcon?: string;
  quickActionItems?: QuickActionType[];
  showMoreDrawerButton: boolean;
  tabs: BottomNavTabItem[];
  color?: string; // 'auto' | 'indigo' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'cyan' | 'slate'
}

export interface BusinessProfile {
  name: string;
  tradeName: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  tagline?: string;
  website?: string;
  logoUrl?: string;
  showLogoOnInvoice?: boolean;
  logoShape?: 'square' | 'circle' | 'rounded';
  signatureUrl?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  showSignatureOnInvoice?: boolean;
  currency: string;
  currencySymbol: string;
  
  // Banking
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  
  // Invoice settings
  invoicePrefix: string;
  nextInvoiceNumber: number;
  posInvoiceSeriesMode?: 'UNIFIED' | 'SEPARATE';
  posInvoicePrefix?: string;
  nextPosInvoiceNumber?: number;
  defaultTerms: string;
  defaultNotes: string;
  enableEinvoice: boolean;
  enableEwayBill: boolean;
  einvoiceThresholdCr: number; // e.g. 5 Cr
  itemLineSettings?: InvoiceLineSettings;
  defaultTemplateId?: string;
  customTemplates?: InvoiceTemplateConfig[];
  bottomNavConfig?: BottomNavConfig;
  headerConfig?: HeaderConfig;
  footerConfig?: FooterConfig;
  lowStockSettings?: LowStockSettings;
  sessionTimeoutSettings?: SessionTimeoutConfig;
  biometricSettings?: BiometricSecurityConfig;
  dispatchSettings?: any;
  themeColor?: string;
}

export interface BiometricCredentialInfo {
  id: string;
  rawId: string;
  type: string;
  createdAt: string;
  deviceName?: string;
  authenticatorAttachment?: 'platform' | 'cross-platform';
}

export interface BiometricSecurityConfig {
  enabled: boolean;
  registered: boolean;
  credential?: BiometricCredentialInfo | null;
  requireForAccounting: boolean;        // Lock General Ledger, Trial Balance, P&L, Balance Sheet
  requireForJournalEntries: boolean;    // Prompt before posting/editing/deleting manual Journal Entries
  requireForAccountHeads: boolean;      // Prompt before creating/editing/deleting Chart of Account Heads
  requireForBankStatements: boolean;    // Prompt before bank statement auto-reconcile/ledger imports
  requireForSensitiveExports: boolean;  // Prompt before exporting financial balance sheets or tax ledgers
  requireForPaymentsOut: boolean;       // Prompt before high-value payment out vouchers
  payoutThresholdAmount: number;        // Threshold above which payment out requires biometric verification (e.g. ₹10,000)
  sessionUnlockDurationMinutes: number; // Duration (in mins) before re-prompting (0 = prompt every transaction, 15 = 15m session grace)
  fallbackPin?: string;                 // 6-digit backup security PIN
  fallbackPinHint?: string;             // Hint for PIN
  exemptSuperAdmin?: boolean;           // Bypass if super admin
}

export type IdleSessionTimeoutAction = 'logout' | 'lock';

export interface SessionTimeoutConfig {
  enabled: boolean;
  timeoutMinutes: number;
  action: IdleSessionTimeoutAction;
  showWarningModal: boolean;
  warningSeconds: number;
  exemptAdmin?: boolean;
}

export interface StateCodeMap {
  code: string;
  name: string;
}

// User Roles & Permissions (RBAC)
export type RoleType = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'SALESPERSON' | 'INVENTORY_MANAGER' | 'AUDITOR' | 'CUSTOM';

export interface UserPermissions {
  dashboard: {
    view: boolean;
    viewFinancialMetrics: boolean;
    exportReports: boolean;
  };
  invoices: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    generateIRN: boolean;
    cancelInvoice: boolean;
    printDownload: boolean;
  };
  pos_billing: {
    view: boolean;
    createSale: boolean;
    giveCustomDiscount: boolean;
    reprintReceipt: boolean;
  };
  payments: {
    view: boolean;
    recordPaymentIn: boolean;
    recordPaymentOut: boolean;
    recordContra: boolean;
    deletePayment: boolean;
  };
  inventory: {
    view: boolean;
    viewPurchaseCost: boolean;
    createProduct: boolean;
    editProduct: boolean;
    deleteProduct: boolean;
    adjustStock: boolean;
  };
  parties: {
    viewCustomers: boolean;
    viewVendors: boolean;
    createParty: boolean;
    editParty: boolean;
    deleteParty: boolean;
    viewLedgerStatement: boolean;
    bulkImport: boolean;
  };
  purchases: {
    view: boolean;
    createBill: boolean;
    editBill: boolean;
    deleteBill: boolean;
    viewITCReports: boolean;
  };
  accounting: {
    viewJournals: boolean;
    createJournal: boolean;
    viewChartOfAccounts: boolean;
    viewBalanceSheet: boolean;
    viewProfitAndLoss: boolean;
    viewTrialBalance: boolean;
  };
  gst_returns: {
    view: boolean;
    viewGstr1: boolean;
    viewGstr3b: boolean;
    viewTaxRegisters: boolean;
    exportGstJson: boolean;
  };
  settings: {
    view: boolean;
    editCompanyProfile: boolean;
    editBankAndUPI: boolean;
    manageUsersAndRoles: boolean;
    backupAndRestore: boolean;
    resetDatabase: boolean;
  };
}

export interface SuperAdminAuthData {
  name: string;
  email: string;
  phone: string;
  roleTitle: string;
  department: string;
  avatarBg?: string;
  avatarText?: string;
  password: string;
  pin: string;
  lastChanged?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: RoleType;
  roleTitle?: string;
  department: string;
  avatarBg: string;
  avatarText: string;
  isActive: boolean;
  password?: string;
  pin?: string;
  customPermissions?: Partial<UserPermissions>;
  createdAt: string;
  lastLogin?: string;
}

export interface RoleDefinition {
  id: RoleType;
  name: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  isSystem: boolean;
  defaultPermissions: UserPermissions;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: RoleType;
  action: string;
  module: string;
  details: string;
}

export type BankEntryClassification = 
  | 'PAYMENT_IN' 
  | 'PAYMENT_OUT' 
  | 'EXPENSE' 
  | 'CONTRA_TRANSFER' 
  | 'JOURNAL_ENTRY' 
  | 'IGNORE';

export interface BankStatementAutoEntry {
  id: string;
  date: string;
  rawDate?: string;
  narration: string;
  referenceNo?: string;
  chequeNo?: string;
  withdrawalAmount: number; // Dr
  depositAmount: number;    // Cr
  closingBalance?: number;
  
  // Inferred or user-assigned classification
  entryType: BankEntryClassification;
  paymentMethod: PaymentMethod;
  
  // Party mapping
  partyId?: string;
  partyName?: string;
  partyType?: 'CUSTOMER' | 'VENDOR';
  
  // Expense categorization
  expenseCategory?: string;
  
  // Contra accounts (e.g. Cash in Hand <-> Bank Account)
  fromAccount?: string;
  toAccount?: string;
  
  // Ledger Head for Direct Journal / Tax / Interest
  contraAccountId?: string;
  contraAccountName?: string;
  
  // Matched invoices or bills
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  linkedBillId?: string;
  linkedBillNumber?: string;
  
  notes?: string;
  status: 'VALID' | 'WARNING' | 'DUPLICATE' | 'IGNORED';
  matchReason?: string;
  validationMessage?: string;
  selected?: boolean;
}

export interface BankStatementImportResult {
  totalRows: number;
  importedCount: number;
  paymentsInCreated: number;
  paymentsOutCreated: number;
  expensesCreated: number;
  contraCreated: number;
  journalsCreated: number;
  partiesCreated: number;
}

export interface CustomHsnCode {
  id: string;
  code: string;
  description: string;
  type: 'HSN' | 'SAC';
  gstRate: GstTaxRate;
  uqc?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface JwtSessionInfo {
  token: string;
  sub: string;
  name: string;
  email: string;
  role: RoleType;
  department?: string;
  companyId: string;
  companyName: string;
  companyGstin: string;
  issuedAt: string;
  expiresAt: string;
  expiresInSeconds: number;
  isValid: boolean;
  isExpired: boolean;
  jti: string;
}

// System Snapshot & Automated Backup Types
export type SystemSnapshotTrigger = 
  | 'SCHEDULED_AUTO' 
  | 'MANUAL_EXPORT' 
  | 'PRE_RESTORE_RECOVERY' 
  | 'PRE_IMPORT' 
  | 'PERIODIC_VAULT';

export interface SystemSnapshotMetadata {
  id: string;
  timestamp: string;
  label: string;
  triggerType: SystemSnapshotTrigger;
  appName: string;
  version: string;
  companiesCount: number;
  invoicesCount: number;
  productsCount: number;
  partiesCount: number;
  paymentsCount: number;
  expensesCount: number;
  purchaseBillsCount: number;
  journalEntriesCount: number;
  chequesCount: number;
  usersCount: number;
  sizeBytes: number;
  fileChecksum?: string;
}

export interface SystemSnapshotPayload {
  metadata: SystemSnapshotMetadata;
  companies: Company[];
  business: BusinessProfile;
  invoices: Invoice[];
  products: Product[];
  parties: Party[];
  purchaseBills: PurchaseBill[];
  payments: PaymentRecord[];
  expenses: Expense[];
  accountHeads: AccountHead[];
  journalEntries: JournalEntry[];
  users: AppUser[];
  cheques?: ChequeRecord[];
  chequeBooks?: ChequeBook[];
  chequeTemplates?: ChequeTemplateConfig[];
  customHsnCodes?: CustomHsnCode[];
  letterheadDocuments?: LetterheadDocument[];
  letterheadTemplates?: LetterheadTemplate[];
  exportedAt: string;
  appName: string;
  version?: string;
}

export * from './letterhead';

export interface AutoSnapshotConfig {
  enabled: boolean;
  intervalHours: 1 | 4 | 12 | 24;
  autoDownloadJson: boolean;
  maxVaultSnapshots: number;
  createSafetyPointOnRestore: boolean;
  lastSnapshotTimestamp?: string;
  nextScheduledSnapshotTimestamp?: string;
}

export type AnnouncementType = 'feature' | 'info' | 'alert' | 'maintenance';

export interface PlatformAnnouncement {
  id: string;
  enabled: boolean;
  title: string;
  message: string;
  badgeText: string;
  type: AnnouncementType;
  actionLabel?: string;
  actionTab?: string;
  actionUrl?: string;
  learnMoreContent?: string;
  dismissible: boolean;
  targetAudience: 'ALL' | 'ADMINS_ONLY';
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformConfig {
  appName: string;
  appTagline: string;
  appLogoType: 'icon' | 'image';
  appLogoIcon: string;
  appLogoUrl?: string;
  appLogoGradient: string;
  brandBadgeText: string;
  brandColorTheme?: string;
  announcement: PlatformAnnouncement;
  lastUpdatedBy?: string;
  updatedAt?: string;
}
