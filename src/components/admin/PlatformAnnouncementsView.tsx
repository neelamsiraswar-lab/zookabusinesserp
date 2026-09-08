import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Megaphone, 
  Sparkles, 
  Send, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Layers, 
  ExternalLink, 
  RotateCcw, 
  Radio, 
  Power, 
  FileText, 
  ArrowRight,
  Shield,
  HelpCircle,
  Clock,
  Check
} from 'lucide-react';
import { AnnouncementBanner } from '../layout/AnnouncementBanner';
import { PlatformAnnouncement } from '../../types';
import { DEFAULT_PLATFORM_CONFIG } from '../../utils/platformDefaults';

const ANNOUNCEMENT_TEMPLATES: Array<{
  id: string;
  name: string;
  category: 'feature' | 'info' | 'alert' | 'maintenance';
  badge: string;
  title: string;
  message: string;
  actionLabel: string;
  actionTab: string;
  learnMoreContent: string;
}> = [
  {
    id: 'feature_superadmin',
    name: '🚀 New Feature: Multi-Workspace & Super Admin Portal',
    category: 'feature',
    badge: 'NEW FEATURE',
    title: 'Super Admin Governance & Multi-Workspace Architecture',
    message: 'Easily manage multiple tenant companies, security credentials, RBAC team roles, and platform branding from the new centralized Super Admin Portal.',
    actionLabel: 'Explore Features',
    actionTab: 'super_admin_dashboard',
    learnMoreContent: `### What's New in This Release:
- **Centralized Super Admin Portal:** One-click governance across all client companies.
- **Tenant Management:** Provision, edit, lock, or switch workspaces seamlessly.
- **Cross-Tenant Security Audit:** Track logins, role modifications, and ledger modifications.
- **White-Label Customization:** Update platform brand name, custom logos, and broadcast announcements.`
  },
  {
    id: 'feature_cheques',
    name: '🏦 New Feature: CTS-2010 Cheque Printing & Books',
    category: 'feature',
    badge: 'NEW RELEASE',
    title: 'Automated CTS-2010 Bank Cheque Printing & Reminders',
    message: 'Print compliant cheques with millimeter precision across HDFC, SBI, ICICI, Axis, and PNB banks directly from your payment vouchers.',
    actionLabel: 'Open Cheque Center',
    actionTab: 'cheques',
    learnMoreContent: `### CTS-2010 Cheque Printing Features:
- Pre-configured coordinate templates for top Indian banks.
- Automated number-to-words currency conversion in Indian numbering system.
- Cheque bounce and post-dated cheque (PDC) lifecycle reminders.`
  },
  {
    id: 'gst_compliance',
    name: '📑 Compliance: FY 2026-27 GST & E-Invoicing Rules',
    category: 'info',
    badge: 'GST COMPLIANCE',
    title: 'Updated GST Rate Registers & GSTR-1/3B Automated Filing',
    message: 'Review auto-calculated CGST, SGST, IGST, and RCM outward supply schedules before the end-of-month reconciliation deadline.',
    actionLabel: 'View GST Returns',
    actionTab: 'gst_returns',
    learnMoreContent: `### FY 2026-27 Tax Filing Guidelines:
- Validate that all supplier GSTINs are verified with active filing statuses.
- Ensure all B2B invoices exceeding ₹5 Cr turnover threshold carry verified IRN QR codes.
- Download GSTR-1 JSON payloads directly for one-click portal filing.`
  },
  {
    id: 'maintenance',
    name: '⚙️ Maintenance: Scheduled Cloud Optimization',
    category: 'maintenance',
    badge: 'MAINTENANCE',
    title: 'Scheduled Cloud Infrastructure Maintenance Window',
    message: 'Our Cloud Firestore database will undergo routine latency enhancements on Sunday at 02:00 AM IST. Offline local drafting remains fully active.',
    actionLabel: 'Database Status',
    actionTab: 'settings',
    learnMoreContent: `### Maintenance Schedule & Details:
- **Window:** Sunday, 02:00 AM - 03:30 AM IST (approx. 90 minutes).
- **Offline Mode:** POS billing and local invoice creation will store vouchers locally and automatically sync upon service resumption.`
  }
];

export const PlatformAnnouncementsView: React.FC = () => {
  const { platformConfig, updateAnnouncement, currentUser, setActiveTab } = useApp();

  const currentAnn = platformConfig?.announcement || DEFAULT_PLATFORM_CONFIG.announcement;

  // Local editable form state
  const [enabled, setEnabled] = useState(currentAnn.enabled);
  const [type, setType] = useState<'feature' | 'info' | 'alert' | 'maintenance'>(currentAnn.type || 'feature');
  const [badgeText, setBadgeText] = useState(currentAnn.badgeText || 'NEW FEATURE');
  const [title, setTitle] = useState(currentAnn.title || '');
  const [message, setMessage] = useState(currentAnn.message || '');
  const [actionLabel, setActionLabel] = useState(currentAnn.actionLabel || 'Learn More');
  const [actionTab, setActionTab] = useState(currentAnn.actionTab || 'dashboard');
  const [actionUrl, setActionUrl] = useState(currentAnn.actionUrl || '');
  const [learnMoreContent, setLearnMoreContent] = useState(currentAnn.learnMoreContent || '');
  const [dismissible, setDismissible] = useState(currentAnn.dismissible !== false);
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'ADMINS_ONLY'>(currentAnn.targetAudience || 'ALL');

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Sync when remote platformConfig changes
  useEffect(() => {
    if (platformConfig?.announcement) {
      const a = platformConfig.announcement;
      setEnabled(a.enabled);
      setType(a.type);
      setBadgeText(a.badgeText || 'NEW FEATURE');
      setTitle(a.title);
      setMessage(a.message);
      setActionLabel(a.actionLabel || 'Learn More');
      setActionTab(a.actionTab || 'dashboard');
      setActionUrl(a.actionUrl || '');
      setLearnMoreContent(a.learnMoreContent || '');
      setDismissible(a.dismissible !== false);
      setTargetAudience(a.targetAudience || 'ALL');
    }
  }, [platformConfig]);

  // Draft object for real-time live preview of the banner
  const draftAnnouncement: PlatformAnnouncement = {
    id: currentAnn.id || 'preview_announcement',
    enabled,
    type,
    badgeText: badgeText.trim(),
    title: title.trim(),
    message: message.trim(),
    actionLabel: actionLabel.trim() || undefined,
    actionTab: actionTab.trim() || undefined,
    actionUrl: actionUrl.trim() || undefined,
    learnMoreContent: learnMoreContent.trim() || undefined,
    dismissible,
    targetAudience,
    publishedAt: currentAnn.publishedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const applyTemplate = (tpl: typeof ANNOUNCEMENT_TEMPLATES[0]) => {
    setEnabled(true);
    setType(tpl.category);
    setBadgeText(tpl.badge);
    setTitle(tpl.title);
    setMessage(tpl.message);
    setActionLabel(tpl.actionLabel);
    setActionTab(tpl.actionTab);
    setLearnMoreContent(tpl.learnMoreContent);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both an announcement title and message before broadcasting.');
      return;
    }

    setIsBroadcasting(true);
    try {
      await updateAnnouncement({
        enabled,
        type,
        badgeText: badgeText.trim(),
        title: title.trim(),
        message: message.trim(),
        actionLabel: actionLabel.trim() || undefined,
        actionTab: actionTab.trim() || undefined,
        actionUrl: actionUrl.trim() || undefined,
        learnMoreContent: learnMoreContent.trim() || undefined,
        dismissible,
        targetAudience,
      });
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to broadcast announcement:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleToggleActiveState = async () => {
    const nextState = !enabled;
    setEnabled(nextState);
    await updateAnnouncement({ enabled: nextState });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header Description & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-purple-400" />
            <span>Platform Announcements & Feature Broadcasts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Publish prominent announcement banners directly under the header across all business workspaces to introduce new features, compliance notices, or maintenance updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Status Pill Button */}
          <button
            type="button"
            onClick={handleToggleActiveState}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shadow-sm ${
              enabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{enabled ? 'Broadcast Status: Active' : 'Broadcast Status: Inactive'}</span>
          </button>

          <button
            type="button"
            onClick={handleBroadcast}
            disabled={isBroadcasting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isBroadcasting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : broadcastSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Broadcast Live</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish to All Workspaces</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Template Presets */}
      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 space-y-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Announcement Templates (Click to Populate):</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-left transition-all cursor-pointer group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300 truncate">
                {tpl.name}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {tpl.message}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Live Interactive Preview Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Interactive Live Banner Preview (As Seen Under Top Header)</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {draftAnnouncement.enabled ? '🟢 Banner is visible' : '⚪ Banner is currently turned off'}
          </span>
        </div>

        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Simulated Fake Header Bar */}
          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="text-slate-300 font-bold">Top Navigation Header</span>
            </div>
            <span>Preview Mode</span>
          </div>

          {/* Real Announcement Banner Component Rendered Live */}
          <div className="min-h-[50px] flex items-center">
            {draftAnnouncement.enabled ? (
              <div className="w-full">
                <AnnouncementBanner
                  announcement={draftAnnouncement}
                  currentUser={currentUser}
                  onNavigateTab={(tab) => {
                    alert(`Preview Click: Would navigate to "${tab}" tab in actual view.`);
                  }}
                  onOpenSuperAdminPortal={() => {
                    alert('Preview Click: Navigates to Super Admin Portal.');
                  }}
                />
              </div>
            ) : (
              <div className="w-full py-6 text-center text-xs text-slate-400 italic">
                Announcement banner is currently disabled. Toggle &quot;Enable Banner Broadcast&quot; below to make it live under the header.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Broadcast Configuration Form */}
      <form onSubmit={handleBroadcast} className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
        
        {/* Row 1: Active Toggle & Category Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-slate-800">
          
          {/* Active Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Power className="w-4 h-4 text-purple-400" />
                <span>Enable Banner Broadcast</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                When switched on, this banner displays immediately under the top header.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Announcement Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Announcement Category & Color Archetype
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'feature', label: 'Feature', color: 'from-purple-900 to-indigo-950 text-purple-300' },
                { id: 'info', label: 'Info', color: 'from-blue-900 to-cyan-950 text-cyan-300' },
                { id: 'alert', label: 'Alert', color: 'from-amber-900 to-orange-950 text-amber-300' },
                { id: 'maintenance', label: 'Maintenance', color: 'from-slate-800 to-zinc-900 text-slate-300' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setType(cat.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer text-center ${
                    type === cat.id
                      ? 'border-purple-500 bg-purple-600/20 text-white ring-1 ring-purple-500/40'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Title, Badge, and Target Audience */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Announcement Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Super Admin Governance & Multi-Workspace Architecture"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Pill Badge Text
            </label>
            <input
              type="text"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value.toUpperCase())}
              placeholder="e.g. NEW FEATURE"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase font-mono font-bold focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Business Workspaces</option>
              <option value="ADMINS_ONLY">Admins & Managers Only</option>
            </select>
          </div>
        </div>

        {/* Row 3: Headline Summary Message */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            Banner Broadcast Message <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Brief 1-2 sentence description visible on the top banner strip..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
          />
          <p className="text-[11px] text-slate-400">
            Keep this concise so it fits comfortably on mobile screens and desktop headers.
          </p>
        </div>

        {/* Row 4: Action Button & In-App Navigation Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Action Button Label
            </label>
            <input
              type="text"
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              placeholder="e.g. Explore Features, Open POS"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Destination App View / Tab
            </label>
            <select
              value={actionTab}
              onChange={(e) => setActionTab(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
            >
              <option value="dashboard">Dashboard</option>
              <option value="invoices">Invoices & Billing</option>
              <option value="pos_billing">POS Counter Billing</option>
              <option value="inventory">Inventory & Stock</option>
              <option value="purchases">Purchases & Expenses</option>
              <option value="parties">Customers & Vendors</option>
              <option value="cheques">Cheque Printing & Books</option>
              <option value="accounting">Accounting & Reports</option>
              <option value="gst_returns">GST & Tax Registers</option>
              <option value="users">Users & Permissions</option>
              <option value="settings">Company Settings</option>
              <option value="super_admin_dashboard">Super Admin Portal</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Or External URL (Optional)
            </label>
            <input
              type="url"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="https://documentation.example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Row 5: Extended Release Notes / Documentation ("Learn More" Modal Content) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Extended Release Notes / &quot;Learn More&quot; Modal Content</span>
            <span className="text-[10px] text-slate-400 font-normal">Supports markdown formatting & bullet points</span>
          </label>
          <textarea
            rows={4}
            value={learnMoreContent}
            onChange={(e) => setLearnMoreContent(e.target.value)}
            placeholder="Detailed guide, release bullet points, or instructions shown when a user clicks 'Learn More' on the banner..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>

        {/* Row 6: Dismissible Setting & Broadcast Trigger */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={dismissible}
              onChange={(e) => setDismissible(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
            />
            <span>Allow users to dismiss the banner for their browser session</span>
          </label>

          <button
            type="submit"
            disabled={isBroadcasting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isBroadcasting ? 'Broadcasting to Cloud...' : 'Broadcast Announcement to All Businesses'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
