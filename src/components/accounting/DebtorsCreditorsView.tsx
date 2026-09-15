import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Party, Invoice, PurchaseBill, PaymentRecord } from '../../types';
import { formatCurrency, formatINR, formatDate } from '../../utils/formatters';
import { ClientStatementModal } from '../parties/ClientStatementModal';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Printer, 
  Download, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Scale, 
  Eye, 
  MessageCircle, 
  Building2, 
  Receipt, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  CreditCard,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

interface DebtorCreditorPartyDetail {
  party: Party;
  role: 'DEBTOR' | 'CREDITOR' | 'BOTH';
  roleLabel: string;
  roleBadgeClass: string;
  accountingHead: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr' | 'Nil';
  totalInvoicedGross: number;      // Dr for Debtor (Sales)
  totalInvoiceReceipts: number;    // Cr for Debtor (Payments Received)
  totalPurchasedGross: number;     // Cr for Creditor (Inward Purchases)
  totalPurchaseDisbursed: number;  // Dr for Creditor (Payments Made)
  otherPaymentsIn: number;         // Cr
  otherPaymentsOut: number;        // Dr
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;          // Positive = Dr (Receivable/Debtor), Negative = Cr (Payable/Creditor)
  balanceType: 'Dr' | 'Cr' | 'Nil';
  invoicesCount: number;
  billsCount: number;
  unpaidInvoicesCount: number;
  unpaidBillsCount: number;
  overdueCount: number;
  pendingDueAmount: number;
}

interface PartyLedgerEntry {
  id: string;
  date: string;
  timestamp: number;
  voucherType: 'INVOICE' | 'RECEIPT' | 'PURCHASE_BILL' | 'PAYMENT' | 'JOURNAL' | 'OPENING';
  voucherTypeLabel: string;
  voucherNumber: string;
  particulars: string;
  oppositeAccount: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
}

interface DebtorsCreditorsViewProps {
  onSelectPartyInGeneralLedger?: (partyId: string) => void;
}

export const DebtorsCreditorsView: React.FC<DebtorsCreditorsViewProps> = ({
  onSelectPartyInGeneralLedger
}) => {
  const { 
    parties, 
    invoices, 
    purchaseBills, 
    payments, 
    business, 
    journalEntries,
    showToast 
  } = useApp();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'DEBTORS' | 'CREDITORS' | 'BOTH'>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'RECEIVABLE_DUE' | 'PAYABLE_OWED' | 'SETTLED' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'BALANCE_DESC' | 'BALANCE_ASC' | 'NAME_ASC' | 'INVOICED_DESC'>('BALANCE_DESC');

  // Selected party for Detailed Ledger Statement Modal
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<Party | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Selected party for Official Statement Modal (ClientStatementModal)
  const [statementPartyId, setStatementPartyId] = useState<string | null>(null);

  // =========================================================================
  // 1. UNIFIED DEBTORS & CREDITORS ACCOUNTING COMPUTATION
  // =========================================================================
  const { 
    partyDetailsList, 
    totalDebtorsCount, 
    totalCreditorsCount, 
    totalBothCount,
    totalReceivablesDr, 
    totalPayablesCr, 
    netWorkingCapital,
    totalOverdueReceivables,
    totalOverduePayables
  } = useMemo(() => {
    // Collect all parties (existing parties + virtual customer/vendors from invoices/bills if not in parties)
    const partyMap = new Map<string, Party>();
    parties.forEach(p => partyMap.set(p.id, p));

    // Ensure customers from invoices exist in map
    invoices.forEach(inv => {
      if (inv.customerId && !partyMap.has(inv.customerId)) {
        partyMap.set(inv.customerId, {
          id: inv.customerId,
          type: 'CUSTOMER',
          name: inv.customerName || 'Customer',
          phone: inv.customerPhone || '',
          billingAddress: inv.customerAddress || '',
          city: inv.customerCity || business.city,
          state: inv.customerState || business.state,
          stateCode: inv.customerStateCode || business.stateCode,
          pincode: inv.customerPincode || business.pincode,
          gstin: inv.customerGstin,
          currentBalance: inv.amountDue || 0,
          openingBalance: 0,
          createdAt: inv.createdAt || new Date().toISOString()
        });
      }
    });

    // Ensure vendors from purchase bills exist in map
    purchaseBills.forEach(bill => {
      if (bill.vendorId && !partyMap.has(bill.vendorId)) {
        partyMap.set(bill.vendorId, {
          id: bill.vendorId,
          type: 'VENDOR',
          name: bill.vendorName || 'Vendor',
          phone: bill.vendorPhone || '',
          billingAddress: bill.vendorAddress || '',
          city: bill.vendorCity || business.city,
          state: bill.vendorState || business.state,
          stateCode: bill.vendorStateCode || business.stateCode,
          pincode: business.pincode,
          gstin: bill.vendorGstin,
          currentBalance: -(bill.amountDue || 0),
          openingBalance: 0,
          createdAt: bill.createdAt || new Date().toISOString()
        });
      }
    });

    const nowTimestamp = Date.now();
    let sumReceivables = 0;
    let sumPayables = 0;
    let overdueReceivables = 0;
    let overduePayables = 0;
    let debtorsCount = 0;
    let creditorsCount = 0;
    let bothCount = 0;

    const details: DebtorCreditorPartyDetail[] = [];

    partyMap.forEach(party => {
      // Determine Role
      let role: 'DEBTOR' | 'CREDITOR' | 'BOTH' = 'DEBTOR';
      if (party.type === 'BOTH') {
        role = 'BOTH';
        bothCount++;
      } else if (party.type === 'VENDOR') {
        role = 'CREDITOR';
        creditorsCount++;
      } else {
        role = 'DEBTOR';
        debtorsCount++;
      }

      // Party Invoices
      const partyInvoices = invoices.filter(inv => 
        inv.status !== 'CANCELLED' && (
          inv.customerId === party.id || 
          (party.phone && inv.customerPhone && party.phone.replace(/[^0-9]/g, '').slice(-10) === inv.customerPhone.replace(/[^0-9]/g, '').slice(-10))
        )
      );
      const totalInvoicedGross = partyInvoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
      const totalInvoiceReceipts = partyInvoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
      const unpaidInvoices = partyInvoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID');
      const overdueInvoices = unpaidInvoices.filter(inv => inv.dueDate && new Date(inv.dueDate + 'T23:59:59').getTime() < nowTimestamp);

      // Party Purchase Bills
      const partyBills = purchaseBills.filter(bill => 
        (bill.status as string) !== 'CANCELLED' && (
          bill.vendorId === party.id ||
          (bill.vendorName && bill.vendorName.toLowerCase().trim() === party.name.toLowerCase().trim())
        )
      );
      const totalPurchasedGross = partyBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
      const totalPurchaseDisbursed = partyBills.reduce((s, b) => s + (b.amountPaid || 0), 0);
      const unpaidBills = partyBills.filter(b => b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID');
      const overdueBills = unpaidBills.filter(b => b.dueDate && new Date(b.dueDate + 'T23:59:59').getTime() < nowTimestamp);

      // Party Payments in standalone Payments register
      const partyInvoiceIds = new Set(partyInvoices.map(i => i.id));
      const partyBillIds = new Set(partyBills.map(b => b.id));

      const standalonePayments = (payments || []).filter(p => {
        const isParty = p.partyId === party.id || (p.partyName && p.partyName.toLowerCase().trim() === party.name.toLowerCase().trim());
        // Avoid double-counting invoice/bill settlement payments already recorded in amountPaid
        if (p.linkedInvoiceId && partyInvoiceIds.has(p.linkedInvoiceId)) return false;
        if (p.linkedBillId && partyBillIds.has(p.linkedBillId)) return false;
        return isParty;
      });

      const otherPaymentsIn = standalonePayments.filter(p => p.type === 'PAYMENT_IN').reduce((s, p) => s + p.amount, 0);
      const otherPaymentsOut = standalonePayments.filter(p => p.type === 'PAYMENT_OUT').reduce((s, p) => s + p.amount, 0);

      // Opening Balance
      const rawOpen = Math.abs(party.openingBalance || 0);
      let openDebit = 0;
      let openCredit = 0;
      let openingType: 'Dr' | 'Cr' | 'Nil' = 'Nil';

      const effectiveOpenType = party.openingBalanceType || (
        (party.openingBalance || 0) < 0 || party.type === 'VENDOR' ? 'Cr' : 'Dr'
      );

      if (rawOpen > 0) {
        if (effectiveOpenType === 'Dr') {
          openDebit = rawOpen;
          openingType = 'Dr';
        } else {
          openCredit = rawOpen;
          openingType = 'Cr';
        }
      }

      // Total Debits = Opening Dr + Invoiced to Debtor + Payments to Creditor + Other Payments Out
      const totalDebits = openDebit + totalInvoicedGross + totalPurchaseDisbursed + otherPaymentsOut;
      // Total Credits = Opening Cr + Receipts from Debtor + Inward Purchases from Creditor + Other Payments In
      const totalCredits = openCredit + totalInvoiceReceipts + totalPurchasedGross + otherPaymentsIn;

      // Net Closing Balance
      // Positive = Dr (Customer owes us / Debtor Asset)
      // Negative = Cr (We owe vendor / Creditor Liability)
      // Zero = Settled
      let closingBalance = totalDebits - totalCredits;
      
      // Fallback to party.currentBalance if no direct transactions exist but currentBalance was specified
      if (partyInvoices.length === 0 && partyBills.length === 0 && standalonePayments.length === 0 && rawOpen === 0) {
        closingBalance = party.currentBalance || 0;
      }

      const balanceType: 'Dr' | 'Cr' | 'Nil' = 
        Math.abs(closingBalance) < 0.01 ? 'Nil' : closingBalance > 0 ? 'Dr' : 'Cr';

      if (closingBalance > 0.01) {
        sumReceivables += closingBalance;
        if (overdueInvoices.length > 0) {
          overdueReceivables += closingBalance;
        }
      } else if (closingBalance < -0.01) {
        sumPayables += Math.abs(closingBalance);
        if (overdueBills.length > 0) {
          overduePayables += Math.abs(closingBalance);
        }
      }

      const roleLabel = role === 'BOTH' 
        ? 'Customer & Vendor (Dual Role)' 
        : role === 'DEBTOR' 
          ? 'Sundry Debtor (Customer)' 
          : 'Sundry Creditor (Vendor)';

      const roleBadgeClass = role === 'BOTH'
        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        : role === 'DEBTOR'
          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';

      const accountingHead = role === 'DEBTOR'
        ? 'Trade Receivables (Current Asset)'
        : role === 'CREDITOR'
          ? 'Trade Payables (Current Liability)'
          : 'Sundry Debtor & Creditor Clearing';

      const pendingDueAmount = closingBalance > 0 
        ? closingBalance 
        : closingBalance < 0 
          ? Math.abs(closingBalance) 
          : 0;

      details.push({
        party,
        role,
        roleLabel,
        roleBadgeClass,
        accountingHead,
        openingBalance: rawOpen,
        openingType,
        totalInvoicedGross,
        totalInvoiceReceipts,
        totalPurchasedGross,
        totalPurchaseDisbursed,
        otherPaymentsIn,
        otherPaymentsOut,
        totalDebits,
        totalCredits,
        closingBalance,
        balanceType,
        invoicesCount: partyInvoices.length,
        billsCount: partyBills.length,
        unpaidInvoicesCount: unpaidInvoices.length,
        unpaidBillsCount: unpaidBills.length,
        overdueCount: overdueInvoices.length + overdueBills.length,
        pendingDueAmount
      });
    });

    return {
      partyDetailsList: details,
      totalDebtorsCount: debtorsCount,
      totalCreditorsCount: creditorsCount,
      totalBothCount: bothCount,
      totalReceivablesDr: sumReceivables,
      totalPayablesCr: sumPayables,
      netWorkingCapital: sumReceivables - sumPayables,
      totalOverdueReceivables: overdueReceivables,
      totalOverduePayables: overduePayables
    };
  }, [parties, invoices, purchaseBills, payments, business]);

  // Filter & Sort
  const filteredParties = useMemo(() => {
    return partyDetailsList.filter(detail => {
      // 1. Role Filter
      if (roleFilter === 'DEBTORS' && detail.role !== 'DEBTOR' && detail.role !== 'BOTH') return false;
      if (roleFilter === 'CREDITORS' && detail.role !== 'CREDITOR' && detail.role !== 'BOTH') return false;
      if (roleFilter === 'BOTH' && detail.role !== 'BOTH') return false;

      // 2. Balance Filter
      if (balanceFilter === 'RECEIVABLE_DUE' && detail.closingBalance <= 0.01) return false;
      if (balanceFilter === 'PAYABLE_OWED' && detail.closingBalance >= -0.01) return false;
      if (balanceFilter === 'SETTLED' && Math.abs(detail.closingBalance) > 0.01) return false;
      if (balanceFilter === 'OVERDUE' && detail.overdueCount === 0) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = detail.party.name.toLowerCase().includes(q);
        const matchesCompany = (detail.party.companyName || '').toLowerCase().includes(q);
        const matchesPhone = (detail.party.phone || '').includes(q);
        const matchesGstin = (detail.party.gstin || '').toLowerCase().includes(q);
        const matchesCity = (detail.party.city || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesPhone && !matchesGstin && !matchesCity) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'BALANCE_DESC') {
        return Math.abs(b.closingBalance) - Math.abs(a.closingBalance);
      }
      if (sortBy === 'BALANCE_ASC') {
        return Math.abs(a.closingBalance) - Math.abs(b.closingBalance);
      }
      if (sortBy === 'NAME_ASC') {
        return a.party.name.localeCompare(b.party.name);
      }
      if (sortBy === 'INVOICED_DESC') {
        return (b.totalInvoicedGross + b.totalPurchasedGross) - (a.totalInvoicedGross + a.totalPurchasedGross);
      }
      return 0;
    });
  }, [partyDetailsList, roleFilter, balanceFilter, searchQuery, sortBy]);

  // =========================================================================
  // 2. DETAILED LEDGER POSTINGS GENERATOR (FOR SELECTED PARTY)
  // =========================================================================
  const activePartyLedgerPostings = useMemo(() => {
    if (!selectedPartyForLedger) return [];

    const postings: PartyLedgerEntry[] = [];
    const party = selectedPartyForLedger;

    // 1. Opening Balance Posting
    const openVal = Math.abs(party.openingBalance || 0);
    if (openVal !== 0) {
      const isDr = party.openingBalanceType === 'Dr' || (!party.openingBalanceType && party.type !== 'VENDOR' && (party.openingBalance || 0) >= 0);
      postings.push({
        id: `open-${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : '2026-04-01',
        timestamp: new Date(party.createdAt || '2026-04-01T00:00:00').getTime(),
        voucherType: 'OPENING',
        voucherTypeLabel: 'Opening Balance',
        voucherNumber: 'OPEN-BAL',
        particulars: `Opening Balance B/F (${party.name}) [${isDr ? 'Debit / Dr' : 'Credit / Cr'}]`,
        oppositeAccount: 'Opening Balance Equity',
        debit: isDr ? openVal : 0,
        credit: !isDr ? openVal : 0,
        runningBalance: openVal,
        balanceType: isDr ? 'Dr' : 'Cr'
      });
    }

    // 2. Sales Invoices (Dr: Party Debtor, Cr: Sales & GST)
    const partyInvoices = invoices.filter(inv => 
      inv.status !== 'CANCELLED' && (
        inv.customerId === party.id || 
        (party.phone && inv.customerPhone && party.phone.replace(/[^0-9]/g, '').slice(-10) === inv.customerPhone.replace(/[^0-9]/g, '').slice(-10))
      )
    );

    partyInvoices.forEach(inv => {
      const t = new Date(inv.invoiceDate + 'T10:00:00').getTime();
      // Invoice Gross Debit
      postings.push({
        id: `inv-${inv.id}`,
        date: inv.invoiceDate,
        timestamp: t,
        voucherType: 'INVOICE',
        voucherTypeLabel: inv.invoiceType === 'POS_SALE' ? 'POS Counter Sale' : 'Tax Invoice',
        voucherNumber: inv.invoiceNumber,
        particulars: `Sales to ${inv.customerName} (${inv.items.length} items) - Due ${formatDate(inv.dueDate)}`,
        oppositeAccount: 'Sales Revenue & GST Output',
        debit: inv.grandTotal,
        credit: 0,
        runningBalance: 0,
        balanceType: 'Dr'
      });

      // Customer Payment Receipts
      if (inv.amountPaid > 0) {
        postings.push({
          id: `rcpt-${inv.id}`,
          date: inv.invoiceDate,
          timestamp: t + 1000,
          voucherType: 'RECEIPT',
          voucherTypeLabel: 'Receipt (Payment In)',
          voucherNumber: `RCPT-${inv.invoiceNumber}`,
          particulars: `Payment received against ${inv.invoiceNumber} (${inv.paymentMethod || 'UPI/Bank'})`,
          oppositeAccount: inv.paymentMethod === 'CASH' ? 'Cash on Hand (acc-1)' : 'Bank Current A/C (acc-2)',
          debit: 0,
          credit: inv.amountPaid,
          runningBalance: 0,
          balanceType: 'Dr'
        });
      }
    });

    // 3. Purchase Bills (Cr: Party Creditor, Dr: COGS & ITC)
    const partyBills = purchaseBills.filter(bill => 
      (bill.status as string) !== 'CANCELLED' && (
        bill.vendorId === party.id ||
        (bill.vendorName && bill.vendorName.toLowerCase().trim() === party.name.toLowerCase().trim())
      )
    );

    partyBills.forEach(bill => {
      const t = new Date(bill.billDate + 'T11:00:00').getTime();
      // Bill Gross Credit
      postings.push({
        id: `bill-${bill.id}`,
        date: bill.billDate,
        timestamp: t,
        voucherType: 'PURCHASE_BILL',
        voucherTypeLabel: 'Purchase Inward Bill',
        voucherNumber: bill.billNumber,
        particulars: `Inward supply from ${bill.vendorName} (Ref: ${bill.vendorInvoiceNumber || bill.billNumber})`,
        oppositeAccount: 'Cost of Goods Sold & ITC',
        debit: 0,
        credit: bill.grandTotal,
        runningBalance: 0,
        balanceType: 'Cr'
      });

      // Vendor Disbursements
      if (bill.amountPaid > 0) {
        postings.push({
          id: `pmt-${bill.id}`,
          date: bill.billDate,
          timestamp: t + 2000,
          voucherType: 'PAYMENT',
          voucherTypeLabel: 'Disbursement (Payment Out)',
          voucherNumber: `PMT-${bill.billNumber}`,
          particulars: `Payment disbursed to ${bill.vendorName} (${bill.paymentMethod || 'Bank'})`,
          oppositeAccount: bill.paymentMethod === 'CASH' ? 'Cash on Hand (acc-1)' : 'Bank Current A/C (acc-2)',
          debit: bill.amountPaid,
          credit: 0,
          runningBalance: 0,
          balanceType: 'Cr'
        });
      }
    });

    // 4. Standalone Payments from payments register
    const coveredInvIds = new Set(partyInvoices.map(i => i.id));
    const coveredBillIds = new Set(partyBills.map(b => b.id));

    (payments || []).forEach(p => {
      const isParty = p.partyId === party.id || (p.partyName && p.partyName.toLowerCase().trim() === party.name.toLowerCase().trim());
      if (!isParty) return;
      if (p.linkedInvoiceId && coveredInvIds.has(p.linkedInvoiceId)) return;
      if (p.linkedBillId && coveredBillIds.has(p.linkedBillId)) return;

      const t = new Date(p.date + 'T14:00:00').getTime();
      if (p.type === 'PAYMENT_IN') {
        postings.push({
          id: `pay-in-${p.id}`,
          date: p.date,
          timestamp: t,
          voucherType: 'RECEIPT',
          voucherTypeLabel: 'Money In (Receipt)',
          voucherNumber: p.voucherNumber || `RCPT-${p.id.slice(-6)}`,
          particulars: p.notes || `Receipt from ${party.name} (${p.paymentMethod})`,
          oppositeAccount: p.paymentMethod === 'CASH' ? 'Cash on Hand (acc-1)' : 'Bank Current A/C (acc-2)',
          debit: 0,
          credit: p.amount,
          runningBalance: 0,
          balanceType: 'Dr'
        });
      } else if (p.type === 'PAYMENT_OUT') {
        postings.push({
          id: `pay-out-${p.id}`,
          date: p.date,
          timestamp: t,
          voucherType: 'PAYMENT',
          voucherTypeLabel: 'Money Out (Payment)',
          voucherNumber: p.voucherNumber || `PMT-${p.id.slice(-6)}`,
          particulars: p.notes || `Disbursement to ${party.name} (${p.paymentMethod})`,
          oppositeAccount: p.paymentMethod === 'CASH' ? 'Cash on Hand (acc-1)' : 'Bank Current A/C (acc-2)',
          debit: p.amount,
          credit: 0,
          runningBalance: 0,
          balanceType: 'Cr'
        });
      }
    });

    // Sort chronologically
    postings.sort((a, b) => a.timestamp - b.timestamp);

    // Compute Running Balance
    // Debtor perspective: Debit increases receivable (Dr), Credit decreases receivable
    // If Net > 0 => Dr (Receivable). If Net < 0 => Cr (Payable).
    let runningNet = 0;
    postings.forEach(p => {
      runningNet += (p.debit - p.credit);
      p.runningBalance = Math.abs(runningNet);
      p.balanceType = runningNet >= 0 ? 'Dr' : 'Cr';
    });

    return postings;
  }, [selectedPartyForLedger, invoices, purchaseBills, payments]);

  // Filtered Postings in Modal
  const filteredLedgerPostings = useMemo(() => {
    if (!ledgerSearch.trim()) return activePartyLedgerPostings;
    const q = ledgerSearch.toLowerCase().trim();
    return activePartyLedgerPostings.filter(p => 
      p.voucherNumber.toLowerCase().includes(q) ||
      p.particulars.toLowerCase().includes(q) ||
      p.voucherTypeLabel.toLowerCase().includes(q) ||
      p.oppositeAccount.toLowerCase().includes(q)
    );
  }, [activePartyLedgerPostings, ledgerSearch]);

  // WhatsApp Reminder Handler
  const handleSendWhatsAppReminder = (detail: DebtorCreditorPartyDetail) => {
    if (detail.closingBalance <= 0) {
      showToast('info', 'No Dues', `${detail.party.name} has no pending debit balance.`);
      return;
    }
    const cleanPhone = detail.party.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast('error', 'Invalid Phone', 'Valid mobile number required to send WhatsApp reminder.');
      return;
    }
    const message = encodeURIComponent(
      `Dear ${detail.party.name},\n` +
      `This is a gentle payment reminder from ${business.tradeName || business.name}.\n` +
      `Your current outstanding balance is ${formatCurrency(detail.closingBalance, business.currencySymbol)} (Dr - Receivable).\n` +
      `Please clear the dues via UPI (${business.upiId || 'N/A'}) or Bank Transfer (${business.bankName || 'Bank'}, A/C: ${business.accountNumber || 'N/A'}, IFSC: ${business.ifscCode || 'N/A'}).\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/${cleanPhone.slice(-10)}?text=${message}`, '_blank');
  };

  // CSV Export for Debtors & Creditors
  const handleExportCsv = () => {
    const headers = [
      'Party ID',
      'Name',
      'Company Name',
      'Accounting Role',
      'Classification',
      'Phone',
      'GSTIN',
      'City',
      'Opening Balance',
      'Opening Type',
      'Total Sales Invoiced (Dr)',
      'Total Purchase Billed (Cr)',
      'Total Debits',
      'Total Credits',
      'Closing Balance',
      'Balance Type',
      'Status'
    ];

    const rows = filteredParties.map(d => [
      `"${d.party.id}"`,
      `"${d.party.name.replace(/"/g, '""')}"`,
      `"${(d.party.companyName || '').replace(/"/g, '""')}"`,
      `"${d.roleLabel}"`,
      `"${d.accountingHead}"`,
      `"${d.party.phone || ''}"`,
      `"${d.party.gstin || ''}"`,
      `"${d.party.city || ''}"`,
      d.openingBalance,
      d.openingType,
      d.totalInvoicedGross,
      d.totalPurchasedGross,
      d.totalDebits,
      d.totalCredits,
      Math.abs(d.closingBalance),
      d.balanceType,
      d.closingBalance > 0 ? 'RECEIVABLE_DUE' : d.closingBalance < 0 ? 'PAYABLE_OWED' : 'SETTLED'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Debtors_and_Creditors_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Complete', 'Debtors and Creditors balance report downloaded.');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Sundry Debtors & Creditors (Party Balances & Ledgers)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {partyDetailsList.length} Active Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Merged view: Customers classified as <strong className="text-blue-600 dark:text-blue-400">Sundry Debtors (Receivables / Assets)</strong> and Vendors classified as <strong className="text-rose-600 dark:text-rose-400">Sundry Creditors (Payables / Liabilities)</strong> with detailed closing balances, sub-ledgers, and statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Key Accounting Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sundry Debtors (Customers) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-bold mb-1.5">
            <span className="flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Sundry Debtors (Customers)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              {totalDebtorsCount} Parties
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatINR(totalReceivablesDr)}
            <span className="text-xs font-sans font-bold text-blue-600 dark:text-blue-400 ml-1.5">Dr</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Asset (To Receive)</span>
            {totalOverdueReceivables > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Overdue: {formatINR(totalOverdueReceivables)}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Sundry Creditors (Vendors) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-bold mb-1.5">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Sundry Creditors (Vendors)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
              {totalCreditorsCount} Parties
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatINR(totalPayablesCr)}
            <span className="text-xs font-sans font-bold text-rose-600 dark:text-rose-400 ml-1.5">Cr</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Liability (To Pay)</span>
            {totalOverduePayables > 0 && (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Pending: {formatINR(totalOverduePayables)}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Net Trade Working Capital Position */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Net Trade Position (Dr - Cr)</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              netWorkingCapital >= 0 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
            }`}>
              {netWorkingCapital >= 0 ? 'Net Surplus (Dr)' : 'Net Liability (Cr)'}
            </span>
          </div>
          <div className={`text-2xl font-black font-mono ${
            netWorkingCapital >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatINR(Math.abs(netWorkingCapital))}
            <span className="text-xs font-sans font-bold ml-1.5">
              {netWorkingCapital >= 0 ? 'Dr' : 'Cr'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {netWorkingCapital >= 0 
              ? 'Receivables exceed payables (+ Liquidity)' 
              : 'Payables exceed receivables (Working Capital Deficit)'}
          </div>
        </div>

        {/* Card 4: Dual Role Parties & Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Dual Role (Customer & Vendor)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
              {totalBothCount} Dual
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {partyDetailsList.filter(d => Math.abs(d.closingBalance) > 0.01).length}
            <span className="text-xs font-sans font-bold text-slate-500 dark:text-slate-400 ml-1.5">With Active Dues</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>Settled Accounts:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {partyDetailsList.filter(d => Math.abs(d.closingBalance) <= 0.01).length} Parties (₹0)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search, Filter & View Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search debtor or creditor by name, company, phone, GSTIN, city..."
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort By:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="BALANCE_DESC">Closing Balance (High to Low)</option>
              <option value="BALANCE_ASC">Closing Balance (Low to High)</option>
              <option value="NAME_ASC">Party Name (A &rarr; Z)</option>
              <option value="INVOICED_DESC">Highest Turnover (Sales / Purchases)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold text-[11px] mr-1">Role:</span>
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                roleFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Merged ({partyDetailsList.length})
            </button>
            <button
              onClick={() => setRoleFilter('DEBTORS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                roleFilter === 'DEBTORS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              <span>Sundry Debtors (Customers)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/30 text-current">
                {totalDebtorsCount}
              </span>
            </button>
            <button
              onClick={() => setRoleFilter('CREDITORS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                roleFilter === 'CREDITORS'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <span>Sundry Creditors (Vendors)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-current">
                {totalCreditorsCount}
              </span>
            </button>
            {totalBothCount > 0 && (
              <button
                onClick={() => setRoleFilter('BOTH')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  roleFilter === 'BOTH'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                }`}
              >
                <span>Dual Role</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-current">
                  {totalBothCount}
                </span>
              </button>
            )}
          </div>

          {/* Balance Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold text-[11px] mr-1">Balance:</span>
            <button
              onClick={() => setBalanceFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                balanceFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Balances
            </button>
            <button
              onClick={() => setBalanceFilter('RECEIVABLE_DUE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                balanceFilter === 'RECEIVABLE_DUE'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              Receivables Due (Dr &gt; 0)
            </button>
            <button
              onClick={() => setBalanceFilter('PAYABLE_OWED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                balanceFilter === 'PAYABLE_OWED'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              Payables Owed (Cr &gt; 0)
            </button>
            <button
              onClick={() => setBalanceFilter('OVERDUE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                balanceFilter === 'OVERDUE'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              Overdue Dues
            </button>
            <button
              onClick={() => setBalanceFilter('SETTLED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                balanceFilter === 'SETTLED'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              Settled (₹0)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Detailed Debtors & Creditors Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Showing <span className="font-mono text-indigo-600 dark:text-indigo-400">{filteredParties.length}</span> of {partyDetailsList.length} Debtors & Creditors
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400">Dr = Sundry Debtor (Asset / Money to Receive)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400">Cr = Sundry Creditor (Liability / Money to Pay)</span>
            </div>
          </div>
        </div>

        {filteredParties.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Debtors or Creditors Found</p>
            <p className="text-xs mt-1">Try clearing or adjusting your search filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Party & Accounting Role</th>
                  <th className="py-3.5 px-3">Contact & GSTIN</th>
                  <th className="py-3.5 px-3 text-right">Opening Bal</th>
                  <th className="py-3.5 px-3 text-right">Sales Invoiced (Dr)</th>
                  <th className="py-3.5 px-3 text-right">Purchases (Cr)</th>
                  <th className="py-3.5 px-3 text-right">Total Settled</th>
                  <th className="py-3.5 px-4 text-right">Closing Balance in Details</th>
                  <th className="py-3.5 px-4 text-center">Ledger Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredParties.map(detail => {
                  const isDebtor = detail.closingBalance > 0.01;
                  const isCreditor = detail.closingBalance < -0.01;
                  const isSettled = !isDebtor && !isCreditor;

                  return (
                    <tr 
                      key={detail.party.id}
                      className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Party & Accounting Role */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>{detail.party.name}</span>
                          {detail.overdueCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800" title={`${detail.overdueCount} Overdue Documents`}>
                              Overdue
                            </span>
                          )}
                        </div>
                        {detail.party.companyName && detail.party.companyName !== detail.party.name && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                            {detail.party.companyName}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${detail.roleBadgeClass}`}>
                            {detail.roleLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {detail.party.id.slice(-6)}
                          </span>
                        </div>
                      </td>

                      {/* Contact & GSTIN */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {detail.party.phone && (
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{detail.party.phone}</span>
                          </div>
                        )}
                        {detail.party.gstin && (
                          <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                            GSTIN: {detail.party.gstin}
                          </div>
                        )}
                        {detail.party.city && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>{detail.party.city}{detail.party.state ? `, ${detail.party.state}` : ''}</span>
                          </div>
                        )}
                      </td>

                      {/* Opening Balance */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {detail.openingBalance !== 0 ? (
                          <div>
                            <span className="font-semibold">{formatINR(Math.abs(detail.openingBalance))}</span>
                            <span className={`text-[10px] ml-1 font-bold ${
                              detail.openingType === 'Dr' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {detail.openingType}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>

                      {/* Total Sales Invoiced (Dr) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {detail.totalInvoicedGross > 0 ? (
                          <div>
                            <span className="font-semibold text-blue-700 dark:text-blue-400">
                              {formatINR(detail.totalInvoicedGross)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {detail.invoicesCount} Invoices
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total Purchases (Cr) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {detail.totalPurchasedGross > 0 ? (
                          <div>
                            <span className="font-semibold text-rose-700 dark:text-rose-400">
                              {formatINR(detail.totalPurchasedGross)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {detail.billsCount} Bills
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total Settled */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div>
                          {detail.totalInvoiceReceipts > 0 && (
                            <div className="text-emerald-600 dark:text-emerald-400 font-semibold" title="Receipts from Customer">
                              Recv: {formatINR(detail.totalInvoiceReceipts)}
                            </div>
                          )}
                          {detail.totalPurchaseDisbursed > 0 && (
                            <div className="text-slate-700 dark:text-slate-300 font-semibold" title="Disbursements to Vendor">
                              Paid: {formatINR(detail.totalPurchaseDisbursed)}
                            </div>
                          )}
                          {detail.totalInvoiceReceipts === 0 && detail.totalPurchaseDisbursed === 0 && (
                            <span className="text-slate-400">₹0.00</span>
                          )}
                        </div>
                      </td>

                      {/* Closing Balance in Details */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <div className={`text-sm font-black font-mono flex items-center gap-1 ${
                            isDebtor 
                              ? 'text-blue-700 dark:text-blue-400' 
                              : isCreditor 
                                ? 'text-rose-700 dark:text-rose-400' 
                                : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            <span>{formatINR(Math.abs(detail.closingBalance))}</span>
                            <span className={`text-[10px] font-sans font-extrabold px-1.5 py-0.2 rounded ${
                              isDebtor 
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' 
                                : isCreditor 
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {isDebtor ? 'Dr' : isCreditor ? 'Cr' : 'Nil'}
                            </span>
                          </div>

                          <div className="text-[10px] font-semibold mt-0.5">
                            {isDebtor ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                Debtor (Receivable Due)
                              </span>
                            ) : isCreditor ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium">
                                Creditor (Payable Owed)
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Account Settled
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedPartyForLedger(detail.party)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                            title="View Detailed Double-Entry Ledger Statement"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setStatementPartyId(detail.party.id)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Open Official Statement / Print / Export PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {isDebtor && detail.party.phone && (
                            <button
                              onClick={() => handleSendWhatsAppReminder(detail)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}

                          {onSelectPartyInGeneralLedger && (
                            <button
                              onClick={() => onSelectPartyInGeneralLedger(detail.party.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Open in General Ledger Tab"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-white uppercase tracking-wider">
                    Total Sundry Debtors & Creditors Volume ({filteredParties.length} Parties)
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-400 text-sm">
                    {formatINR(filteredParties.reduce((s, p) => s + p.totalInvoicedGross, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-700 dark:text-rose-400 text-sm">
                    {formatINR(filteredParties.reduce((s, p) => s + p.totalPurchasedGross, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    Settled
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    <div className="text-blue-700 dark:text-blue-400 font-extrabold">
                      Receivables: {formatINR(filteredParties.filter(p => p.closingBalance > 0).reduce((s, p) => s + p.closingBalance, 0))} Dr
                    </div>
                    <div className="text-rose-700 dark:text-rose-400 font-extrabold text-[11px] mt-0.5">
                      Payables: {formatINR(filteredParties.filter(p => p.closingBalance < 0).reduce((s, p) => s + Math.abs(p.closingBalance), 0))} Cr
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: DETAILED DOUBLE-ENTRY LEDGER STATEMENT MODAL
         ========================================================================= */}
      {selectedPartyForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  selectedPartyForLedger.type === 'VENDOR' 
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white">
                      {selectedPartyForLedger.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      selectedPartyForLedger.type === 'CUSTOMER' 
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        : selectedPartyForLedger.type === 'VENDOR'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    }`}>
                      {selectedPartyForLedger.type === 'CUSTOMER' ? 'Sundry Debtor (Customer)' : selectedPartyForLedger.type === 'VENDOR' ? 'Sundry Creditor (Vendor)' : 'Dual Role (Customer & Vendor)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    General Ledger Statement of Accounts • {selectedPartyForLedger.phone || 'No phone'} • {selectedPartyForLedger.gstin ? `GSTIN: ${selectedPartyForLedger.gstin}` : 'Unregistered'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const pid = selectedPartyForLedger.id;
                    setSelectedPartyForLedger(null);
                    setStatementPartyId(pid);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                  title="Print / Download PDF Statement"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
                <button
                  onClick={() => setSelectedPartyForLedger(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header: Search & Running Balance Summary */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 text-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  placeholder="Filter transactions by voucher or notes..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Total Debits:</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                    {formatINR(activePartyLedgerPostings.reduce((s, p) => s + p.debit, 0))}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Total Credits:</span>
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                    {formatINR(activePartyLedgerPostings.reduce((s, p) => s + p.credit, 0))}
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px] block">Net Closing Balance:</span>
                  <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                    {activePartyLedgerPostings.length > 0 
                      ? `${formatINR(activePartyLedgerPostings[activePartyLedgerPostings.length - 1].runningBalance)} ${activePartyLedgerPostings[activePartyLedgerPostings.length - 1].balanceType}`
                      : formatINR(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Postings Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredLedgerPostings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No ledger transactions recorded for this account.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Voucher Type</th>
                      <th className="py-2.5 px-3">Voucher No</th>
                      <th className="py-2.5 px-4">Particulars</th>
                      <th className="py-2.5 px-3">Opposite Account</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLedgerPostings.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-mono text-[11px]">
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {p.date}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.voucherType === 'INVOICE' 
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : p.voucherType === 'RECEIPT'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : p.voucherType === 'PURCHASE_BILL'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : p.voucherType === 'PAYMENT'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {p.voucherTypeLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {p.voucherNumber}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {p.particulars}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500 dark:text-slate-400 text-[10px]">
                          {p.oppositeAccount}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-700 dark:text-blue-400 font-bold">
                          {p.debit > 0 ? formatINR(p.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                          {p.credit > 0 ? formatINR(p.credit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {formatINR(p.runningBalance)}
                          <span className={`ml-1 text-[10px] font-sans font-bold ${
                            p.balanceType === 'Dr' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {p.balanceType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {filteredLedgerPostings.length} Vouchers posted to this sub-ledger
              </span>
              <button
                onClick={() => setSelectedPartyForLedger(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: OFFICIAL CLIENT STATEMENT MODAL (PRINT / PDF / SHARE)
         ========================================================================= */}
      {statementPartyId && (
        <ClientStatementModal
          partyId={statementPartyId}
          onClose={() => setStatementPartyId(null)}
        />
      )}
    </div>
  );
};
