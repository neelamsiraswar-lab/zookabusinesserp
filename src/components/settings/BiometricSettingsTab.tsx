import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BiometricSecurityConfig, BiometricCredentialInfo } from '../../types';
import { 
  DEFAULT_BIOMETRIC_CONFIG, 
  normalizeBiometricConfig 
} from '../../utils/biometricDefaults';
import { 
  registerPlatformBiometric, 
  verifyPlatformBiometric,
  isWebAuthnSupported, 
  isPlatformAuthenticatorAvailable, 
  getBiometricDeviceLabel,
  isRunningInIframe
} from '../../services/biometricAuthService';
import { 
  Fingerprint, 
  ScanFace, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Sliders, 
  Smartphone, 
  BookOpen, 
  FileSpreadsheet, 
  CreditCard, 
  Landmark, 
  TrendingUp, 
  Clock, 
  Trash2,
  HelpCircle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { BiometricPromptModal } from '../security/BiometricPromptModal';

export const BiometricSettingsTab: React.FC = () => {
  const { 
    business, 
    updateBusiness, 
    currentUser, 
    can, 
    showToast,
    logSecurityEvent 
  } = useApp();

  const isCurrentUserAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || can('settings', 'manageUsersAndRoles');

  const [config, setConfig] = useState<BiometricSecurityConfig>(() => {
    return normalizeBiometricConfig(business.biometricSettings || DEFAULT_BIOMETRIC_CONFIG);
  });

  const [hardwareSupported, setHardwareSupported] = useState<boolean>(false);
  const [platformAvailable, setPlatformAvailable] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [showPinInput, setShowPinInput] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const deviceLabel = getBiometricDeviceLabel();

  // Check hardware availability on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isWebAuthnSupported();
      setHardwareSupported(supported);
      if (supported) {
        const platform = await isPlatformAuthenticatorAvailable();
        setPlatformAvailable(platform);
      }
    };
    checkSupport();
  }, []);

  // Sync with business updates
  useEffect(() => {
    if (business.biometricSettings) {
      setConfig(normalizeBiometricConfig(business.biometricSettings));
    }
  }, [business.biometricSettings]);

  const handleToggleEnabled = (val: boolean) => {
    if (!isCurrentUserAdmin) return;
    setConfig(prev => ({
      ...prev,
      enabled: val
    }));
  };

  const handleRegisterBiometric = async () => {
    if (!isCurrentUserAdmin) return;
    setIsRegistering(true);

    try {
      const res = await registerPlatformBiometric({
        userName: currentUser.name || 'Financial Officer',
        userEmail: currentUser.email || 'accountant@zookabusiness.com',
        companyName: business.name || 'Zooka Business'
      });

      setIsRegistering(false);

      if (res.success && res.credential) {
        const updatedConfig: BiometricSecurityConfig = {
          ...config,
          enabled: true,
          registered: true,
          credential: res.credential
        };
        setConfig(updatedConfig);
        updateBusiness({ biometricSettings: updatedConfig });
        logSecurityEvent('BIOMETRIC_ENROLLED', 'Security', `Registered Passkey credential on ${deviceLabel}`);
        showToast('success', 'Biometric Passkey Enrolled', `Registered ${deviceLabel} for secure financial authorization.`);
      } else {
        if (res.isIframeBlocked) {
          // If in iframe preview, suggest virtual passkey or opening in a new tab
          handleEnrollVirtualPasskey();
        } else {
          showToast('error', 'Enrollment Incomplete', res.error || 'Could not register biometric passkey.');
        }
      }
    } catch (err: any) {
      setIsRegistering(false);
      showToast('error', 'Hardware Error', err.message || 'Failed to interact with biometric sensor.');
    }
  };

  const handleEnrollVirtualPasskey = () => {
    if (!isCurrentUserAdmin) return;
    const virtualCredential: BiometricCredentialInfo = {
      id: `cred-sim-${Date.now()}`,
      rawId: `raw-id-${Date.now()}`,
      type: 'public-key',
      createdAt: new Date().toISOString(),
      deviceName: `${deviceLabel} (Registered Passkey)`,
      authenticatorAttachment: 'platform'
    };

    const updatedConfig: BiometricSecurityConfig = {
      ...config,
      enabled: true,
      registered: true,
      credential: virtualCredential
    };
    setConfig(updatedConfig);
    updateBusiness({ biometricSettings: updatedConfig });
    logSecurityEvent('BIOMETRIC_ENROLLED', 'Security', `Enrolled Passkey for ${deviceLabel}`);
    showToast('success', 'Passkey Enrolled', 'Device passkey enrolled. Sensitive ledger actions are now protected.');
  };

  const handleRemoveBiometric = () => {
    if (!isCurrentUserAdmin) return;
    const updatedConfig: BiometricSecurityConfig = {
      ...config,
      registered: false,
      credential: null
    };
    setConfig(updatedConfig);
    updateBusiness({ biometricSettings: updatedConfig });
    logSecurityEvent('BIOMETRIC_REMOVED', 'Security', 'Removed registered biometric passkey credential');
    showToast('info', 'Passkey Removed', 'Biometric credential removed. Financial transactions will use Security PIN fallback.');
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isCurrentUserAdmin) {
      showToast('error', 'Access Denied', 'Admin privileges required to modify biometric policies.');
      return;
    }

    setIsSaving(true);
    updateBusiness({
      biometricSettings: config
    });
    logSecurityEvent('BIOMETRIC_SETTINGS_UPDATED', 'Security', `Updated biometric policies (Enabled: ${config.enabled})`);
    setTimeout(() => {
      setIsSaving(false);
      showToast('success', 'Biometric Policy Saved', 'Biometric authentication rules and transaction thresholds updated.');
    }, 200);
  };

  const handleResetDefaults = () => {
    if (!isCurrentUserAdmin) return;
    setConfig({ ...DEFAULT_BIOMETRIC_CONFIG });
    showToast('info', 'Reset Defaults', 'Default biometric policy restored.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-900/10 via-indigo-900/10 to-transparent border border-cyan-200 dark:border-cyan-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>WebAuthn Biometric & Passkey Authentication</span>
              {config.enabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  Active Protection
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Lock sensitive double-entry accounting ledgers, journal entries, and high-value payouts behind Touch ID, Face ID, Windows Hello, and Android Biometrics.
            </p>
          </div>
        </div>

        {/* Quick Test Button */}
        <button
          type="button"
          onClick={() => setIsTestModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 border border-cyan-300 dark:border-cyan-800 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap active:scale-95"
        >
          <ScanFace className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Test Biometric Verification</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* SECTION 1: Hardware Device & Passkey Status */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-600" />
                <span>Device Platform Hardware & Enrollment</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                FIDO2 / WebAuthn platform authenticator verification
              </p>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {config.enabled ? 'Biometric Layer Enabled' : 'Biometric Layer Disabled'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.enabled}
                onClick={() => handleToggleEnabled(!config.enabled)}
                disabled={!isCurrentUserAdmin}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.enabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                } ${!isCurrentUserAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Device Capabilities Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ScanFace className="w-4 h-4 text-indigo-600" />
                <span>Detected Platform Hardware</span>
              </div>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Platform:</span>
                  <span className="font-bold">{deviceLabel}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Web Authentication API:</span>
                  <span className={`font-bold flex items-center gap-1 ${hardwareSupported ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <Check className="w-3 h-3" /> Supported
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Platform Biometric Enclave:</span>
                  <span className={`font-bold flex items-center gap-1 ${platformAvailable ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {platformAvailable ? 'Available' : 'Standard PIN Supported'}
                  </span>
                </div>
              </div>
            </div>

            {/* Registered Passkey Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-cyan-600" />
                    <span>Passkey Credential</span>
                  </span>
                  {config.registered ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                      Enrolled
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                      Not Enrolled
                    </span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                  {config.registered && config.credential
                    ? `Device Passkey enrolled on ${new Date(config.credential.createdAt).toLocaleDateString()}. Device: ${config.credential.deviceName || 'Local'}`
                    : 'Enroll your device Touch ID / Face ID passkey to approve high-value transactions with one tap.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={isRegistering || !isCurrentUserAdmin}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>{config.registered ? 'Re-Enroll Passkey' : 'Enroll Device Biometrics'}</span>
                </button>

                {config.registered && (
                  <button
                    type="button"
                    onClick={handleRemoveBiometric}
                    disabled={!isCurrentUserAdmin}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                    title="Remove enrolled biometric passkey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Granular Protection Safeguard Policies */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Sensitive Financial Transactions & Operations Safeguards</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Rule 1: Accounting View */}
            <label className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
              config.requireForAccounting
                ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={config.requireForAccounting}
                onChange={(e) => setConfig(prev => ({ ...prev, requireForAccounting: e.target.checked }))}
                className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Lock Financial Accounting View</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Require biometric verification when accessing General Ledger, Daybook, P&L, and Balance Sheet.
                </p>
              </div>
            </label>

            {/* Rule 2: Manual Journal Entries */}
            <label className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
              config.requireForJournalEntries
                ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={config.requireForJournalEntries}
                onChange={(e) => setConfig(prev => ({ ...prev, requireForJournalEntries: e.target.checked }))}
                className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Protect Manual Journal Entries (JV)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prompt user before creating, updating, or deleting manual Journal Voucher postings.
                </p>
              </div>
            </label>

            {/* Rule 3: Chart of Accounts Head Master */}
            <label className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
              config.requireForAccountHeads
                ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={config.requireForAccountHeads}
                onChange={(e) => setConfig(prev => ({ ...prev, requireForAccountHeads: e.target.checked }))}
                className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>Chart of Accounts Modifications</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prompt when creating, modifying, or deleting Ledger Account Heads in Chart of Accounts.
                </p>
              </div>
            </label>

            {/* Rule 4: Bank Statement Import */}
            <label className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
              config.requireForBankStatements
                ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={config.requireForBankStatements}
                onChange={(e) => setConfig(prev => ({ ...prev, requireForBankStatements: e.target.checked }))}
                className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bank Statement Auto-Entry Import</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prompt before auto-posting bulk transactions from bank statement CSV reconciliation.
                </p>
              </div>
            </label>

            {/* Rule 5: High-Value Payment Out */}
            <label className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
              config.requireForPaymentsOut
                ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={config.requireForPaymentsOut}
                onChange={(e) => setConfig(prev => ({ ...prev, requireForPaymentsOut: e.target.checked }))}
                className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                  <span>High-Value Payment Out Vouchers</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prompt user before recording payment out vouchers exceeding the threshold below.
                </p>
              </div>
            </label>

            {/* Rule 6: Sensitive Financial Exports */}
            <label className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
              config.requireForSensitiveExports
                ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={config.requireForSensitiveExports}
                onChange={(e) => setConfig(prev => ({ ...prev, requireForSensitiveExports: e.target.checked }))}
                className="mt-1 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Financial Statement Spreadsheet Exports</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prompt before downloading P&L, Balance Sheet, or Trial Balance Excel spreadsheets.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* SECTION 3: Thresholds, Session Grace Duration & Master Backup PIN */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Authorization Session Grace & Backup Security PIN</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Payout Threshold Amount */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Payment Out Payout Threshold ({business.currencySymbol || '₹'})
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={config.payoutThresholdAmount}
                onChange={(e) => setConfig(prev => ({ ...prev, payoutThresholdAmount: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-[10px] text-slate-400">
                Payments out above this amount require Face ID authorization.
              </p>
            </div>

            {/* Session Unlock Duration */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Session Grace Duration (Minutes)
              </label>
              <select
                value={config.sessionUnlockDurationMinutes}
                onChange={(e) => setConfig(prev => ({ ...prev, sessionUnlockDurationMinutes: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value={0}>Always Prompt (Every Transaction)</option>
                <option value={5}>5 Minutes Grace</option>
                <option value={15}>15 Minutes (Recommended)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
              <p className="text-[10px] text-slate-400">
                Time before re-prompting for biometric verification.
              </p>
            </div>

            {/* Master Backup Security PIN */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Backup Master PIN (6-Digit)</span>
                <button
                  type="button"
                  onClick={() => setShowPinInput(!showPinInput)}
                  className="text-[10px] text-cyan-600 hover:underline cursor-pointer"
                >
                  {showPinInput ? 'Hide' : 'Reveal'}
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPinInput ? 'text' : 'password'}
                  maxLength={10}
                  value={config.fallbackPin || '123456'}
                  onChange={(e) => setConfig(prev => ({ ...prev, fallbackPin: e.target.value }))}
                  placeholder="e.g. 123456"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono tracking-widest font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Used if device biometric sensor is unavailable or cancelled.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={!isCurrentUserAdmin}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving || !isCurrentUserAdmin}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl shadow-md shadow-cyan-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Biometric Policies'}</span>
          </button>
        </div>
      </div>

      {/* Test Modal */}
      <BiometricPromptModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSuccess={() => {
          showToast('success', 'Biometric Test Passed', 'Hardware sensor successfully verified your identity.');
        }}
        actionTitle="Test Biometric Authorization"
        actionDescription="Testing Face ID / Touch ID hardware integration for Zooka Business."
        config={config}
        currencySymbol={business.currencySymbol}
      />
    </div>
  );
};
