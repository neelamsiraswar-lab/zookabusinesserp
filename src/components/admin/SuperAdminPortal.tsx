import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Company, BusinessProfile, SuperAdminAuthData, AppUser } from '../../types';
import { 
  Crown, 
  Building2, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Database, 
  Activity, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  LogOut, 
  RefreshCw, 
  Download, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Eye, 
  EyeOff, 
  UserCog, 
  Sparkles, 
  Server, 
  Mail, 
  Phone, 
  MapPin, 
  LayoutDashboard,
  Shield,
  Layers,
  Filter,
  Check,
  X,
  Clock,
  Briefcase,
  Palette,
  Megaphone
} from 'lucide-react';
import { CreateCompanyModal } from '../company/CreateCompanyModal';
import { formatINR } from '../../utils/formatters';
import { INDIAN_STATES } from '../../utils/constants';
import { PlatformBrandingView } from './PlatformBrandingView';
import { PlatformAnnouncementsView } from './PlatformAnnouncementsView';
import { AppLogo } from '../common/AppLogo';
import { AnnouncementBanner } from '../layout/AnnouncementBanner';

type SuperAdminTab = 'overview' | 'workspaces' | 'users' | 'branding' | 'announcements' | 'audit_logs' | 'security' | 'database';

const SUPER_ADMIN_AVATAR_THEMES = [
  { id: 'slate', name: 'Obsidian Slate', class: 'bg-slate-800 text-slate-100 border border-slate-700' },
  { id: 'indigo', name: 'Deep Midnight', class: 'bg-slate-900 text-indigo-300 border border-indigo-900/60' },
  { id: 'charcoal', name: 'Pure Charcoal', class: 'bg-zinc-800 text-zinc-100 border border-zinc-700' },
  { id: 'stone', name: 'Warm Bronze', class: 'bg-stone-800 text-stone-200 border border-stone-700' },
  { id: 'emerald', name: 'Forest Teal', class: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80' },
  { id: 'monochrome', name: 'Titanium White', class: 'bg-slate-100 text-slate-950 border border-slate-300' },
];

export const SuperAdminPortal: React.FC = () => {
  const {
    companies,
    currentCompanyId,
    currentCompany,
    business,
    switchCompany,
    deleteCompany,
    toggleCompanyStatus,
    editBusinessProfile,
    superAdminAuth,
    superAdminUser,
    updateSuperAdminProfile,
    updateSuperAdminPassword,
    logoutSuperAdmin,
    cloudSyncStatus,
    lastCloudSyncTime,
    triggerCloudSync,
    isCloudSyncing,
    auditLogs,
    users,
    invoices,
    setActiveTab,
    platformConfig,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<SuperAdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  // Security Credentials form states
  const [currentAuthInput, setCurrentAuthInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [showCurrentAuth, setShowCurrentAuth] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [credentialsMsg, setCredentialsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);

  // User directory filter states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userCompanyFilter, setUserCompanyFilter] = useState('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Audit filter states
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(comp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        comp.name.toLowerCase().includes(q) ||
        (comp.tradeName && comp.tradeName.toLowerCase().includes(q)) ||
        (comp.gstin && comp.gstin.toLowerCase().includes(q)) ||
        (comp.city && comp.city.toLowerCase().includes(q)) ||
        (comp.state && comp.state.toLowerCase().includes(q));

      const isCompActive = comp.isActive ?? true;
      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? isCompActive : !isCompActive;

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  // Aggregate Cross-Tenant Stats
  const crossTenantStats = useMemo(() => {
    let totalInvoicesCount = 0;
    let totalTurnover = 0;
    companies.forEach(comp => {
      if (comp.id === currentCompanyId) {
        totalInvoicesCount += invoices.length;
        totalTurnover += invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
      } else {
        try {
          const raw = localStorage.getItem(`zookabusiness_v2_cloud_c_${comp.id}_invoices`) || localStorage.getItem(`vyaparflow_v2_cloud_c_${comp.id}_invoices`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              totalInvoicesCount += parsed.length;
              totalTurnover += parsed.reduce((acc: number, inv: any) => acc + (inv.grandTotal || inv.totalAmount || 0), 0);
            }
          }
        } catch (e) {}
      }
    });

    const totalWorkspaces = companies.length;
    const activeWorkspaces = companies.filter(c => c.isActive !== false).length;
    const suspendedWorkspaces = totalWorkspaces - activeWorkspaces;

    return {
      totalWorkspaces,
      activeWorkspaces,
      suspendedWorkspaces,
      totalInvoicesCount,
      totalTurnover
    };
  }, [companies, currentCompanyId, invoices]);

  // Aggregate Cross-Tenant Users Roster
  const crossTenantUsers = useMemo(() => {
    const list: Array<{ user: AppUser; company: Company }> = [];
    companies.forEach(comp => {
      if (comp.id === currentCompanyId && users.length > 0) {
        users.forEach(u => list.push({ user: u, company: comp }));
      } else {
        try {
          const raw = localStorage.getItem(`zookabusiness_v2_cloud_c_${comp.id}_users`) || localStorage.getItem(`vyaparflow_v2_cloud_c_${comp.id}_users`);
          if (raw) {
            const parsed = JSON.parse(raw) as AppUser[];
            if (Array.isArray(parsed)) {
              parsed.forEach(u => list.push({ user: u, company: comp }));
            }
          }
        } catch (e) {}
      }
    });
    return list;
  }, [companies, currentCompanyId, users]);

  // Filtered Cross-Tenant Users
  const filteredUsers = useMemo(() => {
    return crossTenantUsers.filter(({ user, company }) => {
      const q = userSearchQuery.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(q) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.phone && user.phone.includes(q)) ||
        company.name.toLowerCase().includes(q) ||
        (company.tradeName && company.tradeName.toLowerCase().includes(q));

      const matchesCompany = userCompanyFilter === 'ALL' || company.id === userCompanyFilter;
      const matchesRole = userRoleFilter === 'ALL' || user.role === userRoleFilter;

      return matchesSearch && matchesCompany && matchesRole;
    });
  }, [crossTenantUsers, userSearchQuery, userCompanyFilter, userRoleFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const q = auditSearchQuery.toLowerCase();
      const matchesSearch = 
        log.details.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q);

      const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;

      return matchesSearch && matchesAction;
    });
  }, [auditLogs, auditSearchQuery, auditActionFilter]);

  // Enter Workspace Action
  const handleEnterWorkspace = (companyId: string) => {
    switchCompany(companyId);
    setActiveTab('dashboard');
  };

  // Master Credentials Handler
  const handleUpdateMasterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsMsg(null);

    if (!currentAuthInput.trim()) {
      setCredentialsMsg({ type: 'error', text: 'Please enter your current Super Admin Password or Master PIN.' });
      return;
    }

    if (!newPasswordInput.trim() && !newPinInput.trim()) {
      setCredentialsMsg({ type: 'error', text: 'Please provide either a new password or a new 4-digit PIN.' });
      return;
    }

    if (newPinInput.trim() && !/^\d{4}$/.test(newPinInput.trim())) {
      setCredentialsMsg({ type: 'error', text: 'Master PIN must be exactly 4 numeric digits.' });
      return;
    }

    setIsUpdatingAuth(true);
    const result = updateSuperAdminPassword(currentAuthInput, newPasswordInput, newPinInput);
    setIsUpdatingAuth(false);

    if (result.success) {
      setCredentialsMsg({ type: 'success', text: 'Master credentials successfully updated and replicated to Cloud Firestore.' });
      setCurrentAuthInput('');
      setNewPasswordInput('');
      setNewPinInput('');
    } else {
      setCredentialsMsg({ type: 'error', text: result.error || 'Failed to update master credentials.' });
    }
  };

  // Export Master Backup JSON
  const handleExportMasterBackup = () => {
    const backupData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      platformVersion: '2.4.0-cloud',
      superAdmin: {
        name: superAdminAuth.name,
        email: superAdminAuth.email,
        roleTitle: superAdminAuth.roleTitle,
        department: superAdminAuth.department,
      },
      platformConfig,
      companies,
      partitions: {}
    };

    companies.forEach(comp => {
      const pKeys = ['business', 'invoices', 'products', 'parties', 'purchaseBills', 'payments', 'expenses', 'accountHeads', 'journalEntries', 'users', 'auditLogs'];
      backupData.partitions[comp.id] = {};
      pKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(`zookabusiness_v2_cloud_c_${comp.id}_${k}`) || localStorage.getItem(`vyaparflow_v2_cloud_c_${comp.id}_${k}`);
          if (raw) backupData.partitions[comp.id][k] = JSON.parse(raw);
        } catch (e) {}
      });
    });

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zookabusiness_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Audit Logs to CSV
  const handleExportAuditCSV = () => {
    if (filteredAuditLogs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Module', 'User', 'User Role', 'Details', 'Severity'];
    const rows = filteredAuditLogs.map(l => [
      new Date(l.timestamp).toISOString(),
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.module.replace(/"/g, '""')}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userRole || ''}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.severity || 'INFO'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Confirm delete company
  const handleConfirmDelete = () => {
    if (!deletingCompany) return;
    deleteCompany(deletingCompany.id);
    setDeletingCompany(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-slate-800 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* TOP MASTER GOVERNANCE HEADER                                   */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Portal Title with Platform Custom Branding */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => setActiveAdminTab('branding')} title="Click to customize Platform Identity & Branding">
              <AppLogo config={platformConfig} size="md" className="ring-1 ring-slate-800 transition-opacity hover:opacity-90" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shadow-xs" title="Super Admin Authority">
                <Crown className="w-2 h-2" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white tracking-tight">
                  {platformConfig?.appName || 'Zooka Business'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/60">
                  {platformConfig?.brandBadgeText || 'PRO'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wide bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>Super Admin</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px] sm:max-w-md">
                {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'} • Master Governance
              </p>
            </div>
          </div>

          {/* Quick Stats & Cloud DB Sync Badge */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-normal">Firestore:</span>
              <span className={`flex items-center gap-1.5 font-medium ${cloudSyncStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {cloudSyncStatus === 'online' ? 'Synchronized' : 'Cached'}
              </span>
            </div>

            <button
              onClick={() => triggerCloudSync()}
              disabled={isCloudSyncing}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer disabled:opacity-50"
              title="Force sync cloud Firestore database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin text-slate-200' : ''}`} />
            </button>
          </div>

          {/* Actions & Profile Controls */}
          <div className="flex items-center gap-2.5">
            {/* Super Admin User Profile Chip */}
            <div 
              onClick={() => setIsEditProfileModalOpen(true)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 cursor-pointer transition-colors"
              title="Click to edit Super Admin profile details"
            >
              <div className={`w-7 h-7 rounded-md ${superAdminAuth.avatarBg || 'bg-slate-800 text-slate-200 border border-slate-700'} text-xs font-mono font-semibold flex items-center justify-center shadow-xs`}>
                {superAdminAuth.avatarText || 'KS'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-200 leading-tight truncate max-w-[130px]">
                  {superAdminAuth.name || 'Kuldeep Siraswar'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[130px]">
                  {superAdminAuth.email || 'kuldeep.siraswar@gmail.com'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logoutSuperAdmin}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors border border-slate-800 cursor-pointer"
              title="Lock Super Admin session and exit"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-850">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none text-xs">
            <button
              onClick={() => setActiveAdminTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'overview'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('workspaces')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'workspaces'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Workspaces</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeAdminTab === 'workspaces' ? 'bg-slate-900 text-slate-200' : 'bg-slate-900 text-slate-400'}`}>
                {companies.length}
              </span>
            </button>

            <button
              onClick={() => setActiveAdminTab('users')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'users'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${activeAdminTab === 'users' ? 'bg-slate-900 text-slate-200' : 'bg-slate-900 text-slate-400'}`}>
                {crossTenantUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveAdminTab('branding')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'branding'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Platform Branding</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('announcements')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'announcements'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Announcements</span>
              {platformConfig?.announcement?.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Announcement banner is active" />
              )}
            </button>

            <button
              onClick={() => setActiveAdminTab('audit_logs')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'audit_logs'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('security')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'security'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Credentials</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('database')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'database'
                  ? 'bg-slate-800 text-white font-medium shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Firestore & Backup</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Broadcast Announcement Banner under Header in Super Admin Dashboard */}
      <AnnouncementBanner
        announcement={platformConfig?.announcement}
        currentUser={superAdminUser}
        onNavigateTab={(tab) => {
          if (tab === 'branding' || tab === 'announcements' || tab === 'workspaces' || tab === 'users' || tab === 'security' || tab === 'database') {
            setActiveAdminTab(tab as any);
          } else {
            handleEnterWorkspace(currentCompanyId);
          }
        }}
        onOpenSuperAdminPortal={() => setActiveAdminTab('announcements')}
      />

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ============================================================ */}
        {/* VIEW 1: PLATFORM OVERVIEW & KPI COMMAND CENTER              */}
        {/* ============================================================ */}
        {activeAdminTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Executive Welcome Hero Banner with Platform Brand Identity */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-7">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-mono">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Master Governance Console • {platformConfig?.appName || 'Zooka Business'}</span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="relative group cursor-pointer" 
                      onClick={() => setActiveAdminTab('branding')}
                      title="Click to customize Platform Identity"
                    >
                      <AppLogo config={platformConfig} size="lg" className="ring-1 ring-slate-800 shrink-0 transition-opacity hover:opacity-90" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shadow-xs">
                        <Crown className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                        <span>Welcome back, {superAdminAuth.name || 'Kuldeep Siraswar'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700/60">
                          {platformConfig?.brandBadgeText || 'PRO'}
                        </span>
                      </h1>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Platform Master Console governing {companies.length} business {companies.length === 1 ? 'workspace' : 'workspaces'} with multi-tenant Google Cloud Firestore real-time replication.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Workspace</span>
                  </button>

                  <button
                    onClick={handleExportMasterBackup}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Export Snapshot</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Core KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Registered Workspaces</p>
                  <p className="text-2xl font-bold font-mono text-white mt-1.5">{crossTenantStats.totalWorkspaces}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-medium">{crossTenantStats.activeWorkspaces} active</span>
                    <span>•</span>
                    <span>{crossTenantStats.suspendedWorkspaces} suspended</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Platform Users</p>
                  <p className="text-2xl font-bold font-mono text-white mt-1.5">{crossTenantUsers.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Cross-tenant credentials</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Invoices & Documents</p>
                  <p className="text-2xl font-bold font-mono text-white mt-1.5">{crossTenantStats.totalInvoicesCount}</p>
                  <p className="text-xs text-slate-400 mt-1">Total multi-tenant records</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cloud Storage</p>
                  <p className="text-sm font-semibold font-mono text-emerald-400 mt-1.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {cloudSyncStatus === 'online' ? 'Synchronized' : 'Cached'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {lastCloudSyncTime ? `Synced at ${lastCloudSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Firestore connected'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                  <Database className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick Governance Controls: Custom Branding & Header Announcements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branding Quick Card */}
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Platform Identity & Branding</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Brand Name: <span className="text-slate-200 font-medium">{platformConfig?.appName || 'Zooka Business'}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {platformConfig?.brandBadgeText || 'PRO'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                  <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                    {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
                  </span>
                  <button
                    onClick={() => setActiveAdminTab('branding')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Configure</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Announcement Quick Card */}
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Broadcast Announcement Banner</h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${platformConfig?.announcement?.enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span>Status: <span className={platformConfig?.announcement?.enabled ? 'text-emerald-400 font-medium' : 'text-slate-400'}>{platformConfig?.announcement?.enabled ? 'Active Under Header' : 'Inactive'}</span></span>
                      </p>
                    </div>
                  </div>
                  {platformConfig?.announcement?.badgeText && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {platformConfig.announcement.badgeText}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                  <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                    {platformConfig?.announcement?.title || 'No active announcement banner'}
                  </span>
                  <button
                    onClick={() => setActiveAdminTab('announcements')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Workspaces Hub Grid */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Business Workspaces Quick Switcher</span>
                  </h2>
                  <p className="text-xs text-slate-400">Instantly switch active tenant workspace or inspect partition state</p>
                </div>

                <button
                  onClick={() => setActiveAdminTab('workspaces')}
                  className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View All {companies.length} Workspaces</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {companies.map(comp => {
                  const isCurrent = comp.id === currentCompanyId;
                  const isCompActive = comp.isActive !== false;

                  return (
                    <div
                      key={comp.id}
                      className={`p-5 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'border-slate-600 bg-slate-950 ring-1 ring-slate-700/80'
                          : 'border-slate-800/90 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {comp.tradeName || comp.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{comp.name}</p>
                        </div>
                        {isCompActive ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-950/60 text-rose-400 border border-rose-800/60 shrink-0">
                            Suspended
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-400 mb-4">
                        {comp.gstin && (
                          <p className="font-mono text-[11px] text-slate-300">GSTIN: {comp.gstin}</p>
                        )}
                        <p className="truncate flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {comp.city ? `${comp.city}, ` : ''}{comp.state}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setEditingCompany(comp);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
                        >
                          Configure
                        </button>

                        <button
                          onClick={() => handleEnterWorkspace(comp.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>Enter Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Security Protocol & Recent Logs Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security Protocol Card */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-white">Platform Governance & Security Architecture</h3>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white font-medium">Strict Multi-Tenancy Partitioning:</strong> Each business workspace data (ledgers, invoices, inventory) is completely isolated by partition IDs and cannot cross-contaminate.
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white font-medium">Master Authority Protection:</strong> Super Admin credentials exist above all tenant accounts and cannot be modified or suspended by tenant company admins.
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white font-medium">Cloud Firestore Integrity:</strong> All master credential changes and company lifecycle operations replicate directly to the persistent Firestore systemState document.
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Audit Events Preview */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-white">Recent Security Audit Logs</h3>
                  </div>
                  <button
                    onClick={() => setActiveAdminTab('audit_logs')}
                    className="text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2.5">
                  {auditLogs.slice(0, 4).map((log, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">{log.action}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                            {log.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: MULTI-TENANT WORKSPACES & COMPANIES                 */}
        {/* ============================================================ */}
        {activeAdminTab === 'workspaces' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <span>Workspaces ({filteredCompanies.length})</span>
                </h1>
                <p className="text-xs text-slate-400">Configure business profiles, tax settings, and tenant lifecycles</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, GSTIN, city..."
                    className="pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden w-48 sm:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-300 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden font-medium"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="DISABLED">Suspended Only</option>
                </select>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Workspace</span>
                </button>
              </div>
            </div>

            {/* Companies List */}
            {filteredCompanies.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
                <Building2 className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-medium">No business profiles matching your filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompanies.map(comp => {
                  const isCurrent = comp.id === currentCompanyId;
                  const isCompActive = comp.isActive ?? true;

                  return (
                    <div
                      key={comp.id}
                      className={`p-5 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'border-slate-600 bg-slate-900 ring-1 ring-slate-700/80'
                          : isCompActive
                          ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                          : 'border-rose-900/40 bg-rose-950/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Company Info */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm sm:text-base text-white">
                              {comp.tradeName || comp.name}
                            </span>
                            {comp.tradeName && comp.tradeName !== comp.name && (
                              <span className="text-xs text-slate-400">
                                ({comp.name})
                              </span>
                            )}

                            {/* Status Badge */}
                            {isCompActive ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5" /> Suspended
                              </span>
                            )}

                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                Current Active
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            {comp.gstin && (
                              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-800">
                                GSTIN: {comp.gstin}
                              </span>
                            )}
                            {comp.pan && (
                              <span className="font-mono text-[11px] text-slate-400">PAN: {comp.pan}</span>
                            )}
                            {comp.state && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {comp.city ? `${comp.city}, ` : ''}{comp.state} ({comp.stateCode})
                              </span>
                            )}
                            {comp.phone && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Phone className="w-3 h-3 text-slate-500" /> {comp.phone}
                              </span>
                            )}
                          </div>

                          {!isCompActive && comp.disabledReason && (
                            <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" /> Notice: {comp.disabledReason}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Suspend / Enable Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleCompanyStatus(comp.id, !isCompActive)}
                            title={isCompActive ? 'Suspend Business' : 'Enable Business'}
                            className={`p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
                              isCompActive
                                ? 'bg-slate-800 hover:bg-amber-950/60 text-slate-400 hover:text-amber-300 border-slate-700'
                                : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-300 border-slate-700'
                            }`}
                          >
                            {isCompActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>

                          {/* Edit Settings */}
                          <button
                            type="button"
                            onClick={() => setEditingCompany(comp)}
                            title="Edit Business Details & Header Settings"
                            className="p-2 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Enter Workspace */}
                          <button
                            type="button"
                            onClick={() => handleEnterWorkspace(comp.id)}
                            title="Enter this company workspace"
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-white text-slate-950 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Enter</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={companies.length <= 1}
                            onClick={() => setDeletingCompany(comp)}
                            title={companies.length <= 1 ? 'Cannot delete only remaining company' : 'Permanently Delete Workspace'}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 hover:border-rose-900/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: CROSS-TENANT USERS DIRECTORY                         */}
        {/* ============================================================ */}
        {activeAdminTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-400" />
                  <span>Platform Users ({filteredUsers.length})</span>
                </h1>
                <p className="text-xs text-slate-400">Unified oversight of user accounts and access levels across all registered companies</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search name, email, role..."
                    className="pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden w-48 sm:w-60"
                  />
                </div>

                <select
                  value={userCompanyFilter}
                  onChange={e => setUserCompanyFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-300 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden font-medium"
                >
                  <option value="ALL">All Workspaces</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.tradeName || c.name}</option>
                  ))}
                </select>

                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-300 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden font-medium"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="SALESPERSON">SALESPERSON</option>
                  <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                  <option value="AUDITOR">AUDITOR</option>
                </select>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
                <Users className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-medium">No user records matching the filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(({ user, company }, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg ${user.avatarBg || 'bg-slate-800 border border-slate-700'} text-slate-200 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                          {user.avatarText || user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">{user.name}</h3>
                          <p className="text-xs text-slate-400 font-mono">{user.role}</p>
                        </div>
                      </div>

                      {user.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-950/60 text-rose-400 border border-rose-800/60 shrink-0">
                          Disabled
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                      {user.email && (
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      )}
                      {user.phone && (
                        <p className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{user.phone}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[160px] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{company.tradeName || company.name}</span>
                      </span>
                      <button
                        onClick={() => handleEnterWorkspace(company.id)}
                        className="text-slate-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: SECURITY AUDIT TRAIL & SYSTEM LOGS                  */}
        {/* ============================================================ */}
        {activeAdminTab === 'audit_logs' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  <span>Audit Trail ({filteredAuditLogs.length})</span>
                </h1>
                <p className="text-xs text-slate-400">Cryptographically verifiable immutable audit records for authentication, company lifecycle, and data mutations</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={e => setAuditSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden w-48 sm:w-60"
                  />
                </div>

                <button
                  onClick={handleExportAuditCSV}
                  disabled={filteredAuditLogs.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900 rounded-2xl border border-slate-800">
                <Activity className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-medium">No audit logs match your search.</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Timestamp</th>
                        <th className="py-3 px-4 font-semibold">Action</th>
                        <th className="py-3 px-4 font-semibold">Module</th>
                        <th className="py-3 px-4 font-semibold">Actor</th>
                        <th className="py-3 px-4 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {filteredAuditLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-850/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {log.module}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-white">
                            {log.userName}
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-md truncate">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW: PLATFORM IDENTITY & BRANDING                          */}
        {/* ============================================================ */}
        {activeAdminTab === 'branding' && (
          <PlatformBrandingView />
        )}

        {/* ============================================================ */}
        {/* VIEW: PLATFORM ANNOUNCEMENTS & BROADCASTS                    */}
        {/* ============================================================ */}
        {activeAdminTab === 'announcements' && (
          <PlatformAnnouncementsView />
        )}

        {/* ============================================================ */}
        {/* VIEW 5: MASTER CREDENTIALS & IDENTITY                       */}
        {/* ============================================================ */}
        {activeAdminTab === 'security' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-400" />
                <span>Super Admin Identity & Security</span>
              </h1>
              <p className="text-xs text-slate-400">Master executive credentials and security configuration synchronized with Cloud Firestore</p>
            </div>

            {/* Profile Identity Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${superAdminAuth.avatarBg || 'bg-slate-800 border border-slate-700'} text-white font-mono font-bold text-lg flex items-center justify-center shrink-0`}>
                    {superAdminAuth.avatarText || 'KS'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">{superAdminAuth.name || 'Kuldeep Siraswar'}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        SUPER ADMIN
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{superAdminAuth.roleTitle || 'Platform Super Administrator'}</p>
                    <p className="text-[11px] text-slate-400">{superAdminAuth.department || 'Executive Governance & Board'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer self-start sm:self-center"
                >
                  <UserCog className="w-4 h-4 text-slate-400" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Profile Details List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">Email: <strong className="text-white font-mono">{superAdminAuth.email || 'kuldeep.siraswar@gmail.com'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">Phone: <strong className="text-white font-mono">{superAdminAuth.phone || '+91 99999 88888'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Master PIN: <span className="font-mono text-white">•••• (Active)</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Status: <strong className="text-emerald-400">Enforced & Synchronized</strong></span>
                </div>
              </div>
            </div>

            {/* Master Credentials Change Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Change Master Password & 4-Digit Unlock PIN</h3>
                  <p className="text-xs text-slate-400">Updates will synchronize immediately to Google Cloud Firestore</p>
                </div>
              </div>

              <form onSubmit={handleUpdateMasterCredentials} className="space-y-4">
                {credentialsMsg && (
                  <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    credentialsMsg.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                  }`}>
                    {credentialsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <span>{credentialsMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Current Super Admin Password or Master PIN *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentAuth ? 'text' : 'password'}
                      value={currentAuthInput}
                      onChange={e => setCurrentAuthInput(e.target.value)}
                      placeholder="Enter current password or PIN to authorize"
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentAuth(!showCurrentAuth)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentAuth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      New Master Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        placeholder="Leave blank to keep unchanged"
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      New 4-Digit Master PIN (Optional)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPinInput}
                      onChange={e => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="e.g. 9999"
                      className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingAuth}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-950 bg-white hover:bg-slate-100 transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isUpdatingAuth ? 'Updating & Syncing...' : 'Update Master Credentials'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 6: CLOUD FIRESTORE & DATA BACKUPS                      */}
        {/* ============================================================ */}
        {activeAdminTab === 'database' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-400" />
                <span>Cloud Firestore & Backups</span>
              </h1>
              <p className="text-xs text-slate-400">Persistent database state and disaster recovery snapshots</p>
            </div>

            {/* Cloud Status Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Google Cloud Firestore</h2>
                    <p className="text-xs text-slate-400">Database ID: <span className="font-mono text-slate-300">ai-studio-zookabussinesssm-847724b3-bd62-4e2e-8d54-4fd3f6a5a143</span></p>
                  </div>
                </div>

                <button
                  onClick={() => triggerCloudSync()}
                  disabled={isCloudSyncing}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin text-slate-300' : 'text-slate-400'}`} />
                  <span>{isCloudSyncing ? 'Synchronizing...' : 'Force Cloud Sync'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Sync Status</p>
                  <p className={`text-sm font-semibold mt-1 ${cloudSyncStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {cloudSyncStatus === 'online' ? 'Online & Active' : 'Cached Locally'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Total Partitions</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {companies.length} Workspaces
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Last Replication</p>
                  <p className="text-sm font-mono text-slate-300 mt-1">
                    {lastCloudSyncTime ? lastCloudSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}
                  </p>
                </div>
              </div>
            </div>

            {/* Disaster Recovery Master Backup Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">System Snapshot Export (.JSON)</h3>
                  <p className="text-xs text-slate-400">Downloads all workspace partitions, ledgers, products, users, and audit records</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Generates a single self-contained JSON archive of the entire multi-tenant database structure. Useful for air-gapped archiving, local compliance, or disaster recovery testing.
              </p>

              <div className="pt-1">
                <button
                  onClick={handleExportMasterBackup}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download System Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* SUPER ADMIN MASTER GOVERNANCE FOOTER                          */}
      {/* ------------------------------------------------------------- */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-5 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo config={platformConfig} size="sm" className="shadow-xs shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{platformConfig?.appName || 'Zooka Business'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {platformConfig?.brandBadgeText || 'PRO'}
                </span>
                <span className="text-slate-700">•</span>
                <span className="text-[11px] text-slate-400">Master Governance Console</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'} • Multi-Tenant Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveAdminTab('branding')}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>Branding</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('announcements')}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5 text-slate-500" />
              <span>Broadcasts</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('database')}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>Firestore Sync</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------- */}
      
      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Super Admin Profile Modal */}
      {isEditProfileModalOpen && (
        <EditSuperAdminProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          superAdminAuth={superAdminAuth}
          onSave={updateSuperAdminProfile}
        />
      )}

      {/* Edit Company Workspace Modal */}
      {editingCompany && (
        <EditCompanyWorkspaceModal
          company={editingCompany}
          isOpen={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={editBusinessProfile}
        />
      )}

      {/* Delete Company Confirmation Modal */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Delete Workspace</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently remove <strong className="text-white">{deletingCompany.tradeName || deletingCompany.name}</strong>?
              </p>
              <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/40 text-[11px] text-rose-300">
                This permanently deletes all invoices, inventory products, ledgers, and transactions for this company in Google Cloud Firestore.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =================================================================== */
/* SUB-MODAL 1: EDIT SUPER ADMIN PROFILE                               */
/* =================================================================== */
interface EditSuperAdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  superAdminAuth: SuperAdminAuthData;
  onSave: (updates: Partial<SuperAdminAuthData>, currentAuth: string) => { success: boolean; error?: string };
}

const EditSuperAdminProfileModal: React.FC<EditSuperAdminProfileModalProps> = ({
  isOpen,
  onClose,
  superAdminAuth,
  onSave
}) => {
  const [name, setName] = useState(superAdminAuth.name || 'Kuldeep Siraswar');
  const [email, setEmail] = useState(superAdminAuth.email || 'kuldeep.siraswar@gmail.com');
  const [phone, setPhone] = useState(superAdminAuth.phone || '+91 99999 88888');
  const [roleTitle, setRoleTitle] = useState(superAdminAuth.roleTitle || 'Platform Super Administrator');
  const [department, setDepartment] = useState(superAdminAuth.department || 'Executive Governance & Board');
  const [avatarBg, setAvatarBg] = useState(superAdminAuth.avatarBg || SUPER_ADMIN_AVATAR_THEMES[0].class);
  const [avatarText, setAvatarText] = useState(superAdminAuth.avatarText || 'KS');
  const [currentAuth, setCurrentAuth] = useState('');
  const [showCurrentAuth, setShowCurrentAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Super Admin Name cannot be blank.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!currentAuth.trim()) {
      setErrorMessage('Please enter your Current Password or PIN to authorize changes.');
      return;
    }

    setIsSaving(true);
    const result = onSave(
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        roleTitle: roleTitle.trim(),
        department: department.trim(),
        avatarBg,
        avatarText: avatarText.trim() || 'KS'
      },
      currentAuth
    );
    setIsSaving(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to update profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-800 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Edit Super Admin Details</h3>
              <p className="text-xs text-slate-400">Master executive profile governing all workspaces</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Display Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => {
                setName(e.target.value);
                const parts = e.target.value.trim().split(' ').filter(Boolean);
                if (parts.length > 0) {
                  setAvatarText(parts.map(p => p[0]).join('').slice(0, 2).toUpperCase());
                }
              }}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role Title</label>
              <input
                type="text"
                value={roleTitle}
                onChange={e => setRoleTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Avatar Theme Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Avatar Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {SUPER_ADMIN_AVATAR_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setAvatarBg(theme.class)}
                  className={`h-9 rounded-lg ${theme.class} flex items-center justify-center font-mono font-bold text-xs cursor-pointer transition-all ${
                    avatarBg === theme.class ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {avatarBg === theme.class && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Security Authorization Field */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Authorize Changes with Current Password or PIN *
            </label>
            <div className="relative">
              <input
                type={showCurrentAuth ? 'text' : 'password'}
                required
                value={currentAuth}
                onChange={e => setCurrentAuth(e.target.value)}
                placeholder="Enter current password or PIN"
                className="w-full pl-3.5 pr-10 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowCurrentAuth(!showCurrentAuth)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showCurrentAuth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =================================================================== */
/* SUB-MODAL 2: EDIT COMPANY WORKSPACE                                 */
/* =================================================================== */
interface EditCompanyWorkspaceModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyId: string, profileUpdates: Partial<BusinessProfile>, companyUpdates?: Partial<Company>) => void;
}

const EditCompanyWorkspaceModal: React.FC<EditCompanyWorkspaceModalProps> = ({
  company,
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(company.name || '');
  const [tradeName, setTradeName] = useState(company.tradeName || '');
  const [gstin, setGstin] = useState(company.gstin || '');
  const [pan, setPan] = useState(company.pan || '');
  const [state, setState] = useState(company.state || 'Maharashtra');
  const [city, setCity] = useState(company.city || '');
  const [address, setAddress] = useState(company.address || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [email, setEmail] = useState(company.email || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const foundState = INDIAN_STATES.find(s => s.name === state);

    onSave(
      company.id,
      {
        name: name.trim(),
        tradeName: tradeName.trim() || name.trim(),
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        state,
        stateCode: foundState ? foundState.code : company.stateCode,
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
      },
      {
        name: name.trim(),
        tradeName: tradeName.trim() || name.trim(),
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        state,
        stateCode: foundState ? foundState.code : company.stateCode,
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
      }
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-800 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Configure Workspace Profile</h3>
              <p className="text-xs text-slate-400">{company.tradeName || company.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Trade / Brand Name</label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCU9603R1ZM"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 font-mono uppercase focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PAN</label>
              <input
                type="text"
                value={pan}
                onChange={e => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 font-mono uppercase focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Registered Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
