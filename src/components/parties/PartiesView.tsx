import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Party } from '../../types';
import { formatCurrency, formatDate, validateGstin } from '../../utils/formatters';
import { INDIAN_STATES } from '../../utils/constants';
import { ClientStatementModal } from './ClientStatementModal';
import { BulkPartyUploadModal } from './BulkPartyUploadModal';
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Share2, 
  BookOpen, 
  Edit3, 
  Trash2, 
  X,
  FileText,
  Clock,
  FileSpreadsheet,
  Download,
  ShoppingCart,
  RefreshCw
} from 'lucide-react';

export const PartiesView: React.FC = () => {
  const { 
    parties, 
    invoices, 
    purchaseBills, 
    business, 
    createParty, 
    bulkCreateParties, 
    updateParty, 
    deleteParty, 
    syncBillingParties,
    setSelectedInvoiceIdForPrint,
    showToast 
  } = useApp();

  // Run a one-time check on mount to ensure all billing customers and vendors are synchronized
  useEffect(() => {
    const hasUnsyncedCustomers = invoices.some(inv => 
      inv.customerName && 
      inv.customerName.trim() && 
      inv.customerName.toLowerCase() !== 'walk-in customer' && 
      !parties.some(p => p.name.trim().toLowerCase() === inv.customerName.trim().toLowerCase() || p.id === inv.customerId)
    );
    const hasUnsyncedVendors = purchaseBills.some(b => 
      b.vendorName && 
      b.vendorName.trim() && 
      !parties.some(p => p.name.trim().toLowerCase() === b.vendorName.trim().toLowerCase() || p.id === b.vendorId)
    );
    if (hasUnsyncedCustomers || hasUnsyncedVendors) {
      syncBillingParties();
    }
  }, [invoices.length, purchaseBills.length, parties.length]);

  const [searchQuery, setSearchQuery] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'VENDOR' | 'POS_CUSTOMER'>('ALL');
  
  // Statement Modal & Bulk Upload Modal
  const [statementPartyId, setStatementPartyId] = useState<string | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  // Form fields
  const [type, setType] = useState<'CUSTOMER' | 'VENDOR' | 'BOTH'>('CUSTOMER');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [stateCode, setStateCode] = useState('07');
  const [pincode, setPincode] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const filteredParties = parties.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.companyName && p.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.gstin && p.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.phone.includes(searchQuery);

    let matchesType = partyTypeFilter === 'ALL' || p.type === partyTypeFilter || p.type === 'BOTH';
    if (partyTypeFilter === 'POS_CUSTOMER') {
      const hasPosSales = invoices.some(i => 
        (i.customerId === p.id || (p.phone && i.customerPhone && p.phone.replace(/[^0-9]/g, '').slice(-10) === i.customerPhone.replace(/[^0-9]/g, '').slice(-10))) && 
        i.invoiceType === 'POS_SALE'
      );
      matchesType = hasPosSales || p.name.toLowerCase().includes('walk-in') || p.id === 'party-3';
    }

    return matchesSearch && matchesType;
  });

  const totalReceivables = parties
    .filter(p => p.currentBalance > 0)
    .reduce((s, p) => s + p.currentBalance, 0);

  const totalPayables = parties
    .filter(p => p.currentBalance < 0)
    .reduce((s, p) => s + Math.abs(p.currentBalance), 0);

  const handleOpenCreate = () => {
    setEditingParty(null);
    setType('CUSTOMER');
    setName('');
    setCompanyName('');
    setGstin('');
    setPhone('');
    setEmail('');
    setBillingAddress('');
    setCity('');
    setState('Delhi');
    setStateCode('07');
    setPincode('');
    setCreditLimit(100000);
    setCreditPeriodDays(30);
    setOpeningBalance(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Party) => {
    setEditingParty(p);
    setType(p.type);
    setName(p.name);
    setCompanyName(p.companyName || '');
    setGstin(p.gstin || '');
    setPhone(p.phone);
    setEmail(p.email || '');
    setBillingAddress(p.billingAddress);
    setCity(p.city);
    setState(p.state);
    setStateCode(p.stateCode);
    setPincode(p.pincode);
    setCreditLimit(p.creditLimit || 0);
    setCreditPeriodDays(p.creditPeriodDays || 30);
    setIsModalOpen(true);
  };

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Missing Name', 'Party or company name is required.');
      return;
    }

    const pan = gstin && gstin.length >= 12 ? gstin.substring(2, 12) : undefined;

    if (editingParty) {
      updateParty(editingParty.id, {
        type,
        name,
        companyName,
        gstin: gstin ? gstin.toUpperCase().trim() : undefined,
        pan,
        phone,
        email,
        billingAddress,
        city,
        state,
        stateCode,
        pincode,
        creditLimit,
        creditPeriodDays
      });
    } else {
      createParty({
        type,
        name,
        companyName,
        gstin: gstin ? gstin.toUpperCase().trim() : undefined,
        pan,
        phone,
        email,
        billingAddress,
        city,
        state,
        stateCode,
        pincode,
        creditLimit,
        creditPeriodDays,
        openingBalance
      });
    }

    setIsModalOpen(false);
  };

  const handleWhatsAppReminder = (party: Party) => {
    if (party.currentBalance <= 0) {
      showToast('info', 'No Dues', `${party.name} has zero outstanding balance.`);
      return;
    }
    const text = encodeURIComponent(
      `Dear ${party.name},\nThis is a gentle payment reminder from ${business.tradeName || business.name}.\nOutstanding balance: ${formatCurrency(party.currentBalance, business.currencySymbol)}.\nPlease transfer via UPI (${business.upiId}) or Bank A/C (${business.accountNumber}, IFSC: ${business.ifscCode}).\nThank you!`
    );
    window.open(`https://wa.me/${party.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Customers & Vendors (Parties Master)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Maintain customer/vendor accounts, GSTIN verification, ledgers & payment tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync Invoiced Customers & Vendors */}
          <button
            onClick={() => syncBillingParties()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Auto-sync all customer & vendor names from your invoices and bills into contacts master"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Sync Invoiced Contacts</span>
          </button>

          {/* Bulk Import CSV Action */}
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Bulk upload customer and vendor list from CSV file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              setStatementPartyId(parties[0]?.id || null);
              setIsStatementOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Generate and export client account statement with transaction history and balance"
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Account Statements</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Contact</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Receivables (Customers)</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalReceivables, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Money to be collected</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
            Dr
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Payables (Suppliers)</span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalPayables, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Money owed to vendors</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
            Cr
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party by name, company, GSTIN or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
          {(['ALL', 'CUSTOMER', 'VENDOR', 'POS_CUSTOMER'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setPartyTypeFilter(tab)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer flex items-center gap-1 ${
                partyTypeFilter === tab
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'POS_CUSTOMER' && <ShoppingCart className="w-3 h-3 text-amber-500" />}
              <span>{tab === 'ALL' ? 'All Contacts' : tab === 'CUSTOMER' ? 'Customers' : tab === 'VENDOR' ? 'Vendors' : 'POS / Retail'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="py-3 px-4">Contact & Company</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">GSTIN & PAN</th>
                <th className="py-3 px-4">Phone & City</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredParties.map(party => {
                const isDebtor = party.currentBalance > 0;
                const isCreditor = party.currentBalance < 0;

                // Find POS sales and total transactions for this party
                const partyInvoices = invoices.filter(i => 
                  i.customerId === party.id || 
                  (party.phone && i.customerPhone && party.phone.replace(/[^0-9]/g, '').slice(-10) === i.customerPhone.replace(/[^0-9]/g, '').slice(-10))
                );
                const posSales = partyInvoices.filter(i => i.invoiceType === 'POS_SALE');

                return (
                  <tr key={party.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{party.name}</span>
                      </div>
                      {party.companyName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{party.companyName}</div>
                      )}
                      {posSales.length > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <ShoppingCart className="w-2.5 h-2.5" />
                            {posSales.length} POS Sale{posSales.length > 1 ? 's' : ''} ({formatCurrency(posSales.reduce((s, x) => s + x.grandTotal, 0), business.currencySymbol)})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        party.type === 'CUSTOMER'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : party.type === 'VENDOR'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                      }`}>
                        {party.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {party.gstin ? (
                        <div>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">{party.gstin}</span>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            State: {party.state} ({party.stateCode})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">Unregistered (URP)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{party.phone}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{party.city || party.state}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className={`font-mono font-bold text-xs ${
                        isDebtor ? 'text-emerald-600 dark:text-emerald-400' : isCreditor ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {formatCurrency(Math.abs(party.currentBalance), business.currencySymbol)}
                        <span className="text-[10px] ml-1 font-sans">
                          {isDebtor ? '(To Receive)' : isCreditor ? '(To Pay)' : '(Settled)'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setStatementPartyId(party.id);
                            setIsStatementOpen(true);
                          }}
                          title="Generate & Export Client Statement of Accounts"
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {isDebtor && (
                          <button
                            onClick={() => handleWhatsAppReminder(party)}
                            title="Send WhatsApp Payment Reminder"
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEdit(party)}
                          title="Edit Contact"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => deleteParty(party.id)}
                          title="Delete Contact"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredParties.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No contacts found</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Quickly import customer & vendor accounts using CSV bulk upload.</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setIsBulkUploadOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Bulk Import CSV</span>
                        </button>
                        <button
                          onClick={handleOpenCreate}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Contact</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Party Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-md md:max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingParty ? 'Edit Contact Profile' : 'Add New Customer / Vendor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Party Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CUSTOMER', 'VENDOR', 'BOTH'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-1.5 rounded-xl font-bold transition-all ${
                        type === t
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Trade Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Solutions"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setGstin(val);
                      const res = validateGstin(val);
                      if (res.isValid && res.stateCode) {
                        setStateCode(res.stateCode);
                        setState(res.stateName || state);
                      }
                    }}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full px-3 py-2 font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone / Mobile *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="accounts@client.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Address</label>
                  <textarea
                    rows={2}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                  <select
                    value={stateCode}
                    onChange={(e) => {
                      const sc = e.target.value;
                      const s = INDIAN_STATES.find(item => item.code === sc);
                      setStateCode(sc);
                      setState(s ? s.name : '');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                {!editingParty && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Opening Balance ({business.currencySymbol})</label>
                    <input
                      type="number"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Statement of Account Modal */}
      {isStatementOpen && (
        <ClientStatementModal
          partyId={statementPartyId || undefined}
          onClose={() => {
            setIsStatementOpen(false);
            setStatementPartyId(null);
          }}
          onSelectInvoiceForPrint={setSelectedInvoiceIdForPrint}
        />
      )}

      {/* Bulk CSV Contacts Upload Modal */}
      <BulkPartyUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onImport={(partiesList, updateExisting) => {
          bulkCreateParties(partiesList, updateExisting);
        }}
        currencySymbol={business.currencySymbol}
      />
    </div>
  );
};
