import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Fingerprint, 
  ScanFace, 
  Lock, 
  Unlock, 
  KeyRound, 
  Sparkles, 
  BookOpen, 
  TrendingUp, 
  Scale, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { BiometricSecurityConfig } from '../../types';
import { getBiometricDeviceLabel } from '../../services/biometricAuthService';

interface AccountingBiometricShieldProps {
  onUnlockClick: () => void;
  config: BiometricSecurityConfig;
  companyName: string;
}

export const AccountingBiometricShield: React.FC<AccountingBiometricShieldProps> = ({
  onUnlockClick,
  config,
  companyName
}) => {
  const deviceLabel = getBiometricDeviceLabel();

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto my-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl p-8 sm:p-12 text-center space-y-8">
        {/* Glow Header Ambient */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-sky-400/20 blur-3xl pointer-events-none" />

        {/* Badge & Lock Icon */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 ring-4 ring-white dark:ring-slate-800">
              <Fingerprint className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 text-white rounded-full shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Biometric Protection Enforced</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Financial Accounting Records Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Confidential Double-Entry General Ledger, Daybook, Profit & Loss Statements and Balance Sheets of <span className="font-bold text-slate-800 dark:text-slate-200">{companyName}</span> are protected by WebAuthn hardware biometric verification.
            </p>
          </div>
        </div>

        {/* Feature Security Safeguard Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">General Ledger</div>
            <div className="text-[10px] text-slate-500">Audited statements</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">P&L Financials</div>
            <div className="text-[10px] text-slate-500">Gross & Net revenue</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <Scale className="w-4 h-4 text-amber-600" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Balance Sheet</div>
            <div className="text-[10px] text-slate-500">Assets & liabilities</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Journal Entries</div>
            <div className="text-[10px] text-slate-500">Manual voucher logs</div>
          </div>
        </div>

        {/* Main Unlock Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onUnlockClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
          >
            <ScanFace className="w-5 h-5" />
            <span>Unlock with {deviceLabel.split(' ')[0]} / Face ID / PIN</span>
          </button>
        </div>

        {/* Security Footnote */}
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <Lock className="w-3.5 h-3.5 text-cyan-500" />
          <span>Session automatically re-locks after {config.sessionUnlockDurationMinutes || 15} minutes of inactivity</span>
        </div>
      </div>
    </div>
  );
};
