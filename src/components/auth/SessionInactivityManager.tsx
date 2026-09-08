import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_SESSION_TIMEOUT_CONFIG, normalizeSessionTimeoutConfig } from '../../utils/sessionTimeoutDefaults';
import { 
  ShieldAlert, 
  Clock, 
  LogOut, 
  CheckCircle2, 
  Lock, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const SessionInactivityManager: React.FC = () => {
  const { 
    isAuthenticated, 
    isSessionLocked, 
    business, 
    currentUser, 
    logout, 
    lockSession, 
    logSecurityEvent,
    showToast 
  } = useApp();

  const config = normalizeSessionTimeoutConfig(business.sessionTimeoutSettings || DEFAULT_SESSION_TIMEOUT_CONFIG);

  const lastActivityRef = useRef<number>(Date.now());
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const isExecutingActionRef = useRef<boolean>(false);

  // Throttled activity updater
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Only update if at least 1 second passed since last recorded activity
    if (now - lastActivityRef.current > 1000) {
      lastActivityRef.current = now;
      if (isWarningOpen) {
        setIsWarningOpen(false);
        setSecondsRemaining(null);
      }
    }
  }, [isWarningOpen]);

  // Global Activity Listeners
  useEffect(() => {
    if (!isAuthenticated || isSessionLocked || !config.enabled) {
      return;
    }

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel',
      'focus'
    ];

    const handleEvent = () => {
      recordActivity();
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleEvent, { passive: true });
    });

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleEvent);
      });
    };
  }, [isAuthenticated, isSessionLocked, config.enabled, recordActivity]);

  // Main Inactivity Checker Interval
  useEffect(() => {
    if (!isAuthenticated || isSessionLocked || !config.enabled) {
      setIsWarningOpen(false);
      setSecondsRemaining(null);
      return;
    }

    // Check exemption for Admins if configured
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    if (config.exemptAdmin && isAdmin) {
      return;
    }

    const timeoutMs = config.timeoutMinutes * 60 * 1000;
    const warningMs = config.warningSeconds * 1000;

    const interval = setInterval(() => {
      if (isExecutingActionRef.current) return;

      const now = Date.now();
      const elapsedMs = now - lastActivityRef.current;
      const remainingMs = timeoutMs - elapsedMs;

      if (remainingMs <= 0) {
        // Inactivity timeout expired!
        isExecutingActionRef.current = true;
        setIsWarningOpen(false);
        setSecondsRemaining(null);

        if (config.action === 'lock') {
          logSecurityEvent(
            'SESSION_LOCKED_IDLE',
            'Security',
            `Session automatically locked for ${currentUser.name} after ${config.timeoutMinutes} min idle inactivity.`
          );
          lockSession();
          showToast('info', 'Session Locked (Idle)', `Screen locked after ${config.timeoutMinutes} minutes of inactivity.`);
        } else {
          logSecurityEvent(
            'SESSION_TIMEOUT_EXPIRED',
            'Security',
            `Session automatically terminated for ${currentUser.name} after ${config.timeoutMinutes} min idle inactivity.`
          );
          logout();
          showToast('info', 'Session Expired', `You were logged out after ${config.timeoutMinutes} minutes of inactivity for security.`);
        }

        setTimeout(() => {
          isExecutingActionRef.current = false;
        }, 1000);
      } else if (config.showWarningModal && remainingMs <= warningMs) {
        // Within warning window
        setIsWarningOpen(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        if (isWarningOpen) {
          setIsWarningOpen(false);
          setSecondsRemaining(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isAuthenticated,
    isSessionLocked,
    config,
    currentUser,
    logout,
    lockSession,
    logSecurityEvent,
    showToast,
    isWarningOpen
  ]);

  const handleStayActive = () => {
    lastActivityRef.current = Date.now();
    setIsWarningOpen(false);
    setSecondsRemaining(null);
    showToast('success', 'Session Extended', 'Your active work session has been extended.');
  };

  const handleImmediateLogout = () => {
    setIsWarningOpen(false);
    setSecondsRemaining(null);
    logout();
  };

  if (!isAuthenticated || isSessionLocked || !isWarningOpen || secondsRemaining === null) {
    return null;
  }

  // Calculate percentage of warning time remaining
  const progressPct = Math.min(100, Math.max(0, ((secondsRemaining || 0) / config.warningSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto modal-overlay">
      <div className="relative w-full max-w-[96vw] sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-6 text-center space-y-4 sm:space-y-5 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto animate-in zoom-in-95 duration-200">
        
        {/* Glow Accent */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon Badge */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-bold shadow-xl shadow-amber-500/30 ring-4 ring-slate-800 animate-pulse">
              <Clock className="w-8 h-8 stroke-[2.5]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
            </span>
          </div>

          <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            Session Expiring Soon
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Due to inactivity, your session will automatically {config.action === 'lock' ? 'lock' : 'end'} to protect business financial records.
          </p>
        </div>

        {/* Countdown Pill Card */}
        <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Auto-{config.action === 'lock' ? 'Lock' : 'Logout'} In:
            </span>
            <span className="text-base font-black font-mono text-amber-400 tracking-wider">
              {secondsRemaining}s
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                secondsRemaining <= 15 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-rose-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 text-left flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Click <strong>Stay Logged In</strong> or move your cursor to resume work.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleImmediateLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>{config.action === 'lock' ? 'Lock Now' : 'Log Out Now'}</span>
          </button>

          <button
            type="button"
            onClick={handleStayActive}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
            <span>Stay Logged In</span>
          </button>
        </div>

      </div>
    </div>
  );
};
