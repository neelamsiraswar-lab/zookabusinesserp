import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_DEFINITIONS } from '../../utils/rbacRules';
import { RoleType } from '../../types';
import { 
  UserCheck, 
  ChevronDown, 
  Shield, 
  ShieldAlert, 
  Check, 
  Sparkles, 
  Lock, 
  LogOut, 
  KeyRound, 
  Users,
  Settings,
  Briefcase,
  Crown
} from 'lucide-react';

interface UserPersonaSwitcherProps {
  compact?: boolean;
}

export const UserPersonaSwitcher: React.FC<UserPersonaSwitcherProps> = ({ compact = false }) => {
  const { 
    users, 
    currentUser, 
    switchUser, 
    openAuthModal, 
    lockSession, 
    logout,
    setActiveTab,
    setIsJwtModalOpen 
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleSortOrder: Record<string, number> = {
    SUPER_ADMIN: 0,
    ADMIN: 1,
    ACCOUNTANT: 2,
    SALESPERSON: 3,
    INVENTORY_MANAGER: 4,
    AUDITOR: 5,
    CUSTOM: 6,
  };

  const sortedUsers = useMemo(() => {
    return [...users.filter(u => u.isActive)].sort((a, b) => {
      const orderA = roleSortOrder[a.role] ?? 99;
      const orderB = roleSortOrder[b.role] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  const currentRoleMeta = ROLE_DEFINITIONS[currentUser.role] || ROLE_DEFINITIONS.CUSTOM;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 rounded-xl transition-all cursor-pointer border focus:outline-none ${
          compact
            ? 'p-1.5 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            : 'px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs text-slate-800 dark:text-slate-100'
        }`}
        title={`Current User: ${currentUser.name} (${currentRoleMeta.name}) - Click to switch persona or lock`}
      >
        <div className={`w-7 h-7 rounded-lg ${currentUser.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
          {currentUser.avatarText || currentUser.name.substring(0, 2).toUpperCase()}
        </div>

        {!compact && (
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none truncate max-w-[110px]">
                {currentUser.name}
              </span>
              <span className={`px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border ${currentRoleMeta.badgeBg} ${currentRoleMeta.badgeText}`}>
                {currentUser.role}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none block mt-0.5 truncate max-w-[120px]">
              {currentUser.roleTitle || currentRoleMeta.name}
            </span>
          </div>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
          {/* Active User Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-indigo-500" /> Active Session
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  lockSession();
                }}
                className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Lock application screen"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Lock Screen</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <div className={`w-9 h-9 rounded-xl ${currentUser.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                {currentUser.avatarText}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${currentRoleMeta.badgeBg} ${currentRoleMeta.badgeText}`}>
                {currentRoleMeta.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsJwtModalOpen(true);
                }}
                className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-mono font-bold flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/80 transition-colors cursor-pointer"
                title="View active JWT cryptographic token and claims"
              >
                <KeyRound className="w-2.5 h-2.5" />
                <span>JWT Active</span>
              </button>
            </div>
          </div>

          {/* Quick Switch List with Password Authentication Prompt */}
          <div className="py-2 px-2 max-h-72 overflow-y-auto">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Switch User Role Account</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold lowercase">password protected</span>
            </div>

            <div className="space-y-1 mt-1">
              {sortedUsers.map(user => {
                const isCurrent = user.id === currentUser.id;
                const roleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.CUSTOM;

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setIsOpen(false);
                      openAuthModal(user);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${user.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                        {user.avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isCurrent ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                            {user.name}
                          </span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <span className={`font-semibold ${roleMeta.badgeText}`}>
                            {roleMeta.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 shrink-0">
                        Login
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manage Roles & Session Controls Footer */}
          <div className="pt-2 px-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                lockSession();
              }}
              className="py-2 px-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Lock Screen</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="py-2 px-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{currentUser.role === 'SUPER_ADMIN' ? 'Exit & Log Out' : 'Log Out'}</span>
            </button>
          </div>

          {currentUser.role === 'SUPER_ADMIN' && (
            <div className="px-2 pt-1 pb-1">
              <button
                onClick={() => {
                  setActiveTab('super_admin_dashboard');
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800/80"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Super Admin Master Portal</span>
              </button>
            </div>
          )}

          <div className="px-2 pt-1 pb-1">
            <button
              onClick={() => {
                setActiveTab('users');
                setIsOpen(false);
              }}
              className="w-full py-1.5 px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Roles & Permissions Matrix</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
