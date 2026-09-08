import React from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_DEFINITIONS } from '../../utils/rbacRules';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, UserCheck, CheckCircle2 } from 'lucide-react';
import { RoleType } from '../../types';

interface AccessRestrictedProps {
  moduleName: string;
  requiredRole?: string;
  actionName?: string;
  allowedRoles?: RoleType[];
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  moduleName,
  requiredRole = 'Administrator or Accountant',
  actionName = 'access this module',
  allowedRoles = ['ADMIN', 'ACCOUNTANT'],
}) => {
  const { currentUser, switchUser, users, setActiveTab } = useApp();
  const currentRoleMeta = ROLE_DEFINITIONS[currentUser.role] || ROLE_DEFINITIONS.CUSTOM;

  // Find a user who has permission to suggest 1-click switch
  const authorizedUser = users.find(u => allowedRoles.includes(u.role));

  return (
    <div className="min-h-[500px] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in-95">
        {/* Top Lock Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-rose-50 text-rose-700 border border-rose-200 mb-2">
            <Lock className="w-3 h-3" /> Access Restricted (RBAC Policy)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Permission Required for {moduleName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Your current role as <strong className="text-slate-800 font-bold">{currentRoleMeta.name}</strong> does not have authorization to {actionName}.
          </p>
        </div>

        {/* Role Comparison Card */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-medium">Logged in as:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800">{currentUser.name}</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded ${currentRoleMeta.badgeBg} ${currentRoleMeta.badgeText}`}>
                {currentUser.role}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Required Clearance:</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {requiredRole}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
            💡 Under the company security policy, {moduleName.toLowerCase()} contains sensitive financial, tax, or master records restricted to designated personnel.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {authorizedUser && (
            <button
              onClick={() => switchUser(authorizedUser.id)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Switch to {authorizedUser.name} ({authorizedUser.role})</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              View Role Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
