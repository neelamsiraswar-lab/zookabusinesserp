import { FooterConfig, FooterBadge, FooterQuickLink } from '../types';

export const DEFAULT_FOOTER_QUICK_LINKS: FooterQuickLink[] = [
  { id: 'lnk-dash', label: 'Dashboard', tabId: 'dashboard', isEnabled: true },
  { id: 'lnk-inv', label: 'Sales Invoices', tabId: 'invoices', isEnabled: true },
  { id: 'lnk-pos', label: 'POS Billing', tabId: 'pos_billing', isEnabled: true },
  { id: 'lnk-stock', label: 'Inventory & Stock', tabId: 'inventory', isEnabled: true },
  { id: 'lnk-parties', label: 'Customers & Vendors', tabId: 'parties', isEnabled: true },
  { id: 'lnk-gst', label: 'GST Returns (GSTR-1/3B)', tabId: 'gst_returns', isEnabled: true },
  { id: 'lnk-reports', label: 'Accounting Reports', tabId: 'reports', isEnabled: true },
  { id: 'lnk-settings', label: 'Settings', tabId: 'settings', isEnabled: true },
];

export const DEFAULT_FOOTER_BADGES: FooterBadge[] = [
  { id: 'bdg-gst', label: '100% GST & E-Invoice Compliant', iconName: 'shield', isEnabled: true, tooltip: 'Compliant with GSTN & NIC E-Invoice V1.03 Specifications' },
  { id: 'bdg-cloud', label: 'Google Cloud Firestore Realtime', iconName: 'server', isEnabled: true, tooltip: 'Encrypted at rest & in transit with automatic multi-region backup' },
  { id: 'bdg-ssl', label: '256-Bit SSL Enterprise Security', iconName: 'lock', isEnabled: true, tooltip: 'Bank-grade 256-bit encryption for all accounting ledgers' },
  { id: 'bdg-iso', label: 'ISO 27001 Security Standard', iconName: 'award', isEnabled: true, tooltip: 'Adheres to global information security management standards' },
];

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  enabled: true,
  style: 'CLASSIC',
  density: 'COMFORTABLE',
  
  // Branding & Copyright
  showBranding: true,
  customBrandName: '',
  customTagline: 'Modern High-Speed GST Accounting & Enterprise Inventory Platform',
  copyrightText: '© {year} {companyName}. All rights reserved. GST & E-Invoice Compliant ERP.',
  showMadeWithLove: true,
  customBottomNote: 'Designed for high-speed counter POS, e-invoicing & multi-company GST compliance.',

  // Business Credentials & Tax Compliance
  showGstin: true,
  showStateCode: true,
  showFinancialYear: true,
  showSecurityBadges: true,
  badges: DEFAULT_FOOTER_BADGES,

  // Contact & Support Details
  showContactInfo: true,
  showPhone: true,
  customPhone: '',
  showEmail: true,
  customEmail: '',
  showAddress: true,
  customAddress: '',
  supportHoursText: 'Mon - Sat: 9:30 AM - 7:30 PM IST',

  // Quick App Navigation Links
  showQuickLinks: true,
  quickLinksTitle: 'Quick Navigation',
  quickLinks: DEFAULT_FOOTER_QUICK_LINKS,

  // System Tools & Status
  showVersion: true,
  versionText: 'v4.2.0 • Enterprise Cloud Edition',
  showCloudSyncStatus: true,
  showSuperAdminPortalBadge: false,
  showScrollToTop: true,

  // Layout & Visual Styling
  customAccentColor: 'auto',
  showBorderTop: true,
  shadow: 'none',
};

export interface FooterPreset {
  id: string;
  name: string;
  description: string;
  config: FooterConfig;
}

export const FOOTER_PRESETS: FooterPreset[] = [
  {
    id: 'enterprise_compliance',
    name: 'Enterprise Trust & Compliance',
    description: 'Comprehensive 4-column footer with GST badges, company tax IDs, support contact, and complete navigation.',
    config: {
      ...DEFAULT_FOOTER_CONFIG,
      style: 'CLASSIC',
      density: 'COMFORTABLE',
      showBranding: true,
      showGstin: true,
      showStateCode: true,
      showFinancialYear: true,
      showSecurityBadges: true,
      showContactInfo: true,
      showQuickLinks: true,
      showVersion: true,
      showCloudSyncStatus: true,
      showSuperAdminPortalBadge: true,
      showBorderTop: true,
      customAccentColor: 'indigo',
    }
  },
  {
    id: 'minimal_clean',
    name: 'Minimalist Clean Bar',
    description: 'Ultra-clean single-row bottom footer with copyright, version tag, and quick scroll to top.',
    config: {
      ...DEFAULT_FOOTER_CONFIG,
      style: 'MINIMAL',
      density: 'COMPACT',
      showBranding: true,
      showGstin: false,
      showStateCode: false,
      showFinancialYear: false,
      showSecurityBadges: false,
      showContactInfo: false,
      showQuickLinks: false,
      showMadeWithLove: true,
      showVersion: true,
      showCloudSyncStatus: true,
      showScrollToTop: true,
      showBorderTop: true,
      customAccentColor: 'slate',
    }
  },
  {
    id: 'floating_pill_card',
    name: 'Modern Floating Glass Card',
    description: 'Floating rounded card with soft shadows, glassmorphism blur, quick action tags, and status indicator.',
    config: {
      ...DEFAULT_FOOTER_CONFIG,
      style: 'FLOATING',
      density: 'COMFORTABLE',
      showBranding: true,
      showGstin: true,
      showStateCode: true,
      showFinancialYear: true,
      showSecurityBadges: true,
      showContactInfo: true,
      showQuickLinks: true,
      showVersion: true,
      showCloudSyncStatus: true,
      showBorderTop: false,
      shadow: 'lg',
      customAccentColor: 'purple',
    }
  },
  {
    id: 'gradient_saas',
    name: 'Gradient Brand Modern',
    description: 'Modern gradient background with highlighted compliance badges, contact matrix, and customer help hotline.',
    config: {
      ...DEFAULT_FOOTER_CONFIG,
      style: 'GRADIENT',
      density: 'SPACIOUS',
      showBranding: true,
      showGstin: true,
      showStateCode: true,
      showFinancialYear: true,
      showSecurityBadges: true,
      showContactInfo: true,
      showQuickLinks: true,
      showVersion: true,
      showCloudSyncStatus: true,
      showBorderTop: true,
      customAccentColor: 'emerald',
    }
  },
  {
    id: 'compact_executive',
    name: 'Compact Executive Bar',
    description: 'Space-saving slim footer layout optimized for POS counters and high-density invoice entry screens.',
    config: {
      ...DEFAULT_FOOTER_CONFIG,
      style: 'MODERN_CARD',
      density: 'COMPACT',
      showBranding: true,
      showGstin: true,
      showStateCode: true,
      showFinancialYear: false,
      showSecurityBadges: false,
      showContactInfo: true,
      showQuickLinks: true,
      showVersion: true,
      showCloudSyncStatus: true,
      showBorderTop: true,
      customAccentColor: 'blue',
    }
  }
];

export const normalizeFooterConfig = (config?: Partial<FooterConfig> | null): FooterConfig => {
  if (!config) return { ...DEFAULT_FOOTER_CONFIG };

  const rawBadges = Array.isArray(config.badges) ? config.badges : DEFAULT_FOOTER_BADGES;
  const normalizedBadges = rawBadges.map((b, idx) => ({
    id: b.id || `bdg-${idx}`,
    label: b.label || '',
    tooltip: b.tooltip || '',
    iconName: b.iconName || 'shield',
    isEnabled: typeof b.isEnabled === 'boolean' ? b.isEnabled : true
  }));

  const rawLinks = Array.isArray(config.quickLinks) ? config.quickLinks : DEFAULT_FOOTER_QUICK_LINKS;
  const normalizedLinks = rawLinks.map((l, idx) => ({
    id: l.id || `lnk-${idx}`,
    label: l.label || '',
    tabId: l.tabId || 'dashboard',
    isEnabled: typeof l.isEnabled === 'boolean' ? l.isEnabled : true
  }));

  return {
    ...DEFAULT_FOOTER_CONFIG,
    ...config,
    badges: normalizedBadges,
    quickLinks: normalizedLinks
  };
};

export const interpolateFooterText = (
  text: string,
  vars: {
    year: number | string;
    companyName: string;
    gstin: string;
    state?: string;
    city?: string;
    fy?: string;
  }
): string => {
  if (!text) return '';
  return text
    .replace(/\{year\}/g, String(vars.year))
    .replace(/\{companyName\}/g, vars.companyName || 'Business Entity')
    .replace(/\{gstin\}/g, vars.gstin || 'UNREGISTERED')
    .replace(/\{state\}/g, vars.state || '')
    .replace(/\{city\}/g, vars.city || '')
    .replace(/\{fy\}/g, vars.fy || '2026-2027');
};
