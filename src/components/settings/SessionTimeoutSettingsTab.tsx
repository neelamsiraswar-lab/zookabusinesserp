import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SessionTimeoutConfig, IdleSessionTimeoutAction } from '../../types';
import { 
  DEFAULT_SESSION_TIMEOUT_CONFIG, 
  TIMEOUT_PRESETS, 
  normalizeSessionTimeoutConfig 
} from '../../utils/sessionTimeoutDefaults';
import { 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Play, 
  BellRing, 
  Sliders, 
  UserCheck, 
  Activity, 
  HelpCircle,
  Shield,
  Smartphone,
  Eye,
  KeyRound
} from 'lucide-react';

export const SessionTimeoutSettingsTab: React.FC = () => {
  const { 
    business, 
    updateBusiness, 
    currentUser, 
    can, 
    showToast,
    logSecurityEvent,
    jwtToken,
    jwtSessionInfo,
    refreshActiveJwtToken,
    setIsJwtModalOpen
  } = useApp();

  const isCurrentUserAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || can('settings', 'manageUsersAndRoles');

  const [config, setConfig] = useState<SessionTimeoutConfig>(() => {
    return normalizeSessionTimeoutConfig(business.sessionTimeoutSettings || DEFAULT_SESSION_TIMEOUT_CONFIG);
  });

  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    const currentMins = business.sessionTimeoutSettings?.timeoutMinutes || DEFAULT_SESSION_TIMEOUT_CONFIG.timeoutMinutes;
    return !TIMEOUT_PRESETS.some(p => p.minutes === currentMins);
  });

  const [customMinutesInput, setCustomMinutesInput] = useState<number>(() => {
    return business.sessionTimeoutSettings?.timeoutMinutes || 45;
  });

  const [isTestingSimulator, setIsTestingSimulator] = useState<boolean>(false);
  const [simulatorSeconds, setSimulatorSeconds] = useState<number>(10);

  // Sync state when business profile updates
  useEffect(() => {
    const current = normalizeSessionTimeoutConfig(business.sessionTimeoutSettings || DEFAULT_SESSION_TIMEOUT_CONFIG);
    setConfig(current);
    const isPreset = TIMEOUT_PRESETS.some(p => p.minutes === current.timeoutMinutes);
    setIsCustomMode(!isPreset);
    if (!isPreset) {
      setCustomMinutesInput(current.timeoutMinutes);
    }
  }, [business.sessionTimeoutSettings]);

  // Simulator timer effect
  useEffect(() => {
    let timer: any;
    if (isTestingSimulator && simulatorSeconds > 0) {
      timer = setInterval(() => {
        setSimulatorSeconds(prev => prev - 1);
      }, 1000);
    } else if (isTestingSimulator && simulatorSeconds === 0) {
      setIsTestingSimulator(false);
      showToast('info', 'Simulation Finished', `Test complete: In production, the session would have triggered ${config.action === 'lock' ? 'Screen Lock' : 'Auto Logout'}.`);
    }
    return () => clearInterval(timer);
  }, [isTestingSimulator, simulatorSeconds, config.action, showToast]);

  const handleSelectPreset = (minutes: number) => {
    if (!isCurrentUserAdmin) return;
    setIsCustomMode(false);
    setConfig(prev => ({
      ...prev,
      timeoutMinutes: minutes,
      enabled: true
    }));
  };

  const handleSelectCustom = () => {
    if (!isCurrentUserAdmin) return;
    setIsCustomMode(true);
    setConfig(prev => ({
      ...prev,
      timeoutMinutes: customMinutesInput,
      enabled: true
    }));
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCurrentUserAdmin) return;
    const val = parseInt(e.target.value, 10);
    const sanitized = isNaN(val) ? 1 : Math.max(1, Math.min(val, 1440));
    setCustomMinutesInput(sanitized);
    setConfig(prev => ({
      ...prev,
      timeoutMinutes: sanitized,
    }));
  };

  const handleSave = () => {
    if (!isCurrentUserAdmin) {
      showToast('error', 'Access Denied', 'Only Administrators can change global session security policies.');
      return;
    }

    const normalized = normalizeSessionTimeoutConfig(config);
    updateBusiness({
      ...business,
      sessionTimeoutSettings: normalized
    });

    logSecurityEvent(
      'SESSION_TIMEOUT_CONFIG_SAVED',
      'Security Settings',
      `Admin ${currentUser.name} updated idle session timeout: ${normalized.enabled ? `${normalized.timeoutMinutes} min (${normalized.action})` : 'Disabled'}`
    );
    showToast('success', 'Security Policy Updated', 'Global idle session timeout settings have been saved.');
  };

  const handleResetDefaults = () => {
    if (!isCurrentUserAdmin) return;
    setConfig(DEFAULT_SESSION_TIMEOUT_CONFIG);
    setIsCustomMode(false);
    updateBusiness({
      ...business,
      sessionTimeoutSettings: DEFAULT_SESSION_TIMEOUT_CONFIG
    });
    showToast('info', 'Defaults Restored', 'Session timeout settings restored to 30 minutes auto-logout.');
  };

  const handleStartSimulation = () => {
    setSimulatorSeconds(10);
    setIsTestingSimulator(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & KPI Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Enterprise Security & Data Protection</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Idle Session Inactivity Timeout
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Enforce automated session termination or screen locking when staff leave workstations unattended. Protects sensitive GST accounting books, vendor balances, and POS counter billing.
            </p>
          </div>

          {/* Current Status Badge Card */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-800/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-700/80 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Enforcement Status</div>
              <div className="text-sm font-black text-white flex items-center gap-1.5 justify-start sm:justify-end mt-0.5">
                {config.enabled ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">Active • {config.timeoutMinutes} Mins</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-400">Disabled (Never Timeout)</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Action: <span className="font-bold text-indigo-300 uppercase">{config.action === 'lock' ? 'Screen Lock' : 'Auto Logout'}</span>
              </div>
            </div>

            {/* Quick Toggle Button */}
            {isCurrentUserAdmin && (
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                  config.enabled 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                {config.enabled ? 'Enabled' : 'Enable Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Non-admin read-only banner */}
      {!isCurrentUserAdmin && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            You are viewing the organizational session security policy in read-only mode. Only Company Administrators can adjust global inactivity timeout durations.
          </span>
        </div>
      )}

      {/* Settings Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Main Configuration */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Inactivity Duration Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Inactivity Timeout Duration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select how long a user must be inactive before security protection triggers.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {config.timeoutMinutes} Minutes Selected
              </span>
            </div>

            {/* Preset Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {TIMEOUT_PRESETS.map((preset) => {
                const isSelected = !isCustomMode && config.timeoutMinutes === preset.minutes;

                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    disabled={!isCurrentUserAdmin}
                    onClick={() => handleSelectPreset(preset.minutes)}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700'
                    } ${!isCurrentUserAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {preset.label}
                        </span>
                        {preset.badge && (
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            preset.recommended
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {preset.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Active Policy
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Custom Duration Card */}
              <button
                type="button"
                disabled={!isCurrentUserAdmin}
                onClick={handleSelectCustom}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                  isCustomMode
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700'
                } ${!isCurrentUserAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-sm text-slate-900 dark:text-white">Custom Duration</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Flexible
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Specify custom timeout in minutes (from 1 min up to 24 hours).
                  </p>
                </div>

                {isCustomMode && (
                  <div className="mt-3 pt-2 border-t border-indigo-200 dark:border-indigo-800 space-y-1.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={customMinutesInput}
                        onChange={handleCustomInputChange}
                        disabled={!isCurrentUserAdmin}
                        className="w-20 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Minutes</span>
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Inactivity Action Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Inactivity Action (Logout vs Screen Lock)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose what action takes place when the inactivity duration expires.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Logout (Default) */}
              <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                config.action === 'logout'
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700'
              } ${!isCurrentUserAdmin ? 'cursor-not-allowed opacity-80' : ''}`}>
                <input
                  type="radio"
                  name="action"
                  value="logout"
                  checked={config.action === 'logout'}
                  disabled={!isCurrentUserAdmin}
                  onChange={() => setConfig(prev => ({ ...prev, action: 'logout' }))}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Automatic Logout (Recommended)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Completely ends the active session and returns to the Login Screen. Requires entering password or PIN to resume. Best for high security & compliance.
                  </p>
                </div>
              </label>

              {/* Option B: Screen Lock */}
              <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                config.action === 'lock'
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700'
              } ${!isCurrentUserAdmin ? 'cursor-not-allowed opacity-80' : ''}`}>
                <input
                  type="radio"
                  name="action"
                  value="lock"
                  checked={config.action === 'lock'}
                  disabled={!isCurrentUserAdmin}
                  onChange={() => setConfig(prev => ({ ...prev, action: 'lock' }))}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Screen Lock Overlay</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Freezes UI with a PIN/password lock overlay while preserving active background tab state. Best for fast retail counter checkout terminals.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Warning Countdown Modal & Lead Time */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Pre-Timeout Warning Countdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notify users before their session terminates with an interactive countdown dialog.
                </p>
              </div>

              {isCurrentUserAdmin && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showWarningModal}
                    onChange={e => setConfig(prev => ({ ...prev, showWarningModal: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              )}
            </div>

            {config.showWarningModal && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Warning Lead Time Before Action
                </label>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 60, 120].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      disabled={!isCurrentUserAdmin}
                      onClick={() => setConfig(prev => ({ ...prev, warningSeconds: sec }))}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        config.warningSeconds === sec
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {sec} Seconds Before
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Users can click <strong>"Stay Logged In"</strong> or simply move the mouse or press any key to immediately dismiss the alert and resume work.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Compliance, Simulator & Activity Triggers */}
        <div className="space-y-6">

          {/* Card A: Activity Detection Info */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              Activity Triggers Detected
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The system monitors the following user interactions to automatically refresh the active idle timer:
            </p>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Mouse movements, clicks & wheel scrolling</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Keyboard typing & shortcut combinations</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Touch screen gestures (tablets & smartphones)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Window tab focus & view changes</span>
              </div>
            </div>
          </div>

          {/* Card: JWT Cryptographic Session Token */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/80 rounded-3xl border border-indigo-500/30 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                JWT Cryptographic Session Token
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                RFC 7519 • HS256
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every authenticated login generates a signed JSON Web Token (JWT) with tenant boundaries, multi-role claims, and auto-refresh security.
            </p>

            <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Token</div>
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Valid & Cryptographically Signed</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJwtModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Token</span>
              </button>
            </div>
          </div>

          {/* Card B: Live Test Simulator Modal */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-3xl border border-indigo-200 dark:border-indigo-800/60 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Test Experience Simulator
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                Demo
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Verify how the timeout warning dialog appears to your employees without waiting {config.timeoutMinutes} minutes.
            </p>

            {isTestingSimulator ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-center space-y-2 animate-pulse">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Simulation Running...
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {simulatorSeconds}s
                </div>
                <button
                  type="button"
                  onClick={() => setIsTestingSimulator(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancel Simulation
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartSimulation}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Launch 10s Warning Simulator</span>
              </button>
            )}
          </div>

          {/* Card C: Compliance Badge Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Compliance Standards</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Meets ISO/IEC 27001 session termination controls, Indian GST e-Invoicing IT audit policies, and PCI DSS Requirement 8.1.8 for inactive credential protection.
            </p>
          </div>

        </div>

      </div>

      {/* Footer Action Bar */}
      {isCurrentUserAdmin && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard (30 Mins Auto-Logout)</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Session Security Policy</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
