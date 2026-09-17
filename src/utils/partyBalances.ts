import { Party, Invoice, PurchaseBill, PaymentRecord } from '../types';

export interface CalculatedPartyBalance {
  partyId: string;
  partyName: string;
  role: 'DEBTOR' | 'CREDITOR' | 'BOTH';
  openingBalance: number;
  openingType: 'Dr' | 'Cr' | 'Nil';
  totalInvoicedGross: number;
  totalInvoiceReceipts: number;
  totalPurchasedGross: number;
  totalPurchaseDisbursed: number;
  otherPaymentsIn: number;
  otherPaymentsOut: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number; // Positive = Dr (Debtor / Receivable), Negative = Cr (Creditor / Payable)
  balanceType: 'Dr' | 'Cr' | 'Nil';
  pendingDueAmount: number; // Absolute amount of outstanding due
  isReceivable: boolean;
  isPayable: boolean;
  unpaidInvoicesCount: number;
  unpaidBillsCount: number;
  overdueInvoicesCount: number;
  overdueBillsCount: number;
}

export interface ReceivablesAndPayablesResult {
  totalReceivables: number;
  totalPayables: number;
  netWorkingCapital: number;
  totalDebtorsCount: number;
  totalCreditorsCount: number;
  totalBothCount: number;
  partyBalances: Map<string, CalculatedPartyBalance>;
  partyBalancesList: CalculatedPartyBalance[];
  totalOverdueReceivables: number;
  totalOverduePayables: number;
}

/**
 * Universally calculates exact Receivables (Debtors) and Payables (Creditors)
 * incorporating:
 * 1. Party opening balance (Dr / Cr)
 * 2. Sales Invoices (Gross and Amount Paid)
 * 3. Purchase Bills from Creditors (Gross and Amount Paid)
 * 4. Standalone Customer Receipts and Creditor Disbursements
 * 5. Handles unlinked Invoices and Purchase Bills without throwing off balances
 */
export function calculateReceivablesAndPayables(
  parties: Party[] = [],
  invoices: Invoice[] = [],
  purchaseBills: PurchaseBill[] = [],
  payments: PaymentRecord[] = []
): ReceivablesAndPayablesResult {
  const nowTimestamp = Date.now();
  const partyMap = new Map<string, CalculatedPartyBalance>();
  const partyList: CalculatedPartyBalance[] = [];

  let totalReceivables = 0;
  let totalPayables = 0;
  let totalOverdueReceivables = 0;
  let totalOverduePayables = 0;
  let debtorsCount = 0;
  let creditorsCount = 0;
  let bothCount = 0;

  const validInvoices = invoices.filter(i => i.status !== 'CANCELLED');
  const validBills = purchaseBills.filter(b => (b.status as string) !== 'CANCELLED');

  // Track which invoices and bills are linked to a party
  const processedInvoiceIds = new Set<string>();
  const processedBillIds = new Set<string>();

  // 1. Process all existing parties
  parties.forEach(party => {
    const rawRole = party.type || 'CUSTOMER';
    const role: 'DEBTOR' | 'CREDITOR' | 'BOTH' = 
      rawRole === 'BOTH' ? 'BOTH' : rawRole === 'VENDOR' ? 'CREDITOR' : 'DEBTOR';

    if (role === 'DEBTOR') debtorsCount++;
    else if (role === 'CREDITOR') creditorsCount++;
    else bothCount++;

    // Linked Invoices
    const partyInvoices = validInvoices.filter(inv => {
      const match = inv.customerId === party.id || 
        (inv.customerName && inv.customerName.toLowerCase().trim() === party.name.toLowerCase().trim()) ||
        (party.phone && inv.customerPhone && party.phone.replace(/[^0-9]/g, '').slice(-10) === inv.customerPhone.replace(/[^0-9]/g, '').slice(-10));
      if (match) processedInvoiceIds.add(inv.id);
      return match;
    });

    const totalInvoicedGross = partyInvoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
    const totalInvoiceReceipts = partyInvoices.reduce((s, inv) => {
      if (inv.status === 'PAID') {
        return s + Math.max(inv.grandTotal || 0, inv.amountPaid || 0);
      }
      return s + (inv.amountPaid !== undefined ? inv.amountPaid : 0);
    }, 0);
    const unpaidInvoices = partyInvoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID');
    const overdueInvoices = unpaidInvoices.filter(inv => inv.dueDate && new Date(inv.dueDate + 'T23:59:59').getTime() < nowTimestamp);

    // Linked Purchase Bills (Creditor)
    const partyBills = validBills.filter(bill => {
      const match = bill.vendorId === party.id ||
        (bill.vendorName && bill.vendorName.toLowerCase().trim() === party.name.toLowerCase().trim());
      if (match) processedBillIds.add(bill.id);
      return match;
    });

    const totalPurchasedGross = partyBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const totalPurchaseDisbursed = partyBills.reduce((s, b) => {
      if (b.status === 'PAID') {
        return s + Math.max(b.grandTotal || 0, b.amountPaid || 0);
      }
      return s + (b.amountPaid !== undefined ? b.amountPaid : 0);
    }, 0);
    const unpaidBills = partyBills.filter(b => b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID');
    const overdueBills = unpaidBills.filter(b => b.dueDate && new Date(b.dueDate + 'T23:59:59').getTime() < nowTimestamp);

    // Standalone payments (deduplicating auto-generated payment records linked to bills/invoices)
    const partyInvoiceIds = new Set(partyInvoices.map(i => i.id));
    const partyBillIds = new Set(partyBills.map(b => b.id));

    const standalonePayments = payments.filter(p => {
      const isParty = p.partyId === party.id || (p.partyName && p.partyName.toLowerCase().trim() === party.name.toLowerCase().trim());
      if (!isParty) return false;
      if (p.linkedInvoiceId && partyInvoiceIds.has(p.linkedInvoiceId)) return false;
      if (p.linkedBillId && partyBillIds.has(p.linkedBillId)) return false;
      if (p.id.startsWith('pay-rec-inv-') || p.id.startsWith('pay-rec-pb-')) return false;
      return true;
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

    // Double-entry balance calculation:
    // Debits (Assets/Receivables): Opening Dr + Invoices (Sales Dr) + Payments Out (Supplier settlement Dr)
    const totalDebits = openDebit + totalInvoicedGross + totalPurchaseDisbursed + otherPaymentsOut;
    // Credits (Liabilities/Payables): Opening Cr + Inward Bills (Purchases Cr) + Payments In (Customer receipts Cr)
    const totalCredits = openCredit + totalInvoiceReceipts + totalPurchasedGross + otherPaymentsIn;

    let closingBalance = totalDebits - totalCredits;

    // Fallback if no transactions exist but currentBalance is stored
    if (partyInvoices.length === 0 && partyBills.length === 0 && standalonePayments.length === 0 && rawOpen === 0 && party.currentBalance !== undefined) {
      closingBalance = party.currentBalance;
    }

    const balanceType: 'Dr' | 'Cr' | 'Nil' = 
      Math.abs(closingBalance) < 0.01 ? 'Nil' : closingBalance > 0 ? 'Dr' : 'Cr';

    const isReceivable = closingBalance > 0.01;
    const isPayable = closingBalance < -0.01;
    const pendingDueAmount = isReceivable ? closingBalance : isPayable ? Math.abs(closingBalance) : 0;

    if (isReceivable) {
      totalReceivables += closingBalance;
      if (overdueInvoices.length > 0) {
        totalOverdueReceivables += closingBalance;
      }
    } else if (isPayable) {
      totalPayables += Math.abs(closingBalance);
      if (overdueBills.length > 0) {
        totalOverduePayables += Math.abs(closingBalance);
      }
    }

    const calcResult: CalculatedPartyBalance = {
      partyId: party.id,
      partyName: party.name,
      role,
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
      pendingDueAmount,
      isReceivable,
      isPayable,
      unpaidInvoicesCount: unpaidInvoices.length,
      unpaidBillsCount: unpaidBills.length,
      overdueInvoicesCount: overdueInvoices.length,
      overdueBillsCount: overdueBills.length
    };

    partyMap.set(party.id, calcResult);
    partyList.push(calcResult);
  });

  // 2. Add any remaining unlinked Invoices with outstanding balance
  validInvoices.forEach(inv => {
    if (!processedInvoiceIds.has(inv.id)) {
      if (inv.status === 'PAID') return;
      const due = (inv.amountDue !== undefined ? inv.amountDue : Math.max(0, inv.grandTotal - (inv.amountPaid || 0)));
      if (due > 0.01) {
        totalReceivables += due;
        if (inv.dueDate && new Date(inv.dueDate + 'T23:59:59').getTime() < nowTimestamp) {
          totalOverdueReceivables += due;
        }
      }
    }
  });

  // 3. Add any remaining unlinked Purchase Bills with outstanding balance
  validBills.forEach(bill => {
    if (!processedBillIds.has(bill.id)) {
      if (bill.status === 'PAID') return;
      const due = (bill.amountDue !== undefined ? bill.amountDue : Math.max(0, bill.grandTotal - (bill.amountPaid || 0)));
      if (due > 0.01) {
        totalPayables += due;
        if (bill.dueDate && new Date(bill.dueDate + 'T23:59:59').getTime() < nowTimestamp) {
          totalOverduePayables += due;
        }
      }
    }
  });

  return {
    totalReceivables,
    totalPayables,
    netWorkingCapital: totalReceivables - totalPayables,
    totalDebtorsCount: debtorsCount,
    totalCreditorsCount: creditorsCount,
    totalBothCount: bothCount,
    partyBalances: partyMap,
    partyBalancesList: partyList,
    totalOverdueReceivables,
    totalOverduePayables
  };
}
