import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentRecord, PaymentType, PaymentMethod, Party, Invoice, PurchaseBill } from '../../types';
import { formatINR, formatDate, numberToIndianWords } from '../../utils/formatters';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  CreditCard, 
  FileText, 
  Receipt, 
  Wallet, 
  X, 
  Download,
  Share2,
  Clock,
  User,
  Hash,
  Landmark,
  FileSpreadsheet,
  Upload,
  Sparkles
} from 'lucide-react';
import { BankStatementImportModal } from '../accounting/BankStatementImportModal';

export const PaymentsView: React.FC = () => {
  const { 
    payments, 
    createPayment, 
    updatePayment, 
    deletePayment, 
    parties, 
    invoices, 
    purchaseBills, 
    accountHeads, 
    business 
  } = useApp();

  // Active Tab Filter
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'CONTRA_TRANSFER' | 'PENDING_RECEIVABLES' | 'PENDING_PAYABLES'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordModalType, setRecordModalType] = useState<PaymentType>('PAYMENT_IN');
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [voucherToPrint, setVoucherToPrint] = useState<PaymentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBankStatementModal, setShowBankStatementModal] = useState<boolean>(false);

  // Pending Invoices (Receivables from Customers)
  const pendingInvoices = useMemo(() => {
    return invoices
      .filter(i => (i.amountDue > 0 || (i.status !== 'PAID' && (i.amountDue === undefined || i.amountDue > 0))) && i.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [invoices]);

  const totalPendingReceivables = useMemo(() => {
    return pendingInvoices.reduce((sum, i) => sum + (i.amountDue !== undefined ? i.amountDue : i.grandTotal), 0);
  }, [pendingInvoices]);

  // Pending Purchase Bills (Payables to Vendors)
  const pendingBills = useMemo(() => {
    return purchaseBills
      .filter(b => (b.amountDue > 0 || (b.status !== 'PAID' && (b.amountDue === undefined || b.amountDue > 0))))
      .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  }, [purchaseBills]);

  const totalPendingPayables = useMemo(() => {
    return pendingBills.reduce((sum, b) => sum + (b.amountDue !== undefined ? b.amountDue : b.grandTotal), 0);
  }, [pendingBills]);

  // Filtered Pending Invoices
  const filteredPendingInvoices = useMemo(() => {
    if (!searchQuery.trim()) return pendingInvoices;
    const q = searchQuery.toLowerCase();
    return pendingInvoices.filter(i => 
      i.invoiceNumber.toLowerCase().includes(q) ||
      (i.customerName && i.customerName.toLowerCase().includes(q)) ||
      (i.customerPhone && i.customerPhone.includes(q))
    );
  }, [pendingInvoices, searchQuery]);

  // Filtered Pending Purchase Bills
  const filteredPendingBills = useMemo(() => {
    if (!searchQuery.trim()) return pendingBills;
    const q = searchQuery.toLowerCase();
    return pendingBills.filter(b => 
      b.billNumber.toLowerCase().includes(q) ||
      (b.vendorName && b.vendorName.toLowerCase().includes(q)) ||
      (b.vendorPhone && b.vendorPhone.includes(q))
    );
  }, [pendingBills, searchQuery]);

  // Form State for Recording / Editing Payment
  const [formData, setFormData] = useState({
    voucherNumber: '',
    type: 'PAYMENT_IN' as PaymentType,
    date: new Date().toISOString().split('T')[0],
    partyId: '',
    partyName: '',
    partyType: 'CUSTOMER' as 'CUSTOMER' | 'VENDOR',
    amount: '' as string | number,
    paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
    bankAccountId: 'acc-2',
    bankAccountName: 'HDFC Current Bank Account',
    referenceNo: '',
    chequeDate: '',
    linkedInvoiceId: '',
    linkedInvoiceNumber: '',
    linkedBillId: '',
    linkedBillNumber: '',
    fromAccount: 'Cash in Hand (acc-1)',
    toAccount: 'HDFC Current Bank Account (acc-2)',
    notes: ''
  });

  // Calculate High Level Metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalContra = 0;
    let inCount = 0;
    let outCount = 0;

    payments.forEach(p => {
      if (p.type === 'PAYMENT_IN') {
        totalIn += p.amount;
        inCount++;
      } else if (p.type === 'PAYMENT_OUT') {
        totalOut += p.amount;
        outCount++;
      } else if (p.type === 'CONTRA_TRANSFER') {
        totalContra += p.amount;
      }
    });

    const netCashflow = totalIn - totalOut;

    // Bank and Cash account head balances
    const bankHead = accountHeads.find(a => a.name.toLowerCase().includes('bank') || a.code === '1010');
    const cashHead = accountHeads.find(a => a.name.toLowerCase().includes('cash') || a.code === '1000');

    return {
      totalIn,
      totalOut,
      netCashflow,
      inCount,
      outCount,
      totalContra,
      bankBalance: bankHead ? bankHead.balance : 345800,
      cashBalance: cashHead ? cashHead.balance : 28500
    };
  }, [payments, accountHeads]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Tab filter
      if (activeTab !== 'ALL' && p.type !== activeTab) {
        return false;
      }
      // Method filter
      if (filterMethod !== 'ALL' && p.paymentMethod !== filterMethod) {
        return false;
      }
      // Date filter
      if (dateFilter === 'THIS_MONTH') {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!p.date.startsWith(currentMonth)) return false;
      } else if (dateFilter === 'LAST_MONTH') {
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (!p.date.startsWith(lastMonth)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVoucher = p.voucherNumber.toLowerCase().includes(q);
        const matchParty = p.partyName.toLowerCase().includes(q);
        const matchRef = p.referenceNo ? p.referenceNo.toLowerCase().includes(q) : false;
        const matchNotes = p.notes ? p.notes.toLowerCase().includes(q) : false;
        const matchInv = p.linkedInvoiceNumber ? p.linkedInvoiceNumber.toLowerCase().includes(q) : false;
        const matchBill = p.linkedBillNumber ? p.linkedBillNumber.toLowerCase().includes(q) : false;
        return matchVoucher || matchParty || matchRef || matchNotes || matchInv || matchBill;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, activeTab, filterMethod, dateFilter, searchQuery]);

  // Available Customers & Vendors for dropdowns
  const customers = useMemo(() => parties.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH'), [parties]);
  const vendors = useMemo(() => parties.filter(p => p.type === 'VENDOR' || p.type === 'BOTH'), [parties]);

  // Open Record Modal
  const handleOpenRecord = (type: PaymentType) => {
    setEditingPayment(null);
    setRecordModalType(type);
    const prefix = type === 'PAYMENT_IN' ? 'RCPT' : type === 'PAYMENT_OUT' ? 'PMT' : 'CNTR';
    const num = Math.floor(100 + Math.random() * 900);
    const defaultVoucher = `${prefix}-2026-${num}`;

    setFormData({
      voucherNumber: defaultVoucher,
      type: type,
      date: new Date().toISOString().split('T')[0],
      partyId: '',
      partyName: '',
      partyType: type === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR',
      amount: '',
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'acc-2',
      bankAccountName: 'HDFC Current Bank Account',
      referenceNo: '',
      chequeDate: '',
      linkedInvoiceId: '',
      linkedInvoiceNumber: '',
      linkedBillId: '',
      linkedBillNumber: '',
      fromAccount: 'Cash in Hand (acc-1)',
      toAccount: 'HDFC Current Bank Account (acc-2)',
      notes: ''
    });
    setIsRecordModalOpen(true);
  };

  // Open Record Modal pre-filled for a specific pending invoice
  const handleOpenCollectInvoice = (inv: Invoice) => {
    setEditingPayment(null);
    setRecordModalType('PAYMENT_IN');
    const num = Math.floor(100 + Math.random() * 900);
    const defaultVoucher = `RCPT-2026-${num}`;
    const party = parties.find(p => p.id === inv.customerId || p.name.toLowerCase() === (inv.customerName || '').toLowerCase());
    const dueAmt = inv.amountDue !== undefined ? inv.amountDue : inv.grandTotal;

    setFormData({
      voucherNumber: defaultVoucher,
      type: 'PAYMENT_IN',
      date: new Date().toISOString().split('T')[0],
      partyId: party?.id || inv.customerId || '',
      partyName: inv.customerName || party?.name || 'Customer',
      partyType: 'CUSTOMER',
      amount: dueAmt,
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'acc-2',
      bankAccountName: 'HDFC Current Bank Account',
      referenceNo: '',
      chequeDate: '',
      linkedInvoiceId: inv.id,
      linkedInvoiceNumber: inv.invoiceNumber,
      linkedBillId: '',
      linkedBillNumber: '',
      fromAccount: 'Cash in Hand (acc-1)',
      toAccount: 'HDFC Current Bank Account (acc-2)',
      notes: `Payment receipt against Invoice ${inv.invoiceNumber}`
    });
    setIsRecordModalOpen(true);
  };

  // Open Record Modal pre-filled for a specific pending purchase bill
  const handleOpenPayBill = (bill: PurchaseBill) => {
    setEditingPayment(null);
    setRecordModalType('PAYMENT_OUT');
    const num = Math.floor(100 + Math.random() * 900);
    const defaultVoucher = `PMT-2026-${num}`;
    const party = parties.find(p => p.id === bill.vendorId || p.name.toLowerCase() === (bill.vendorName || '').toLowerCase());
    const dueAmt = bill.amountDue !== undefined ? bill.amountDue : bill.grandTotal;

    setFormData({
      voucherNumber: defaultVoucher,
      type: 'PAYMENT_OUT',
      date: new Date().toISOString().split('T')[0],
      partyId: party?.id || bill.vendorId || '',
      partyName: bill.vendorName || party?.name || 'Vendor',
      partyType: 'VENDOR',
      amount: dueAmt,
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'acc-2',
      bankAccountName: 'HDFC Current Bank Account',
      referenceNo: '',
      chequeDate: '',
      linkedInvoiceId: '',
      linkedInvoiceNumber: '',
      linkedBillId: bill.id,
      linkedBillNumber: bill.billNumber,
      fromAccount: 'HDFC Current Bank Account (acc-2)',
      toAccount: 'Vendor Bank / Cash',
      notes: `Payment disbursed for Purchase Bill ${bill.billNumber}`
    });
    setIsRecordModalOpen(true);
  };

  // Handle Editing
  const handleOpenEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setRecordModalType(payment.type);
    setFormData({
      voucherNumber: payment.voucherNumber,
      type: payment.type,
      date: payment.date,
      partyId: payment.partyId || '',
      partyName: payment.partyName,
      partyType: payment.partyType || (payment.type === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR'),
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      bankAccountId: payment.bankAccountId || 'acc-2',
      bankAccountName: payment.bankAccountName || 'HDFC Current Bank Account',
      referenceNo: payment.referenceNo || '',
      chequeDate: payment.chequeDate || '',
      linkedInvoiceId: payment.linkedInvoiceId || '',
      linkedInvoiceNumber: payment.linkedInvoiceNumber || '',
      linkedBillId: payment.linkedBillId || '',
      linkedBillNumber: payment.linkedBillNumber || '',
      fromAccount: payment.fromAccount || 'Cash in Hand (acc-1)',
      toAccount: payment.toAccount || 'HDFC Current Bank Account (acc-2)',
      notes: payment.notes || ''
    });
    setIsRecordModalOpen(true);
  };

  // Handle Customer Selection
  const handleSelectParty = (partyId: string) => {
    const selectedParty = parties.find(p => p.id === partyId);
    if (!selectedParty) {
      setFormData(prev => ({ ...prev, partyId: '', partyName: '', linkedInvoiceId: '', linkedInvoiceNumber: '', linkedBillId: '', linkedBillNumber: '' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyType: selectedParty.type === 'VENDOR' ? 'VENDOR' : 'CUSTOMER',
      linkedInvoiceId: '',
      linkedInvoiceNumber: '',
      linkedBillId: '',
      linkedBillNumber: ''
    }));
  };

  // Available Unpaid Invoices for Selected Customer
  const customerUnpaidInvoices = useMemo(() => {
    if (!formData.partyId || formData.type !== 'PAYMENT_IN') return [];
    return invoices.filter(i => (i.customerId === formData.partyId || i.customerName === formData.partyName) && i.status !== 'PAID' && i.status !== 'CANCELLED');
  }, [formData.partyId, formData.partyName, formData.type, invoices]);

  // Available Unpaid Purchase Bills for Selected Vendor
  const vendorUnpaidBills = useMemo(() => {
    if (!formData.partyId || formData.type !== 'PAYMENT_OUT') return [];
    return purchaseBills.filter(b => (b.vendorId === formData.partyId || b.vendorName === formData.partyName) && b.status !== 'PAID');
  }, [formData.partyId, formData.partyName, formData.type, purchaseBills]);

  // Handle Linked Invoice Select
  const handleSelectInvoice = (invId: string) => {
    if (!invId) {
      setFormData(prev => ({ ...prev, linkedInvoiceId: '', linkedInvoiceNumber: '' }));
      return;
    }
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setFormData(prev => ({
        ...prev,
        linkedInvoiceId: inv.id,
        linkedInvoiceNumber: inv.invoiceNumber,
        amount: prev.amount ? prev.amount : (inv.amountDue || inv.grandTotal)
      }));
    }
  };

  // Handle Linked Bill Select
  const handleSelectBill = (billId: string) => {
    if (!billId) {
      setFormData(prev => ({ ...prev, linkedBillId: '', linkedBillNumber: '' }));
      return;
    }
    const bill = purchaseBills.find(b => b.id === billId);
    if (bill) {
      setFormData(prev => ({
        ...prev,
        linkedBillId: bill.id,
        linkedBillNumber: bill.billNumber,
        amount: prev.amount ? prev.amount : (bill.amountDue || bill.grandTotal)
      }));
    }
  };

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    let partyDisplayName = formData.partyName;
    if (formData.type === 'CONTRA_TRANSFER') {
      partyDisplayName = `${formData.fromAccount} ➔ ${formData.toAccount}`;
    }

    if (editingPayment) {
      updatePayment(editingPayment.id, {
        voucherNumber: formData.voucherNumber,
        type: formData.type,
        date: formData.date,
        partyId: formData.partyId || undefined,
        partyName: partyDisplayName,
        partyType: formData.partyType,
        amount: parsedAmount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        bankAccountName: formData.bankAccountName,
        referenceNo: formData.referenceNo,
        chequeDate: formData.chequeDate,
        linkedInvoiceId: formData.linkedInvoiceId,
        linkedInvoiceNumber: formData.linkedInvoiceNumber,
        linkedBillId: formData.linkedBillId,
        linkedBillNumber: formData.linkedBillNumber,
        fromAccount: formData.fromAccount,
        toAccount: formData.toAccount,
        notes: formData.notes
      });
    } else {
      createPayment({
        voucherNumber: formData.voucherNumber,
        type: formData.type,
        date: formData.date,
        partyId: formData.partyId || undefined,
        partyName: partyDisplayName,
        partyType: formData.partyType,
        amount: parsedAmount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        bankAccountName: formData.bankAccountName,
        referenceNo: formData.referenceNo,
        chequeDate: formData.chequeDate,
        linkedInvoiceId: formData.linkedInvoiceId,
        linkedInvoiceNumber: formData.linkedInvoiceNumber,
        linkedBillId: formData.linkedBillId,
        linkedBillNumber: formData.linkedBillNumber,
        fromAccount: formData.fromAccount,
        toAccount: formData.toAccount,
        notes: formData.notes
      });
    }

    setIsRecordModalOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Type', 'Party / Transfer', 'Mode', 'Amount (INR)', 'Reference No', 'Linked Doc', 'Notes'];
    const rows = filteredPayments.map(p => [
      p.voucherNumber,
      p.date,
      p.type,
      `"${p.partyName}"`,
      p.paymentMethod,
      p.amount,
      `"${p.referenceNo || ''}"`,
      `"${p.linkedInvoiceNumber || p.linkedBillNumber || ''}"`,
      `"${p.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ZookaBusiness_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Payments & Receipts Module</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Record customer collections (Money In), vendor disbursements (Money Out), & Contra bank transfers</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowBankStatementModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
            title="Auto-create receipts, payments, and ledger entries by uploading Bank Statement CSV"
          >
            <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Bank Statement Auto Entry (CSV)</span>
          </button>

          <button
            onClick={() => handleOpenRecord('PAYMENT_IN')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Payment Received (In)</span>
          </button>

          <button
            onClick={() => handleOpenRecord('PAYMENT_OUT')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Payment Made (Out)</span>
          </button>

          <button
            onClick={() => handleOpenRecord('CONTRA_TRANSFER')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>⇄ Contra Transfer</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            title="Export CSV Statement"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Money In */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg">Money In</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{formatINR(metrics.totalIn)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{metrics.inCount}</span> receipts
            </div>
          </div>
        </div>

        {/* Total Money Out */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg">Money Out</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{formatINR(metrics.totalOut)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-rose-600 dark:text-rose-400">{metrics.outCount}</span> disbursements
            </div>
          </div>
        </div>

        {/* Pending Customer Receivables (Unpaid Invoices) */}
        <div 
          onClick={() => setActiveTab('PENDING_RECEIVABLES')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg">Pending Receivables</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-amber-700 dark:text-amber-400">{formatINR(totalPendingReceivables)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
              <span><strong className="text-amber-700 dark:text-amber-400">{pendingInvoices.length}</strong> unpaid invoices</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">View & Collect →</span>
            </div>
          </div>
        </div>

        {/* Pending Vendor Payables (Unpaid Bills) */}
        <div 
          onClick={() => setActiveTab('PENDING_PAYABLES')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-600 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg">Pending Payables</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-rose-700 dark:text-rose-400">{formatINR(totalPendingPayables)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
              <span><strong className="text-rose-700 dark:text-rose-400">{pendingBills.length}</strong> unpaid bills</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">View & Pay →</span>
            </div>
          </div>
        </div>

        {/* Liquid Balances */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">Liquid Balances</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Bank:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatINR(metrics.bankBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Cash:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatINR(metrics.cashBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex-wrap">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Transactions ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_IN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'PAYMENT_IN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Received ({metrics.inCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_OUT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'PAYMENT_OUT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Paid ({metrics.outCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('CONTRA_TRANSFER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'CONTRA_TRANSFER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Contra ({payments.filter(p => p.type === 'CONTRA_TRANSFER').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PENDING_RECEIVABLES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'PENDING_RECEIVABLES'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Receivables ({pendingInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PENDING_PAYABLES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'PENDING_PAYABLES'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Pending Payables ({pendingBills.length})</span>
            </button>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Date:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs">
              <button
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dateFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter('THIS_MONTH')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dateFilter === 'THIS_MONTH' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter('LAST_MONTH')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dateFilter === 'LAST_MONTH' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Last Month
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'PENDING_RECEIVABLES' 
                  ? "Search pending invoices by Invoice #, Customer Name, Phone..." 
                  : activeTab === 'PENDING_PAYABLES'
                  ? "Search pending purchase bills by Bill #, Vendor Name..."
                  : "Search by Voucher #, Party Name, Cheque/UTR Ref, Linked Invoice/Bill..."
              }
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab !== 'PENDING_RECEIVABLES' && activeTab !== 'PENDING_PAYABLES' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit/Debit Card</option>
              </select>
            </div>
          )}
        </div>

        {/* Render Pending Customer Receivables Table */}
        {activeTab === 'PENDING_RECEIVABLES' && (
          <div className="overflow-x-auto rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900">
            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300">Unsettled Customer Invoices (Pending Receivables)</span>
              </div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                Total Due: {formatINR(totalPendingReceivables)}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Invoice Date</th>
                  <th className="py-3 px-3.5">Invoice #</th>
                  <th className="py-3 px-3.5">Customer Name & Phone</th>
                  <th className="py-3 px-3.5 text-right">Total Invoice</th>
                  <th className="py-3 px-3.5 text-right">Amount Paid</th>
                  <th className="py-3 px-3.5 text-right font-bold text-amber-800 dark:text-amber-400">Pending Due</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPendingInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No pending receivables!</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">All customer invoices are fully settled.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPendingInvoices.map(inv => {
                    const dueAmt = inv.amountDue !== undefined ? inv.amountDue : inv.grandTotal;
                    const paidAmt = inv.amountPaid || (inv.grandTotal - dueAmt);

                    return (
                      <tr key={inv.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors">
                        <td className="py-3.5 px-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(inv.invoiceDate, 'short')}
                          {inv.dueDate && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">Due: {formatDate(inv.dueDate, 'short')}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</span>
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{inv.customerName || 'Customer'}</div>
                          {inv.customerPhone && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{inv.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                          {formatINR(inv.grandTotal)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatINR(paidAmt)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-black text-amber-700 dark:text-amber-400 text-sm">
                          {formatINR(dueAmt)}
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            dueAmt === inv.grandTotal 
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {dueAmt === inv.grandTotal ? 'UNPAID' : 'PARTIAL DUE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <button
                            onClick={() => handleOpenCollectInvoice(inv)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Collect (Settle)</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Render Pending Vendor Payables Table */}
        {activeTab === 'PENDING_PAYABLES' && (
          <div className="overflow-x-auto rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900">
            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-3 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300">Unsettled Purchase Bills (Pending Payables to Vendors)</span>
              </div>
              <span className="text-xs font-bold text-rose-800 dark:text-rose-400">
                Total Due: {formatINR(totalPendingPayables)}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Bill Date</th>
                  <th className="py-3 px-3.5">Bill #</th>
                  <th className="py-3 px-3.5">Vendor Name & Phone</th>
                  <th className="py-3 px-3.5 text-right">Total Bill</th>
                  <th className="py-3 px-3.5 text-right">Amount Paid</th>
                  <th className="py-3 px-3.5 text-right font-bold text-rose-800 dark:text-rose-400">Pending Due</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPendingBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No pending vendor payables!</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">All supplier bills are fully settled.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPendingBills.map(bill => {
                    const dueAmt = bill.amountDue !== undefined ? bill.amountDue : bill.grandTotal;
                    const paidAmt = bill.amountPaid || (bill.grandTotal - dueAmt);

                    return (
                      <tr key={bill.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors">
                        <td className="py-3.5 px-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(bill.billDate, 'short')}
                          {bill.dueDate && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">Due: {formatDate(bill.dueDate, 'short')}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{bill.billNumber}</span>
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{bill.vendorName || 'Vendor'}</div>
                          {bill.vendorPhone && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{bill.vendorPhone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                          {formatINR(bill.grandTotal)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatINR(paidAmt)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-black text-rose-700 dark:text-rose-400 text-sm">
                          {formatINR(dueAmt)}
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            dueAmt === bill.grandTotal 
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {dueAmt === bill.grandTotal ? 'UNPAID' : 'PARTIAL DUE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <button
                            onClick={() => handleOpenPayBill(bill)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Pay Bill (Settle)</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Standard Transactions Table (for ALL, PAYMENT_IN, PAYMENT_OUT, CONTRA_TRANSFER) */}
        {activeTab !== 'PENDING_RECEIVABLES' && activeTab !== 'PENDING_PAYABLES' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Voucher #</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Party / Accounts</th>
                <th className="py-3 px-3.5">Payment Mode & Ref</th>
                <th className="py-3 px-3.5">Linked Document</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">No payment records found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try changing search filters or create a new payment receipt.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const isMoneyIn = p.type === 'PAYMENT_IN';
                  const isMoneyOut = p.type === 'PAYMENT_OUT';
                  const isContra = p.type === 'CONTRA_TRANSFER';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(p.date, 'short')}
                      </td>

                      {/* Voucher No */}
                      <td className="py-3.5 px-3.5">
                        <button
                          onClick={() => setVoucherToPrint(p)}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
                        >
                          <Hash className="w-3 h-3 text-indigo-400" />
                          <span>{p.voucherNumber}</span>
                        </button>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {isMoneyIn && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ArrowDownLeft className="w-3 h-3" /> Received (In)
                          </span>
                        )}
                        {isMoneyOut && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <ArrowUpRight className="w-3 h-3" /> Paid (Out)
                          </span>
                        )}
                        {isContra && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <ArrowLeftRight className="w-3 h-3" /> Contra Transfer
                          </span>
                        )}
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white max-w-[220px] truncate" title={p.partyName}>
                          {p.partyName}
                        </div>
                        {p.notes && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[220px]" title={p.notes}>
                            {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode & Ref */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{p.paymentMethod.replace('_', ' ')}</span>
                        </div>
                        {p.referenceNo && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            Ref: {p.referenceNo}
                          </div>
                        )}
                      </td>

                      {/* Linked Doc */}
                      <td className="py-3.5 px-3.5">
                        {p.linkedInvoiceNumber && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md font-mono text-[11px] font-medium border border-indigo-100 dark:border-indigo-800">
                            <FileText className="w-3 h-3" /> {p.linkedInvoiceNumber}
                          </div>
                        )}
                        {p.linkedBillNumber && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md font-mono text-[11px] font-medium border border-amber-100 dark:border-amber-800">
                            <FileText className="w-3 h-3" /> {p.linkedBillNumber}
                          </div>
                        )}
                        {!p.linkedInvoiceNumber && !p.linkedBillNumber && (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Direct / Advance</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3.5 text-right font-black whitespace-nowrap text-sm">
                        <span className={isMoneyIn ? 'text-emerald-600 dark:text-emerald-400' : isMoneyOut ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}>
                          {isMoneyIn ? '+' : isMoneyOut ? '-' : ''}{formatINR(p.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setVoucherToPrint(p)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title="Print Voucher Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit Payment"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* RECORD / EDIT PAYMENT MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] sm:max-w-lg md:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto">
            {/* Modal Header */}
            <div className={`p-3.5 sm:p-4 border-b flex items-center justify-between shrink-0 ${
              formData.type === 'PAYMENT_IN' ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50' :
              formData.type === 'PAYMENT_OUT' ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50' : 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shrink-0 ${
                  formData.type === 'PAYMENT_IN' ? 'bg-emerald-600' :
                  formData.type === 'PAYMENT_OUT' ? 'bg-rose-600' : 'bg-blue-600'
                }`}>
                  {formData.type === 'PAYMENT_IN' ? <ArrowDownLeft className="w-4 h-4" /> :
                   formData.type === 'PAYMENT_OUT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                    {editingPayment ? 'Edit Payment Voucher' : 
                     formData.type === 'PAYMENT_IN' ? 'Record Payment Received (Money In)' :
                     formData.type === 'PAYMENT_OUT' ? 'Record Payment Made (Money Out)' : 'Record Contra Bank/Cash Transfer'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {formData.type === 'PAYMENT_IN' ? 'Log customer payment against sales invoice or advance' :
                     formData.type === 'PAYMENT_OUT' ? 'Log payment disbursed to supplier or vendor bill' : 'Transfer money between Bank and Cash accounts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Voucher Number */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Voucher Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.voucherNumber}
                    onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Party Selection (For Payment In / Out) */}
              {formData.type !== 'CONTRA_TRANSFER' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {formData.type === 'PAYMENT_IN' ? 'Customer / Received From *' : 'Vendor / Paid To *'}
                  </label>
                  <select
                    value={formData.partyId}
                    onChange={e => handleSelectParty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Select {formData.type === 'PAYMENT_IN' ? 'Customer' : 'Vendor'} --</option>
                    {(formData.type === 'PAYMENT_IN' ? customers : vendors).map(party => (
                      <option key={party.id} value={party.id}>
                        {party.name} ({party.city || party.state || 'India'}) - Current Bal: {formatINR(party.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linked Sales Invoice (For Payment In) */}
              {formData.type === 'PAYMENT_IN' && formData.partyId && customerUnpaidInvoices.length > 0 && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <label className="block font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                    Settle Against Pending Invoice (Optional)
                  </label>
                  <select
                    value={formData.linkedInvoiceId}
                    onChange={e => handleSelectInvoice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Direct Payment / Advance (No Specific Invoice) --</option>
                    {customerUnpaidInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} (Date: {formatDate(inv.invoiceDate)}) - Total: {formatINR(inv.grandTotal)} | Due: {formatINR(inv.amountDue || inv.grandTotal)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linked Purchase Bill (For Payment Out) */}
              {formData.type === 'PAYMENT_OUT' && formData.partyId && vendorUnpaidBills.length > 0 && (
                <div className="bg-rose-50/50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <label className="block font-semibold text-rose-900 dark:text-rose-300 mb-1">
                    Settle Against Purchase Bill (Optional)
                  </label>
                  <select
                    value={formData.linkedBillId}
                    onChange={e => handleSelectBill(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="">-- Direct / Advance Payment --</option>
                    {vendorUnpaidBills.map(bill => (
                      <option key={bill.id} value={bill.id}>
                        {bill.billNumber} (Date: {formatDate(bill.billDate)}) - Total: {formatINR(bill.grandTotal)} | Due: {formatINR(bill.amountDue || bill.grandTotal)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contra Transfer Account Selection */}
              {formData.type === 'CONTRA_TRANSFER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50">
                  <div>
                    <label className="block font-semibold text-blue-900 dark:text-blue-300 mb-1">Transfer From Account *</label>
                    <select
                      value={formData.fromAccount}
                      onChange={e => setFormData({ ...formData, fromAccount: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Cash in Hand (acc-1)">Cash in Hand</option>
                      <option value="HDFC Current Bank Account (acc-2)">HDFC Current Bank Account</option>
                      <option value="Petty Cash Fund">Petty Cash Fund</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-900 dark:text-blue-300 mb-1">Transfer To Account *</label>
                    <select
                      value={formData.toAccount}
                      onChange={e => setFormData({ ...formData, toAccount: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    >
                      <option value="HDFC Current Bank Account (acc-2)">HDFC Current Bank Account</option>
                      <option value="Cash in Hand (acc-1)">Cash in Hand</option>
                      <option value="SBI Secondary Current A/c">SBI Secondary Current A/c</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Amount & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              {/* Bank Account / Deposit To */}
              {formData.type !== 'CONTRA_TRANSFER' && formData.paymentMethod !== 'CASH' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {formData.type === 'PAYMENT_IN' ? 'Deposit Into Bank A/c' : 'Paid From Bank A/c'}
                    </label>
                    <select
                      value={formData.bankAccountId}
                      onChange={e => {
                        const acc = accountHeads.find(a => a.id === e.target.value);
                        setFormData({
                          ...formData,
                          bankAccountId: e.target.value,
                          bankAccountName: acc ? acc.name : 'HDFC Current Bank Account'
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    >
                      <option value="acc-2">HDFC Current Bank Account (A/c ...5678)</option>
                      <option value="acc-1">Cash in Hand (acc-1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference / UTR / Cheque No</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-9821092 or CHQ-88219"
                      value={formData.referenceNo}
                      onChange={e => setFormData({ ...formData, referenceNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Cheque Date if Cheque */}
              {formData.paymentMethod === 'CHEQUE' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cheque Date</label>
                  <input
                    type="date"
                    value={formData.chequeDate}
                    onChange={e => setFormData({ ...formData, chequeDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Notes / Narration */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Narration / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Enter remarks or payment details..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-sm hover:shadow transition-all ${
                    formData.type === 'PAYMENT_IN' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    formData.type === 'PAYMENT_OUT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingPayment ? 'Update Voucher' : 'Save Payment Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE VOUCHER MODAL */}
      {voucherToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] sm:max-w-xl md:max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[95vh] my-auto">
            {/* Modal Controls */}
            <div className="p-3.5 bg-slate-800 dark:bg-slate-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs sm:text-sm truncate">
                  {voucherToPrint.type === 'PAYMENT_IN' ? 'Receipt Voucher' : 
                   voucherToPrint.type === 'PAYMENT_OUT' ? 'Payment Voucher' : 'Contra Voucher'}
                </span>
                <span className="text-xs text-slate-400 font-mono truncate">({voucherToPrint.voucherNumber})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setVoucherToPrint(null)}
                  className="p-1.5 rounded-lg bg-slate-700 dark:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Layout */}
            <div id="printable-voucher-content" className="p-4 sm:p-6 overflow-y-auto modal-content-scroll flex-1 bg-white text-slate-800 text-xs font-sans space-y-4">
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{business.tradeName || business.name}</h2>
                  <p className="text-[11px] text-slate-600">{business.address}, {business.city}, {business.state} - {business.pincode}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-700">
                    <span><strong>GSTIN:</strong> {business.gstin}</span>
                    <span><strong>PAN:</strong> {business.pan}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                    voucherToPrint.type === 'PAYMENT_IN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    voucherToPrint.type === 'PAYMENT_OUT' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}>
                    {voucherToPrint.type === 'PAYMENT_IN' ? 'RECEIPT VOUCHER' :
                     voucherToPrint.type === 'PAYMENT_OUT' ? 'PAYMENT VOUCHER' : 'CONTRA VOUCHER'}
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900 text-sm">{voucherToPrint.voucherNumber}</div>
                  <div className="text-[11px] text-slate-500">Date: {formatDate(voucherToPrint.date, 'long')}</div>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="space-y-3.5 py-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">
                    {voucherToPrint.type === 'PAYMENT_IN' ? 'Received with thanks from:' : 'Paid to (Beneficiary):'}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{voucherToPrint.partyName}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Amount Received / Disbursed:</span>
                  <span className="font-black text-slate-900 text-base">{formatINR(voucherToPrint.amount)}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block font-medium">Amount in Words:</span>
                  <span className="font-bold text-indigo-900 text-xs italic">
                    {numberToIndianWords(voucherToPrint.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Payment Mode:</span>
                    <span className="font-semibold text-slate-900">{voucherToPrint.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  {voucherToPrint.referenceNo && (
                    <div>
                      <span className="text-slate-500 block">Reference / Cheque No:</span>
                      <span className="font-mono font-bold text-slate-900">{voucherToPrint.referenceNo}</span>
                    </div>
                  )}
                  {voucherToPrint.linkedInvoiceNumber && (
                    <div>
                      <span className="text-slate-500 block">Settled Against Invoice:</span>
                      <span className="font-mono font-bold text-indigo-600">{voucherToPrint.linkedInvoiceNumber}</span>
                    </div>
                  )}
                  {voucherToPrint.linkedBillNumber && (
                    <div>
                      <span className="text-slate-500 block">Settled Against Purchase Bill:</span>
                      <span className="font-mono font-bold text-amber-700">{voucherToPrint.linkedBillNumber}</span>
                    </div>
                  )}
                  {voucherToPrint.bankAccountName && (
                    <div>
                      <span className="text-slate-500 block">Bank Account:</span>
                      <span className="font-semibold text-slate-800">{voucherToPrint.bankAccountName}</span>
                    </div>
                  )}
                </div>

                {voucherToPrint.notes && (
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-500 block">Narration / Remarks:</span>
                    <p className="text-slate-700 italic">{voucherToPrint.notes}</p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 mt-6">
                <div className="text-center w-40">
                  <div className="border-b border-slate-400 pb-8"></div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mt-1">Receiver's Signature</div>
                </div>

                <div className="text-center w-48">
                  {business.signatureUrl ? (
                    <img
                      src={business.signatureUrl}
                      alt="Authorized Signature"
                      className="h-12 max-w-[140px] mx-auto object-contain mb-1"
                    />
                  ) : (
                    <div className="border-b border-slate-400 pb-8"></div>
                  )}
                  <div className="font-bold text-slate-900 text-xs">For {business.tradeName || business.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    {business.signatoryDesignation || 'Authorized Signatory'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] sm:max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 text-center space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete Payment Record?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete this payment voucher? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deletePayment(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Statement Auto Entry Modal */}
      <BankStatementImportModal
        isOpen={showBankStatementModal}
        onClose={() => setShowBankStatementModal(false)}
      />
    </div>
  );
};
