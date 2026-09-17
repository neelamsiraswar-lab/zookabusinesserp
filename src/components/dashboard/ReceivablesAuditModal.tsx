import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CalculatedPartyBalance } from '../../utils/partyBalances';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  FileText, 
  ArrowRight, 
  DollarSign, 
  CreditCard,
  RotateCcw,
  CheckCheck,
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface ReceivablesAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyBalancesList: CalculatedPartyBalance[];
  totalReceivables: number;
}

export const ReceivablesAuditModal: React.FC<ReceivablesAuditModalProps> = ({
  isOpen,
  onClose,
  partyBalancesList,
  totalReceivables
}) => {
  const { 
    invoices, 
    business, 
    updateInvoice, 
    recordInvoicePayment,
    updateParty, 
    parties,
    setActiveTab, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTabFilter] = useState<'ALL' | 'CUSTOMERS' | 'INVOICES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [showConfirmSettleAll, setShowConfirmSettleAll] = useState(false);

  if (!isOpen) return null;

  // Filter customers with positive Dr (receivables)
  const debtorParties = partyBalancesList.filter(p => p.closingBalance > 0.01);
  
  // Filter unpaid or partially paid invoices
  const unpaidInvoices = invoices.filter(
    inv => inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (inv.grandTotal - (inv.amountPaid || 0)) > 0.01
  );

  // Search filtering
  const filteredDebtors = debtorParties.filter(p => 
    p.partyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvoices = unpaidInvoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total collected calculation
  const validInvoices = invoices.filter(i => i.status !== 'CANCELLED');
  const totalInvoiced = validInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalCollected = validInvoices.reduce((s, i) => {
    if (i.status === 'PAID') return s + i.grandTotal;
    return s + (i.amountPaid || 0);
  }, 0);
  const collectionRate = totalInvoiced > 0 ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100)) : 100;

  // Handler: Mark a single invoice as Paid
  const handleMarkInvoicePaid = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    
    const remainingDue = Math.max(0, inv.grandTotal - (inv.amountPaid || 0));
    if (remainingDue > 0) {
      recordInvoicePayment(inv.id, remainingDue, inv.paymentMethod || 'CASH', 'Settled via Receivables Audit');
    } else {
      updateInvoice(inv.id, {
        status: 'PAID',
        amountPaid: inv.grandTotal,
        amountDue: 0
      });
    }
    showToast('success', 'Invoice Settled', `Invoice #${inv.invoiceNumber} marked as fully Paid.`);
  };

  // Handler: Settle a customer ledger balance (clear opening Dr and mark their invoices paid)
  const handleSettleCustomer = (partyId: string, partyName: string) => {
    // 1. Mark all unpaid invoices of this customer as Paid
    const customerInvoices = unpaidInvoices.filter(
      inv => inv.customerId === partyId || inv.customerName.toLowerCase().trim() === partyName.toLowerCase().trim()
    );
    customerInvoices.forEach(inv => {
      const remainingDue = Math.max(0, inv.grandTotal - (inv.amountPaid || 0));
      if (remainingDue > 0) {
        recordInvoicePayment(inv.id, remainingDue, inv.paymentMethod || 'CASH', 'Cleared customer dues');
      }
    });

    // 2. Clear opening Dr if any
    const party = parties.find(p => p.id === partyId);
    if (party && party.openingBalance && party.openingBalance > 0) {
      updateParty(party.id, { openingBalance: 0, openingBalanceType: 'Dr' });
    }

    showToast('success', 'Customer Account Cleared', `All dues for ${partyName} have been reconciled.`);
  };

  // Handler: 1-Click Settle All Outstanding Invoices & Balances
  const handleSettleAll = async () => {
    setIsProcessing(true);
    try {
      // 1. Mark all unpaid invoices as PAID
      unpaidInvoices.forEach(inv => {
        updateInvoice(inv.id, {
          status: 'PAID',
          amountPaid: inv.grandTotal,
          amountDue: 0
        });
      });

      // 2. Reset opening Dr on debtor parties
      debtorParties.forEach(dp => {
        const party = parties.find(p => p.id === dp.partyId);
        if (party && party.openingBalance && party.openingBalance > 0) {
          updateParty(party.id, { openingBalance: 0, openingBalanceType: 'Dr' });
        }
      });

      setShowConfirmSettleAll(false);
      showToast('success', 'All Receivables Reconciled', 'All customer invoices are marked PAID and pending balances are cleared to ₹0.00.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-[98vw] sm:max-w-2xl lg:max-w-3xl overflow-hidden my-auto max-h-[95dvh] sm:max-h-[88dvh] flex flex-col"
        >
          {/* Top Bar Header */}
          <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850/80 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                totalReceivables <= 0.01 
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
              }`}>
                {totalReceivables <= 0.01 ? <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" /> : <Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Accounts Receivable Audit & Reconciliation
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Verify customer payment status, unsettled dues, and ledger balances
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* KPI Snapshot Bar */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-850 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Pending Receivable</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block sm:hidden">
                  {totalReceivables <= 0.01 ? '✓ All settled' : `${debtorParties.length} customer(s)`}
                </span>
              </div>
              <div className="text-right sm:text-left">
                <div className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${
                  totalReceivables <= 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {formatCurrency(totalReceivables, business.currencySymbol)}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                  {totalReceivables <= 0.01 ? '✓ All collections 100% settled' : `${debtorParties.length} Customer(s) with balance`}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Recovery Rate</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block sm:hidden">
                  {formatCurrency(totalCollected, business.currencySymbol)} collected
                </span>
              </div>
              <div className="text-right sm:text-left">
                <div className="text-lg sm:text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {collectionRate}%
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                  {formatCurrency(totalCollected, business.currencySymbol)} of {formatCurrency(totalInvoiced, business.currencySymbol)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Unpaid Invoices</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block sm:hidden">
                  {unpaidInvoices.length === 0 ? 'Zero pending' : 'Pending payment'}
                </span>
              </div>
              <div className="text-right sm:text-left">
                <div className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${
                  unpaidInvoices.length === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {unpaidInvoices.length}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                  {unpaidInvoices.length === 0 ? 'Zero pending invoices' : 'Awaiting confirmation'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar & Tab Controls */}
          <div className="p-3 sm:px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            {/* Scrollable Tabs on mobile */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveTabFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[32px] ${
                  activeTab === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Dues ({debtorParties.length + unpaidInvoices.length})
              </button>
              <button
                onClick={() => setActiveTabFilter('CUSTOMERS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[32px] ${
                  activeTab === 'CUSTOMERS'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Debtors ({debtorParties.length})
              </button>
              <button
                onClick={() => setActiveTabFilter('INVOICES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[32px] ${
                  activeTab === 'INVOICES'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Invoices ({unpaidInvoices.length})
              </button>
            </div>

            {/* Settle All Action Button */}
            {(unpaidInvoices.length > 0 || debtorParties.length > 0) && !showConfirmSettleAll && (
              <button
                onClick={() => setShowConfirmSettleAll(true)}
                disabled={isProcessing}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50 min-h-[38px] sm:min-h-0"
              >
                <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1-Click Settle All Dues (Clear to ₹0)</span>
              </button>
            )}

            {showConfirmSettleAll && (
              <div className="w-full sm:w-auto flex items-center gap-2 p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 px-1">Clear all to ₹0?</span>
                <button
                  onClick={handleSettleAll}
                  disabled={isProcessing}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowConfirmSettleAll(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="px-3 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search debtor name, phone or invoice number..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="p-3 sm:p-4 md:p-5 overflow-y-auto flex-1 space-y-3 sm:space-y-4">
            {totalReceivables <= 0.01 && unpaidInvoices.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">All Customer Payments Cleared!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  Every customer invoice is marked as fully paid and all customer ledger accounts have zero outstanding debit dues. Your Accounts Receivable metric is cleanly balanced at ₹0.00.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Unpaid Invoices Section */}
                {(activeTab === 'ALL' || activeTab === 'INVOICES') && filteredInvoices.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Unpaid / Partially Paid Invoices ({filteredInvoices.length})</span>
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredInvoices.map(inv => {
                        const due = Math.max(0, inv.grandTotal - (inv.amountPaid || 0));
                        return (
                          <div key={inv.id} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                                  {inv.status}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 text-[11px]">{formatDate(inv.invoiceDate)}</span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium truncate">
                                {inv.customerName}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                              <div className="text-left sm:text-right">
                                <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                                  {formatCurrency(due, business.currencySymbol)} Due
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  Total: {formatCurrency(inv.grandTotal, business.currencySymbol)}
                                </div>
                              </div>

                              <button
                                onClick={() => handleMarkInvoicePaid(inv.id)}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                              >
                                Mark Paid
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Customer Debtors Ledger Section */}
                {(activeTab === 'ALL' || activeTab === 'CUSTOMERS') && filteredDebtors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Debtor Customers with Ledger Balances ({filteredDebtors.length})</span>
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredDebtors.map(debtor => (
                        <div key={debtor.partyId} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{debtor.partyName}</span>
                              {debtor.openingBalance > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                  Opening Dr: {formatCurrency(debtor.openingBalance, business.currencySymbol)}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 truncate">
                              Invoiced: {formatCurrency(debtor.totalInvoicedGross, business.currencySymbol)} • Received: {formatCurrency(debtor.totalInvoiceReceipts, business.currencySymbol)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            <div className="text-left sm:text-right">
                              <div className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                {formatCurrency(debtor.closingBalance, business.currencySymbol)} Dr
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                Outstanding
                              </div>
                            </div>

                            <button
                              onClick={() => handleSettleCustomer(debtor.partyId, debtor.partyName)}
                              className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                            >
                              Settle Account
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shrink-0">
            <button
              onClick={() => {
                onClose();
                setActiveTab('parties');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer py-1 sm:py-0 w-full sm:w-auto justify-center sm:justify-start"
            >
              <span>Open Customer Master Ledger</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 sm:py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
