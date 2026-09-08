import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Company, BusinessProfile, HeaderConfig, SuperAdminAuthData, LowStockSettings } from '../../types';
import { INDIAN_STATES } from '../../utils/constants';
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Plus, 
  ArrowRight, 
  Search, 
  Filter, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Database, 
  Activity, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Sparkles, 
  RefreshCw, 
  Server,
  Layers,
  Crown,
  FileSpreadsheet,
  Sliders,
  Palette,
  Layout,
  LogOut,
  User,
  UserCheck,
  UserCog,
  Briefcase,
  AtSign,
  Shield,
  Smartphone,
  Package
} from 'lucide-react';
import { CreateCompanyModal } from '../company/CreateCompanyModal';
import { HeaderSettingsTab } from '../settings/HeaderSettingsTab';
import { LowStockSettingsTab } from '../settings/LowStockSettingsTab';
import { DEFAULT_HEADER_CONFIG, HEADER_PRESETS, normalizeHeaderConfig } from '../../utils/headerDefaults';
import { DEFAULT_LOW_STOCK_SETTINGS, normalizeLowStockSettings } from '../../utils/stockUtils';
import { AppLogo } from '../common/AppLogo';

const SUPER_ADMIN_AVATAR_THEMES = [
  { id: 'purple', name: 'Royal Purple', class: 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-700' },
  { id: 'emerald', name: 'Emerald Teal', class: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700' },
  { id: 'sapphire', name: 'Sapphire Blue', class: 'bg-gradient-to-tr from-blue-600 via-indigo-700 to-slate-900' },
  { id: 'amber', name: 'Amber Bronze', class: 'bg-gradient-to-tr from-amber-600 via-orange-600 to-red-700' },
  { id: 'rose', name: 'Rose Velvet', class: 'bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-800' },
  { id: 'obsidian', name: 'Obsidian Dark', class: 'bg-gradient-to-tr from-slate-800 via-zinc-900 to-black' },
];

interface EditSuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  superAdminAuth: SuperAdminAuthData;
  onSave: (updates: Partial<SuperAdminAuthData>, currentAuth: string) => { success: boolean; error?: string };
}

const EditSuperAdminModal: React.FC<EditSuperAdminModalProps> = ({
  isOpen,
  onClose,
  superAdminAuth,
  onSave,
}) => {
  const [modalTab, setModalTab] = useState<'profile' | 'avatar' | 'security'>('profile');
  const [name, setName] = useState(superAdminAuth.name || 'Kuldeepn Siraswar');
  const [email, setEmail] = useState(superAdminAuth.email || 'kuldeep.siraswar@gmail.com');
  const [phone, setPhone] = useState(superAdminAuth.phone || '+91 99999 88888');
  const [roleTitle, setRoleTitle] = useState(superAdminAuth.roleTitle || 'Platform Super Administrator');
  const [department, setDepartment] = useState(superAdminAuth.department || 'Executive Governance & Board');
  const [avatarBg, setAvatarBg] = useState(superAdminAuth.avatarBg || SUPER_ADMIN_AVATAR_THEMES[0].class);
  const [avatarText, setAvatarText] = useState(superAdminAuth.avatarText || 'SA');
  
  // Security credentials fields
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentAuth, setCurrentAuth] = useState('');
  const [showCurrentAuth, setShowCurrentAuth] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(superAdminAuth.name || 'Kuldeep Siraswar');
      setEmail(superAdminAuth.email || 'kuldeep.siraswar@gmail.com');
      setPhone(superAdminAuth.phone || '+91 99999 88888');
      setRoleTitle(superAdminAuth.roleTitle || 'Platform Super Administrator');
      setDepartment(superAdminAuth.department || 'Executive Governance & Board');
      setAvatarBg(superAdminAuth.avatarBg || SUPER_ADMIN_AVATAR_THEMES[0].class);
      setAvatarText(superAdminAuth.avatarText || 'SA');
      setNewPassword('');
      setNewPin('');
      setCurrentAuth('');
      setErrorMessage(null);
      setModalTab('profile');
    }
  }, [isOpen, superAdminAuth]);

  if (!isOpen) return null;

  const handleAutoInitials = () => {
    if (!name.trim()) return;
    const parts = name.trim().split(' ').filter(Boolean);
    const initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
    setAvatarText(initials || 'SA');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Super Admin Name cannot be blank.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid Super Admin email address.');
      return;
    }
    if (!currentAuth.trim()) {
      setErrorMessage('Please enter your Current Password or Master PIN in the security verification field to authorize changes.');
      return;
    }
    if (newPin.trim() && !/^\d{4}$/.test(newPin.trim())) {
      setErrorMessage('New Master PIN must be exactly 4 numeric digits.');
      return;
    }

    setIsSaving(true);
    const computedInitials = avatarText.trim() || (name.trim().slice(0, 2).toUpperCase());

    const updates: Partial<SuperAdminAuthData> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      roleTitle: roleTitle.trim(),
      department: department.trim(),
      avatarBg,
      avatarText: computedInitials,
      ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
      ...(newPin.trim() ? { pin: newPin.trim() } : {}),
    };

    const res = onSave(updates, currentAuth.trim());
    setIsSaving(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update Super Admin profile.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto modal-overlay animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-[96vw] sm:max-w-xl md:max-w-2xl w-full border border-slate-100 overflow-hidden my-auto max-h-[95dvh] sm:max-h-[90dvh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header with Dark Royal Gradient */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">Edit Super Admin Details</h2>
                <span className="px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 rounded-md border border-purple-400/30">
                  ROOT
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200/80 truncate">Configure Master Administrator Identity & Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Identity Preview Card */}
        <div className="bg-gradient-to-r from-slate-900 to-purple-950 text-white p-4 mx-6 mt-5 rounded-2xl border border-purple-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl ${avatarBg} text-amber-300 font-black text-base flex items-center justify-center shadow-md ring-2 ring-purple-400/50 shrink-0`}>
              {avatarText || 'SA'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white truncate">{name || 'Super Administrator'}</h4>
                <span className="text-[9px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded">
                  ROOT
                </span>
              </div>
              <p className="text-xs text-purple-200 truncate">{roleTitle || 'Platform Super Administrator'}</p>
              <p className="text-[11px] text-purple-300/70 truncate">{email || 'kuldeep.siraswar@gmail.com'}</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-1 bg-purple-900/60 text-purple-200 border border-purple-700/50 rounded-lg shrink-0">
            Live Preview
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 mt-2 border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setModalTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'profile'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('avatar')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'avatar'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Avatar & Theme</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('security')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'security'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Credentials & PIN</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {modalTab === 'profile' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Super Admin Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Kuldeep Siraswar"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. kuldeep.siraswar@gmail.com"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. +91 99999 88888"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role Title / Designation
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={e => setRoleTitle(e.target.value)}
                      placeholder="e.g. Platform Super Administrator"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department / Governance Unit
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. Executive Governance & Board"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          )}

          {modalTab === 'avatar' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Avatar Initials (1-3 Characters)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={3}
                    value={avatarText}
                    onChange={e => setAvatarText(e.target.value.toUpperCase())}
                    placeholder="e.g. SA"
                    className="w-24 text-center font-bold font-mono uppercase px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAutoInitials}
                    className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto Generate from Name</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Avatar Gradient Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SUPER_ADMIN_AVATAR_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setAvatarBg(theme.class)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        avatarBg === theme.class
                          ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/30'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${theme.class} text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}>
                        👑
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{theme.name}</p>
                        <p className="text-[10px] text-slate-500">Preset Theme</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalTab === 'security' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Optionally update your global Super Admin password or 4-digit master PIN. Leave these blank if you want to keep existing credentials unchanged.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Master Password (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep unchanged"
                      className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New 4-Digit Master PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="e.g. 9999"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono tracking-widest"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Verification / Authentication Section (Required to confirm changes) */}
          <div className="pt-3 border-t border-slate-200">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-700" />
                <span>Verify Identity to Authorize Updates *</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentAuth ? 'text' : 'password'}
                  required
                  value={currentAuth}
                  onChange={e => setCurrentAuth(e.target.value)}
                  placeholder="Enter Current Super Admin Password or Master PIN"
                  className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentAuth(!showCurrentAuth)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentAuth ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Security confirmation is required before updating root governance records.
              </p>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-purple-900/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving & Syncing...' : 'Save & Sync Super Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditCompanyModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyId: string, profileUpdates: Partial<BusinessProfile>, companyUpdates?: Partial<Company>) => void;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({ company, isOpen, onClose, onSave }) => {
  const [modalTab, setModalTab] = useState<'profile' | 'header' | 'low_stock'>('profile');
  const [name, setName] = useState(company.name || '');
  const [tradeName, setTradeName] = useState(company.tradeName || '');
  const [gstin, setGstin] = useState(company.gstin || '');
  const [pan, setPan] = useState(company.pan || '');
  const [state, setState] = useState(company.state || 'Maharashtra');
  const [stateCode, setStateCode] = useState(company.stateCode || '27');
  const [city, setCity] = useState(company.city || '');
  const [address, setAddress] = useState(company.address || '');
  const [pincode, setPincode] = useState(company.pincode || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [email, setEmail] = useState(company.email || '');
  const [financialYear, setFinancialYear] = useState(company.financialYear || '2026-2027');
  const [themeColor, setThemeColor] = useState(company.themeColor || 'indigo');
  const [isActive, setIsActive] = useState<boolean>(company.isActive ?? true);
  const [disabledReason, setDisabledReason] = useState(company.disabledReason || '');
  const [modalHeaderConfig, setModalHeaderConfig] = useState<HeaderConfig>(() => 
    normalizeHeaderConfig(company.headerConfig || DEFAULT_HEADER_CONFIG)
  );
  const [modalLowStockSettings, setModalLowStockSettings] = useState<LowStockSettings>(() =>
    normalizeLowStockSettings(company.lowStockSettings || DEFAULT_LOW_STOCK_SETTINGS)
  );

  // Synchronize and bind company & facility profile data whenever company changes or modal opens
  useEffect(() => {
    if (isOpen && company) {
      setName(company.name || '');
      setTradeName(company.tradeName || '');
      setGstin(company.gstin || '');
      setPan(company.pan || '');
      setState(company.state || 'Maharashtra');
      setStateCode(company.stateCode || '27');
      setCity(company.city || '');
      setAddress(company.address || '');
      setPincode(company.pincode || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setFinancialYear(company.financialYear || '2026-2027');
      setThemeColor(company.themeColor || 'indigo');
      setIsActive(company.isActive ?? true);
      setDisabledReason(company.disabledReason || '');
      setModalHeaderConfig(normalizeHeaderConfig(company.headerConfig || DEFAULT_HEADER_CONFIG));
      setModalLowStockSettings(normalizeLowStockSettings(company.lowStockSettings || DEFAULT_LOW_STOCK_SETTINGS));
      setModalTab('profile');
    }
  }, [isOpen, company]);

  if (!isOpen) return null;

  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    const found = INDIAN_STATES.find(s => s.name === selectedState);
    if (found) {
      setStateCode(found.code);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave(
      company.id,
      {
        name: name.trim(),
        tradeName: tradeName.trim() || name.trim(),
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        state,
        stateCode,
        city: city.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        headerConfig: modalHeaderConfig,
        lowStockSettings: modalLowStockSettings,
      },
      {
        financialYear,
        themeColor,
        headerConfig: modalHeaderConfig,
        lowStockSettings: modalLowStockSettings,
        isActive,
        disabledReason: isActive ? undefined : disabledReason.trim(),
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto modal-overlay animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-[98vw] md:max-w-2xl lg:max-w-3xl w-full border border-slate-100 overflow-hidden my-auto max-h-[96dvh] sm:max-h-[92dvh] flex flex-col">
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold truncate">Edit Business Profile & Header</h2>
              <p className="text-[11px] sm:text-xs text-indigo-200 truncate">Super Admin Workspace Control • ID: {company.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setModalTab('profile')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Profile & Tax Credentials</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('header')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'header'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Top Header Navigation</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('low_stock')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'low_stock'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            <span>Low Stock & Inventory Engine</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {modalTab === 'profile' ? (
            <>
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  {isActive ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Operational Status: {isActive ? 'Active Trading' : 'Suspended / Disabled'}
                    </p>
                    <p className="text-[11px] opacity-80">
                      {isActive ? 'Company can issue invoices and process transactions.' : 'Company operations are locked.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isActive ? 'Suspend Business' : 'Enable Business'}
                </button>
              </div>

              {!isActive && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Suspension Reason / Notice</label>
                  <input
                    type="text"
                    value={disabledReason}
                    onChange={e => setDisabledReason(e.target.value)}
                    placeholder="e.g. Account audit in progress / Subscription renewal pending"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-rose-300 bg-rose-50/50 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Business Legal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trade / Brand Name</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={e => setTradeName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={e => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={pan}
                    onChange={e => setPan(e.target.value.toUpperCase())}
                    placeholder="AAAAA0000A"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono uppercase"
                  />
                </div>
              </div>

              {/* Contact & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State / Union Territory</label>
                  <select
                    value={state}
                    onChange={e => handleStateChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.name}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / District</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Financial Year</label>
                  <select
                    value={financialYear}
                    onChange={e => setFinancialYear(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="2025-2026">FY 2025-2026</option>
                    <option value="2026-2027">FY 2026-2027</option>
                    <option value="2027-2028">FY 2027-2028</option>
                  </select>
                </div>
              </div>
            </>
          ) : modalTab === 'header' ? (
            <HeaderSettingsTab
              isSuperAdminMode={true}
              initialConfig={modalHeaderConfig}
              onConfigChange={setModalHeaderConfig}
              companyName={tradeName || name}
            />
          ) : (
            <LowStockSettingsTab
              formData={{ lowStockSettings: modalLowStockSettings }}
              setFormData={(val: any) => {
                if (typeof val === 'function') {
                  const updated = val({ lowStockSettings: modalLowStockSettings });
                  if (updated?.lowStockSettings) setModalLowStockSettings(updated.lowStockSettings);
                } else if (val?.lowStockSettings) {
                  setModalLowStockSettings(val.lowStockSettings);
                }
              }}
              onSave={() => {}}
            />
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Workspace Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SuperAdminDashboard: React.FC = () => {
  const {
    companies,
    currentCompanyId,
    business,
    switchCompany,
    deleteCompany,
    toggleCompanyStatus,
    editBusinessProfile,
    superAdminAuth,
    superAdminUser,
    updateSuperAdminProfile,
    updateSuperAdminPassword,
    logoutSuperAdmin,
    cloudSyncStatus,
    lastCloudSyncTime,
    triggerCloudSync,
    isCloudSyncing,
    auditLogs,
    platformConfig,
    setActiveTab,
  } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Modals & Active actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditSuperAdminModalOpen, setIsEditSuperAdminModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  // Super Admin Password Management Form State
  const [currentAuthInput, setCurrentAuthInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [showCurrentAuth, setShowCurrentAuth] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [credentialsMsg, setCredentialsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(comp => {
      const matchesSearch = 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.tradeName && comp.tradeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.gstin && comp.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.city && comp.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.state && comp.state.toLowerCase().includes(searchQuery.toLowerCase()));

      const isCompActive = comp.isActive ?? true;
      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? isCompActive : !isCompActive;

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = companies.length;
    const activeCount = companies.filter(c => c.isActive !== false).length;
    const disabledCount = total - activeCount;
    return {
      total,
      activeCount,
      disabledCount,
    };
  }, [companies]);

  // Password & PIN change handler
  const handleUpdateMasterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsMsg(null);

    if (!currentAuthInput.trim()) {
      setCredentialsMsg({ type: 'error', text: 'Please enter your current Super Admin Password or Master PIN.' });
      return;
    }

    if (!newPasswordInput.trim() && !newPinInput.trim()) {
      setCredentialsMsg({ type: 'error', text: 'Please provide either a new password or a new 4-digit PIN.' });
      return;
    }

    if (newPinInput.trim() && !/^\d{4}$/.test(newPinInput.trim())) {
      setCredentialsMsg({ type: 'error', text: 'Master PIN must be exactly 4 numeric digits.' });
      return;
    }

    setIsUpdatingAuth(true);
    const result = updateSuperAdminPassword(currentAuthInput, newPasswordInput, newPinInput);
    setIsUpdatingAuth(false);

    if (result.success) {
      setCredentialsMsg({ type: 'success', text: 'Master credentials successfully updated and synced to Firestore.' });
      setCurrentAuthInput('');
      setNewPasswordInput('');
      setNewPinInput('');
    } else {
      setCredentialsMsg({ type: 'error', text: result.error || 'Failed to update master credentials.' });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingCompany) return;
    deleteCompany(deletingCompany.id);
    setDeletingCompany(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Master Super Admin Portal • {platformConfig?.appName || 'Zooka Business'}
            </div>
            
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <AppLogo config={platformConfig} size="lg" className="shadow-xl ring-2 ring-indigo-500/40 shrink-0" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md" title="Super Admin Authority">
                  <Crown className="w-3 h-3" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                  <span>{platformConfig?.appName || 'Zooka Business'}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    {platformConfig?.brandBadgeText || 'PRO'}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">Multi-Company Governance</span>
                </h1>
                <p className="text-xs text-indigo-300/90 font-medium mt-0.5">
                  {platformConfig?.appTagline || 'Smart Business, GST & E-Invoicing Suite'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Create, edit, suspend, or permanently remove business workspaces across the multi-tenant architecture with Google Cloud Firestore replication.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('super_admin_dashboard')}
              className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-white text-xs font-bold transition-all flex items-center gap-2 border border-purple-400/40 cursor-pointer shadow-md"
              title="Open full Super Admin Master Console with Platform Branding, Announcements & Governance"
            >
              <Palette className="w-4 h-4 text-purple-300" />
              <span>Platform Identity & Branding</span>
            </button>
            <button
              onClick={() => setIsEditSuperAdminModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer shadow-md"
              title="Edit Super Admin Name, Email, Phone, Role Title & Avatar"
            >
              <UserCog className="w-4 h-4 text-amber-300" />
              <span>Edit Super Admin</span>
            </button>
            <button
              onClick={() => triggerCloudSync()}
              disabled={isCloudSyncing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              {isCloudSyncing ? 'Syncing...' : 'Sync Firestore Cloud DB'}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Business
            </button>
            <button
              onClick={logoutSuperAdmin}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/40 border border-rose-400/30 flex items-center gap-2 cursor-pointer active:scale-95"
              title="Close Super Admin session and lock portal"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Super Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Businesses</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered workspaces</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Entities</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.activeCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Operational for billing</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Suspended / Inactive</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{stats.disabledCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Blocked transactions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cloud Firestore</p>
            <p className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${cloudSyncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {cloudSyncStatus === 'online' ? 'Online & Synced' : 'Cached Locally'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lastCloudSyncTime ? `Last: ${lastCloudSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Server className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left side Companies Table, Right side Master Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Businesses Directory (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Registered Business Workspaces ({filteredCompanies.length})
                </h2>
                <p className="text-xs text-slate-500">Manage tenant entities, tax configurations, and operational switches</p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, GSTIN, city..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden w-44 sm:w-56"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-slate-700"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="DISABLED">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Companies List */}
            {filteredCompanies.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Building2 className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs font-semibold">No business profiles matching your filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompanies.map(comp => {
                  const isCurrent = comp.id === currentCompanyId;
                  const isCompActive = comp.isActive ?? true;

                  return (
                    <div
                      key={comp.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-500/10'
                          : isCompActive
                          ? 'border-slate-200 bg-white hover:border-slate-300'
                          : 'border-rose-200 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Company Info */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {comp.tradeName || comp.name}
                            </span>
                            {comp.tradeName && comp.tradeName !== comp.name && (
                              <span className="text-xs text-slate-400 font-medium">
                                ({comp.name})
                              </span>
                            )}

                            {/* Status Badge */}
                            {isCompActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5" /> Suspended
                              </span>
                            )}

                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Current Active Workspace
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {comp.gstin && (
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
                                GSTIN: {comp.gstin}
                              </span>
                            )}
                            {comp.pan && (
                              <span className="font-mono text-[11px]">PAN: {comp.pan}</span>
                            )}
                            {comp.state && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {comp.city ? `${comp.city}, ` : ''}{comp.state} ({comp.stateCode})
                              </span>
                            )}
                            {comp.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {comp.phone}
                              </span>
                            )}
                          </div>

                          {!isCompActive && comp.disabledReason && (
                            <p className="text-[11px] text-rose-700 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-rose-500" /> Notice: {comp.disabledReason}
                            </p>
                          )}
                        </div>

                        {/* Control Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Toggle Active Switch */}
                          <button
                            type="button"
                            onClick={() => toggleCompanyStatus(comp.id, !isCompActive)}
                            title={isCompActive ? 'Suspend Business' : 'Enable Business'}
                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isCompActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isCompActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingCompany(comp)}
                            title="Edit Business Details"
                            className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Switch To Company Workspace */}
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => switchCompany(comp.id)}
                              title="Enter this company workspace"
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Enter</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl">
                              Active
                            </span>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={companies.length <= 1}
                            onClick={() => setDeletingCompany(comp)}
                            title={companies.length <= 1 ? 'Cannot delete only company' : 'Permanently Delete Company Workspace'}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Super Admin Master Credentials & Platform Security */}
        <div className="space-y-6">
          {/* Active Super Admin Profile & Identity Governance Card */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950/70 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-purple-800/50 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
                  Master Authority Active
                </span>
              </div>

              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-200 rounded-full border border-purple-400/40">
                SUPER ADMIN
              </span>
            </div>

            {/* Profile Highlight */}
            <div className="flex items-center gap-4 bg-purple-950/40 p-3.5 rounded-2xl border border-purple-800/40">
              <div className={`w-14 h-14 rounded-2xl ${superAdminAuth.avatarBg || 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-700'} text-amber-300 font-black text-lg flex items-center justify-center shadow-lg ring-2 ring-purple-400/40 shrink-0`}>
                {superAdminAuth.avatarText || 'KS'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-white truncate">
                  {superAdminAuth.name || 'Kuldeep Siraswar'}
                </h3>
                <p className="text-xs text-purple-200 font-semibold truncate">
                  {superAdminAuth.roleTitle || 'Platform Super Administrator'}
                </p>
                <p className="text-[11px] text-purple-300/70 truncate mt-0.5">
                  {superAdminAuth.department || 'Executive Governance & Board'}
                </p>
              </div>
            </div>

            {/* Contact Details List */}
            <div className="space-y-2 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-purple-900/40">
              <div className="flex items-center gap-2.5 text-purple-200 truncate">
                <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{superAdminAuth.email || 'kuldeep.siraswar@gmail.com'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-purple-200 truncate">
                <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{superAdminAuth.phone || '+91 99999 88888'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-purple-200 truncate">
                <KeyRound className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate text-[11px] text-purple-300">
                  Master PIN: <span className="font-mono text-white">•••• (Configured)</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditSuperAdminModalOpen(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/40 border border-purple-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Super Admin Details</span>
              </button>
              <button
                type="button"
                onClick={logoutSuperAdmin}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Close Super Admin Session</span>
              </button>
            </div>
          </div>

          {/* Master Password & Master PIN Management Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Master Super Admin Credentials</h3>
                <p className="text-[11px] text-slate-500">Global access key & 4-digit master unlock PIN</p>
              </div>
            </div>

            <form onSubmit={handleUpdateMasterCredentials} className="space-y-3.5">
              {credentialsMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  credentialsMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}>
                  {credentialsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span>{credentialsMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Password or Master PIN *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentAuth ? 'text' : 'password'}
                    value={currentAuthInput}
                    onChange={e => setCurrentAuthInput(e.target.value)}
                    placeholder="Enter current password or PIN"
                    required
                    className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentAuth(!showCurrentAuth)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentAuth ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Master Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full pl-3.5 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New 4-Digit Master PIN (Optional)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinInput}
                  onChange={e => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 9999"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono tracking-widest"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingAuth}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isUpdatingAuth ? 'Updating...' : 'Update Master Credentials'}
                </button>
              </div>
            </form>
          </div>

          {/* System & Global Header Navigation Control Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Header Bar Navigation Control</h3>
                  <p className="text-[11px] text-slate-500">System header styles, search & quick actions</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Active Business:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[140px]">
                    {companies.find(c => c.id === currentCompanyId)?.tradeName || 'Primary Workspace'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Layout Style:</span>
                  <span className="font-bold text-indigo-600">
                    {(business.headerConfig?.style || 'GLASS')} • {(business.headerConfig?.density || 'COMFORTABLE')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Quick Broadcast Header Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {HEADER_PRESETS.slice(0, 4).map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const targetCompany = companies.find(c => c.id === currentCompanyId);
                        if (targetCompany) {
                          editBusinessProfile(
                            targetCompany.id,
                            { headerConfig: preset.config },
                            { headerConfig: preset.config }
                          );
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group"
                    >
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">{preset.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const activeComp = companies.find(c => c.id === currentCompanyId);
                    if (activeComp) {
                      setEditingCompany(activeComp);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Customize Company Header Bar
                </button>
              </div>
            </div>
          </div>

          {/* Super Admin Quick Governance Info */}
          <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold">Platform Governance Protocol</h3>
            </div>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>Super Admin credentials govern all companies centrally and cannot be altered by standard business admins.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>Super Admin is not injected into company user rosters, preserving clean business-level access control.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>Deleting a company executes a cascading cleanup across all invoices, ledgers, and inventory partitions in Google Cloud Firestore.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Company Modal */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          isOpen={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={editBusinessProfile}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto modal-overlay">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-[96vw] sm:max-w-md w-full p-4 sm:p-6 border border-slate-100 space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Company Workspace?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong className="text-slate-800">{deletingCompany.tradeName || deletingCompany.name}</strong>?
              </p>
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 leading-snug">
                ⚠️ <strong>Warning:</strong> This will cascade and permanently erase all invoices, products, accounting ledgers, and transactions associated with this company in Google Cloud Firestore.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Super Admin Profile & Details Modal */}
      <EditSuperAdminModal
        isOpen={isEditSuperAdminModalOpen}
        onClose={() => setIsEditSuperAdminModalOpen(false)}
        superAdminAuth={superAdminAuth}
        onSave={updateSuperAdminProfile}
      />
    </div>
  );
};
