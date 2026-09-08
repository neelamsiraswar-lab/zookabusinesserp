import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  KeyRound, 
  Clock, 
  Copy, 
  Check, 
  RefreshCw, 
  LogOut, 
  X, 
  Lock, 
  Building2, 
  User, 
  Cpu, 
  FileCode, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Crown
} from 'lucide-react';
import { formatTokenTimeRemaining, verifyJwtToken } from '../../utils/jwtAuth';

interface JwtSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JwtSessionModal: React.FC<JwtSessionModalProps> = ({ isOpen, onClose }) => {
  const { 
    jwtToken, 
    jwtSessionInfo, 
    refreshActiveJwtToken, 
    currentUser, 
    currentCompany, 
    logout, 
    showToast 
  } = useApp();

  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'payload' | 'raw'>('overview');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedBearer, setCopiedBearer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);

  // Live timer countdown
  useEffect(() => {
    if (!isOpen || !jwtToken) return;

    const updateTime = () => {
      const decoded = verifyJwtToken(jwtToken);
      if (decoded) {
        setRemainingSecs(decoded.expiresInSeconds);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen, jwtToken]);

  if (!isOpen) return null;

  const decoded = verifyJwtToken(jwtToken);

  const handleCopyRaw = () => {
    if (!jwtToken) return;
    navigator.clipboard.writeText(jwtToken);
    setCopiedRaw(true);
    showToast('success', 'JWT Copied', 'Encoded JWT token copied to clipboard.');
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleCopyBearer = () => {
    if (!jwtToken) return;
    navigator.clipboard.writeText(`Bearer ${jwtToken}`);
    setCopiedBearer(true);
    showToast('success', 'Bearer Token Copied', 'Authorization header copied to clipboard.');
    setTimeout(() => setCopiedBearer(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const success = refreshActiveJwtToken();
      setIsRefreshing(false);
      if (success) {
        showToast('success', 'JWT Renewed', 'Your session cryptographic token has been extended.');
      } else {
        showToast('error', 'Renewal Failed', 'Unable to renew JWT token. Please re-authenticate.');
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-indigo-950/60 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-cyan-400 flex items-center justify-center shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  JWT Session & Cryptographic Token
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verified HS256</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                RFC 7519 Compliant JSON Web Token • Active Multi-Tenant Session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 border-b border-slate-800/80 bg-slate-950/30 flex gap-2">
          <button
            onClick={() => setActiveViewTab('overview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewTab === 'overview'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Session Claims</span>
          </button>

          <button
            onClick={() => setActiveViewTab('payload')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewTab === 'payload'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Decoded JSON</span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewTab === 'raw'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw Token String</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: OVERVIEW & CLAIMS */}
          {activeViewTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Token Lifetime & Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-cyan-300 flex items-center justify-center font-mono text-xs">
                    <Clock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <span>Token Lifetime Remaining</span>
                      <span className="font-mono text-cyan-300 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-800/80 font-extrabold text-xs">
                        {formatTokenTimeRemaining(remainingSecs)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Expires: {decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Renew Token</span>
                </button>
              </div>

              {/* Claims Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* User Claim Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Authenticated Subject</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">claim: sub</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${currentUser.avatarBg || 'bg-indigo-600'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                      {currentUser.role === 'SUPER_ADMIN' ? <Crown className="w-4 h-4 text-amber-300" /> : (currentUser.avatarText || 'US')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{decoded?.payload?.name || currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{decoded?.payload?.email || currentUser.email}</div>
                    </div>
                  </div>
                </div>

                {/* Tenant Claim Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tenant Workspace</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">claim: companyId</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate">
                      {decoded?.payload?.companyName || currentCompany.tradeName || currentCompany.name}
                    </div>
                    <div className="text-[11px] text-cyan-400 font-mono truncate mt-0.5">
                      GSTIN: {decoded?.payload?.companyGstin || currentCompany.gstin || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Role Claim Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Role & Permissions</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">claim: role</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-md text-xs font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {decoded?.payload?.role || currentUser.role}
                    </span>
                    <span className="text-xs text-slate-300 truncate">
                      {decoded?.payload?.department || currentUser.department || 'Operations'}
                    </span>
                  </div>
                </div>

                {/* JWT Metadata Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Algorithm & Issuer</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">claim: iss / aud</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono pt-1 truncate">
                    <span>{decoded?.header?.alg || 'HS256'}</span> • <span>{decoded?.payload?.iss || 'zooka-enterprise-erp'}</span>
                  </div>
                </div>

              </div>

              {/* Quick Copy Action Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyBearer}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedBearer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Bearer Header</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Raw JWT</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: DECODED JSON */}
          {activeViewTab === 'payload' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header JSON */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1.5 flex items-center justify-between">
                  <span>JWT Header (JOSE)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Algorithm & Token Type</span>
                </div>
                <pre className="p-3.5 rounded-2xl bg-slate-950 border border-rose-900/40 text-xs font-mono text-rose-300 overflow-x-auto">
                  {JSON.stringify(decoded?.header || { alg: 'HS256', typ: 'JWT' }, null, 2)}
                </pre>
              </div>

              {/* Payload JSON */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1.5 flex items-center justify-between">
                  <span>JWT Payload (Claims)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Identity & Company Claims</span>
                </div>
                <pre className="p-3.5 rounded-2xl bg-slate-950 border border-purple-900/40 text-xs font-mono text-purple-300 overflow-x-auto max-h-60">
                  {JSON.stringify(decoded?.payload || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: RAW TOKEN STRING */}
          {activeViewTab === 'raw' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Compact RFC 7519 Serialized JWT Token</span>
                <span className="text-[11px] text-cyan-400 font-mono">{jwtToken ? `${jwtToken.length} characters` : 'None'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono break-all leading-relaxed select-all">
                {jwtToken ? (
                  <>
                    <span className="text-rose-400">{jwtToken.split('.')[0]}</span>
                    <span className="text-slate-600">.</span>
                    <span className="text-purple-400">{jwtToken.split('.')[1]}</span>
                    <span className="text-slate-600">.</span>
                    <span className="text-cyan-400">{jwtToken.split('.')[2]}</span>
                  </>
                ) : (
                  <span className="text-slate-600">No active JWT token found.</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-400" /> Header</span>
                  <span className="flex items-center gap-1 text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-400" /> Payload</span>
                  <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Signature</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cryptographically signed with tamper protection</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Revoke & Logout</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
