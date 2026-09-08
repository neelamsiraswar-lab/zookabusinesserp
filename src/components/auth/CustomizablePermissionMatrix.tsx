import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, UserPermissions } from '../../types';
import { 
  ROLE_DEFINITIONS, 
  MODULE_DEFINITIONS, 
  getDefaultRolePermissionsMap,
  getUserEffectivePermissions 
} from '../../utils/rbacRules';
import { 
  Sliders, 
  Check, 
  Lock, 
  Unlock, 
  Eye, 
  RotateCcw, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Users, 
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  ShoppingBag,
  BookOpen,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  Zap,
  Filter
} from 'lucide-react';

const MODULE_ICONS: Record<keyof UserPermissions, any> = {
  dashboard: BarChart3,
  invoices: FileText,
  pos_billing: Zap,
  payments: DollarSign,
  inventory: BookOpen,
  parties: Users,
  purchases: ShoppingBag,
  accounting: FileText,
  gst_returns: ShieldCheck,
  settings: Settings,
};

export const CustomizablePermissionMatrix: React.FC = () => {
  const { 
    currentUser, 
    users, 
    customRolePermissions, 
    updateRolePermissions, 
    updateAllRolePermissions, 
    resetRolePermissions,
    updateUser,
    showToast,
    logSecurityEvent
  } = useApp();

  const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [matrixMode, setMatrixMode] = useState<'roles' | 'users'>('roles');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => ({
    invoices: true,
    inventory: true,
    pos_billing: false,
    payments: false,
    parties: false,
    purchases: false,
    accounting: false,
    gst_returns: false,
    dashboard: false,
    settings: false,
  }));
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [roleToReset, setRoleToReset] = useState<RoleType | 'ALL' | null>(null);

  const standardRoles: RoleType[] = ['ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'INVENTORY_MANAGER', 'AUDITOR', 'CUSTOM'];

  // Compute active permissions map for all roles
  const activeRolePermissions = useMemo(() => {
    const defaults = getDefaultRolePermissionsMap();
    const result: Record<RoleType, UserPermissions> = { ...defaults };
    for (const r of standardRoles) {
      if (customRolePermissions[r]) {
        result[r] = JSON.parse(JSON.stringify(customRolePermissions[r]));
      }
    }
    return result;
  }, [customRolePermissions]);

  // Filter modules/actions based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_DEFINITIONS;
    const q = searchQuery.toLowerCase().trim();
    return MODULE_DEFINITIONS.filter(mod => {
      const matchMod = mod.label.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q);
      const matchAction = mod.actions.some(a => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
      return matchMod || matchAction;
    });
  }, [searchQuery]);

  // Expand / Collapse all toggle
  const allExpanded = useMemo(() => {
    return filteredModules.every(m => expandedModules[m.key]);
  }, [filteredModules, expandedModules]);

  const toggleExpandAll = () => {
    const nextState = !allExpanded;
    const updated: Record<string, boolean> = {};
    MODULE_DEFINITIONS.forEach(m => {
      updated[m.key] = nextState;
    });
    setExpandedModules(updated);
  };

  const toggleModuleExpand = (modKey: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  // Check if a role has customized permissions compared to factory defaults
  const isRoleCustomized = (role: RoleType): boolean => {
    return !!customRolePermissions[role];
  };

  // Toggle single action for a role
  const handleToggleRoleAction = (role: RoleType, modKey: keyof UserPermissions, actionKey: string) => {
    if (!isCurrentUserAdmin) {
      showToast('error', 'Access Denied', 'Only Admin or Super Admin can edit permissions.');
      return;
    }

    const currentPerms = JSON.parse(JSON.stringify(activeRolePermissions[role])) as UserPermissions;
    const modObj = (currentPerms[modKey] as any) || {};
    modObj[actionKey] = !modObj[actionKey];
    currentPerms[modKey] = modObj;

    updateRolePermissions(role, currentPerms);
  };

  // Quick preset: Grant All, Read-Only, Revoke All, Reset
  const handleApplyRolePreset = (role: RoleType, preset: 'grant_all' | 'read_only' | 'revoke_all' | 'reset') => {
    if (!isCurrentUserAdmin) {
      showToast('error', 'Access Denied', 'Only Admin or Super Admin can apply permission presets.');
      return;
    }

    if (preset === 'reset') {
      resetRolePermissions(role);
      return;
    }

    const newPerms = JSON.parse(JSON.stringify(activeRolePermissions[role])) as UserPermissions;

    MODULE_DEFINITIONS.forEach(mod => {
      const modObj: any = {};
      mod.actions.forEach(act => {
        if (preset === 'grant_all') {
          modObj[act.key] = true;
        } else if (preset === 'revoke_all') {
          modObj[act.key] = false;
        } else if (preset === 'read_only') {
          modObj[act.key] = act.key === 'view' || act.key.startsWith('view');
        }
      });
      (newPerms as any)[mod.key] = modObj;
    });

    updateRolePermissions(role, newPerms);
  };

  // Quick Toggle Module for a Role
  const handleToggleWholeModule = (role: RoleType, modKey: keyof UserPermissions) => {
    if (!isCurrentUserAdmin) return;

    const modDef = MODULE_DEFINITIONS.find(m => m.key === modKey);
    if (!modDef) return;

    const currentMod = (activeRolePermissions[role][modKey] as any) || {};
    const allActive = modDef.actions.every(act => !!currentMod[act.key]);

    const updatedPerms = JSON.parse(JSON.stringify(activeRolePermissions[role])) as UserPermissions;
    const targetModObj: any = {};
    modDef.actions.forEach(act => {
      targetModObj[act.key] = !allActive;
    });
    (updatedPerms as any)[modKey] = targetModObj;

    updateRolePermissions(role, updatedPerms);
  };

  // Toggle single action for a specific User
  const handleToggleUserAction = (user: AppUser, modKey: keyof UserPermissions, actionKey: string) => {
    if (!isCurrentUserAdmin) {
      showToast('error', 'Access Denied', 'Only Admin or Super Admin can edit user permissions.');
      return;
    }

    const currentEffective = getUserEffectivePermissions(user, customRolePermissions);
    const existingCustom = user.customPermissions ? JSON.parse(JSON.stringify(user.customPermissions)) : {};
    const modObj = existingCustom[modKey] ? { ...existingCustom[modKey] } : { ...currentEffective[modKey] };

    modObj[actionKey] = !modObj[actionKey];
    existingCustom[modKey] = modObj;

    updateUser(user.id, { customPermissions: existingCustom });
    logSecurityEvent('USER_PERMISSIONS_CUSTOMIZED', 'RBAC Matrix', `Updated granular permissions for staff member ${user.name}`);
  };

  // Reset User custom permissions
  const handleResetUserPerms = (user: AppUser) => {
    if (!isCurrentUserAdmin) return;
    updateUser(user.id, { customPermissions: undefined });
    showToast('info', 'User Permissions Reset', `${user.name}'s permissions now match base ${user.role} role.`);
  };

  // Active roles to display
  const rolesToDisplay = useMemo(() => {
    if (selectedRoleFilter === 'ALL') return standardRoles;
    return standardRoles.filter(r => r === selectedRoleFilter);
  }, [selectedRoleFilter, standardRoles]);

  // Active users to display
  const usersToDisplay = useMemo(() => {
    return users.filter(u => {
      if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, selectedRoleFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Customizable Permission Matrix</h3>
                {isCurrentUserAdmin ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Admin Live Control
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" /> Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure action-level access policies across financial reports, tax returns, stock movements, and invoicing.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Selector (Roles vs Users) */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setMatrixMode('roles')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                matrixMode === 'roles'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role Matrix</span>
            </button>
            <button
              onClick={() => setMatrixMode('users')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                matrixMode === 'users'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Matrix ({users.length})</span>
            </button>
          </div>

          {/* Reset All to System Standards (Admin only) */}
          {isCurrentUserAdmin && (
            <button
              onClick={() => {
                setRoleToReset('ALL');
                setShowResetConfirmModal(true);
              }}
              className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Reset all role permissions back to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={matrixMode === 'roles' ? "Search module or action (e.g. IRN, discount, cost)..." : "Search staff name, email or role..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Filter Role */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1">
              <Filter className="w-3 h-3" /> Role:
            </span>
            <button
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedRoleFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              ALL
            </button>
            {standardRoles.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedRoleFilter === r
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Expand/Collapse Toggle & Legend */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={toggleExpandAll}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            {allExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{allExpanded ? 'Collapse Actions' : 'Expand All Sub-Actions'}</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Granted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" /> Restricted
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                <th className="py-4 px-4 min-w-[280px] sticky left-0 bg-slate-100/95 dark:bg-slate-850/95 backdrop-blur-xs z-20 border-r border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span>Application Modules & Actions</span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                      {filteredModules.length} Modules
                    </span>
                  </div>
                </th>

                {/* Columns for Role Matrix Mode */}
                {matrixMode === 'roles' && rolesToDisplay.map(role => {
                  const meta = ROLE_DEFINITIONS[role];
                  const isCustom = isRoleCustomized(role);
                  return (
                    <th key={role} className="py-3.5 px-3 min-w-[170px] text-center border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] uppercase font-extrabold rounded-md border shadow-2xs ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.name}
                          </span>
                          {isCustom && (
                            <span 
                              className="w-2 h-2 rounded-full bg-amber-500" 
                              title="Role has customized matrix settings" 
                            />
                          )}
                        </div>

                        {/* Admin Column Quick Actions */}
                        {isCurrentUserAdmin && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              onClick={() => handleApplyRolePreset(role, 'grant_all')}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800/80 cursor-pointer transition-colors"
                              title="Grant all actions in this role"
                            >
                              Grant All
                            </button>
                            <button
                              onClick={() => handleApplyRolePreset(role, 'read_only')}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 bg-blue-50 dark:bg-blue-950/60 rounded border border-blue-200 dark:border-blue-800/80 cursor-pointer transition-colors"
                              title="Grant view-only access"
                            >
                              Read-Only
                            </button>
                            <button
                              onClick={() => handleApplyRolePreset(role, 'revoke_all')}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 bg-rose-50 dark:bg-rose-950/60 rounded border border-rose-200 dark:border-rose-800/80 cursor-pointer transition-colors"
                              title="Revoke all actions"
                            >
                              Revoke
                            </button>
                            {isCustom && (
                              <button
                                onClick={() => handleApplyRolePreset(role, 'reset')}
                                className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                title="Reset role to factory preset"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Columns for Staff Matrix Mode */}
                {matrixMode === 'users' && usersToDisplay.map(user => {
                  const roleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.CUSTOM;
                  const hasCustom = !!user.customPermissions && Object.keys(user.customPermissions).length > 0;
                  return (
                    <th key={user.id} className="py-3.5 px-3 min-w-[170px] text-center border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg ${user.avatarBg} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                            {user.avatarText}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[110px]">{user.name}</div>
                            <span className={`px-1.5 py-0.2 text-[8px] uppercase font-extrabold rounded border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                              {user.role}
                            </span>
                          </div>
                        </div>

                        {hasCustom && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/80">
                              Custom Overrides
                            </span>
                            {isCurrentUserAdmin && (
                              <button
                                onClick={() => handleResetUserPerms(user)}
                                className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                                title="Reset to base role permissions"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredModules.map(mod => {
                const IconComponent = MODULE_ICONS[mod.key] || Sliders;
                const isExpanded = !!expandedModules[mod.key];

                return (
                  <React.Fragment key={mod.key}>
                    {/* MODULE MASTER ROW */}
                    <tr className="bg-slate-50/90 dark:bg-slate-850/80 font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
                      <td className="py-3 px-4 sticky left-0 bg-slate-50/95 dark:bg-slate-850/95 backdrop-blur-xs z-10 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleModuleExpand(mod.key)}
                            className="flex items-center gap-2.5 text-left cursor-pointer group flex-1"
                          >
                            <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs group-hover:scale-105 transition-transform">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                                <span>{mod.label}</span>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">({mod.actions.length})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight line-clamp-1">
                                {mod.description}
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => toggleModuleExpand(mod.key)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer ml-2"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>

                      {/* Role Matrix Summary Cells */}
                      {matrixMode === 'roles' && rolesToDisplay.map(role => {
                        const currentPerms = activeRolePermissions[role][mod.key] as any;
                        const totalActions = mod.actions.length;
                        const activeActionsCount = mod.actions.filter(a => !!currentPerms?.[a.key]).length;
                        const isFull = activeActionsCount === totalActions;
                        const isNone = activeActionsCount === 0;

                        return (
                          <td key={role} className="py-2.5 px-3 text-center align-middle border-r border-slate-200/80 dark:border-slate-800">
                            <button
                              disabled={!isCurrentUserAdmin}
                              onClick={() => handleToggleWholeModule(role, mod.key)}
                              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                isCurrentUserAdmin ? 'cursor-pointer hover:scale-102 active:scale-98' : 'cursor-default'
                              } ${
                                isFull
                                  ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                                  : isNone
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                                  : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shadow-2xs'
                              }`}
                              title={isCurrentUserAdmin ? `Click to toggle all ${mod.label} permissions for ${role}` : ''}
                            >
                              {isFull ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[11px]">Full ({activeActionsCount}/{totalActions})</span>
                                </>
                              ) : isNone ? (
                                <>
                                  <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                  <span className="text-[11px]">Restricted</span>
                                </>
                              ) : (
                                <>
                                  <Sliders className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-[11px]">Partial ({activeActionsCount}/{totalActions})</span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Staff Matrix Summary Cells */}
                      {matrixMode === 'users' && usersToDisplay.map(user => {
                        const effective = getUserEffectivePermissions(user, customRolePermissions);
                        const userMod = effective[mod.key] as any;
                        const totalActions = mod.actions.length;
                        const activeActionsCount = mod.actions.filter(a => !!userMod?.[a.key]).length;
                        const isFull = activeActionsCount === totalActions;
                        const isNone = activeActionsCount === 0;

                        return (
                          <td key={user.id} className="py-2.5 px-3 text-center align-middle border-r border-slate-200/80 dark:border-slate-800">
                            <div
                              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                                isFull
                                  ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80'
                                  : isNone
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                                  : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80'
                              }`}
                            >
                              {isFull ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[11px]">Full ({activeActionsCount}/{totalActions})</span>
                                </>
                              ) : isNone ? (
                                <>
                                  <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                  <span className="text-[11px]">Restricted</span>
                                </>
                              ) : (
                                <>
                                  <Sliders className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-[11px]">Partial ({activeActionsCount}/{totalActions})</span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* EXPANDED GRANULAR ACTION ROWS */}
                    {isExpanded && mod.actions.map(act => (
                      <tr key={`${mod.key}-${act.key}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Action Label and Tooltip */}
                        <td className="py-2.5 px-4 pl-11 sticky left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10 border-r border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span>{act.label}</span>
                            </div>
                            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 leading-tight">
                              {act.description}
                            </div>
                          </div>
                        </td>

                        {/* Granular Switch Cells for Role Matrix */}
                        {matrixMode === 'roles' && rolesToDisplay.map(role => {
                          const isEnabled = !!(activeRolePermissions[role][mod.key] as any)?.[act.key];

                          return (
                            <td key={role} className="py-2 px-3 text-center align-middle border-r border-slate-200/80 dark:border-slate-800">
                              <button
                                type="button"
                                disabled={!isCurrentUserAdmin}
                                onClick={() => handleToggleRoleAction(role, mod.key, act.key)}
                                className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all select-none ${
                                  isCurrentUserAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-85'
                                } ${
                                  isEnabled
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                                }`}
                                title={isCurrentUserAdmin ? `Toggle ${act.label} for ${role}` : 'Read Only'}
                              >
                                {isEnabled ? (
                                  <>
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                    <span className="text-[11px]">Enabled</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                                      <Lock className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Off</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        {/* Granular Switch Cells for Staff Matrix */}
                        {matrixMode === 'users' && usersToDisplay.map(user => {
                          const effective = getUserEffectivePermissions(user, customRolePermissions);
                          const isEnabled = !!(effective[mod.key] as any)?.[act.key];

                          return (
                            <td key={user.id} className="py-2 px-3 text-center align-middle border-r border-slate-200/80 dark:border-slate-800">
                              <button
                                type="button"
                                disabled={!isCurrentUserAdmin}
                                onClick={() => handleToggleUserAction(user, mod.key, act.key)}
                                className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all select-none ${
                                  isCurrentUserAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-85'
                                } ${
                                  isEnabled
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                                }`}
                                title={isCurrentUserAdmin ? `Toggle ${act.label} for ${user.name}` : 'Read Only'}
                              >
                                {isEnabled ? (
                                  <>
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                    <span className="text-[11px]">Enabled</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                                      <Lock className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Off</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100 overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reset Permission Matrix?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Restore role access policies back to standard RBAC defaults.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {roleToReset === 'ALL'
                ? 'This will erase all custom role permission modifications across all operational roles and restore the standard Indian GST accounting security policies.'
                : `This will reset the permissions matrix for ${roleToReset} back to default system settings.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  setRoleToReset(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (roleToReset === 'ALL') {
                    resetRolePermissions();
                  } else if (roleToReset) {
                    resetRolePermissions(roleToReset);
                  }
                  setShowResetConfirmModal(false);
                  setRoleToReset(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
