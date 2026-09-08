import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, UserPermissions } from '../../types';
import { ROLE_DEFINITIONS, getUserEffectivePermissions } from '../../utils/rbacRules';
import { CreateUserModal } from './CreateUserModal';
import { CustomizablePermissionMatrix } from './CustomizablePermissionMatrix';
import { formatDate } from '../../utils/formatters';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Sliders, 
  Check, 
  X, 
  Lock, 
  KeyRound, 
  Edit3, 
  Trash2, 
  FileText, 
  ShieldAlert, 
  Activity, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';

export const UsersAndRolesView: React.FC = () => {
  const { 
    users, 
    currentUser, 
    business,
    setActiveTab,
    switchUser, 
    openAuthModal,
    changeUserPassword,
    deleteUser, 
    auditLogs, 
    can,
    showToast,
    setIsJwtModalOpen 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'matrix' | 'audit' | 'guidelines'>('members');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.roleTitle && user.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const handleOpenEdit = (user: AppUser) => {
    if (!isCurrentUserAdmin && user.id !== currentUser.id) {
      showToast('error', 'Access Denied', 'Only Administrators can edit other team members.');
      return;
    }
    setUserToEdit(user);
    setIsCreateModalOpen(true);
  };

  const handleOpenCreate = () => {
    if (!isCurrentUserAdmin) {
      showToast('error', 'Access Denied', 'Only Administrators can invite or create new team members.');
      return;
    }
    setUserToEdit(null);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & KPI Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Role-Based Access Control (RBAC)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              User Roles & Permissions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
              Define operational roles (Administrator, Accountant, Salesperson, Inventory Manager, Auditor) to secure financial data, control pricing visibility, and streamline GST compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <span className="text-[11px] font-medium text-slate-300 block">Total Staff</span>
              <span className="text-xl font-bold font-mono text-white">{users.length}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <span className="text-[11px] font-medium text-slate-300 block">Active Roles</span>
              <span className="text-xl font-bold font-mono text-cyan-300">5 Defined</span>
            </div>

            {isCurrentUserAdmin && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite New User</span>
              </button>
            )}
          </div>
        </div>

        {/* Current User Session Bar inside Header */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Active Session:</span>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'ADMIN' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                <strong className="text-white font-bold">{currentUser.name}</strong>
                <span className="text-slate-400 font-mono">({currentUser.role})</span>
              </div>
            </div>

            {/* Inactivity Security Policy Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>Inactivity Protection:</span>
              <strong className="text-white font-mono">
                {business.sessionTimeoutSettings?.enabled !== false 
                  ? `${business.sessionTimeoutSettings?.timeoutMinutes || 30}m ${business.sessionTimeoutSettings?.action === 'lock' ? 'Lock' : 'Logout'}` 
                  : 'Disabled'}
              </strong>
            </div>

            {/* Cryptographic JWT Token Pill */}
            <button
              type="button"
              onClick={() => setIsJwtModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all cursor-pointer shadow-xs"
              title="Inspect Cryptographic JWT Token & Claims"
            >
              <KeyRound className="w-3 h-3 text-cyan-400" />
              <span>JWT Auth:</span>
              <strong className="font-mono text-emerald-400">Verified HS256</strong>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isCurrentUserAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Configure Idle Timeout</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <span className="text-slate-400 text-[11px] hidden md:inline">
              💡 Tip: Use persona switcher to test permissions.
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'members'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Members ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'matrix'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'audit'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guidelines')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'guidelines'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Role Descriptions & Indian GST Controls</span>
        </button>
      </div>

      {/* TAB 1: Team Members List */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">Filter Role:</span>
              {['ALL', 'ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'INVENTORY_MANAGER', 'AUDITOR'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === r
                      ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Members Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => {
              const isCurrent = user.id === currentUser.id;
              const roleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.CUSTOM;

              return (
                <div
                  key={user.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                    isCurrent
                      ? 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20 dark:ring-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Card Header: Avatar, Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl ${user.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0`}>
                          {user.avatarText}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{user.name}</h3>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{user.email}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-lg border shrink-0 ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Meta Details */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Position Title:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px] text-right">{user.roleTitle || roleMeta.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Department:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{user.department}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" /> Security:
                        </span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md font-semibold border border-emerald-200 dark:border-emerald-800/80">
                          Password & PIN Protected
                        </span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Phone:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{user.phone}</span>
                        </div>
                      )}
                      {user.lastLogin && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Last Active:</span>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{formatDate(user.lastLogin, 'long')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {isCurrent ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active Session</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAuthModal(user)}
                        className="py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-100 dark:border-indigo-800/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Login to this role account with Password or PIN"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Login with Password</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {(isCurrentUserAdmin || isCurrent) && (
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer"
                          title={isCurrent ? "Edit Your Profile & Credentials" : `Edit ${user.name} & Permissions (Admin)`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {isCurrentUserAdmin && !isCurrent && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                          title={`Delete ${user.name} (Admin Only)`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No team members match your search criteria.</p>
              <button
                onClick={() => { setRoleFilter('ALL'); setSearchQuery(''); }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Permissions Matrix */}
      {activeSubTab === 'matrix' && (
        <CustomizablePermissionMatrix />
      )}

      {/* TAB 3: Security Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Security & Action Audit Trail</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable activity logs of user logins, role switches, invoice issuances, and database adjustments.
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300/60 dark:border-slate-700">
              {auditLogs.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">Action Event</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {auditLogs.map(log => {
                  const roleMeta = ROLE_DEFINITIONS[log.userRole] || ROLE_DEFINITIONS.CUSTOM;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.module}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Compliance & Guidelines */}
      {activeSubTab === 'guidelines' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Internal Financial Controls (IFC)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Mandated under Section 134(5)(e) of Companies Act, 2013</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Zooka Business&apos;s RBAC framework enforces rigorous separation of duties. Sales personnel cannot tamper with historical vendor bills or ledger balances, while store managers can adjust stock without exposing confidential gross profit margins or balance sheet liabilities.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900 dark:text-slate-100">No Unauthorized Price Leakage:</strong> Purchase cost prices and profit margins are hidden from standard front-office sales executives.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900 dark:text-slate-100">Audit Compliance:</strong> Statutory auditors have read-only access to GST registers and Trial Balances without write-tampering risk.</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-100 dark:border-cyan-900/60 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-bold shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Indian GST & E-Invoice Compliance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Rule 48(4) and e-Way Bill guidelines</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              IRN generation and GSTR filing summaries require authorized signatory credentials. In Zooka Business, only Administrators and Accountants can execute cancellations and register reconciliations, preventing inadvertent tax liabilities.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900 dark:text-slate-100">E-Invoice / IRN Signatory:</strong> Standardized Authorized Signatory signatures render consistently on Tax Invoices.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900 dark:text-slate-100">Sequential Audit Numbering:</strong> Numbering remains sequential and continuous across offline POS and B2B Tax Invoices.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userToEdit={userToEdit}
      />

      {/* In-App Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100 overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Remove Team Member?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action will revoke all system credentials and access.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${userToDelete.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                {userToDelete.avatarText}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{userToDelete.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{userToDelete.email}</div>
                <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{userToDelete.role} • {userToDelete.department}</div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100">{userToDelete.name}</strong> from team access? They will no longer be able to log in or manage accounting records.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const success = deleteUser(userToDelete.id);
                  if (success) {
                    setUserToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Remove User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
