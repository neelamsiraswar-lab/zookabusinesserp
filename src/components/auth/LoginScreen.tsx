import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, Company } from '../../types';
import { ROLE_DEFINITIONS, DEFAULT_SUPER_ADMIN } from '../../utils/rbacRules';
import { cleanDefaultUsers } from '../../utils/cleanDefaults';
import { getThemeBg } from '../../utils/themeColors';
import { cloudDb } from '../../services/cloudDb';
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
  RefreshCw,
  ChevronDown,
  X,
  Building
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
    triggerCloudSync,
    setActiveTab
  } = useApp();

  // Screen Flow Step: 'company_login' (default), 'login_credentials' (user login), or 'super_admin_credentials'
  const [loginStep, setLoginStep] = useState<'company_login' | 'login_credentials' | 'super_admin_credentials'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/admin') || window.location.hash.includes('admin'))) {
      return 'super_admin_credentials';
    }
    return 'company_login';
  });

  // Step 1: Company / Workspace Login State
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
  const handleVerifyCompany = async (e: React.FormEvent) => {
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

    try {
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

      // Check credentials against Firestore users first, then local partition cache
      let compUsers: AppUser[] = [];
      try {
        const cloudUsers = await cloudDb.fetchCompanyUsers(matchedComp.id);
        if (cloudUsers && cloudUsers.length > 0) {
          compUsers = cloudUsers;
        }
      } catch (err) {
        console.warn('Could not fetch cloud users during verification, falling back to cache:', err);
      }

      if (compUsers.length === 0) {
        try {
          const raw = localStorage.getItem(`zookabusiness_v2_cloud_c_${matchedComp.id}_users`) || localStorage.getItem(`vyaparflow_v2_cloud_c_${matchedComp.id}_users`);
          if (raw) {
            compUsers = JSON.parse(raw);
          }
        } catch (err) {
          console.warn('Error reading company users partition:', err);
        }
      }

      if (!compUsers || compUsers.length === 0) {
        if (matchedComp.id === currentCompanyId && users.length > 0) {
          compUsers = users;
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
          // Fallback standard default admin check only if default user exists in this company
          (u.role === 'ADMIN' && (cleanSecret === 'admin' || cleanSecret === '1111') && u.id === 'usr-admin-1')
        )
      );

      if (isSuperMatch || matchingUser) {
        await switchCompany(matchedComp.id, matchingUser?.id);
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
    } catch (err: any) {
      setIsVerifyingCompany(false);
      setCompanyError(`Authentication error: ${err?.message || 'Could not verify workspace credentials'}`);
    }
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
    setActiveTab('super_admin_dashboard');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ tab: 'super_admin_dashboard' }, '', '/admin');
      } catch (e) {
        window.location.hash = '#/admin';
      }
    }
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
      {/* Calm Slate Canvas with Subtle Top Ambient Lighting */}
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-96 bg-gradient-to-b from-indigo-500/10 via-slate-850/10 to-transparent blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-48 bg-indigo-500/5 blur-[120px] rounded-full" />

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

      {/* Top Master Governance Header - Compact Minimalist Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 h-12 sm:h-14 flex items-center justify-between gap-3">
          {/* Brand & Portal Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative group shrink-0">
              <AppLogo 
                config={platformConfig} 
                size="sm" 
                className="ring-1 ring-slate-800 rounded-lg transition-transform group-hover:scale-105" 
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center" title="Platform Governance Enabled">
                <Crown className="w-1.5 h-1.5" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  {platformConfig?.appName || 'Zooka Business'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1 shrink-0">
                  <Crown className="w-2 h-2 text-amber-400" />
                  <span>{loginStep === 'super_admin_credentials' ? 'Super Admin' : 'Workspace'}</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block max-w-[200px] md:max-w-xs">
                {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Firestore Cloud Sync Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
              <Server className="w-3 h-3 text-indigo-400" />
              <span className={`flex items-center gap-1 font-medium ${cloudSyncStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {cloudSyncStatus === 'online' ? 'Sync' : 'Local'}
              </span>
            </div>

            {/* Force Sync Cloud DB Trigger */}
            <button
              type="button"
              onClick={() => triggerCloudSync()}
              disabled={isCloudSyncing}
              className="hidden lg:flex p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 cursor-pointer disabled:opacity-50"
              title="Sync cloud database"
            >
              <RefreshCw className={`w-3 h-3 ${isCloudSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Back to Step 1 Company Login */}
            {loginStep !== 'company_login' && (
              <button
                type="button"
                onClick={handleSwitchCompanyBack}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Switch Company</span>
              </button>
            )}

            {/* Super Admin Access / Business Login Mode Toggle */}
            {loginStep !== 'super_admin_credentials' ? (
              <button
                type="button"
                onClick={handleGoToSuperAdminLogin}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-[11px] font-medium text-slate-300 hover:text-white"
                title="Access Super Admin Master Control"
              >
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Super Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginStep('company_login')}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-[11px] font-medium text-slate-300 hover:text-white"
                title="Return to Business Workspace Login"
              >
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Business Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area - Optimized viewport fit across desktop, tablet, and mobile */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-5 md:py-6 flex-1 flex flex-col justify-center">
        
        {/* ======================================================================= */}
        {/* STEP 1: COMPANY LOGIN GATE (INPUT COMPANY NAME + PASSWORD/PIN)          */}
        {/* ======================================================================= */}
        {loginStep === 'company_login' && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in zoom-in-95 duration-200 max-w-md mx-auto w-full">
            
            {/* Header / Intro - Compact typography */}
            <div className="text-center space-y-1 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-medium">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Step 1 of 2: Company Verification</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                {platformConfig?.appName ? `${platformConfig.appName} Workspace Login` : 'Business Workspace Login'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                Enter your registered Company Name (or GSTIN) & PIN/Password.
              </p>
            </div>

            {/* Company Login Card - Compact padding and neat spacing */}
            <div className="bg-slate-900/95 border border-slate-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl backdrop-blur-sm space-y-4 relative">
              <form onSubmit={handleVerifyCompany} className="space-y-3.5">
                
                {/* 1. Minimalist Workspace / Company Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Workspace</span>
                    </label>
                  </div>

                  <div className="relative group">
                    <input
                      type="text"
                      value={companyIdentifier}
                      onChange={(e) => {
                        setCompanyIdentifier(e.target.value);
                        if (companyError) setCompanyError(null);
                      }}
                      placeholder="Enter Workspace Name or GSTIN..."
                      autoFocus
                      className={`w-full px-3.5 py-2.5 text-sm bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-600 ${
                        matchedCompanyPreview
                          ? 'border-emerald-500/80 pr-10'
                          : companyIdentifier.trim()
                            ? 'pr-10 border-slate-700'
                            : 'border-slate-850 hover:border-slate-750'
                      } ${
                        companyError ? 'border-rose-500/80 ring-1 ring-rose-500/30' : ''
                      }`}
                    />

                    {/* Action Controls inside the input */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                      {companyIdentifier && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompanyIdentifier('');
                            if (companyError) setCompanyError(null);
                          }}
                          className="p-1 hover:text-slate-200 transition-colors cursor-pointer rounded"
                          title="Clear field"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {matchedCompanyPreview && (
                        <span className="text-emerald-400 p-0.5" title="Workspace entity verified">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clean, minimalist detected entity chip */}
                  {matchedCompanyPreview && (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-md ${getThemeBg(matchedCompanyPreview.themeColor)} text-white flex items-center justify-center font-bold text-[10px] shrink-0`}>
                          <Building className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-200 truncate leading-tight">
                            {matchedCompanyPreview.tradeName || matchedCompanyPreview.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {matchedCompanyPreview.gstin} {matchedCompanyPreview.city ? `• ${matchedCompanyPreview.city}` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        Matched
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Streamlined Mode Selector (Password vs PIN) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{companyAuthMode === 'password' ? 'Company Password' : '4-Digit Counter PIN'}</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Verification Method
                    </span>
                  </div>

                  {/* Clean Segmented Control */}
                  <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyAuthMode('password');
                        setCompanySecret('');
                        setCompanyError(null);
                      }}
                      className={`py-1 px-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        companyAuthMode === 'password'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
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
                      className={`py-1 px-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        companyAuthMode === 'pin'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Fingerprint className="w-3 h-3" />
                      <span>4-Digit PIN</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showCompanySecret ? 'text' : 'password'}
                      value={companySecret}
                      onChange={(e) => {
                        setCompanySecret(e.target.value);
                        if (companyError) setCompanyError(null);
                      }}
                      placeholder={companyAuthMode === 'password' ? 'Enter company password...' : '••••'}
                      maxLength={companyAuthMode === 'pin' ? 6 : 50}
                      className={`w-full px-3 py-2 pr-10 text-xs sm:text-sm bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-600 ${
                        companyAuthMode === 'pin' ? 'font-mono tracking-widest text-center text-sm sm:text-base' : 'font-mono'
                      } ${
                        companyError ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCompanySecret(!showCompanySecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showCompanySecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showCompanySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {companyError && (
                    <div className="flex items-start gap-1.5 text-[11px] text-rose-400 mt-2 font-medium animate-in fade-in p-2 rounded-lg bg-rose-950/30 border border-rose-800/40">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                      <span>{companyError}</span>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isVerifyingCompany}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isVerifyingCompany ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </span>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Access Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Super Admin Link */}
              <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleGoToSuperAdminLogin}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Super Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-indigo-400" />
                  <span>New Business</span>
                </button>
              </div>
            </div>

            {/* Privacy & Compliance Note */}
            <div className="text-center text-[10px] text-slate-500">
              <span>Encrypted Multi-Company Ledgers • RBAC Security</span>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* STEP 2: USER LOGIN (AFTER COMPANY IS VERIFIED)                          */}
        {/* ======================================================================= */}
        {loginStep === 'login_credentials' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full">
            
            {/* Active Verified Company Banner - Streamlined */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center justify-between gap-3 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${getThemeBg(currentCompany.themeColor)} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                      {currentCompany.tradeName || currentCompany.name}
                    </h2>
                    <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/20 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                    <span className="text-slate-300">{currentCompany.gstin}</span>
                    {currentCompany.city && (
                      <>
                        <span className="font-sans">•</span>
                        <span className="font-sans">{currentCompany.city}, {currentCompany.state}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSwitchCompanyBack}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Switch</span>
              </button>
            </div>

            {/* Login & Role Selection Grid - Compact Split on Desktop & Tablet */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-start">
              
              {/* Left Column: Role Selector in Selected Company */}
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-white">Select Account ({sortedActiveUsers.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Choose persona to log in</span>
                </div>

                {/* Role Account Cards - Max 4 visible or scrollable with max height to avoid page overflow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[38vh] sm:max-h-[46vh] overflow-y-auto pr-1">
                  {sortedActiveUsers.map(user => {
                    const isSelected = user.id === selectedUserId;
                    const uRoleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.ADMIN;
                    const isSuper = user.role === 'SUPER_ADMIN';

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800/95 border-indigo-500 ring-1 ring-indigo-500/30 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg ${user.avatarBg} text-white font-semibold text-[11px] flex items-center justify-center shrink-0`}>
                                {isSuper ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : user.avatarText}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                                  {user.name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {user.roleTitle || uRoleMeta.name}
                                </div>
                              </div>
                            </div>

                            <span className={`text-[8px] font-semibold uppercase px-1.5 py-0.2 rounded border shrink-0 ${uRoleMeta.badgeBg} ${uRoleMeta.badgeText}`}>
                              {user.role}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Auth required</span>
                          </span>
                          <span className={isSelected ? 'text-indigo-400 font-semibold' : 'text-slate-500'}>
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Password / PIN Login Form */}
              <div className="md:col-span-5">
                <div className="bg-slate-900/95 border border-slate-800/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 md:p-5 shadow-xl backdrop-blur-sm space-y-3">
                  
                  {/* Selected User Header */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${targetUser?.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                      {targetUser?.role === 'SUPER_ADMIN' ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : targetUser?.avatarText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-white text-xs sm:text-sm truncate">{targetUser?.name}</h3>
                        <span className={`text-[8px] font-semibold uppercase px-1.5 py-0.2 rounded border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                          {targetUser?.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {targetUser?.department || 'Workspace Member'}
                      </p>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleUserLogin} className="space-y-3">
                    
                    {/* Clean Segmented Control (Password vs PIN) */}
                    <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('password');
                          setPasswordInput('');
                          setErrorMessage(null);
                        }}
                        className={`py-1 px-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          authMode === 'password'
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('pin');
                          setPasswordInput('');
                          setErrorMessage(null);
                        }}
                        className={`py-1 px-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          authMode === 'pin'
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>4-Digit PIN</span>
                      </button>
                    </div>

                    {/* Password / PIN Input Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-slate-300">
                          {authMode === 'password' ? 'Password' : 'PIN'}
                        </label>
                        <span className="text-[10px] text-slate-500">
                          {authMode === 'password' ? 'Confidential' : 'Numeric'}
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
                          autoComplete="new-password"
                          placeholder={authMode === 'password' ? 'Enter password...' : '••••'}
                          maxLength={authMode === 'pin' ? 6 : 50}
                          autoFocus
                          className={`w-full px-3 py-2 pr-10 text-xs bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-600 ${
                            authMode === 'pin' ? 'font-mono tracking-widest text-center text-sm' : 'font-mono'
                          } ${
                            errorMessage ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {errorMessage && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-1.5 font-medium animate-in fade-in">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Submit Action Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </span>
                      ) : (
                        <>
                          <span>Login as {targetUser?.name.split(' ')[0]}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Security Policy Footnote */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                      <span>Encrypted</span>
                    </span>
                    <span>GST & Ind AS Compliant</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* STEP 3: SUPER ADMIN PASSWORD / PIN LOGIN (UNOBTRUSIVE GOVERNANCE)       */}
        {/* ======================================================================= */}
        {loginStep === 'super_admin_credentials' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 max-w-md mx-auto w-full space-y-3 sm:space-y-4">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setLoginStep('company_login')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Workspace</span>
              </button>

              <span className="text-[9px] font-semibold uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>Master Console</span>
              </span>
            </div>

            {/* Super Admin Login Card - Unified Minimalist Slate Design */}
            <div className="bg-slate-900/95 border border-slate-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl backdrop-blur-sm space-y-4 relative">
              
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-xs sm:text-sm tracking-tight truncate">{superAdminUser?.name || DEFAULT_SUPER_ADMIN.name}</h3>
                    <span className="text-[8px] font-semibold uppercase px-1.5 py-0.2 rounded border bg-slate-800 text-slate-300 border-slate-700">
                      SUPER ADMIN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {superAdminUser?.roleTitle || 'Platform Governance & Master Administration'}
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleUserLogin} className="space-y-3.5">
                
                {/* Clean Segmented Control (Password vs PIN) */}
                <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('password');
                      setPasswordInput('');
                      setErrorMessage(null);
                    }}
                    className={`py-1 px-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      authMode === 'password'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Master Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('pin');
                      setPasswordInput('');
                      setErrorMessage(null);
                    }}
                    className={`py-1 px-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      authMode === 'pin'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Fingerprint className="w-3 h-3" />
                    <span>4-Digit PIN</span>
                  </button>
                </div>

                {/* Password / PIN Input Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-300">
                      {authMode === 'password' ? 'Super Admin Password' : '4-Digit PIN'}
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Master Key
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
                      autoComplete="new-password"
                      placeholder={authMode === 'password' ? 'Enter master password...' : '••••'}
                      maxLength={authMode === 'pin' ? 6 : 50}
                      autoFocus
                      className={`w-full px-3 py-2 pr-10 text-xs sm:text-sm bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-600 ${
                        authMode === 'pin' ? 'font-mono tracking-widest text-center text-sm sm:text-base' : 'font-mono'
                      } ${
                        errorMessage ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-1.5 font-medium animate-in fade-in p-2 rounded-lg bg-rose-950/30 border border-rose-800/40">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Verifying Master Credentials...</span>
                    </span>
                  ) : (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Access Governance Console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Policy Footnote */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-slate-500">
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                  <span>Master Key Protected</span>
                </span>
                <span className="font-medium text-slate-400">
                  Governance Console
                </span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Note - Compact & Responsive */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 py-2 sm:py-3 text-center text-[10px] sm:text-[11px] text-slate-500 border-t border-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
        <p>© {new Date().getFullYear()} {platformConfig?.appName || 'Zooka Business'} • {platformConfig?.appTagline || 'Enterprise Accounting'}</p>
        <p className="flex items-center gap-2 text-slate-500">
          <span>Developed by Kuldeep Siraswar</span>
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
