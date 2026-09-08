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
  { id: 'purple', name: 'Royal Purple', class: 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-700' },
  { id: 'emerald', name: 'Emerald Teal', class: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700' },
  { id: 'sapphire', name: 'Sapphire Blue', class: 'bg-gradient-to-tr from-blue-600 via-indigo-700 to-slate-900' },
  { id: 'amber', name: 'Amber Bronze', class: 'bg-gradient-to-tr from-amber-600 via-orange-600 to-red-700' },
  { id: 'rose', name: 'Rose Velvet', class: 'bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-800' },
  { id: 'obsidian', name: 'Obsidian Dark', class: 'bg-gradient-to-tr from-slate-800 via-zinc-900 to-black' },
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-purple-500 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* TOP MASTER GOVERNANCE HEADER                                   */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-purple-900/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Portal Title with Platform Custom Branding */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => setActiveAdminTab('branding')} title="Click to customize Platform Identity & Branding">
              <AppLogo config={platformConfig} size="md" className="shadow-lg shadow-purple-900/40 ring-2 ring-purple-400/40 transition-transform group-hover:scale-105" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs" title="Super Admin Master Authority">
                <Crown className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-tight">
                  {platformConfig?.appName || 'Zooka Business'}
                </span>
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {platformConfig?.brandBadgeText || 'PRO'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>Super Admin</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[260px] sm:max-w-md">
                {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'} • Master Governance
              </p>
            </div>
          </div>

          {/* Quick Stats & Cloud DB Sync Badge */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Firestore:</span>
              <span className={`flex items-center gap-1.5 font-semibold ${cloudSyncStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {cloudSyncStatus === 'online' ? 'Online & Synced' : 'Cached'}
              </span>
            </div>

            <button
              onClick={() => triggerCloudSync()}
              disabled={isCloudSyncing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Force sync cloud Firestore database"
            >
              <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

          {/* Actions & Profile Controls */}
          <div className="flex items-center gap-2.5">
            {/* Super Admin User Profile Chip */}
            <div 
              onClick={() => setIsEditProfileModalOpen(true)}
              className="flex items-center gap-2.5 pl-2.5 pr-3 py-1 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 cursor-pointer transition-all"
              title="Click to edit Super Admin profile details"
            >
              <div className={`w-7 h-7 rounded-lg ${superAdminAuth.avatarBg || 'bg-gradient-to-tr from-purple-600 to-indigo-600'} text-amber-300 text-xs font-black flex items-center justify-center shadow-xs`}>
                {superAdminAuth.avatarText || 'KS'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                  {superAdminAuth.name || 'Kuldeep Siraswar'}
                </p>
                <p className="text-[10px] text-purple-300/80 leading-tight truncate max-w-[130px]">
                  {superAdminAuth.email || 'kuldeep.siraswar@gmail.com'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logoutSuperAdmin}
              className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white transition-all border border-rose-800/60 cursor-pointer"
              title="Lock Super Admin session and exit"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveAdminTab('overview')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Platform Overview</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('workspaces')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'workspaces'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Workspaces & Tenants</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-purple-300">
                {companies.length}
              </span>
            </button>

            <button
              onClick={() => setActiveAdminTab('users')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cross-Tenant Users</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-purple-300">
                {crossTenantUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveAdminTab('branding')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'branding'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Platform Branding</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('announcements')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'announcements'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast Banners</span>
              {platformConfig?.announcement?.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Announcement banner is active" />
              )}
            </button>

            <button
              onClick={() => setActiveAdminTab('audit_logs')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'audit_logs'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Security Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('security')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'security'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Master Credentials</span>
            </button>

            <button
              onClick={() => setActiveAdminTab('database')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeAdminTab === 'database'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Cloud Firestore & Backup</span>
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/80 to-slate-900 border border-purple-900/50 p-6 sm:p-8 shadow-2xl">
              <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Master Super Admin Console • {platformConfig?.appName || 'Zooka Business'}
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="relative group cursor-pointer" 
                      onClick={() => setActiveAdminTab('branding')}
                      title="Click to customize Platform Identity"
                    >
                      <AppLogo config={platformConfig} size="lg" className="shadow-xl ring-2 ring-purple-500/40 shrink-0 transition-transform group-hover:scale-105" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                        <Crown className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                        <span>Welcome back, {superAdminAuth.name || 'Kuldeep Siraswar'}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {platformConfig?.brandBadgeText || 'PRO'}
                        </span>
                      </h1>
                      <p className="text-xs text-purple-300/90 font-medium mt-0.5">
                        {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Platform Master Console governing {companies.length} business {companies.length === 1 ? 'workspace' : 'workspaces'} with multi-tenant Google Cloud Firestore real-time replication.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Workspace</span>
                  </button>

                  <button
                    onClick={handleExportMasterBackup}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>Export Master Backup</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Core KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Workspaces</p>
                  <p className="text-2xl font-black text-white mt-1">{crossTenantStats.totalWorkspaces}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">{crossTenantStats.activeWorkspaces} Active • {crossTenantStats.suspendedWorkspaces} Suspended</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cross-Tenant Users</p>
                  <p className="text-2xl font-black text-white mt-1">{crossTenantUsers.length}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Staff & Admin credentials</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cross-Tenant Invoices</p>
                  <p className="text-2xl font-black text-white mt-1">{crossTenantStats.totalInvoicesCount}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Total platform billing documents</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Firestore Cloud DB</p>
                  <p className="text-sm font-black text-white mt-1 flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {cloudSyncStatus === 'online' ? 'Connected & Healthy' : 'Local Cached'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {lastCloudSyncTime ? `Synced at ${lastCloudSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Database className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Governance Controls: Custom Branding & Header Announcements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branding Quick Card */}
              <div className="bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 rounded-2xl p-5 border border-purple-900/40 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Platform Identity & Branding</h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Brand Name: <strong className="text-purple-300">{platformConfig?.appName || 'Zooka Business'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    {platformConfig?.brandBadgeText || 'PRO'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-900/30">
                  <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                    {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
                  </span>
                  <button
                    onClick={() => setActiveAdminTab('branding')}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <span>Customize Brand</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Announcement Quick Card */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl p-5 border border-indigo-900/40 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Broadcast Announcement Banner</h3>
                      <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${platformConfig?.announcement?.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>Status: <strong className={platformConfig?.announcement?.enabled ? 'text-emerald-400' : 'text-slate-400'}>{platformConfig?.announcement?.enabled ? 'Active Under Header' : 'Inactive'}</strong></span>
                      </p>
                    </div>
                  </div>
                  {platformConfig?.announcement?.badgeText && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                      {platformConfig.announcement.badgeText}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-indigo-900/30">
                  <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                    {platformConfig?.announcement?.title || 'No active announcement'}
                  </span>
                  <button
                    onClick={() => setActiveAdminTab('announcements')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <span>Manage Broadcast</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Workspaces Hub Grid */}
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    <span>Business Workspaces Quick Switcher</span>
                  </h2>
                  <p className="text-xs text-slate-400">Instantly switch active tenant workspace or inspect partition state</p>
                </div>

                <button
                  onClick={() => setActiveAdminTab('workspaces')}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
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
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-purple-500 bg-purple-950/20 ring-1 ring-purple-500/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">
                            {comp.tradeName || comp.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{comp.name}</p>
                        </div>
                        {isCompActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800 shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-950/60 text-rose-400 border border-rose-800 shrink-0">
                            Suspended
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-400 mb-4">
                        {comp.gstin && (
                          <p className="font-mono text-[11px] text-slate-300">GSTIN: {comp.gstin}</p>
                        )}
                        <p className="truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {comp.city ? `${comp.city}, ` : ''}{comp.state}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setEditingCompany(comp);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                        >
                          Configure
                        </button>

                        <button
                          onClick={() => handleEnterWorkspace(comp.id)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
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
              <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Platform Governance & Security Architecture</h3>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Strict Multi-Tenancy Partitioning:</strong> Each business workspace data (ledgers, invoices, inventory) is completely isolated by partition IDs and cannot cross-contaminate.
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Master Authority Protection:</strong> Super Admin credentials exist above all tenant accounts and cannot be modified or suspended by tenant company admins.
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Cloud Firestore Integrity:</strong> All master credential changes and company lifecycle operations replicate directly to the persistent Firestore systemState document.
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Audit Events Preview */}
              <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Recent Security Audit Logs</h3>
                  </div>
                  <button
                    onClick={() => setActiveAdminTab('audit_logs')}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2.5">
                  {auditLogs.slice(0, 4).map((log, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{log.action}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 uppercase font-mono">
                            {log.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
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
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <span>Registered Business Workspaces ({filteredCompanies.length})</span>
                </h1>
                <p className="text-xs text-slate-400">Configure business profiles, tax configurations, and operational switches</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, GSTIN, city..."
                    className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-hidden w-48 sm:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="DISABLED">Suspended Only</option>
                </select>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Workspace</span>
                </button>
              </div>
            </div>

            {/* Companies List */}
            {filteredCompanies.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900/60 rounded-3xl border border-slate-800">
                <Building2 className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-semibold">No business profiles matching your filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompanies.map(comp => {
                  const isCurrent = comp.id === currentCompanyId;
                  const isCompActive = comp.isActive ?? true;

                  return (
                    <div
                      key={comp.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-purple-500/80 bg-purple-950/20 ring-1 ring-purple-500/30'
                          : isCompActive
                          ? 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                          : 'border-rose-900/40 bg-rose-950/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Company Info */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-white">
                              {comp.tradeName || comp.name}
                            </span>
                            {comp.tradeName && comp.tradeName !== comp.name && (
                              <span className="text-xs text-slate-400 font-medium">
                                ({comp.name})
                              </span>
                            )}

                            {/* Status Badge */}
                            {isCompActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-950/80 text-rose-400 border border-rose-800/80 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5" /> Suspended
                              </span>
                            )}

                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-900/60 text-purple-300 border border-purple-700/60">
                                Current Active
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            {comp.gstin && (
                              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-200">
                                GSTIN: {comp.gstin}
                              </span>
                            )}
                            {comp.pan && (
                              <span className="font-mono text-[11px]">PAN: {comp.pan}</span>
                            )}
                            {comp.state && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {comp.city ? `${comp.city}, ` : ''}{comp.state} ({comp.stateCode})
                              </span>
                            )}
                            {comp.phone && (
                              <span className="flex items-center gap-1">
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
                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isCompActive
                                ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isCompActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>

                          {/* Edit Settings */}
                          <button
                            type="button"
                            onClick={() => setEditingCompany(comp)}
                            title="Edit Business Details & Header Settings"
                            className="p-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Enter Workspace */}
                          <button
                            type="button"
                            onClick={() => handleEnterWorkspace(comp.id)}
                            title="Enter this company workspace"
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
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
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-rose-900/40"
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
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Cross-Tenant Staff & Users Directory ({filteredUsers.length})</span>
                </h1>
                <p className="text-xs text-slate-400">Unified oversight of user accounts and permissions across all registered companies</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search name, email, role..."
                    className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-hidden w-48 sm:w-60"
                  />
                </div>

                <select
                  value={userCompanyFilter}
                  onChange={e => setUserCompanyFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
                >
                  <option value="ALL">All Workspaces</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.tradeName || c.name}</option>
                  ))}
                </select>

                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
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
              <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900/60 rounded-3xl border border-slate-800">
                <Users className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-semibold">No user records matching the filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(({ user, company }, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${user.avatarBg || 'bg-indigo-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}>
                          {user.avatarText || user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                          <p className="text-xs text-purple-300 font-semibold">{user.role}</p>
                        </div>
                      </div>

                      {user.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800 shrink-0">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800 shrink-0">
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
                      <span className="text-slate-500 truncate max-w-[160px]">
                        🏢 {company.tradeName || company.name}
                      </span>
                      <button
                        onClick={() => handleEnterWorkspace(company.id)}
                        className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3 h-3" />
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
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span>Master Security Audit Trail ({filteredAuditLogs.length})</span>
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
                    className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-hidden w-48 sm:w-60"
                  />
                </div>

                <button
                  onClick={handleExportAuditCSV}
                  disabled={filteredAuditLogs.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900/60 rounded-3xl border border-slate-800">
                <Activity className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-semibold">No audit logs match your search.</p>
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">Timestamp</th>
                        <th className="py-3 px-4 font-bold">Action</th>
                        <th className="py-3 px-4 font-bold">Module</th>
                        <th className="py-3 px-4 font-bold">Actor</th>
                        <th className="py-3 px-4 font-bold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredAuditLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-medium">
                            {log.module}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-bold text-white">
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
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                <span>Master Super Admin Identity & Credentials</span>
              </h1>
              <p className="text-xs text-slate-400">Master executive credentials and security configuration replicated to Cloud Firestore</p>
            </div>

            {/* Profile Identity Card */}
            <div className="bg-gradient-to-br from-slate-900 via-purple-950/70 to-slate-900 rounded-3xl p-6 sm:p-8 border border-purple-800/50 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl ${superAdminAuth.avatarBg || 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-700'} text-amber-300 font-black text-xl flex items-center justify-center shadow-xl ring-2 ring-purple-400/40 shrink-0`}>
                    {superAdminAuth.avatarText || 'KS'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">{superAdminAuth.name || 'Kuldeep Siraswar'}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-200 border border-purple-400/40">
                        SUPER ADMIN
                      </span>
                    </div>
                    <p className="text-xs text-purple-200 font-semibold">{superAdminAuth.roleTitle || 'Platform Super Administrator'}</p>
                    <p className="text-[11px] text-purple-300/80">{superAdminAuth.department || 'Executive Governance & Board'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-center"
                >
                  <UserCog className="w-4 h-4 text-amber-300" />
                  <span>Edit Profile Details</span>
                </button>
              </div>

              {/* Profile Details List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-purple-900/40">
                <div className="flex items-center gap-2.5 text-purple-200">
                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">Email: <strong className="text-white">{superAdminAuth.email || 'kuldeep.siraswar@gmail.com'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-purple-200">
                  <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">Phone: <strong className="text-white">{superAdminAuth.phone || '+91 99999 88888'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-purple-200">
                  <KeyRound className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Master PIN: <span className="font-mono text-white font-bold">•••• (Configured)</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-purple-200">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Status: <strong className="text-emerald-400 font-bold">Active & Authority Enforced</strong></span>
                </div>
              </div>
            </div>

            {/* Master Credentials Change Card */}
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Change Master Password & 4-Digit Unlock PIN</h3>
                  <p className="text-xs text-slate-400">Updates will synchronize immediately to Google Cloud Firestore</p>
                </div>
              </div>

              <form onSubmit={handleUpdateMasterCredentials} className="space-y-4">
                {credentialsMsg && (
                  <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    credentialsMsg.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}>
                    {credentialsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <span>{credentialsMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Current Super Admin Password or Master PIN *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentAuth ? 'text' : 'password'}
                      value={currentAuthInput}
                      onChange={e => setCurrentAuthInput(e.target.value)}
                      placeholder="Enter current password or PIN to authorize"
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      New Master Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        placeholder="Leave blank to keep unchanged"
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      New 4-Digit Master PIN (Optional)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPinInput}
                      onChange={e => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="e.g. 9999"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingAuth}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/30 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                <span>Cloud Firestore Multi-Tenant Storage & Backups</span>
              </h1>
              <p className="text-xs text-slate-400">Persistent database state and disaster recovery snapshots</p>
            </div>

            {/* Cloud Status Card */}
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Google Cloud Firestore</h2>
                    <p className="text-xs text-slate-400">Database ID: <span className="font-mono text-slate-300">ai-studio-zookabussinesssm-847724b3-bd62-4e2e-8d54-4fd3f6a5a143</span></p>
                  </div>
                </div>

                <button
                  onClick={() => triggerCloudSync()}
                  disabled={isCloudSyncing}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin text-white' : ''}`} />
                  <span>{isCloudSyncing ? 'Synchronizing...' : 'Force Cloud Sync'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sync Status</p>
                  <p className={`text-base font-black mt-1 ${cloudSyncStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {cloudSyncStatus === 'online' ? 'Online & Active' : 'Cached Locally'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Partitions</p>
                  <p className="text-base font-black text-white mt-1">
                    {companies.length} Workspaces
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Replication</p>
                  <p className="text-base font-black text-slate-300 mt-1">
                    {lastCloudSyncTime ? lastCloudSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}
                  </p>
                </div>
              </div>
            </div>

            {/* Disaster Recovery Master Backup Card */}
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Export Complete Multi-Tenant System Snapshot (JSON)</h3>
                  <p className="text-xs text-slate-400">Downloads all company partitions, invoices, parties, products, users, and audit records</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Generates a single self-contained JSON backup archive of the entire multi-company database structure. Useful for air-gapped archiving, local compliance, or disaster restore testing.
              </p>

              <div className="pt-2">
                <button
                  onClick={handleExportMasterBackup}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-900/30 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Multi-Company Snapshot (.JSON)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* SUPER ADMIN MASTER GOVERNANCE FOOTER                          */}
      {/* ------------------------------------------------------------- */}
      <footer className="mt-auto border-t border-purple-900/40 bg-slate-900/90 backdrop-blur-md py-5 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo config={platformConfig} size="sm" className="shadow-md ring-1 ring-purple-500/30 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white">{platformConfig?.appName || 'Zooka Business'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-950 text-purple-300 border border-purple-800/60 font-bold">
                  {platformConfig?.brandBadgeText || 'PRO'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-300 font-semibold">Master Governance Console</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'} • Multi-Tenant Google Cloud Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveAdminTab('branding')}
              className="text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>Platform Branding</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('announcements')}
              className="text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Broadcast Banners</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('database')}
              className="text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
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
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Workspace?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently remove <strong className="text-white">{deletingCompany.tradeName || deletingCompany.name}</strong>?
              </p>
              <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-900/60 text-[11px] text-rose-300">
                ⚠️ <strong>Warning:</strong> This permanently deletes all invoices, inventory products, ledgers, and transactions for this company in Google Cloud Firestore.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Workspace</span>
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
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-800 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Super Admin Details</h3>
              <p className="text-xs text-slate-400">Master executive profile governing all workspaces</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Full Display Name *</label>
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
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Role Title</label>
              <input
                type="text"
                value={roleTitle}
                onChange={e => setRoleTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Avatar Theme Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">Avatar Gradient Theme</label>
            <div className="grid grid-cols-6 gap-2">
              {SUPER_ADMIN_AVATAR_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setAvatarBg(theme.class)}
                  className={`h-9 rounded-xl ${theme.class} flex items-center justify-center text-white font-bold text-xs cursor-pointer transition-all ${
                    avatarBg === theme.class ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {avatarBg === theme.class && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Security Authorization Field */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-amber-400 mb-1">
              Authorize Changes with Current Password or PIN *
            </label>
            <div className="relative">
              <input
                type={showCurrentAuth ? 'text' : 'password'}
                required
                value={currentAuth}
                onChange={e => setCurrentAuth(e.target.value)}
                placeholder="Enter current password or PIN"
                className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl border border-amber-500/50 bg-slate-950 text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
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
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-800 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configure Workspace Profile</h3>
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
              <label className="block text-xs font-bold text-slate-300 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Trade / Brand Name</label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCU9603R1ZM"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">PAN</label>
              <input
                type="text"
                value={pan}
                onChange={e => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">State</label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Registered Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
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
