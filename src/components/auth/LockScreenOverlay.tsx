import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_DEFINITIONS } from '../../utils/rbacRules';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  AlertCircle,
  Building2,
  Receipt
} from 'lucide-react';

export const LockScreenOverlay: React.FC = () => {
  const { 
    isSessionLocked, 
    currentUser, 
    unlockSession, 
    openAuthModal, 
    business 
  } = useApp();

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isSessionLocked) return null;

  const roleMeta = ROLE_DEFINITIONS[currentUser.role] || ROLE_DEFINITIONS.CUSTOM;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMessage('Please enter your password or PIN to unlock.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = unlockSession(passwordInput.trim());
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Incorrect credentials.');
      } else {
        setPasswordInput('');
        setErrorMessage(null);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto modal-overlay">
      <div className="relative w-full max-w-[96vw] sm:max-w-sm bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 text-center space-y-4 sm:space-y-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
        {/* Brand Lock Badge */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-xl shadow-indigo-500/30 mb-3 ring-4 ring-slate-800">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            {business.tradeName || business.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Session Locked for Security</p>
        </div>

        {/* User Card */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3 text-left">
          <div className={`w-11 h-11 rounded-xl ${currentUser.avatarBg} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-slate-700`}>
            {currentUser.avatarText}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm truncate">{currentUser.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                {currentUser.role}
              </span>
              <span className="text-[11px] text-slate-400 truncate">{roleMeta.name}</span>
            </div>
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
              <span>Password or PIN</span>
              <span className="text-[11px] text-slate-500">Confidential</span>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter password or 4-digit PIN..."
                autoFocus
                className={`w-full px-4 py-3 pr-11 text-sm bg-slate-950 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono placeholder:text-slate-500 ${
                  errorMessage ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
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
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1.5 font-medium animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Unlocking...
              </span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Session</span>
              </>
            )}
          </button>
        </form>

        {/* Switch Account CTA */}
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              openAuthModal();
            }}
            className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 w-full py-1 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Switch to another role / user account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
