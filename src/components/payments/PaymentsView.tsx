import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentRecord, PaymentType, PaymentMethod, Party, Invoice, PurchaseBill } from '../../types';
import { formatINR, formatDate, numberToIndianWords } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
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
import { AutoUpdateVoucherNumbersModal } from './AutoUpdateVoucherNumbersModal';
import { DesktopModal } from '../common/DesktopModal';
import { getNextAvailableVoucherNumber } from '../../utils/voucherNumberUtils';
import { calculateReceivablesAndPayables } from '../../utils/partyBalances';

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

  // Calculate Unified Receivables & Payables (incorporating Opening Balances, Bills, Invoices & Standalone Payments)
  const { 
    totalReceivables, 
    totalPayables, 
    partyBalances, 
    partyBalancesList,
    totalDebtorsCount,
    totalCreditorsCount 
  } = useMemo(() => {
    return calculateReceivablesAndPayables(parties, invoices, purchaseBills, payments);
  }, [parties, invoices, purchaseBills, payments]);

  // Active Tab Filter
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'CONTRA_TRANSFER' | 'PENDING_RECEIVABLES' | 'PENDING_PAYABLES'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');

  // Sub-view filters for pending tabs
  const [payablesViewMode, setPayablesViewMode] = useState<'BILLS' | 'CREDITORS'>('BILLS');
  const [receivablesViewMode, setReceivablesViewMode] = useState<'INVOICES' | 'DEBTORS'>('INVOICES');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordModalType, setRecordModalType] = useState<PaymentType>('PAYMENT_IN');
  const [showResequenceModal, setShowResequenceModal] = useState<boolean>(false);
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

  const totalPendingInvoicesDue = useMemo(() => {
    return pendingInvoices.reduce((sum, i) => sum + (i.amountDue !== undefined ? i.amountDue : i.grandTotal), 0);
  }, [pendingInvoices]);

  // Pending Purchase Bills (Payables to Creditors)
  const pendingBills = useMemo(() => {
    return purchaseBills
      .filter(b => (b.status as string) !== 'CANCELLED' && (b.amountDue > 0 || (b.status !== 'PAID' && (b.amountDue === undefined || b.amountDue > 0))))
      .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  }, [purchaseBills]);

  const totalPendingBillsDue = useMemo(() => {
    return pendingBills.reduce((sum, b) => sum + (b.amountDue !== undefined ? b.amountDue : b.grandTotal), 0);
  }, [pendingBills]);

  // Creditors with outstanding payable balance (Cr)
  const creditorsWithPayables = useMemo(() => {
    return partyBalancesList
      .filter(p => p.isPayable)
      .map(calc => {
        const party = parties.find(pt => pt.id === calc.partyId);
        return {
          ...calc,
          phone: party?.phone || '',
          city: party?.city || '',
          state: party?.state || '',
          gstin: party?.gstin || ''
        };
      })
      .sort((a, b) => b.pendingDueAmount - a.pendingDueAmount);
  }, [partyBalancesList, parties]);

  const filteredCreditorsWithPayables = useMemo(() => {
    if (!searchQuery.trim()) return creditorsWithPayables;
    const q = searchQuery.toLowerCase();
    return creditorsWithPayables.filter(c => 
      c.partyName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  }, [creditorsWithPayables, searchQuery]);

  // Debtors with outstanding receivable balance (Dr)
  const debtorsWithReceivables = useMemo(() => {
    return partyBalancesList
      .filter(p => p.isReceivable)
      .map(calc => {
        const party = parties.find(pt => pt.id === calc.partyId);
        return {
          ...calc,
          phone: party?.phone || '',
          city: party?.city || '',
          state: party?.state || '',
          gstin: party?.gstin || ''
        };
      })
      .sort((a, b) => b.pendingDueAmount - a.pendingDueAmount);
  }, [partyBalancesList, parties]);

  const filteredDebtorsWithReceivables = useMemo(() => {
    if (!searchQuery.trim()) return debtorsWithReceivables;
    const q = searchQuery.toLowerCase();
    return debtorsWithReceivables.filter(d => 
      d.partyName.toLowerCase().includes(q) ||
      (d.phone && d.phone.includes(q)) ||
      (d.gstin && d.gstin.toLowerCase().includes(q)) ||
      (d.city && d.city.toLowerCase().includes(q))
    );
  }, [debtorsWithReceivables, searchQuery]);

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

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterMethod, dateFilter, payablesViewMode, receivablesViewMode]);

  const currentTotal = activeTab === 'PENDING_RECEIVABLES'
    ? (receivablesViewMode === 'INVOICES' ? filteredPendingInvoices.length : filteredDebtorsWithReceivables.length)
    : activeTab === 'PENDING_PAYABLES'
    ? (payablesViewMode === 'BILLS' ? filteredPendingBills.length : filteredCreditorsWithPayables.length)
    : filteredPayments.length;

  const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPendingInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPendingInvoices.slice(start, start + pageSize);
  }, [filteredPendingInvoices, currentPage, pageSize]);

  const paginatedDebtorsWithReceivables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDebtorsWithReceivables.slice(start, start + pageSize);
  }, [filteredDebtorsWithReceivables, currentPage, pageSize]);

  const paginatedPendingBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPendingBills.slice(start, start + pageSize);
  }, [filteredPendingBills, currentPage, pageSize]);

  const paginatedCreditorsWithPayables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCreditorsWithPayables.slice(start, start + pageSize);
  }, [filteredCreditorsWithPayables, currentPage, pageSize]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Available Customers & Creditors for dropdowns
  const customers = useMemo(() => parties.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH'), [parties]);
  const creditors = useMemo(() => parties.filter(p => p.type === 'VENDOR' || p.type === 'BOTH'), [parties]);

  // Open Record Modal
  const handleOpenRecord = (type: PaymentType) => {
    setEditingPayment(null);
    setRecordModalType(type);
    const nextVoucher = getNextAvailableVoucherNumber(payments, business, type).voucherNumber;

    setFormData({
      voucherNumber: nextVoucher,
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
    const nextVoucher = getNextAvailableVoucherNumber(payments, business, 'PAYMENT_IN').voucherNumber;
    const party = parties.find(p => p.id === inv.customerId || p.name.toLowerCase() === (inv.customerName || '').toLowerCase());
    const dueAmt = inv.amountDue !== undefined ? inv.amountDue : inv.grandTotal;

    setFormData({
      voucherNumber: nextVoucher,
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
    const nextVoucher = getNextAvailableVoucherNumber(payments, business, 'PAYMENT_OUT').voucherNumber;
    const party = parties.find(p => p.id === bill.vendorId || p.name.toLowerCase() === (bill.vendorName || '').toLowerCase());
    const dueAmt = bill.amountDue !== undefined ? bill.amountDue : bill.grandTotal;

    setFormData({
      voucherNumber: nextVoucher,
      type: 'PAYMENT_OUT',
      date: new Date().toISOString().split('T')[0],
      partyId: party?.id || bill.vendorId || '',
      partyName: bill.vendorName || party?.name || 'Creditor (Supplier)',
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
      toAccount: 'Creditor Bank / Cash',
      notes: `Payment disbursed for Purchase Bill ${bill.billNumber}`
    });
    setIsRecordModalOpen(true);
  };

  // Open Record Modal pre-filled for a Creditor Account balance
  const handleOpenPayCreditor = (creditor: { partyId: string; partyName: string; pendingDueAmount: number }) => {
    setEditingPayment(null);
    setRecordModalType('PAYMENT_OUT');
    const nextVoucher = getNextAvailableVoucherNumber(payments, business, 'PAYMENT_OUT').voucherNumber;

    setFormData({
      voucherNumber: nextVoucher,
      type: 'PAYMENT_OUT',
      date: new Date().toISOString().split('T')[0],
      partyId: creditor.partyId,
      partyName: creditor.partyName,
      partyType: 'VENDOR',
      amount: creditor.pendingDueAmount > 0 ? creditor.pendingDueAmount : '',
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'acc-2',
      bankAccountName: 'HDFC Current Bank Account',
      referenceNo: '',
      chequeDate: '',
      linkedInvoiceId: '',
      linkedInvoiceNumber: '',
      linkedBillId: '',
      linkedBillNumber: '',
      fromAccount: 'HDFC Current Bank Account (acc-2)',
      toAccount: 'Creditor Bank / Cash',
      notes: `Payment disbursed to settle Creditor account balance (${creditor.partyName})`
    });
    setIsRecordModalOpen(true);
  };

  // Open Record Modal pre-filled for a Debtor Account balance
  const handleOpenCollectDebtor = (debtor: { partyId: string; partyName: string; pendingDueAmount: number }) => {
    setEditingPayment(null);
    setRecordModalType('PAYMENT_IN');
    const nextVoucher = getNextAvailableVoucherNumber(payments, business, 'PAYMENT_IN').voucherNumber;

    setFormData({
      voucherNumber: nextVoucher,
      type: 'PAYMENT_IN',
      date: new Date().toISOString().split('T')[0],
      partyId: debtor.partyId,
      partyName: debtor.partyName,
      partyType: 'CUSTOMER',
      amount: debtor.pendingDueAmount > 0 ? debtor.pendingDueAmount : '',
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
      notes: `Payment receipt to settle Debtor account balance (${debtor.partyName})`
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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Minimalist Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Payments & Receipts</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track customer collections, creditor payments, and account contra transfers</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Secondary Actions */}
          <button
            onClick={() => setShowResequenceModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-xs font-medium transition-all cursor-pointer"
            title="Auto-resequence voucher numbers"
          >
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            <span>Voucher Sequence</span>
          </button>

          <button
            onClick={() => setShowBankStatementModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-xs font-medium transition-all cursor-pointer"
            title="Import Bank Statement CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Statement</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Export CSV Statement"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

          {/* Primary Transaction Buttons */}
          <button
            onClick={() => handleOpenRecord('PAYMENT_IN')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receive Payment</span>
          </button>

          <button
            onClick={() => handleOpenRecord('PAYMENT_OUT')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Pay Creditor</span>
          </button>

          <button
            onClick={() => handleOpenRecord('CONTRA_TRANSFER')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Contra</span>
          </button>
        </div>
      </div>

      {/* Minimalist Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Money In */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Money In</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatINR(metrics.totalIn)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{metrics.inCount}</span> receipts
            </div>
          </div>
        </div>

        {/* Total Money Out */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Money Out</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatINR(metrics.totalOut)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-semibold text-rose-600 dark:text-rose-400">{metrics.outCount}</span> disbursements
            </div>
          </div>
        </div>

        {/* Pending Customer Receivables (Debtors) */}
        <div 
          onClick={() => setActiveTab('PENDING_RECEIVABLES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'PENDING_RECEIVABLES'
              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Pending Receivables</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{formatINR(totalReceivables)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{pendingInvoices.length} bills • {debtorsWithReceivables.length} debtors</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">View →</span>
            </div>
          </div>
        </div>

        {/* Pending Creditor Payables */}
        <div 
          onClick={() => setActiveTab('PENDING_PAYABLES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'PENDING_PAYABLES'
              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 shadow-xs ring-1 ring-rose-400/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Pending Payables</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{formatINR(totalPayables)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{pendingBills.length} bills • {creditorsWithPayables.length} creditors</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">View →</span>
            </div>
          </div>
        </div>

        {/* Liquid Balances */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Liquid Balances</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Bank:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatINR(metrics.bankBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Cash:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatINR(metrics.cashBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Minimal Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl flex-wrap">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_IN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'PAYMENT_IN'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Received ({metrics.inCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_OUT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'PAYMENT_OUT'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Paid ({metrics.outCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('CONTRA_TRANSFER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'CONTRA_TRANSFER'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Contra ({payments.filter(p => p.type === 'CONTRA_TRANSFER').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PENDING_RECEIVABLES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'PENDING_RECEIVABLES'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Receivables ({pendingInvoices.length > 0 ? pendingInvoices.length : debtorsWithReceivables.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('PENDING_PAYABLES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'PENDING_PAYABLES'
                  ? 'bg-rose-600 text-white shadow-xs font-semibold'
                  : 'text-rose-800 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Payables ({pendingBills.length > 0 ? pendingBills.length : creditorsWithPayables.length})</span>
            </button>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl text-xs">
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 font-medium'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'THIS_MONTH' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 font-medium'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('LAST_MONTH')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'LAST_MONTH' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 font-medium'
              }`}
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Minimal Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'PENDING_RECEIVABLES' 
                  ? "Search by Customer, Phone, City, GSTIN, or Invoice #..." 
                  : activeTab === 'PENDING_PAYABLES'
                  ? "Search by Creditor, Phone, City, GSTIN, or Bill #..."
                  : "Search by Voucher #, Party Name, Reference, Notes..."
              }
              className="w-full pl-9 pr-4 py-2 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
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
                className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
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

        {/* Render Pending Customer Receivables Table & View Modes */}
        {activeTab === 'PENDING_RECEIVABLES' && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Customer Receivables</span>
                <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-700/60 p-0.5 ml-2">
                  <button
                    onClick={() => setReceivablesViewMode('INVOICES')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      receivablesViewMode === 'INVOICES'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Unsettled Invoices ({pendingInvoices.length})
                  </button>
                  <button
                    onClick={() => setReceivablesViewMode('DEBTORS')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      receivablesViewMode === 'DEBTORS'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Debtor Balances ({debtorsWithReceivables.length})
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Total Receivables: {formatINR(totalReceivables)}
                </span>
                {totalReceivables !== totalPendingInvoicesDue && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    (Invoices Due: {formatINR(totalPendingInvoicesDue)})
                  </span>
                )}
              </div>
            </div>

            {/* Invoices View */}
            {receivablesViewMode === 'INVOICES' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Invoice Date</th>
                      <th className="py-3 px-3.5">Invoice #</th>
                      <th className="py-3 px-3.5">Customer</th>
                      <th className="py-3 px-3.5 text-right">Total Invoice</th>
                      <th className="py-3 px-3.5 text-right">Paid</th>
                      <th className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">Pending Due</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPendingInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">
                          <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500/80" />
                          <p className="font-medium text-slate-700 dark:text-slate-300">No pending invoice receivables</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">All customer invoices are settled.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedPendingInvoices.map(inv => {
                        const dueAmt = inv.amountDue !== undefined ? inv.amountDue : inv.grandTotal;
                        const paidAmt = inv.amountPaid || (inv.grandTotal - dueAmt);

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(inv.invoiceDate, 'short')}
                              {inv.dueDate && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">Due: {formatDate(inv.dueDate, 'short')}</div>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="font-mono font-medium text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-medium text-slate-900 dark:text-white">{inv.customerName || 'Customer'}</div>
                              {inv.customerPhone && (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{inv.customerPhone}</div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right font-medium text-slate-600 dark:text-slate-400">
                              {formatINR(inv.grandTotal)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatINR(paidAmt)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-amber-700 dark:text-amber-400">
                              {formatINR(dueAmt)}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                dueAmt === inv.grandTotal 
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' 
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                              }`}>
                                {dueAmt === inv.grandTotal ? 'Unpaid' : 'Partial'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <button
                                onClick={() => handleOpenCollectInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>Collect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {filteredPendingInvoices.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredPendingInvoices.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="invoices"
                  />
                )}
              </div>
            ) : (
              /* Customer Debtors View */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Customer / Debtor</th>
                      <th className="py-3 px-3.5">Phone & GSTIN</th>
                      <th className="py-3 px-3.5 text-right">Opening Bal</th>
                      <th className="py-3 px-3.5 text-right">Invoices (Dr)</th>
                      <th className="py-3 px-3.5 text-right">Received (Cr)</th>
                      <th className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">Net Due</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredDebtorsWithReceivables.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                          <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500/80" />
                          <p className="font-medium text-slate-700 dark:text-slate-300">No debtor balances pending</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">All customer debtor accounts are settled.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedDebtorsWithReceivables.map(debtor => (
                        <tr key={debtor.partyId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{debtor.partyName}</div>
                            {(debtor.city || debtor.state) && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">{debtor.city}{debtor.city && debtor.state ? ', ' : ''}{debtor.state}</div>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            {debtor.phone && <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{debtor.phone}</div>}
                            {debtor.gstin && <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">GSTIN: {debtor.gstin}</div>}
                          </td>
                          <td className="py-3 px-3.5 text-right font-medium text-slate-500 dark:text-slate-400">
                            {formatINR(Math.abs(debtor.openingBalance))} {debtor.openingBalanceType}
                          </td>
                          <td className="py-3 px-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                            {formatINR(debtor.totalInvoicedGross)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatINR(debtor.totalReceipts)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold text-amber-700 dark:text-amber-400">
                            {formatINR(debtor.pendingDueAmount)} Dr
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => handleOpenCollectDebtor(debtor)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all cursor-pointer"
                            >
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Collect</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {filteredDebtorsWithReceivables.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredDebtorsWithReceivables.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="debtors"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Render Pending Creditor Payables Table & View Modes */}
        {activeTab === 'PENDING_PAYABLES' && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Creditor Payables</span>
                <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-700/60 p-0.5 ml-2">
                  <button
                    onClick={() => setPayablesViewMode('BILLS')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      payablesViewMode === 'BILLS'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Unsettled Bills ({pendingBills.length})
                  </button>
                  <button
                    onClick={() => setPayablesViewMode('CREDITORS')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      payablesViewMode === 'CREDITORS'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Creditor Balances ({creditorsWithPayables.length})
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Total Payables: {formatINR(totalPayables)}
                </span>
                {totalPayables !== totalPendingBillsDue && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    (Bills Due: {formatINR(totalPendingBillsDue)})
                  </span>
                )}
              </div>
            </div>

            {/* Purchase Bills View */}
            {payablesViewMode === 'BILLS' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Bill Date</th>
                      <th className="py-3 px-3.5">Bill #</th>
                      <th className="py-3 px-3.5">Creditor (Supplier)</th>
                      <th className="py-3 px-3.5 text-right">Total Bill</th>
                      <th className="py-3 px-3.5 text-right">Paid</th>
                      <th className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">Pending Due</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPendingBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">
                          <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500/80" />
                          <p className="font-medium text-slate-700 dark:text-slate-300">No pending purchase bills</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">All supplier bills are settled.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedPendingBills.map(bill => {
                        const dueAmt = bill.amountDue !== undefined ? bill.amountDue : bill.grandTotal;
                        const paidAmt = bill.amountPaid || (bill.grandTotal - dueAmt);

                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(bill.billDate, 'short')}
                              {bill.dueDate && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">Due: {formatDate(bill.dueDate, 'short')}</div>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="font-mono font-medium text-slate-900 dark:text-white">{bill.billNumber}</span>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-medium text-slate-900 dark:text-white">{bill.vendorName || 'Creditor (Supplier)'}</div>
                              {bill.vendorPhone && (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{bill.vendorPhone}</div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right font-medium text-slate-600 dark:text-slate-400">
                              {formatINR(bill.grandTotal)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatINR(paidAmt)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-rose-700 dark:text-rose-400">
                              {formatINR(dueAmt)}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                dueAmt === bill.grandTotal 
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' 
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                              }`}>
                                {dueAmt === bill.grandTotal ? 'Unpaid' : 'Partial'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <button
                                onClick={() => handleOpenPayBill(bill)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-all cursor-pointer"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {filteredPendingBills.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredPendingBills.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="bills"
                  />
                )}
              </div>
            ) : (
              /* Creditors View */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Creditor (Supplier)</th>
                      <th className="py-3 px-3.5">Phone & GSTIN</th>
                      <th className="py-3 px-3.5 text-right">Opening Bal</th>
                      <th className="py-3 px-3.5 text-right">Purchases (Cr)</th>
                      <th className="py-3 px-3.5 text-right">Paid (Dr)</th>
                      <th className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">Net Due</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredCreditorsWithPayables.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                          <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500/80" />
                          <p className="font-medium text-slate-700 dark:text-slate-300">No creditor payables pending</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">All creditor accounts are settled.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedCreditorsWithPayables.map(creditor => (
                        <tr key={creditor.partyId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{creditor.partyName}</div>
                            {(creditor.city || creditor.state) && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">{creditor.city}{creditor.city && creditor.state ? ', ' : ''}{creditor.state}</div>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            {creditor.phone && <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{creditor.phone}</div>}
                            {creditor.gstin && <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">GSTIN: {creditor.gstin}</div>}
                          </td>
                          <td className="py-3 px-3.5 text-right font-medium text-slate-500 dark:text-slate-400">
                            {formatINR(Math.abs(creditor.openingBalance))} {creditor.openingBalanceType}
                          </td>
                          <td className="py-3 px-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                            {formatINR(creditor.totalPurchasesGross)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatINR(creditor.totalDisbursements)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold text-rose-700 dark:text-rose-400">
                            {formatINR(creditor.pendingDueAmount)} Cr
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => handleOpenPayCreditor(creditor)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-all cursor-pointer"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {filteredCreditorsWithPayables.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredCreditorsWithPayables.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="creditors"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Standard Transactions Table (for ALL, PAYMENT_IN, PAYMENT_OUT, CONTRA_TRANSFER) */}
        {activeTab !== 'PENDING_RECEIVABLES' && activeTab !== 'PENDING_PAYABLES' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Voucher #</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Party / Accounts</th>
                <th className="py-3 px-3.5">Mode & Ref</th>
                <th className="py-3 px-3.5">Linked Doc</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">No payment records found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try changing search filters or create a new payment receipt.</p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map(p => {
                  const isMoneyIn = p.type === 'PAYMENT_IN';
                  const isMoneyOut = p.type === 'PAYMENT_OUT';
                  const isContra = p.type === 'CONTRA_TRANSFER';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(p.date, 'short')}
                      </td>

                      {/* Voucher No */}
                      <td className="py-3 px-3.5">
                        <button
                          onClick={() => setVoucherToPrint(p)}
                          className="font-mono font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {p.voucherNumber}
                        </button>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isMoneyIn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                            <ArrowDownLeft className="w-3 h-3" /> Received
                          </span>
                        )}
                        {isMoneyOut && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                            <ArrowUpRight className="w-3 h-3" /> Paid
                          </span>
                        )}
                        {isContra && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <ArrowLeftRight className="w-3 h-3" /> Contra
                          </span>
                        )}
                      </td>

                      {/* Party Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-900 dark:text-white max-w-[220px] truncate" title={p.partyName}>
                          {p.partyName}
                        </div>
                        {p.notes && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[220px]" title={p.notes}>
                            {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode & Ref */}
                      <td className="py-3 px-3.5">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {p.paymentMethod.replace('_', ' ')}
                        </div>
                        {p.referenceNo && (
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {p.referenceNo}
                          </div>
                        )}
                      </td>

                      {/* Linked Doc */}
                      <td className="py-3 px-3.5">
                        {p.linkedInvoiceNumber && (
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {p.linkedInvoiceNumber}
                          </span>
                        )}
                        {p.linkedBillNumber && (
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {p.linkedBillNumber}
                          </span>
                        )}
                        {!p.linkedInvoiceNumber && !p.linkedBillNumber && (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 text-right font-bold whitespace-nowrap">
                        <span className={isMoneyIn ? 'text-emerald-600 dark:text-emerald-400' : isMoneyOut ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>
                          {isMoneyIn ? '+' : isMoneyOut ? '-' : ''}{formatINR(p.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setVoucherToPrint(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Print Voucher Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Edit Payment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {filteredPayments.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPayments.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="payments"
            />
          )}
        </div>
        )}
      </div>

      {/* RECORD / EDIT PAYMENT MODAL */}
      <DesktopModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        size="xl"
        title={editingPayment ? 'Edit Payment Voucher' : 
          formData.type === 'PAYMENT_IN' ? 'Record Payment Received (Money In)' :
          formData.type === 'PAYMENT_OUT' ? 'Record Payment Made (Money Out)' : 'Record Contra Bank/Cash Transfer'}
        subtitle={formData.type === 'PAYMENT_IN' ? 'Log customer payment against sales invoice or advance' :
          formData.type === 'PAYMENT_OUT' ? 'Log payment disbursed to supplier or vendor bill' : 'Transfer money between Bank and Cash accounts'}
        icon={formData.type === 'PAYMENT_IN' ? <ArrowDownLeft className="w-4 h-4" /> :
          formData.type === 'PAYMENT_OUT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
        iconBgColor={formData.type === 'PAYMENT_IN' ? 'bg-emerald-600 text-white' :
          formData.type === 'PAYMENT_OUT' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}
        bodyClassName="p-0"
      >
        <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
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
                    {formData.type === 'PAYMENT_IN' ? 'Customer (Debtor) / Received From *' : 'Creditor (Supplier) / Paid To *'}
                  </label>
                  <select
                    value={formData.partyId}
                    onChange={e => handleSelectParty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Select {formData.type === 'PAYMENT_IN' ? 'Customer (Debtor)' : 'Creditor (Supplier)'} --</option>
                    {(formData.type === 'PAYMENT_IN' ? customers : creditors).map(party => {
                      const bal = partyBalances[party.id];
                      const balText = bal 
                        ? `${formatINR(bal.pendingDueAmount)} ${bal.isPayable ? 'Cr (Payable)' : bal.isReceivable ? 'Dr (Receivable)' : 'Settled'}`
                        : formatINR(party.currentBalance);
                      return (
                        <option key={party.id} value={party.id}>
                          {party.name} ({party.city || party.state || 'India'}) - Net Bal: {balText}
                        </option>
                      );
                    })}
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
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-sm hover:shadow transition-all cursor-pointer ${
                    formData.type === 'PAYMENT_IN' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    formData.type === 'PAYMENT_OUT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingPayment ? 'Update Voucher' : 'Save Payment Voucher'}
                </button>
              </div>
            </form>
      </DesktopModal>

      {/* PRINTABLE VOUCHER MODAL */}
      <DesktopModal
        isOpen={!!voucherToPrint}
        onClose={() => setVoucherToPrint(null)}
        size="2xl"
        title={voucherToPrint?.type === 'PAYMENT_IN' ? 'Receipt Voucher' : 
          voucherToPrint?.type === 'PAYMENT_OUT' ? 'Payment Voucher' : 'Contra Voucher'}
        badge={voucherToPrint ? (
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
            {voucherToPrint.voucherNumber}
          </span>
        ) : undefined}
        icon={<Receipt className="w-5 h-5 text-emerald-500" />}
        headerActions={
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        }
        bodyClassName="bg-slate-100 dark:bg-slate-950 p-4 sm:p-6"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Desktop window supports maximize & instant print
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVoucherToPrint(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        }
      >
        {voucherToPrint && (
          <div id="printable-voucher-content" className="p-6 bg-white text-slate-800 text-xs font-sans space-y-4 rounded-xl border border-slate-200 shadow-md max-w-3xl mx-auto">
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
        )}
      </DesktopModal>

      {/* DELETE CONFIRMATION MODAL */}
      <DesktopModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        size="sm"
        title="Delete Payment Record?"
        icon={<Trash2 className="w-5 h-5 text-rose-600" />}
        iconBgColor="bg-rose-100 dark:bg-rose-950/60"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (deleteConfirmId) {
                  deletePayment(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
            >
              Delete Record
            </button>
          </div>
        }
      >
        <div className="text-center py-2 space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this payment voucher? This action cannot be undone.
          </p>
        </div>
      </DesktopModal>

      {/* Bank Statement Auto Entry Modal */}
      <BankStatementImportModal
        isOpen={showBankStatementModal}
        onClose={() => setShowBankStatementModal(false)}
      />

      {/* Auto-Resequence Voucher Numbers Modal */}
      <AutoUpdateVoucherNumbersModal
        isOpen={showResequenceModal}
        onClose={() => setShowResequenceModal(false)}
      />
    </div>
  );
};
