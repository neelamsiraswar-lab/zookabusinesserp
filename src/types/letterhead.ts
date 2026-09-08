export type LetterCategory = 
  | 'OFFICIAL_LETTER' 
  | 'PROPOSAL_QUOTATION' 
  | 'HR_EMPLOYMENT' 
  | 'AUTHORIZATION_RESOLUTION' 
  | 'PAYMENT_REMINDER' 
  | 'WARRANTY_CERTIFICATE' 
  | 'NOC_DECLARATION' 
  | 'CUSTOM';

export type LetterStatus = 'DRAFT' | 'FINALIZED' | 'ISSUED' | 'ARCHIVED';

export type LetterheadHeaderStyle = 
  | 'MODERN_SPLIT' 
  | 'CLASSIC_OFFICIAL' 
  | 'CENTERED_ELEGANT' 
  | 'MINIMAL_ACCENT' 
  | 'BANNER_FULL' 
  | 'LEFT_BRAND';

export type LetterheadFooterStyle = 
  | 'CLASSIC_SIGNATORY' 
  | 'MODERN_SPLIT' 
  | 'MINIMAL_LEGAL' 
  | 'COMPACT_BAR' 
  | 'NONE';

export interface LetterheadTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  
  // Header configuration
  headerStyle: LetterheadHeaderStyle;
  showLogo: boolean;
  logoPosition: 'LEFT' | 'CENTER' | 'RIGHT';
  logoHeightPx: number;
  showCompanyName: boolean;
  showTradeName: boolean;
  showTagline: boolean;
  customTagline?: string;
  showGstin: boolean;
  showPan: boolean;
  showCin?: boolean;
  cinNumber?: string;
  showAddress: boolean;
  customAddress?: string;
  showContact: boolean; // Phone, Email, Website
  
  // Watermark
  showWatermark: boolean;
  watermarkType: 'LOGO' | 'TEXT' | 'CUSTOM';
  watermarkText?: string;
  watermarkOpacity: number; // 0.03 to 0.15
  
  // Footer & Signatory
  footerStyle: LetterheadFooterStyle;
  showSignatory: boolean;
  signatoryPosition: 'RIGHT' | 'LEFT' | 'BOTH';
  signatoryTitle: string; // e.g. "For ACME ENTERPRISES", "Authorized Signatory"
  signatoryName?: string;
  signatoryDesignation?: string;
  showSignatureImage: boolean;
  showStampPlaceholder: boolean;
  showBankDetailsInFooter: boolean;
  showFooterAddress: boolean;
  showPageNumber: boolean;
  footerCustomNote?: string;

  // Colors & Typography
  accentColor: string; // Hex e.g. #4f46e5
  secondaryColor?: string;
  textColor?: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  bodyFontSizePt: number; // 10, 11, 12, 13
  lineHeight: number; // 1.4, 1.5, 1.6, 1.8
  
  // Page geometry (mm)
  paperSize: 'A4' | 'LETTER' | 'LEGAL';
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  
  createdAt: string;
  updatedAt?: string;
}

export interface LetterheadDocument {
  id: string;
  documentNumber: string; // e.g. "DOC/2026/001" or "LTR/2026/042"
  title: string; // Internal title or subject
  category: LetterCategory;
  date: string; // YYYY-MM-DD
  referenceNumber?: string; // e.g. "REF: AZ/2026/HR-089"
  
  // Recipient details
  recipientName: string;
  recipientDesignation?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientState?: string;
  recipientPincode?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  
  // Content
  subject: string;
  salutation: string; // e.g. "Dear Sir/Madam,", "To Whom It May Concern,"
  bodyHtml: string; // Rich WYSIWYG HTML
  bodyPlainText?: string;
  
  // Attached template & styling override
  templateId: string;
  status: LetterStatus;
  authorName: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  
  // Print & Presentation Options
  includeSignature: boolean;
  includeStamp: boolean;
  includeLetterheadOnPrint: boolean; // True = with Letterhead, False = Pre-printed Stationery mode (body only)
  customTopMarginMm?: number; // Custom offset for pre-printed letterhead paper
  customBottomMarginMm?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface LetterheadStarterPreset {
  id: string;
  title: string;
  category: LetterCategory;
  subject: string;
  salutation: string;
  description: string;
  badge: string;
  iconName?: string;
  bodyHtml: string;
}
