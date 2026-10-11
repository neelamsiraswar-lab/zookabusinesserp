import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_SUPER_ADMIN } from '../../utils/rbacRules';
import { AppLogo } from '../common/AppLogo';
import { 
  Crown, 
  KeyRound, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Server, 
  Mail, 
  UserCheck, 
  Briefcase,
  Building2,
  HelpCircle
} from 'lucide-react';

interface SuperAdminLoginScreenProps {
  onSwitchToCompanyLogin?: () => void;
}

export const SuperAdminLoginScreen: React.FC<SuperAdminLoginScreenProps> = ({ 
  onSwitchToCompanyLogin 
}) => {
  const { 
    superAdminAuth, 
    superAdminUser, 
    authenticateSuperAdmin, 
    authenticateAndSwitchUser,
    platformConfig, 
    cloudSyncStatus,
    currentUser,
    isAuthenticated,
    currentCompany,
    setActiveTab
  } = useApp();

  const [emailInput, setEmailInput] = useState<string>(() => {
    return superAdminAuth?.email || DEFAULT_SUPER_ADMIN.email || 'kuldeep.siraswar@gmail.com';
  });
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [secretInput, setSecretInput] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isCapsOn, setIsCapsOn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<boolean>(false);

  // Sync default email if superAdminAuth updates
  useEffect(() => {
    if (superAdminAuth?.email && !emailInput) {
      setEmailInput(superAdminAuth.email);
    }
  }, [superAdminAuth?.email, emailInput]);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsOn(e.getModifierState('CapsLock'));
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = emailInput.trim();
    const cleanSecret = secretInput.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter the Super Admin email or username.');
      return;
    }

    if (!cleanSecret) {
      setErrorMessage(authMode === 'password' ? 'Please enter your Super Admin password.' : 'Please enter your 4-digit PIN.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Use authenticateSuperAdmin if available, or authenticateAndSwitchUser
      let result: { success: boolean; error?: string } = { success: false, error: 'Authentication failed' };
      if (typeof authenticateSuperAdmin === 'function') {
        result = authenticateSuperAdmin(cleanSecret, cleanEmail);
      } else {
        result = authenticateAndSwitchUser(DEFAULT_SUPER_ADMIN.id, cleanSecret);
      }

      setIsLoading(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your Super Admin email, password, or PIN.');
      } else {
        setSecretInput('');
        setErrorMessage(null);
      }
    }, 180);
  };

  const handleBackToWorkspaceOrCompany = () => {
    if (onSwitchToCompanyLogin) {
      onSwitchToCompanyLogin();
    } else {
      setActiveTab('dashboard');
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState({}, '', '/');
        } catch (e) {
          window.location.hash = '';
        }
      }
    }
  };

  const isCompanyUserLoggedIn = isAuthenticated && currentUser.role !== 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Calm Slate Canvas with Subtle Top Ambient Lighting */}
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-96 bg-gradient-to-b from-indigo-500/10 via-slate-850/10 to-transparent blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-48 bg-indigo-500/5 blur-[120px] rounded-full" />

      {/* Top Brand Header - Compact Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-3 sm:px-5 pt-3 sm:pt-4 pb-1 sm:pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AppLogo 
            size="sm" 
            className="ring-1 ring-slate-800 rounded-lg shrink-0" 
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold tracking-tight text-sm sm:text-base text-white">
                {platformConfig?.appName || 'Zooka Business'}
              </span>
              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/80 flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {platformConfig?.appTagline || 'Platform Governance & Enterprise Management'}
            </p>
          </div>
        </div>

        {/* Action Link to Workspace Login */}
        <button
          type="button"
          onClick={handleBackToWorkspaceOrCompany}
          className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{isCompanyUserLoggedIn ? 'Return to Workspace' : 'Company Login'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </header>

      {/* Central Super Admin Login Form Card - Compact Height */}
      <main className="relative z-10 w-full max-w-md mx-auto px-3 sm:px-4 py-2 sm:py-4 my-auto">
        
        {/* Notice for Users Already Logged in as Company Members */}
        {isCompanyUserLoggedIn && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm flex items-center justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-slate-200 truncate">
                  Active: <strong className="text-white">{currentCompany?.tradeName || currentCompany?.name}</strong>
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Logged in as {currentUser.name} ({currentUser.role}). Enter Super Admin credentials.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackToWorkspaceOrCompany}
              className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {/* Focused Authentication Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm space-y-3.5">
          
          {/* Card Header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                  Super Administrator Gateway
                </h1>
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700 shrink-0">
                  Level 0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Master Governance & Multi-Company Ledger Control
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-3">
            
            {/* Super Admin Email / Identifier */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-200 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>Master Email or Username</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  Administrator ID
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="off"
                  placeholder="kuldeep.siraswar@gmail.com or superadmin"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Streamlined Authentication Mode Selector (Clean Segmented Control) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-200">
                  Verification Method
                </label>
                <span className="text-[10px] text-slate-500">
                  Select credential type
                </span>
              </div>
              
              <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password');
                    setSecretInput('');
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 px-2 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
                    setSecretInput('');
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 px-2 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'pin'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Fingerprint className="w-3 h-3" />
                  <span>4-Digit PIN</span>
                </button>
              </div>
            </div>

            {/* Password / PIN Input Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-200">
                  {authMode === 'password' ? 'Super Admin Master Password' : '4-Digit Master PIN'}
                </label>
                {isCapsOn && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    Caps Lock is ON
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secretInput}
                  onChange={(e) => {
                    setSecretInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onKeyUp={handleKeyUp}
                  autoComplete="new-password"
                  placeholder={authMode === 'password' ? 'Enter master password...' : '••••'}
                  maxLength={authMode === 'pin' ? 6 : 60}
                  autoFocus
                  className={`w-full px-3 py-2 pr-10 text-xs sm:text-sm bg-slate-950 border rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-600 ${
                    authMode === 'pin' ? 'font-mono tracking-widest text-center text-sm sm:text-base' : 'font-mono'
                  } ${
                    errorMessage ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-medium animate-in fade-in p-2 rounded-lg bg-rose-950/30 border border-rose-800/40">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-3 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
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

          {/* Access Info Notice */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowHints(!showHints)}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] font-medium"
            >
              <HelpCircle className="w-3 h-3 text-slate-400" />
              <span>{showHints ? 'Hide Access Info' : 'Master Access Info'}</span>
            </button>

            {showHints && (
              <div className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 space-y-1 animate-in fade-in">
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Master Account:</span>
                  <code className="font-mono text-white bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                    {superAdminAuth?.email || DEFAULT_SUPER_ADMIN.email}
                  </code>
                </p>
                <p className="text-slate-400 text-[10px] leading-tight">
                  Enter master password or PIN to unlock platform governance.
                </p>
              </div>
            )}
          </div>

          {/* Security Footnote */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-500">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Master Key Protected</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Encrypted Gateway</span>
            </span>
          </div>
        </div>

        {/* Alternate Link to Company Login */}
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={handleBackToWorkspaceOrCompany}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 py-1 px-2.5 rounded-md hover:bg-slate-900/60"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Switch to Standard Company Workspace Login</span>
          </button>
        </div>
      </main>

      {/* Footer - Compact Single Line */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 py-2 sm:py-3 text-center text-[11px] text-slate-400 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-1.5">
        <p>
          © {new Date().getFullYear()} {platformConfig?.appName || 'Zooka Business'} • Platform Master Governance
        </p>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-slate-400">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Executive Authority</span>
          </span>
          <span className="text-slate-700">•</span>
          <span>Developed by Kuldeep Siraswar</span>
        </div>
      </footer>
    </div>
  );
};
