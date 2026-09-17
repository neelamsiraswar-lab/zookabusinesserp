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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* Dynamic Ambient Background Illumination */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-indigo-600/10 blur-[130px] rounded-full" />
        <div className="absolute -bottom-40 right-0 w-[700px] h-[500px] bg-violet-600/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#6b21a8_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* Top Brand Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo 
            size="md" 
            className="shadow-xl shadow-purple-900/40 ring-1 ring-purple-500/30" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-base sm:text-lg text-white">
                {platformConfig?.appName || 'Zooka Business'}
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-purple-300/70 hidden sm:block">
              {platformConfig?.appTagline || 'Platform Governance & Enterprise Management'}
            </p>
          </div>
        </div>

        {/* Action Link to Workspace Login */}
        <button
          type="button"
          onClick={handleBackToWorkspaceOrCompany}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-slate-600 active:scale-95"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{isCompanyUserLoggedIn ? 'Return to Workspace' : 'Company Login'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Central Super Admin Login Form Card */}
      <main className="relative z-10 w-full max-w-lg mx-auto px-4 py-8 sm:py-12 my-auto">
        
        {/* Notice for Users Already Logged in as Company Members */}
        {isCompanyUserLoggedIn && (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-indigo-200 truncate">
                  Active Workspace Session: <strong className="text-white">{currentCompany?.tradeName || currentCompany?.name}</strong>
                </p>
                <p className="text-[11px] text-indigo-300/80">
                  Logged in as {currentUser.name} ({currentUser.role}). Enter Super Admin credentials to elevate session.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackToWorkspaceOrCompany}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-100 border border-indigo-500/40 transition-all shrink-0 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        <div className="bg-gradient-to-b from-slate-900/95 via-purple-950/40 to-slate-900/95 border border-purple-800/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/80 backdrop-blur-xl">
          
          {/* Card Header */}
          <div className="flex items-center gap-4 pb-5 border-b border-purple-900/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-600 text-amber-300 flex items-center justify-center shadow-lg shadow-purple-600/40 shrink-0 ring-2 ring-purple-400/40">
              <Crown className="w-7 h-7 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-white text-lg tracking-tight truncate">
                  Super Administrator Login
                </h1>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-purple-500/30 text-purple-200 border-purple-400/40 shrink-0">
                  Level 0 Gate
                </span>
              </div>
              <p className="text-xs text-purple-300/80 mt-0.5">
                Master Governance & Multi-Company Control
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} autoComplete="off" className="mt-6 space-y-5">
            
            {/* Super Admin Email / Identifier */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>Master Email or Username</span>
                </label>
                <span className="text-[10px] text-purple-400 font-semibold">
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
                  className="w-full px-4 py-3 text-sm bg-slate-950/90 border border-purple-900/60 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Authentication Mode Selector (Password vs PIN) */}
            <div>
              <label className="text-xs font-bold text-slate-200 mb-1.5 block">
                Verification Method
              </label>
              <div className="flex items-center bg-slate-950/90 p-1.5 rounded-2xl border border-purple-900/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password');
                    setSecretInput('');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    authMode === 'password'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Master Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('pin');
                    setSecretInput('');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    authMode === 'pin'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>4-Digit PIN</span>
                </button>
              </div>
            </div>

            {/* Password / PIN Input Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">
                  {authMode === 'password' ? 'Super Admin Master Password' : '4-Digit Master PIN'}
                </label>
                {isCapsOn && (
                  <span className="text-[10px] text-amber-400 font-bold animate-pulse">
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
                  className={`w-full px-4 py-3 pr-12 text-sm bg-slate-950/90 border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono transition-all placeholder:text-slate-600 ${
                    errorMessage ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-purple-900/60'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-xs text-rose-400 mt-2.5 font-medium animate-in fade-in p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl shadow-xl shadow-purple-900/40 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Verifying Master Credentials...</span>
                </span>
              ) : (
                <>
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Unlock Super Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Access Info Notice */}
          <div className="mt-5 pt-4 border-t border-purple-900/40">
            <button
              type="button"
              onClick={() => setShowHints(!showHints)}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHints ? 'Hide Access Info' : 'Master Access Info'}</span>
            </button>

            {showHints && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-purple-900/50 text-[11px] text-purple-200/90 space-y-1.5 animate-in fade-in">
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Master Account:</span>
                  <code className="font-mono text-white bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/40">
                    {superAdminAuth?.email || DEFAULT_SUPER_ADMIN.email}
                  </code>
                </p>
                <p className="text-slate-400 text-[11px] mt-1">
                  Enter your master password or PIN to verify identity and unlock system governance.
                </p>
              </div>
            )}
          </div>

          {/* Security Footnote */}
          <div className="mt-4 pt-3 border-t border-purple-900/30 flex items-center justify-between text-[11px] text-purple-300/70">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>SHA-256 JWT Signed</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Gateway</span>
            </span>
          </div>
        </div>

        {/* Alternate Link to Company Login */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={handleBackToWorkspaceOrCompany}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-900/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch to Standard Company Workspace Login</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>
          © {new Date().getFullYear()} {platformConfig?.appName || 'Zooka Business'} • Platform Master Governance
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-purple-400">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive Authority</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>Developed by.Kuldeep Siraswar</span>
        </div>
      </footer>
    </div>
  );
};
