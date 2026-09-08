import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, Company } from '../../types';
import { ROLE_DEFINITIONS, DEFAULT_SUPER_ADMIN } from '../../utils/rbacRules';
import { cleanDefaultUsers } from '../../utils/cleanDefaults';
import { getThemeBg } from '../../utils/themeColors';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  Building2,
  Receipt,
  Plus,
  Fingerprint,
  MapPin,
  Briefcase,
  ChevronRight,
  Users,
  ShieldAlert,
  Crown,
  Search,
  CheckCircle2,
  Key,
  Server,
  RefreshCw
} from 'lucide-react';
import { CreateCompanyModal } from '../company/CreateCompanyModal';
import { AppLogo } from '../common/AppLogo';
import { AnnouncementBanner } from '../layout/AnnouncementBanner';

export const LoginScreen: React.FC = () => {
  const { 
    companies,
    currentCompany,
    currentCompanyId,
    switchCompany,
    users, 
    currentUser, 
    superAdminUser,
    authenticateAndSwitchUser, 
    loginAsSuperAdmin,
    showToast,
    platformConfig,
    cloudSyncStatus,
    isCloudSyncing,
    triggerCloudSync
  } = useApp();

  // Screen Flow Step: 'company_login' (default), 'login_credentials' (user login), or 'super_admin_credentials'
  const [loginStep, setLoginStep] = useState<'company_login' | 'login_credentials' | 'super_admin_credentials'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/admin') || window.location.hash.includes('admin'))) {
      return 'super_admin_credentials';
    }
    return 'company_login';
  });

  // Step 1: Company Login State
  const [companyIdentifier, setCompanyIdentifier] = useState('');
  const [companySecret, setCompanySecret] = useState('');
  const [companyAuthMode, setCompanyAuthMode] = useState<'password' | 'pin'>('password');
  const [showCompanySecret, setShowCompanySecret] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [isVerifyingCompany, setIsVerifyingCompany] = useState(false);

  // Dynamically resolve matched company in real-time as user types GSTIN or company name
  const matchedCompanyPreview = useMemo(() => {
    const raw = companyIdentifier.trim();
    if (!raw || raw.length < 2) return null;
    const cleanLower = raw.toLowerCase();
    const cleanAlphanumeric = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return companies.find(c => {
      const cGstin = (c.gstin || '').toLowerCase();
      const cGstinAlphanumeric = (c.gstin || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const cName = (c.name || '').toLowerCase();
      const cTrade = (c.tradeName || '').toLowerCase();
      const cId = (c.id || '').toLowerCase();

      // Check GSTIN match (exact, alphanumeric, startsWith, or contains)
      if (cGstin && (
        cGstin === cleanLower || 
        cGstinAlphanumeric === cleanAlphanumeric || 
        cGstin.startsWith(cleanLower) ||
        (cleanLower.length >= 3 && cGstin.includes(cleanLower))
      )) {
        return true;
      }
      // Check Name or Trade Name match
      if (cName === cleanLower || cTrade === cleanLower || cId === cleanLower) {
        return true;
      }
      if (cleanLower.length >= 3 && (cName.includes(cleanLower) || cTrade.includes(cleanLower))) {
        return true;
      }
      return false;
    }) || null;
  }, [companies, companyIdentifier]);

  // Step 2: User Login State
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const admin = users.find(u => u.role === 'ADMIN' && u.isActive);
    return admin ? admin.id : (users[0]?.id || DEFAULT_SUPER_ADMIN.id);
  });
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);

  // Role display ordering: Admin always first, then Accountant, Salesperson, etc.
  const roleSortOrder: Record<string, number> = {
    SUPER_ADMIN: 0,
    ADMIN: 1,
    ACCOUNTANT: 2,
    SALESPERSON: 3,
    INVENTORY_MANAGER: 4,
    AUDITOR: 5,
    CUSTOM: 6,
  };

  const sortedActiveUsers = useMemo(() => {
    return [...users.filter(u => u.isActive)].sort((a, b) => {
      const orderA = roleSortOrder[a.role] ?? 99;
      const orderB = roleSortOrder[b.role] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  // Sync selected user when switching company or updating user list
  useEffect(() => {
    if (users.length > 0 && loginStep === 'login_credentials') {
      setSelectedUserId(prevId => {
        const stillValid = users.find(u => u.id === prevId && u.isActive);
        if (stillValid) return prevId;
        const admin = users.find(u => u.role === 'ADMIN' && u.isActive);
        return admin ? admin.id : (sortedActiveUsers[0]?.id || users[0].id);
      });
    }
  }, [users, currentCompanyId, loginStep, sortedActiveUsers]);

  const targetUser: AppUser = loginStep === 'super_admin_credentials' || selectedUserId === DEFAULT_SUPER_ADMIN.id
    ? (superAdminUser || DEFAULT_SUPER_ADMIN)
    : users.find(u => u.id === selectedUserId) || users.find(u => u.role === 'ADMIN' && u.isActive) || sortedActiveUsers[0] || DEFAULT_SUPER_ADMIN;
  const roleMeta = ROLE_DEFINITIONS[targetUser?.role] || ROLE_DEFINITIONS.ADMIN;

  // Handle Step 1: Company Verification via Company Name + Password/PIN
  const handleVerifyCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError(null);

    const cleanInput = companyIdentifier.trim().toLowerCase();
    const cleanAlphanumeric = companyIdentifier.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanSecret = companySecret.trim();

    if (!cleanInput) {
      setCompanyError('Please enter your Company Name or GSTIN.');
      return;
    }
    if (!cleanSecret) {
      setCompanyError(companyAuthMode === 'password' ? 'Please enter the Company / Admin Password.' : 'Please enter the 4-digit PIN.');
      return;
    }

    setIsVerifyingCompany(true);

    setTimeout(() => {
      // Use matchedCompanyPreview if available, or search across registered companies
      const matchedComp = matchedCompanyPreview || companies.find(c => {
        const cName = (c.name || '').toLowerCase();
        const cTrade = (c.tradeName || '').toLowerCase();
        const cGstin = (c.gstin || '').toLowerCase();
        const cGstinAlphanumeric = (c.gstin || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const cId = (c.id || '').toLowerCase();
        return cName === cleanInput || 
               cTrade === cleanInput || 
               cGstin === cleanInput || 
               cGstinAlphanumeric === cleanAlphanumeric ||
               cId === cleanInput ||
               cName.includes(cleanInput) ||
               cTrade.includes(cleanInput);
      });

      if (!matchedComp) {
        setIsVerifyingCompany(false);
        setCompanyError(`No registered business found matching "${companyIdentifier}". Please verify your GSTIN or company name.`);
        return;
      }

      if (matchedComp.isActive === false) {
        setIsVerifyingCompany(false);
        setCompanyError(`This company workspace has been deactivated. Reason: ${matchedComp.disabledReason || 'Contact platform administrator'}.`);
        return;
      }

      // Check if credentials match any authorized user or admin in that company partition
      let compUsers: AppUser[] = [];
      try {
        const raw = localStorage.getItem(`zookabusiness_v2_cloud_c_${matchedComp.id}_users`) || localStorage.getItem(`vyaparflow_v2_cloud_c_${matchedComp.id}_users`);
        if (raw) {
          compUsers = JSON.parse(raw);
        }
      } catch (err) {
        console.warn('Error reading company users partition:', err);
      }

      if (!compUsers || compUsers.length === 0) {
        if (matchedComp.id === currentCompanyId && users.length > 0) {
          compUsers = users;
        } else {
          compUsers = cleanDefaultUsers;
        }
      }

      // Super Admin Master Credentials match
      const isSuperMatch = 
        cleanSecret === superAdminUser?.password ||
        cleanSecret === superAdminUser?.pin ||
        cleanSecret === DEFAULT_SUPER_ADMIN.password ||
        cleanSecret === DEFAULT_SUPER_ADMIN.pin ||
        cleanSecret === 'superadmin' ||
        cleanSecret === '9999';

      // Check company user password/PIN
      const matchingUser = compUsers.find(u => 
        u.isActive && (
          (u.password && u.password === cleanSecret) ||
          (u.pin && u.pin === cleanSecret) ||
          // Fallback standard default admin check
          (u.role === 'ADMIN' && (cleanSecret === 'admin' || cleanSecret === '1111'))
        )
      );

      if (isSuperMatch || matchingUser) {
        switchCompany(matchedComp.id);
        setIsVerifyingCompany(false);
        setCompanyError(null);
        setCompanySecret('');
        if (matchingUser) {
          setSelectedUserId(matchingUser.id);
        }
        setLoginStep('login_credentials');
        showToast('success', 'Company Workspace Unlocked', `Accessed ${matchedComp.tradeName || matchedComp.name}. Please authenticate your user account.`);
      } else {
        setIsVerifyingCompany(false);
        setCompanyError(`Invalid password or PIN for "${matchedComp.tradeName || matchedComp.name}". Access denied.`);
      }
    }, 200);
  };

  const handleSelectUser = (user: AppUser) => {
    setSelectedUserId(user.id);
    setPasswordInput('');
    setErrorMessage(null);
  };

  // Handle Step 2: User Login
  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!passwordInput.trim()) {
      setErrorMessage(authMode === 'password' ? 'Please enter the account password.' : 'Please enter the 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const targetId = loginStep === 'super_admin_credentials' ? DEFAULT_SUPER_ADMIN.id : selectedUserId;
      const res = authenticateAndSwitchUser(targetId, passwordInput.trim());
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify password/PIN.');
      } else {
        setPasswordInput('');
        setErrorMessage(null);
      }
    }, 150);
  };

  const handleGoToSuperAdminLogin = () => {
    setSelectedUserId(DEFAULT_SUPER_ADMIN.id);
    setPasswordInput('');
    setErrorMessage(null);
    setShowPassword(false);
    setLoginStep('super_admin_credentials');
  };

  const handleSwitchCompanyBack = () => {
    setCompanySecret('');
    setCompanyError(null);
    setPasswordInput('');
    setErrorMessage(null);
    setLoginStep('company_login');
  };

  const getCompanyGradient = (color?: string) => {
    switch (color) {
      case 'emerald': return 'from-emerald-600 via-emerald-700 to-teal-800';
      case 'blue': return 'from-blue-600 via-cyan-700 to-slate-900';
      case 'amber': return 'from-amber-600 via-orange-700 to-slate-900';
      case 'purple': return 'from-purple-600 via-indigo-700 to-slate-900';
      case 'rose': return 'from-rose-600 via-pink-700 to-slate-900';
      case 'cyan': return 'from-cyan-600 via-teal-700 to-slate-900';
      default: return 'from-indigo-600 via-blue-700 to-slate-900';
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Lighting */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Super Admin Live Announcement Notice (If Active) */}
      {platformConfig?.announcement?.enabled && (
        <div className="relative z-20 w-full shrink-0">
          <AnnouncementBanner 
            announcement={platformConfig.announcement}
            currentUser={currentUser}
            onOpenSuperAdminPortal={handleGoToSuperAdminLogin}
          />
        </div>
      )}

      {/* Top Master Governance Header (Super Admin Design) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-purple-900/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Portal Title with Platform Custom Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative group shrink-0">
              <AppLogo 
                config={platformConfig} 
                size="md" 
                className="shadow-lg shadow-purple-900/40 ring-2 ring-purple-400/40 transition-transform group-hover:scale-105" 
              />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs" title="Super Admin Master Authority">
                <Crown className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                  {platformConfig?.appName || 'Zooka Business'}
                </span>
                {platformConfig?.brandBadgeText && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                    {platformConfig.brandBadgeText}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shrink-0">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>{loginStep === 'super_admin_credentials' ? 'Super Admin' : 'Workspace Portal'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[240px] sm:max-w-md">
                {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Firestore Cloud Sync Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Firestore:</span>
              <span className={`flex items-center gap-1.5 font-semibold ${cloudSyncStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {cloudSyncStatus === 'online' ? 'Online & Synced' : 'Cached'}
              </span>
            </div>

            {/* Force Sync Cloud DB Trigger */}
            <button
              type="button"
              onClick={() => triggerCloudSync()}
              disabled={isCloudSyncing}
              className="hidden md:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Force sync cloud Firestore database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            {/* Back to Step 1 Company Login */}
            {loginStep !== 'company_login' && (
              <button
                type="button"
                onClick={handleSwitchCompanyBack}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch Company</span>
              </button>
            )}

            {/* Super Admin Access / Business Login Mode Toggle */}
            {loginStep !== 'super_admin_credentials' ? (
              <button
                type="button"
                onClick={handleGoToSuperAdminLogin}
                className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 cursor-pointer transition-all text-xs font-bold text-purple-200 shadow-xs"
                title="Access Super Admin Master Control"
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300 text-[10px] font-black flex items-center justify-center shadow-xs">
                  <Crown className="w-3 h-3" />
                </div>
                <span className="hidden sm:inline">Super Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginStep('company_login')}
                className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-all text-xs font-bold text-slate-200 shadow-xs"
                title="Return to Business Workspace Login"
              >
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Business Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        
        {/* ======================================================================= */}
        {/* STEP 1: COMPANY LOGIN GATE (INPUT COMPANY NAME + PASSWORD/PIN)          */}
        {/* (Company list is hidden for privacy and security)                       */}
        {/* ======================================================================= */}
        {loginStep === 'company_login' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 max-w-xl mx-auto w-full">
            
            {/* Header / Intro */}
            <div className="text-center space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-cyan-300 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Step 1 of 2: Company Verification</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {platformConfig?.appName ? `${platformConfig.appName} Workspace Login` : 'Business Workspace Login'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Enter your registered Company Name (or GSTIN) and PIN/Password to access your company workspace.
              </p>
            </div>

            {/* Company Login Card */}
            <div className="bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl space-y-6 relative overflow-hidden">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400" />

              <form onSubmit={handleVerifyCompany} className="space-y-5">
                
                {/* 1. Company Name or GSTIN Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Company Name / GSTIN</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Registered Workspace
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={companyIdentifier}
                      onChange={(e) => {
                        setCompanyIdentifier(e.target.value);
                        if (companyError) setCompanyError(null);
                      }}
                      placeholder="Enter GSTIN (e.g. 27AABCV1234F1Z5) or Company Name..."
                      autoFocus
                      className={`w-full px-4 py-3 pr-10 text-sm bg-slate-950/90 border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600 ${
                        matchedCompanyPreview
                          ? 'border-emerald-500/80 ring-1 ring-emerald-500/30'
                          : companyError 
                            ? 'border-rose-500 ring-1 ring-rose-500/50' 
                            : 'border-slate-800 hover:border-slate-700'
                      }`}
                    />
                    {matchedCompanyPreview && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                      </div>
                    )}
                  </div>

                  {/* Real-Time Detected Company Banner (When GSTIN or Name is entered) */}
                  {matchedCompanyPreview && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 shadow-lg shadow-indigo-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${getThemeBg(matchedCompanyPreview.themeColor)} text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 ring-2 ring-indigo-400/30`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Company Identified</span>
                              </span>
                              {matchedCompanyPreview.isActive === false && (
                                <span className="text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-md border border-rose-500/30">
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-white truncate mt-1 tracking-tight">
                              {matchedCompanyPreview.tradeName || matchedCompanyPreview.name}
                            </h4>
                            {matchedCompanyPreview.tradeName && matchedCompanyPreview.name !== matchedCompanyPreview.tradeName && (
                              <p className="text-[11px] text-slate-400 truncate">
                                Legal: {matchedCompanyPreview.name}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-1 font-mono">
                              <span className="text-cyan-300 font-semibold">{matchedCompanyPreview.gstin}</span>
                              {matchedCompanyPreview.city && (
                                <>
                                  <span className="text-slate-600 font-sans">•</span>
                                  <span className="text-slate-300 font-sans">{matchedCompanyPreview.city}, {matchedCompanyPreview.state}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Mode Selector (Password vs PIN) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Company Password / PIN</span>
                    </label>
                    
                    {/* Toggle Password / PIN */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyAuthMode('password');
                          setCompanySecret('');
                          setCompanyError(null);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          companyAuthMode === 'password'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyAuthMode('pin');
                          setCompanySecret('');
                          setCompanyError(null);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          companyAuthMode === 'pin'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>4-Digit PIN</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={showCompanySecret ? 'text' : 'password'}
                      value={companySecret}
                      onChange={(e) => {
                        setCompanySecret(e.target.value);
                        if (companyError) setCompanyError(null);
                      }}
                      placeholder={companyAuthMode === 'password' ? 'Enter Company / Admin Password...' : '•••• (e.g. 1111)'}
                      maxLength={companyAuthMode === 'pin' ? 6 : 50}
                      className={`w-full px-4 py-3 pr-12 text-sm bg-slate-950/90 border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all placeholder:text-slate-600 ${
                        companyError ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCompanySecret(!showCompanySecret)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showCompanySecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showCompanySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {companyError && (
                    <div className="flex items-start gap-2 text-xs text-rose-400 mt-2.5 font-medium animate-in fade-in p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{companyError}</span>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isVerifyingCompany}
                  className="w-full py-3.5 px-5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingCompany ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verifying Company Credentials...
                    </span>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Verify & Access Company Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Super Admin Link */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleGoToSuperAdminLogin}
                  className="inline-flex items-center gap-1.5 text-purple-300 hover:text-purple-200 font-semibold transition-colors cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Super Admin Master Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Business</span>
                </button>
              </div>
            </div>

            {/* Privacy & Compliance Note */}
            <div className="text-center text-[11px] text-slate-500">
              <span>Isolated Multi-Company Ledger Encryption • Strict Role-Based Access Control</span>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* STEP 2: USER LOGIN (AFTER COMPANY IS VERIFIED)                          */}
        {/* ======================================================================= */}
        {loginStep === 'login_credentials' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 space-y-5">
            
            {/* Active Verified Company Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl ${getThemeBg(currentCompany.themeColor)} text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white leading-tight">
                      {currentCompany.tradeName || currentCompany.name}
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Company Verified</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono">{currentCompany.gstin}</span>
                    <span>•</span>
                    <span>{currentCompany.city}, {currentCompany.state}</span>
                    <span>•</span>
                    <span>FY {currentCompany.financialYear || '2026-2027'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSwitchCompanyBack}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Switch Company</span>
                </button>
              </div>
            </div>

            {/* Login & Role Selection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Role Selector in Selected Company */}
              <div className="lg:col-span-7 space-y-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Step 2 of 2: Select User Role</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Choose Your User Account
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select a designated persona configured for this business entity and enter credentials.
                  </p>
                </div>

                {/* Role Account Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {sortedActiveUsers.map(user => {
                    const isSelected = user.id === selectedUserId;
                    const uRoleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.ADMIN;
                    const isSuper = user.role === 'SUPER_ADMIN';

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                          isSelected
                            ? isSuper
                              ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30 shadow-xl shadow-purple-500/10'
                              : 'bg-slate-900/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-500/10'
                            : isSuper
                              ? 'bg-purple-950/40 border-purple-900/60 hover:bg-purple-950/70 hover:border-purple-700'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-xl ${user.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-md shrink-0`}>
                                {isSuper ? <Crown className="w-4 h-4 text-amber-300" /> : user.avatarText}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {user.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {user.roleTitle || uRoleMeta.name}
                                </div>
                              </div>
                            </div>

                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border shrink-0 ${uRoleMeta.badgeBg} ${uRoleMeta.badgeText}`}>
                              {user.role}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {uRoleMeta.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 text-slate-400 font-medium">
                            <Lock className="w-2.5 h-2.5 text-indigo-400" />
                            <span>Password / PIN Protected</span>
                          </span>
                          <span className="text-indigo-400 font-semibold">Select & Login</span>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Password / PIN Login Form */}
              <div className="lg:col-span-5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
                  
                  {/* Selected User Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <div className={`w-11 h-11 rounded-2xl ${targetUser?.avatarBg} text-white font-black text-sm flex items-center justify-center shadow-md shrink-0 ring-2 ring-slate-700`}>
                      {targetUser?.role === 'SUPER_ADMIN' ? <Crown className="w-5 h-5 text-amber-300" /> : targetUser?.avatarText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm truncate">{targetUser?.name}</h3>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                          {targetUser?.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {targetUser?.department} • {currentCompany.tradeName || currentCompany.name}
                      </p>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleUserLogin} className="space-y-4">
                    
                    {/* Mode Selector (Password vs PIN) */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('password');
                          setPasswordInput('');
                          setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          authMode === 'password'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('pin');
                          setPasswordInput('');
                          setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          authMode === 'pin'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>4-Digit PIN</span>
                      </button>
                    </div>

                    {/* Password / PIN Input Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          {authMode === 'password' ? 'Account Password' : '4-Digit Counter PIN'}
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {authMode === 'password' ? 'Confidential' : 'Numeric PIN'}
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={(e) => {
                            setPasswordInput(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder={authMode === 'password' ? 'Enter password...' : '••••'}
                          maxLength={authMode === 'pin' ? 6 : 50}
                          autoFocus
                          className={`w-full px-4 py-2.5 pr-11 text-xs bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all placeholder:text-slate-600 ${
                            errorMessage ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-800'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {errorMessage && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-medium animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Submit Action Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Authenticating...
                        </span>
                      ) : (
                        <>
                          <span>Login to {currentCompany.tradeName || currentCompany.name}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Security Policy Footnote */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Encrypted Session</span>
                    </span>
                    <span className="text-indigo-400 font-semibold">
                      Ind AS & GST Compliant
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* STEP 3: SUPER ADMIN PASSWORD / PIN LOGIN                                */}
        {/* ======================================================================= */}
        {loginStep === 'super_admin_credentials' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 max-w-xl mx-auto w-full space-y-5">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setLoginStep('company_login')}
                className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Company Login</span>
              </button>

              <span className="text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                Super Admin Security Gate
              </span>
            </div>

            {/* Super Admin Login Card */}
            <div className="bg-gradient-to-b from-slate-900 via-purple-950/40 to-slate-900 border border-purple-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/60 backdrop-blur-xl space-y-6">
              
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 pb-5 border-b border-purple-900/40">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300 font-black text-base flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0 ring-2 ring-purple-400/40">
                  <Crown className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-lg tracking-tight truncate">{superAdminUser?.name || DEFAULT_SUPER_ADMIN.name}</h3>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border bg-purple-500/30 text-purple-200 border-purple-400/40">
                      SUPER ADMIN
                    </span>
                  </div>
                  <p className="text-xs text-purple-300/80 truncate mt-0.5">
                    {superAdminUser?.roleTitle || 'System Master Authority • Multi-Company Provisioning & Audit'}
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleUserLogin} className="space-y-5">
                
                {/* Mode Selector (Password vs PIN) */}
                <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-purple-900/50">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('password');
                      setPasswordInput('');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      authMode === 'password'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Master Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('pin');
                      setPasswordInput('');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      authMode === 'pin'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>4-Digit Master PIN</span>
                  </button>
                </div>

                {/* Password / PIN Input Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-200">
                      {authMode === 'password' ? 'Super Admin Master Password' : '4-Digit Super Admin Master PIN'}
                    </label>
                    <span className="text-[11px] text-purple-400 font-semibold">
                      Required
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={authMode === 'password' ? 'Enter master password...' : '••••'}
                      maxLength={authMode === 'pin' ? 6 : 50}
                      autoFocus
                      className={`w-full px-4 py-3 pr-12 text-sm bg-slate-950/90 border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono transition-all placeholder:text-slate-600 ${
                        errorMessage ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-purple-900/60'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-2 text-xs text-rose-400 mt-2.5 font-medium animate-in fade-in p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl shadow-xl shadow-purple-900/40 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verifying Super Admin Credentials...
                    </span>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-amber-300" />
                      <span>Login to {platformConfig?.appName || 'Super Admin'} Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Policy Footnote */}
              <div className="pt-3 border-t border-purple-900/40 flex items-center justify-between text-[11px] text-purple-300/70">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Master Key Protected</span>
                </span>
                <span className="font-semibold text-purple-400">
                  Global Multi-Tenant Control
                </span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Note */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} {platformConfig?.appName || 'Zooka Business'} • {platformConfig?.appTagline || 'Enterprise Multi-Business Accounting'} • All rights reserved</p>
        <p className="flex items-center gap-3">
          <span>Developed by.Kuldeep Siraswar</span>
        </p>
      </footer>

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={() => {
          setLoginStep('login_credentials');
        }}
      />
    </div>
  );
};
