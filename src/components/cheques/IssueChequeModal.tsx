import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChequeRecord, 
  ChequeType, 
  ChequeStatus, 
  Party, 
  Invoice, 
  PurchaseBill, 
  ChequeBook 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { 
  DEFAULT_CTS2010_TEMPLATE, 
  BANK_CHEQUE_PRESETS,
  formatChequeAmountWords,
  formatChequeNumber,
  getNextChequeNumber
} from '../../utils/chequeConstants';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  FileText, 
  BookOpen, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Landmark
} from 'lucide-react';

interface IssueChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cheque: ChequeRecord, openPrintNow?: boolean) => void;
  initialPartyId?: string;
  initialType?: ChequeType;
  initialBillId?: string;
  initialInvoiceId?: string;
}

export const IssueChequeModal: React.FC<IssueChequeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPartyId,
  initialType = 'PAYMENT_OUT',
  initialBillId,
  initialInvoiceId
}) => {
  const { 
    parties, 
    invoices, 
    purchaseBills, 
    business, 
    chequeBooks, 
    chequeTemplates,
    createCheque,
    accountHeads,
    showToast
  } = useApp();

  // Form State
  const [chequeType, setChequeType] = useState<ChequeType>(initialType);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || '');
  const [payeeName, setPayeeName] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [chequeDate, setChequeDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [selectedChequeBookId, setSelectedChequeBookId] = useState<string>('');
  
  const [bankName, setBankName] = useState<string>(business.bankName || 'HDFC Bank Ltd');
  const [accountNumber, setAccountNumber] = useState<string>(business.accountNumber || '');
  
  const [isAccountPayeeOnly, setIsAccountPayeeOnly] = useState<boolean>(true);
  const [strikeBearer, setStrikeBearer] = useState<boolean>(true);
  const [memo, setMemo] = useState<string>('');
  const [billReference, setBillReference] = useState<string>('');
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoiceId || '');
  const [selectedBillId, setSelectedBillId] = useState<string>(initialBillId || '');
  const [autoPostLedger, setAutoPostLedger] = useState<boolean>(true);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_CTS2010_TEMPLATE.id);

  // Active Cheque Books for quick selection
  const activeChequeBooks = useMemo(() => {
    return chequeBooks.filter(b => b.status === 'ACTIVE');
  }, [chequeBooks]);

  // Set initial cheque number from active cheque book if available
  useEffect(() => {
    if (activeChequeBooks.length > 0) {
      const activeBook = activeChequeBooks[0];
      setSelectedChequeBookId(activeBook.id);
      setChequeNumber(activeBook.currentChequeNo);
      setBankName(activeBook.bankName);
      setAccountNumber(activeBook.accountNumber);
    } else if (!chequeNumber) {
      setChequeNumber('000101');
    }
  }, [activeChequeBooks]);

  // Party Selection Handling
  const selectedParty = useMemo(() => {
    return parties.find(p => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  useEffect(() => {
    if (selectedParty) {
      setPayeeName(selectedParty.name);
    } else if (chequeType === 'SELF_CASH') {
      setPayeeName('YOURSELF / CASH');
    }
  }, [selectedParty, chequeType]);

  // Handle Cheque Book change
  const handleChequeBookChange = (bookId: string) => {
    setSelectedChequeBookId(bookId);
    const book = chequeBooks.find(b => b.id === bookId);
    if (book) {
      setChequeNumber(book.currentChequeNo);
      setBankName(book.bankName);
      setAccountNumber(book.accountNumber);
    }
  };

  // Unpaid Invoices or Bills for selected party
  const partyUnpaidInvoices = useMemo(() => {
    if (!selectedPartyId) return [];
    return invoices.filter(inv => 
      inv.customerId === selectedPartyId && 
      (inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID' || inv.amountDue > 0)
    );
  }, [invoices, selectedPartyId]);

  const partyUnpaidBills = useMemo(() => {
    if (!selectedPartyId) return [];
    return purchaseBills.filter(bill => 
      bill.vendorId === selectedPartyId && 
      (bill.status === 'UNPAID' || bill.status === 'PARTIALLY_PAID' || bill.amountDue > 0)
    );
  }, [purchaseBills, selectedPartyId]);

  // Quick apply invoice/bill
  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoiceId(inv.id);
    setAmount(inv.amountDue > 0 ? inv.amountDue : inv.grandTotal);
    setBillReference(`Inv #${inv.invoiceNumber}`);
    setMemo(`Payment against Invoice ${inv.invoiceNumber}`);
  };

  const handleSelectBill = (bill: PurchaseBill) => {
    setSelectedBillId(bill.id);
    setAmount(bill.amountDue > 0 ? bill.amountDue : bill.grandTotal);
    setBillReference(`Bill #${bill.billNumber}`);
    setMemo(`Payment against Purchase Bill ${bill.billNumber}`);
  };

  // Amount in words live calculation
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const amountWordsPreview = formatChequeAmountWords(numericAmount);

  // Form submission
  const handleSubmit = (e: React.FormEvent, openPrintNow = false) => {
    e.preventDefault();

    if (!payeeName.trim()) {
      showToast('error', 'Missing Payee', 'Please specify the payee name.');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter a valid cheque amount.');
      return;
    }

    const linkedInv = invoices.find(i => i.id === selectedInvoiceId);
    const linkedBill = purchaseBills.find(b => b.id === selectedBillId);

    const newCheque = createCheque({
      chequeNumber: formatChequeNumber(chequeNumber),
      chequeDate,
      payeeName: payeeName.trim(),
      partyId: selectedPartyId || undefined,
      partyName: selectedParty?.name || payeeName.trim(),
      partyType: selectedParty?.type,
      amount: numericAmount,
      amountInWords: amountWordsPreview,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      chequeType,
      status: openPrintNow ? 'PRINTED' : 'ISSUED',
      isAccountPayeeOnly,
      strikeBearer,
      memo: memo.trim(),
      billReference: billReference.trim() || undefined,
      linkedInvoiceId: selectedInvoiceId || undefined,
      linkedInvoiceNumber: linkedInv?.invoiceNumber,
      linkedBillId: selectedBillId || undefined,
      linkedBillNumber: linkedBill?.billNumber,
      templateConfigId: selectedTemplateId,
      autoPostLedger,
      printedAt: openPrintNow ? new Date().toISOString() : undefined
    });

    onSuccess(newCheque, openPrintNow);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                Issue & Print Cheque
              </h3>
              <p className="text-xs text-slate-500">
                CTS-2010 Cheque generation with automatic client ledger & banking entries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Top Bar: Cheque Type & Cheque Book */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Cheque Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Cheque Type
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setChequeType('PAYMENT_OUT')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center ${
                    chequeType === 'PAYMENT_OUT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Payment Out
                </button>
                <button
                  type="button"
                  onClick={() => setChequeType('PAYMENT_IN')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center ${
                    chequeType === 'PAYMENT_IN'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Payment In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChequeType('SELF_CASH');
                    setSelectedPartyId('');
                    setPayeeName('YOURSELF / CASH');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center ${
                    chequeType === 'SELF_CASH'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Self / Cash
                </button>
              </div>
            </div>

            {/* Cheque Book Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Cheque Book Series
              </label>
              <select
                value={selectedChequeBookId}
                onChange={(e) => handleChequeBookChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Manual Cheque Number --</option>
                {activeChequeBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} (#{b.startChequeNo} - #{b.endChequeNo}) • Next: #{b.currentChequeNo}
                  </option>
                ))}
              </select>
            </div>

            {/* Cheque Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Cheque Number (6-digits) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={8}
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="e.g. 004821"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm font-bold tracking-widest text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Party and Payee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Party Selector */}
            {chequeType !== 'SELF_CASH' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Select Party (Customer / Vendor)
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    setSelectedPartyId(e.target.value);
                    const party = parties.find(p => p.id === e.target.value);
                    if (party) {
                      setPayeeName(party.name);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Party or Enter Custom Payee Below --</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type}) • Balance: {formatINR(p.currentBalance || 0)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payee Name */}
            <div className={chequeType === 'SELF_CASH' ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Payee Name on Cheque (Pay To) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="e.g. M/S ABC TRADING CO"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold uppercase tracking-wide text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Amount */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Cheque Amount ({business.currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                  {business.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-lg font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Amount in words live helper */}
              <div className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold italic truncate">
                {amountWordsPreview}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Cheque Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Quick Invoice / Bill Settlement Section if party has unpaid items */}
          {selectedPartyId && (partyUnpaidInvoices.length > 0 || partyUnpaidBills.length > 0) && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Link to Unsettled Invoices / Bills for Automatic Knock-Off
                </span>
                <span className="text-xs text-slate-400">
                  Click an invoice/bill to auto-fill exact due amount
                </span>
              </div>

              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {partyUnpaidInvoices.map(inv => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => handleSelectInvoice(inv)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-left flex items-center gap-2 ${
                      selectedInvoiceId === inv.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                    }`}
                  >
                    <span>Invoice #{inv.invoiceNumber}</span>
                    <span className="font-mono opacity-80">({formatINR(inv.amountDue || inv.grandTotal)})</span>
                    {selectedInvoiceId === inv.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}

                {partyUnpaidBills.map(bill => (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => handleSelectBill(bill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition text-left flex items-center gap-2 ${
                      selectedBillId === bill.id
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300'
                    }`}
                  >
                    <span>Bill #{bill.billNumber}</span>
                    <span className="font-mono opacity-80">({formatINR(bill.amountDue || bill.grandTotal)})</span>
                    {selectedBillId === bill.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bank & Crossing Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Bank Account / Issuing Bank
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank Ltd"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 50200000000000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Crossing & Bearer Switches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAccountPayeeOnly}
                onChange={(e) => setIsAccountPayeeOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cross Cheque ("A/C PAYEE ONLY")
                </div>
                <div className="text-[11px] text-slate-500">
                  Restricts negotiation; deposits money strictly into payee's bank account.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={strikeBearer}
                onChange={(e) => setStrikeBearer(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Strike Out "Or Bearer" (Order Cheque)
                </div>
                <div className="text-[11px] text-slate-500">
                  Draws a solid line across bearer text to prevent unauthorized encashment.
                </div>
              </div>
            </label>
          </div>

          {/* Memo & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Internal Memo / Notes
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Advance payment for hardware purchase order"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Bill / PO Reference #
              </label>
              <input
                type="text"
                value={billReference}
                onChange={(e) => setBillReference(e.target.value)}
                placeholder="e.g. PO-2026-0819"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Automatic Client Ledger & Banking Entry Toggle */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPostLedger}
                onChange={(e) => setAutoPostLedger(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    Automatic Entry in Ledger of Client & Bank Account
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-400 mt-1 leading-relaxed">
                  When enabled, issuing this cheque automatically updates the client/vendor's statement balance, logs a <strong>Payment Voucher</strong>, and creates a corresponding <strong>Double-Entry Journal Posting</strong> in the accounting general ledger.
                </p>
              </div>
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl shadow-sm transition"
            >
              Save Cheque Entry
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Save & Print Cheque</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
