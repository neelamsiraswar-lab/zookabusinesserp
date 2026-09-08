import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, UserPermissions } from '../../types';
import { ROLE_DEFINITIONS, COMPANY_ASSIGNABLE_ROLES, getUserEffectivePermissions } from '../../utils/rbacRules';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Briefcase, 
  Sliders, 
  Check, 
  Save, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Eye, 
  EyeOff,
  ShieldAlert,
  KeyRound
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: AppUser | null;
}

const BG_AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-teal-600',
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { createUser, updateUser, deleteUser, currentUser, customRolePermissions, showToast } = useApp();
  const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isEditingSelf = Boolean(userToEdit && userToEdit.id === currentUser?.id);
  const isAllowed = isCurrentUserAdmin || isEditingSelf;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [formData, setFormData] = useState({
    name: userToEdit?.name || '',
    email: userToEdit?.email || '',
    phone: userToEdit?.phone || '',
    department: userToEdit?.department || 'Operations & Accounts',
    roleTitle: userToEdit?.roleTitle || '',
    role: (userToEdit?.role || 'SALESPERSON') as RoleType,
    avatarBg: userToEdit?.avatarBg || 'bg-indigo-600',
    isActive: userToEdit?.isActive ?? true,
    password: '',
    pin: '',
  });

  const [customPerms, setCustomPerms] = useState<UserPermissions>(() => {
    return getUserEffectivePermissions(userToEdit, customRolePermissions);
  });

  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);
  const [activePermModule, setActivePermModule] = useState<keyof UserPermissions>('invoices');

  // Re-bind profile data cleanly whenever userToEdit or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setFormData({
          name: userToEdit.name || '',
          email: userToEdit.email || '',
          phone: userToEdit.phone || '',
          department: userToEdit.department || 'Operations & Accounts',
          roleTitle: userToEdit.roleTitle || '',
          role: (userToEdit.role || 'SALESPERSON') as RoleType,
          avatarBg: userToEdit.avatarBg || 'bg-indigo-600',
          isActive: userToEdit.isActive ?? true,
          password: '', // Never populate existing password in plaintext
          pin: '', // Never populate existing PIN in plaintext
        });
        setCustomPerms(getUserEffectivePermissions(userToEdit, customRolePermissions));
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          department: 'Operations & Accounts',
          roleTitle: '',
          role: 'SALESPERSON',
          avatarBg: BG_AVATAR_COLORS[Math.floor(Math.random() * BG_AVATAR_COLORS.length)],
          isActive: true,
          password: '',
          pin: '',
        });
        const initialBase = customRolePermissions?.SALESPERSON || ROLE_DEFINITIONS.SALESPERSON.defaultPermissions;
        setCustomPerms(JSON.parse(JSON.stringify(initialBase)));
      }
      setShowDeleteConfirm(false);
      setShowPassword(false);
      setShowPin(false);
    }
  }, [isOpen, userToEdit, customRolePermissions]);

  // Security guard: If non-admin attempts to open another user's configuration, block and close
  useEffect(() => {
    if (isOpen && !isAllowed) {
      showToast('error', 'Access Denied', 'You do not have permission to view or edit this user.');
      onClose();
    }
  }, [isOpen, isAllowed, onClose, showToast]);

  if (!isOpen || !isAllowed) return null;

  const handleRoleChange = (newRole: RoleType) => {
    if (!isCurrentUserAdmin) return;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      roleTitle: prev.roleTitle || ROLE_DEFINITIONS[newRole]?.name || ''
    }));
    // Sync permissions from role defaults (respecting customized role matrix)
    const defaults = customRolePermissions?.[newRole] || ROLE_DEFINITIONS[newRole]?.defaultPermissions || ROLE_DEFINITIONS.SALESPERSON.defaultPermissions;
    setCustomPerms(JSON.parse(JSON.stringify(defaults)));
  };

  const handleTogglePerm = (module: keyof UserPermissions, key: string) => {
    if (!isCurrentUserAdmin) return;
    setCustomPerms(prev => {
      const mod = { ...(prev[module] as any) };
      mod[key] = !mod[key];
      return {
        ...prev,
        [module]: mod,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('error', 'Validation Error', 'Please enter user full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      showToast('error', 'Validation Error', 'Please enter a valid work email address.');
      return;
    }

    const initials = formData.name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';

    if (userToEdit) {
      // Editing existing user
      if (!isCurrentUserAdmin && userToEdit.id !== currentUser.id) {
        showToast('error', 'Access Denied', 'You cannot edit other team members.');
        onClose();
        return;
      }

      const updates: Partial<AppUser> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        avatarBg: formData.avatarBg,
        avatarText: initials,
      };

      // Only update password/pin if a new value was explicitly entered
      if (formData.password.trim()) {
        updates.password = formData.password.trim();
      }
      if (formData.pin.trim()) {
        updates.pin = formData.pin.trim();
      }

      // Role and granular permissions can ONLY be modified by Admins
      if (isCurrentUserAdmin) {
        updates.roleTitle = formData.roleTitle.trim();
        updates.role = formData.role;
        updates.isActive = formData.isActive;
        updates.customPermissions = customPerms;
      }

      updateUser(userToEdit.id, updates);
    } else {
      // Creating new user (Admins only)
      if (!isCurrentUserAdmin) {
        showToast('error', 'Access Denied', 'Only Administrators can create new team members.');
        onClose();
        return;
      }

      createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        roleTitle: formData.roleTitle.trim() || ROLE_DEFINITIONS[formData.role].name,
        role: formData.role,
        avatarBg: formData.avatarBg,
        avatarText: initials,
        isActive: formData.isActive,
        password: formData.password.trim() || 'admin',
        pin: formData.pin.trim() || '1234',
        customPermissions: customPerms,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto modal-overlay animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[96vw] sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20 shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {userToEdit 
                  ? (isEditingSelf ? 'Edit Your Profile & Password' : `Edit User: ${userToEdit.name}`)
                  : 'Add New Team Member'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                {userToEdit
                  ? (isCurrentUserAdmin ? 'Configure role access levels, department, and credentials' : 'Update your personal profile and security credentials')
                  : 'Set up work email, assigned system role, and access authorization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto modal-content-scroll p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@bharattech.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Branch
                </label>
                <input
                  type="text"
                  placeholder="Sales, Accounts, Warehouse, etc."
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Profile Badge Theme
              </label>
              <div className="flex items-center gap-2">
                {BG_AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatarBg: color })}
                    className={`w-6 h-6 rounded-full ${color} transition-transform cursor-pointer ${
                      formData.avatarBg === color ? 'ring-2 ring-offset-2 ring-indigo-600 dark:ring-offset-slate-900 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Role Selection */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Assigned System Role
            </h3>

            {isCurrentUserAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMPANY_ASSIGNABLE_ROLES.map(rKey => {
                  const roleDef = ROLE_DEFINITIONS[rKey];
                  const isSelected = formData.role === rKey;

                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => handleRoleChange(rKey)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{roleDef.name}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${roleDef.badgeBg} ${roleDef.badgeText}`}>
                            {rKey}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {roleDef.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selected Role
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {ROLE_DEFINITIONS[formData.role]?.name || formData.role}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${ROLE_DEFINITIONS[formData.role]?.badgeBg} ${ROLE_DEFINITIONS[formData.role]?.badgeText}`}>
                      {formData.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Your system role is assigned by your Company Administrator. Contact an Admin to change access level.
                  </p>
                </div>
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              </div>
            )}
          </div>

          {/* Section 3: Security Credentials (Password & PIN) */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" /> {userToEdit ? 'Reset Security Credentials' : 'Login Credentials & Security'}
              </h3>
              {isCurrentUserAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const randomPwd = Math.random().toString(36).slice(-6);
                    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                    setFormData(prev => ({ ...prev, password: randomPwd, pin: randomPin }));
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer hover:underline"
                >
                  Generate Random
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {userToEdit ? 'New Password' : 'User Account Password'} {!userToEdit && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={userToEdit ? 'Leave blank to keep existing password' : 'Set secure password...'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 pr-9 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {userToEdit 
                    ? '🔒 Existing password is protected. Enter only to set a new password.'
                    : 'Used for browser login and session unlocking'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {userToEdit ? 'New 4-Digit PIN' : 'Quick 4-Digit PIN'} {!userToEdit && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    placeholder={userToEdit ? 'Leave blank to keep existing PIN' : 'Set 4-digit PIN...'}
                    value={formData.pin}
                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full px-3.5 pr-9 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {userToEdit 
                    ? '🔒 Existing PIN is protected. Enter only to set a new PIN.' 
                    : 'For fast counter POS & quick screen unlocking'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Granular Permission Customization Accordion (Admins Only) */}
          {isCurrentUserAdmin && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Fine-tune Granular Permissions (Module & Action Level)</span>
                </div>
                {showAdvancedPerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvancedPerms && (
                <div className="mt-3 p-4 bg-slate-50/70 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-4 animate-in fade-in duration-150">
                  {/* Module Selector Tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {(Object.keys(customPerms) as (keyof UserPermissions)[]).map(modKey => (
                      <button
                        key={modKey}
                        type="button"
                        onClick={() => setActivePermModule(modKey)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize shrink-0 transition-all cursor-pointer ${
                          activePermModule === modKey
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {modKey.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Active Module Permissions List */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-700">
                      {activePermModule.replace(/_/g, ' ')} Capabilities
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {Object.entries((customPerms[activePermModule] || {}) as Record<string, boolean>).map(([permKey, isAllowed]) => (
                        <label
                          key={permKey}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-100 dark:border-slate-700/60 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => handleTogglePerm(activePermModule, permKey)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                          />
                          <span className="text-slate-700 dark:text-slate-200 font-medium capitalize">
                            {permKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Submit & Delete */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {isCurrentUserAdmin && userToEdit && userToEdit.id !== currentUser.id && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const success = deleteUser(userToEdit.id);
                        if (success) {
                          onClose();
                        }
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete User</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{userToEdit ? 'Save Profile' : 'Create User & Send Invite'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
