import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Company, BusinessProfile } from '../../types';
import { 
  Building2, 
  X, 
  Check, 
  Plus, 
  ShieldCheck, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail, 
  KeyRound, 
  Sparkles, 
  UserPlus,
  Receipt,
  Layers,
  Lock,
  Fingerprint,
  Crown,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { INDIAN_STATES } from '../../utils/constants';
import { DEFAULT_LOW_STOCK_SETTINGS } from '../../utils/stockUtils';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdCompany: Company) => void;
}

const THEME_COLORS = [
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-600' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-600' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-600' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-600' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-600' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-600' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-600' },
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createCompany, currentUser, verifySuperAdminKey, showToast, logSecurityEvent } = useApp();

  // Super Admin Authorization state
  const isSuperAdminLoggedIn = currentUser?.role === 'SUPER_ADMIN';
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [isSuperAdminAuthorized, setIsSuperAdminAuthorized] = useState<boolean>(isSuperAdminLoggedIn);
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [businessType, setBusinessType] = useState('Private Limited • Trading & Services');
  const [state, setState] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [themeColor, setThemeColor] = useState('indigo');

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Initial Administrator Account
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [adminPin, setAdminPin] = useState('1111');

  useEffect(() => {
    if (isSuperAdminLoggedIn) {
      setIsSuperAdminAuthorized(true);
    }
  }, [isSuperAdminLoggedIn, isOpen]);

  if (!isOpen) return null;

  const handleVerifySuperAdmin = () => {
    if (!superAdminKey.trim()) {
      setSuperAdminError('Please enter the Super Admin Password or 4-digit Master PIN.');
      return;
    }

    if (verifySuperAdminKey(superAdminKey)) {
      setIsSuperAdminAuthorized(true);
      setSuperAdminError(null);
      showToast('success', 'Super Admin Verified', 'Master authorization granted. You may now create a business.');
    } else {
      setIsSuperAdminAuthorized(false);
      setSuperAdminError('Invalid Super Admin credentials. Only authorized Super Admin can provision businesses.');
      showToast('error', 'Authorization Denied', 'Invalid Super Admin password or PIN.');
    }
  };

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().trim();
    setGstin(upper);

    // Auto extract State Code from first 2 digits
    if (upper.length >= 2) {
      const code = upper.substring(0, 2);
      const matchedState = INDIAN_STATES.find(s => s.code === code);
      if (matchedState) {
        setState(matchedState.name);
        setStateCode(matchedState.code);
      }
    }

    // Auto extract PAN from digits 3-12
    if (upper.length >= 12) {
      const derivedPan = upper.substring(2, 12);
      setPan(derivedPan);
    }
  };

  const handleStateChange = (selectedStateName: string) => {
    setState(selectedStateName);
    const matched = INDIAN_STATES.find(s => s.name === selectedStateName);
    if (matched) {
      setStateCode(matched.code);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT CHECK: Without Super Admin, no business can be created!
    if (!isSuperAdminAuthorized && !isSuperAdminLoggedIn) {
      showToast('error', 'Super Admin Required', 'Strict Security: Without Super Admin authorization, no business can be created.');
      setSuperAdminError('Super Admin authorization is required to create a business.');
      return;
    }

    if (!companyName.trim()) {
      showToast('error', 'Required Field', 'Please enter Company Legal Name.');
      return;
    }

    if (!adminName.trim()) {
      showToast('error', 'Required Field', 'Please provide an Administrator name.');
      return;
    }

    const newCompany = createCompany(
      {
        name: companyName.trim(),
        tradeName: tradeName.trim() || companyName.trim(),
        gstin: gstin.trim() || 'UNREGISTERED',
        pan: pan.trim() || (gstin.length >= 12 ? gstin.substring(2, 12) : 'PANNOTSET'),
        businessType,
        state,
        stateCode,
        city: city.trim() || 'Mumbai',
        address: address.trim() || 'Main Business Avenue',
        pincode: pincode.trim() || '400001',
        phone: phone.trim() || '+91 98000 00000',
        email: email.trim() || (adminEmail.trim() || 'accounts@company.com'),
        bankName: bankName.trim() || 'HDFC Bank Ltd',
        accountNumber: accountNumber.trim() || '50200000000000',
        ifscCode: ifscCode.trim().toUpperCase() || 'HDFC0000000',
        branchName: 'Main Commercial Branch',
        upiId: upiId.trim() || 'mybusiness@upi',
        financialYear,
        currency: 'INR',
        currencySymbol: '₹',
        themeColor,
        lowStockSettings: DEFAULT_LOW_STOCK_SETTINGS,
      },
      {
        name: adminName.trim(),
        email: adminEmail.trim() || `${adminName.toLowerCase().replace(/\s+/g, '')}@company.com`,
        password: adminPassword.trim() || 'admin',
        pin: adminPin.trim() || '1111',
      }
    );

    logSecurityEvent('COMPANY_CREATED', 'Organization Management', `Created company "${newCompany.name}" (${newCompany.gstin}) with Super Admin authorization.`);

    if (onSuccess) {
      onSuccess(newCompany);
    }
    onClose();
  };

  const handleFillDemo = () => {
    setCompanyName('Zenith Logistics & Supply Chain Pvt Ltd');
    setTradeName('Zenith Express Logistics');
    setGstin('24AABCZ8899Z1Z3');
    setPan('AABCZ8899Z');
    setBusinessType('Private Limited • Logistics & Supply');
    setState('Gujarat');
    setStateCode('24');
    setCity('Ahmedabad');
    setAddress('C-402, Titanium City Centre, Prahlad Nagar');
    setPincode('380015');
    setPhone('+91 97234 55667');
    setEmail('accounts@zenithexpress.in');
    setBankName('Axis Bank Ltd');
    setAccountNumber('921020011448899');
    setIfscCode('UTIB0000888');
    setUpiId('zenithexpress@axisbank');
    setAdminName('Kiran Patel');
    setAdminEmail('kiran@zenithexpress.in');
    setAdminPassword('admin');
    setAdminPin('1111');
    setThemeColor('emerald');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto modal-overlay animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-[96vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[95dvh] sm:max-h-[90dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-purple-900/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white ring-2 ring-white/10 shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white leading-none truncate">Register New Company / Business</h2>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/40">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 sm:mt-1 truncate">Multi-entity provisioning with isolated GSTIN, books & user roles</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 hover:text-white text-[11px] sm:text-xs font-semibold rounded-xl border border-purple-400/30 transition-all flex items-center gap-1 cursor-pointer"
              title="Auto-populate sample company details"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="hidden sm:inline">Sample Details</span>
              <span className="sm:hidden">Sample</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto modal-content-scroll space-y-4 sm:space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          
          {/* ======================================================================= */}
          {/* MANDATORY SUPER ADMIN AUTHORIZATION BANNER / SECURITY GATE             */}
          {/* ======================================================================= */}
          <div className={`rounded-2xl p-4 border transition-all ${
            isSuperAdminAuthorized 
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200' 
              : 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                  isSuperAdminAuthorized 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300'
                }`}>
                  {isSuperAdminAuthorized ? <Check className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      {isSuperAdminAuthorized 
                        ? 'Super Admin Authorization Granted' 
                        : 'Super Admin Authorization Required'}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      isSuperAdminAuthorized
                        ? 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}>
                      {isSuperAdminAuthorized ? 'Authorized' : 'Mandatory Requirement'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {isSuperAdminAuthorized
                      ? 'Verified as Super Administrator (Kuldeep Siraswar). You have master clearance to create business entities.'
                      : 'Without Super Admin verification, no company can be created in the system. Enter the Super Admin password or PIN to unlock.'}
                  </p>
                </div>
              </div>
            </div>

            {/* If not authorized, show input box */}
            {!isSuperAdminAuthorized && (
              <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/60">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <KeyRound className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={superAdminKey}
                      onChange={e => {
                        setSuperAdminKey(e.target.value);
                        if (superAdminError) setSuperAdminError(null);
                      }}
                      placeholder="Enter Super Admin Password or 4-digit Master PIN..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-purple-300 dark:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifySuperAdmin}
                    className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize Super Admin</span>
                  </button>
                </div>

                {superAdminError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{superAdminError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Business Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/60 pb-1.5">
              <Building2 className="w-4 h-4" />
              <span>1. Company Legal & Tax Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Supplies Pvt Ltd"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trade / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Tools & Hardware"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AAACA1234M1Z2"
                  value={gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono uppercase bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">State & PAN auto-extracted from GSTIN</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Permanent Account Number (PAN)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. AAACA1234M"
                  value={pan}
                  onChange={e => setPan(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono uppercase bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Constitution / Business Type
                </label>
                <select
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Private Limited • Trading & Services">Private Limited (Trading & Services)</option>
                  <option value="Proprietorship • Retail POS">Proprietorship (Retail Store)</option>
                  <option value="Partnership • Wholesale & FMCG">Partnership (Wholesale & FMCG)</option>
                  <option value="LLP • Logistics & Consulting">Limited Liability Partnership (LLP)</option>
                  <option value="Manufacturing • Industrial Unit">Manufacturing & Assembly Unit</option>
                  <option value="Public Limited Company">Public Limited Company</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Financial Year
                </label>
                <select
                  value={financialYear}
                  onChange={e => setFinancialYear(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="2026-2027">FY 2026 - 2027 (Current)</option>
                  <option value="2025-2026">FY 2025 - 2026</option>
                  <option value="2024-2025">FY 2024 - 2025</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/60 pb-1.5">
              <MapPin className="w-4 h-4" />
              <span>2. Place of Business & Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  State (Place of Supply) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={e => handleStateChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st.code} value={st.name}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City / District
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 411001"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Principal Business Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot No. 12, MIDC Industrial Area, Bhosari"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Initial Administrator Credentials */}
          <div className="bg-indigo-50/40 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/60 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>3. Primary Administrator Account (Default Sign-in for New Company)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rakesh Mehta"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. rakesh@company.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password..."
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin 4-Digit PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Fingerprint className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="4-digit PIN"
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Theme Color */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Company Branding Accent Color
            </label>
            <div className="flex items-center gap-3">
              {THEME_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setThemeColor(c.id)}
                  className={`w-8 h-8 rounded-xl ${c.class} flex items-center justify-center text-white transition-all cursor-pointer ${
                    themeColor === c.id ? 'ring-3 ring-slate-900 dark:ring-white scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                >
                  {themeColor === c.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Crown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Super Admin Master Policy Enforced</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isSuperAdminAuthorized && !isSuperAdminLoggedIn}
                className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                  isSuperAdminAuthorized || isSuperAdminLoggedIn
                    ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 hover:from-purple-800 hover:to-indigo-700 text-white shadow-purple-600/25 active:scale-95'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Create Company & Launch</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
