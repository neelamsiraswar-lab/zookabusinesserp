import { PlatformConfig } from '../types';

export const LOGO_ICON_OPTIONS = [
  { id: 'Receipt', label: 'Receipt & Billing' },
  { id: 'Building2', label: 'Corporate Entity' },
  { id: 'Landmark', label: 'Banking & Treasury' },
  { id: 'Sparkles', label: 'Smart AI & Innovation' },
  { id: 'Zap', label: 'Fast POS & Express' },
  { id: 'ShieldCheck', label: 'Compliance & Security' },
  { id: 'Briefcase', label: 'Executive Enterprise' },
  { id: 'Layers', label: 'Multi-Tenant Suite' },
  { id: 'ShoppingBag', label: 'Retail & Commerce' },
  { id: 'PieChart', label: 'Analytics & Ledger' },
];

export const LOGO_GRADIENT_PRESETS = [
  {
    id: 'indigo-cyan',
    name: 'Electric Indigo',
    class: 'bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400',
    ring: 'ring-indigo-400/40',
    glow: 'shadow-indigo-500/25',
  },
  {
    id: 'purple-violet',
    name: 'Royal Purple',
    class: 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500',
    ring: 'ring-purple-400/40',
    glow: 'shadow-purple-500/25',
  },
  {
    id: 'emerald-teal',
    name: 'Emerald Mint',
    class: 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500',
    ring: 'ring-emerald-400/40',
    glow: 'shadow-emerald-500/25',
  },
  {
    id: 'amber-orange',
    name: 'Amber Sunset',
    class: 'bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500',
    ring: 'ring-amber-400/40',
    glow: 'shadow-amber-500/25',
  },
  {
    id: 'rose-pink',
    name: 'Rose Velvet',
    class: 'bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600',
    ring: 'ring-rose-400/40',
    glow: 'shadow-rose-500/25',
  },
  {
    id: 'slate-obsidian',
    name: 'Obsidian Midnight',
    class: 'bg-gradient-to-tr from-slate-700 via-zinc-800 to-black',
    ring: 'ring-slate-500/40',
    glow: 'shadow-slate-900/40',
  },
];

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  appName: 'Zooka Business',
  appTagline: 'Smart Business, GST & E-Invoicing Suite',
  appLogoType: 'icon',
  appLogoIcon: 'Receipt',
  appLogoUrl: '',
  appLogoGradient: 'bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400',
  brandBadgeText: 'PRO',
  brandColorTheme: 'indigo',
  announcement: {
    id: 'announcement_governance_v2',
    enabled: true,
    title: 'Super Admin Multi-Workspace Governance & Live Cloud Sync Active',
    message: 'Centralized tenant workspace switching, cross-company staff auditing, real-time Firestore database replication, and custom platform branding are now live.',
    badgeText: 'NEW FEATURE',
    type: 'feature',
    actionLabel: 'Explore Workspaces',
    actionTab: 'super_admin_dashboard',
    learnMoreContent: 'The platform has been enhanced with dedicated Multi-Entity Governance:\n\n1. Centralized Workspace Directory: Create, suspend, configure, and inspect individual business entities independently.\n2. Cross-Tenant Staff & Permissions Directory: Audit staff accounts across all company partitions in one unified platform view.\n3. Customizable Platform Branding: Personalize the platform name, logo, tagline, and brand badge from the Super Admin Console.\n4. Real-time Cloud Announcements: Broadcast new features, maintenance alerts, and system notices instantly to all active businesses under their header.\n5. Disaster Recovery Vault: Export complete system archives across all workspaces with one click.',
    dismissible: true,
    targetAudience: 'ALL',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  lastUpdatedBy: 'Super Admin',
  updatedAt: new Date().toISOString(),
};

export function normalizePlatformConfig(raw?: Partial<PlatformConfig> | null): PlatformConfig {
  if (!raw) return { ...DEFAULT_PLATFORM_CONFIG };

  return {
    appName: (raw.appName && raw.appName.trim()) || DEFAULT_PLATFORM_CONFIG.appName,
    appTagline: (raw.appTagline && raw.appTagline.trim()) || DEFAULT_PLATFORM_CONFIG.appTagline,
    appLogoType: raw.appLogoType === 'image' ? 'image' : 'icon',
    appLogoIcon: raw.appLogoIcon || DEFAULT_PLATFORM_CONFIG.appLogoIcon,
    appLogoUrl: raw.appLogoUrl || '',
    appLogoGradient: raw.appLogoGradient || DEFAULT_PLATFORM_CONFIG.appLogoGradient,
    brandBadgeText: raw.brandBadgeText !== undefined ? raw.brandBadgeText : DEFAULT_PLATFORM_CONFIG.brandBadgeText,
    brandColorTheme: raw.brandColorTheme || DEFAULT_PLATFORM_CONFIG.brandColorTheme,
    announcement: {
      id: raw.announcement?.id || DEFAULT_PLATFORM_CONFIG.announcement.id,
      enabled: raw.announcement?.enabled !== undefined ? raw.announcement.enabled : DEFAULT_PLATFORM_CONFIG.announcement.enabled,
      title: raw.announcement?.title || DEFAULT_PLATFORM_CONFIG.announcement.title,
      message: raw.announcement?.message || DEFAULT_PLATFORM_CONFIG.announcement.message,
      badgeText: raw.announcement?.badgeText || DEFAULT_PLATFORM_CONFIG.announcement.badgeText,
      type: raw.announcement?.type || DEFAULT_PLATFORM_CONFIG.announcement.type,
      actionLabel: raw.announcement?.actionLabel || DEFAULT_PLATFORM_CONFIG.announcement.actionLabel,
      actionTab: raw.announcement?.actionTab || DEFAULT_PLATFORM_CONFIG.announcement.actionTab,
      actionUrl: raw.announcement?.actionUrl || DEFAULT_PLATFORM_CONFIG.announcement.actionUrl,
      learnMoreContent: raw.announcement?.learnMoreContent || DEFAULT_PLATFORM_CONFIG.announcement.learnMoreContent,
      dismissible: raw.announcement?.dismissible !== undefined ? raw.announcement.dismissible : DEFAULT_PLATFORM_CONFIG.announcement.dismissible,
      targetAudience: raw.announcement?.targetAudience || DEFAULT_PLATFORM_CONFIG.announcement.targetAudience,
      publishedAt: raw.announcement?.publishedAt || DEFAULT_PLATFORM_CONFIG.announcement.publishedAt,
      updatedAt: raw.announcement?.updatedAt || DEFAULT_PLATFORM_CONFIG.announcement.updatedAt,
    },
    lastUpdatedBy: raw.lastUpdatedBy || DEFAULT_PLATFORM_CONFIG.lastUpdatedBy,
    updatedAt: raw.updatedAt || DEFAULT_PLATFORM_CONFIG.updatedAt,
  };
}
