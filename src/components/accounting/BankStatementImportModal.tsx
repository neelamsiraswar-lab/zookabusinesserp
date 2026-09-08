import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BankStatementAutoEntry, 
  BankEntryClassification, 
  BankStatementImportResult,
  PaymentMethod,
  Party,
  AccountHead
} from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Download, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle, 
  Search, 
  Filter, 
  Landmark, 
  CreditCard, 
  FileText, 
  DollarSign, 
  Building2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Receipt, 
  TrendingDown, 
  Sparkles, 
  Layers, 
  Check, 
  Copy,
  Plus
} from 'lucide-react';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBankAccountId?: string;
}

// Pre-defined sample CSV contents for instant download
const SAMPLE_2_COLUMN_CSV = `Date,Narration,Chq/Ref No,Withdrawal,Deposit,Balance
2026-08-15,UPI/CR/8291028192/Acme InfoTech Solutions LLP/HDFC,UPI-8291028192,,84368.00,430168.00
2026-08-16,NEFT-CR-Apex Retail Stores Pvt Ltd-INV101,NEFT-889102,,147500.00,577668.00
2026-08-17,NEFT-DR-Redington India Wholesale-BILL001,NEFT-119203,125000.00,,452668.00
2026-08-18,ATM CASH WDL 18AUG S1091,ATM-449102,10000.00,,442668.00
2026-08-18,ELECTRICITY BILL DISCOM BSES RAJDHANI,BILL-99210,8450.00,,434218.00
2026-08-19,OFFICE RENT FOR AUG 2026,CHQ-449012,35000.00,,399218.00
2026-08-19,BLUE DART COURIER CHARGES,REF-7721,4200.00,,395018.00
2026-08-20,INT.PD ON SAV/CURR ACCOUNT,INT-Q1-26,,2850.00,397868.00
2026-08-20,CONSOLIDATED SMS & ANNUAL AMC CHARGES,CHG-9921,590.00,,397278.00
2026-08-20,CDM CASH DEPOSIT BRANCH 0122,CDM-88219,,25000.00,422278.00`;

const SAMPLE_HDFC_NETBANKING_CSV = `Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
15/08/2026,UPI-Acme InfoTech Solutions LLP-8291028192,UPI8291028192,15/08/2026,,84368.00,430168.00
16/08/2026,NEFT DR-Redington India Wholesale Distribution,N889102,16/08/2026,125000.00,,305168.00
17/08/2026,ATM WDL-HDFC ATM CP ND,ATM882190,17/08/2026,15000.00,,290168.00
18/08/2026,BSES POWER DELHI ELECTRICITY BILL,ELEC88291,18/08/2026,8450.00,,281718.00
19/08/2026,INTEREST CREDIT FOR Q1 2026,INT882910,19/08/2026,,3150.00,284868.00
20/08/2026,SMS ALERT CHARGES QTRLY,CHG881092,20/08/2026,59.00,,284809.00`;

const SAMPLE_SINGLE_AMOUNT_CSV = `Date,Description,Reference,Amount,Type,Balance
2026-08-15,Payment received from Acme InfoTech,REF-101,84368,CR,430168
2026-08-16,Vendor payment to Redington Wholesale,REF-102,125000,DR,305168
2026-08-17,Cash withdrawal from ATM,ATM-009,10000,DR,295168
2026-08-18,Electricity bill payment,ELEC-881,8450,DR,286718
2026-08-19,Interest credit from bank,INT-112,2850,CR,289568`;

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  defaultBankAccountId
}) => {
  const { 
    accountHeads, 
    parties, 
    invoices, 
    purchaseBills, 
    payments, 
    expenses, 
    journalEntries, 
    business,
    importBankStatementAutoEntries,
    createAccountHead
  } = useApp();

  // Find all Bank and Asset account heads
  const bankAccounts = useMemo(() => {
    return accountHeads.filter(
      a => a.category === 'ASSET' && (
        a.name.toLowerCase().includes('bank') || 
        a.name.toLowerCase().includes('hdfc') || 
        a.name.toLowerCase().includes('icici') || 
        a.name.toLowerCase().includes('sbi') || 
        a.name.toLowerCase().includes('axis') || 
        a.name.toLowerCase().includes('kotak') || 
        a.code === '1010' ||
        a.subCategory?.toLowerCase().includes('bank')
      )
    );
  }, [accountHeads]);

  // Selected Target Bank Account
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(() => {
    if (defaultBankAccountId) return defaultBankAccountId;
    const hdfc = accountHeads.find(a => a.id === 'acc-2' || a.name.toLowerCase().includes('bank'));
    return hdfc?.id || (bankAccounts[0]?.id || 'acc-2');
  });

  // Steps: 1: Upload/Paste -> 2: Auto-Classification Review -> 3: Done
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [inputTab, setInputTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed and classified transactions
  const [parsedEntries, setParsedEntries] = useState<BankStatementAutoEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Import options
  const [autoCreateParties, setAutoCreateParties] = useState<boolean>(true);
  const [autoSettleInvoices, setAutoSettleInvoices] = useState<boolean>(true);
  const [autoSettleBills, setAutoSettleBills] = useState<boolean>(true);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Import Execution Result
  const [importResult, setImportResult] = useState<BankStatementImportResult | null>(null);

  // Quick New Bank Account Modal
  const [showNewBankModal, setShowNewBankModal] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>('');
  const [newBankCode, setNewBankCode] = useState<string>('1011');
  const [newBankOpeningBal, setNewBankOpeningBal] = useState<number>(0);

  const currentBankAccount = useMemo(() => {
    return accountHeads.find(a => a.id === selectedBankAccountId) || {
      id: 'acc-2',
      name: 'HDFC Current Bank Account',
      code: '1010',
      balance: 345800
    };
  }, [accountHeads, selectedBankAccountId]);

  // =========================================================================
  // SMART PARSING & CLASSIFICATION ENGINE
  // =========================================================================
  const cleanNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim().replace(/,/g, '').replace(/₹/g, '').replace(/\$/g, '');
    // Handle brackets (100.00) as negative or CR/DR suffixes
    const isCr = /cr/i.test(s);
    const isDr = /dr/i.test(s);
    s = s.replace(/cr|dr/gi, '').trim();
    if (s.startsWith('(') && s.endsWith(')')) {
      s = '-' + s.slice(1, -1);
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : Math.abs(num);
  };

  const parseFlexibleDate = (raw: string): string => {
    if (!raw) return new Date().toISOString().split('T')[0];
    const s = String(raw).trim();

    // 1. YYYY-MM-DD
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(s)) {
      const parts = s.split(/[-/.]/);
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    // 2. DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(s)) {
      const parts = s.split(/[-/.]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // 3. DD-MM-YY or DD/MM/YY
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2}$/.test(s)) {
      const parts = s.split(/[-/.]/);
      const year = parseInt(parts[2], 10) > 50 ? `19${parts[2]}` : `20${parts[2]}`;
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // 4. DD-Mon-YYYY (e.g. 15-Aug-2026 or 15/AUG/2026)
    const monthNames: { [k: string]: string } = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const monMatch = s.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[-/. ](\d{2,4})$/);
    if (monMatch) {
      const day = monMatch[1].padStart(2, '0');
      const monStr = monMatch[2].toLowerCase();
      const month = monthNames[monStr] || '01';
      let year = monMatch[3];
      if (year.length === 2) {
        year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }

    // Fallback: Date.parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  };

  const processRawCSV = (content: string) => {
    if (!content.trim()) return;

    const lines = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    // Detect CSV Delimiter (comma, tab, semicolon, pipe)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
    else if (firstLine.includes('|')) delimiter = '|';

    // Parse CSV Lines respecting quotes
    const parseCSVLine = (text: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === delimiter && !insideQuote) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    // Find Header Row
    let headerIndex = 0;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const cols = parseCSVLine(lines[i]).map(c => c.toLowerCase());
      const hasDate = cols.some(c => /date|txn_date|tran_date|value_date|posting/i.test(c));
      const hasNarration = cols.some(c => /narration|description|particular|remark|detail|memo/i.test(c));
      const hasAmount = cols.some(c => /debit|credit|withdrawal|deposit|amount|dr|cr/i.test(c));

      if (hasDate && (hasNarration || hasAmount)) {
        headerIndex = i;
        headers = cols;
        break;
      }
    }

    if (headers.length === 0) {
      headers = parseCSVLine(lines[0]).map(c => c.toLowerCase());
      headerIndex = 0;
    }

    // Column Index Mapping
    let dateCol = headers.findIndex(c => /date|txn_date|tran_date|posting|value_date/i.test(c));
    let narrCol = headers.findIndex(c => /narration|description|particular|remarks|detail|memo/i.test(c));
    let refCol = headers.findIndex(c => /chq|cheque|ref|utr|txn_id|reference|instrument/i.test(c));
    let drCol = headers.findIndex(c => /withdrawal|debit|dr_amount|debit_amount|dr\b/i.test(c));
    let crCol = headers.findIndex(c => /deposit|credit|cr_amount|credit_amount|cr\b/i.test(c));
    let amtCol = headers.findIndex(c => /amount|txn_amount|transaction_amount|net_amount/i.test(c));
    let typeCol = headers.findIndex(c => /type|cr_dr|dr_cr|d_c|c_d/i.test(c));
    let balCol = headers.findIndex(c => /balance|closing|avail_bal|running/i.test(c));

    // Fallbacks
    if (dateCol === -1) dateCol = 0;
    if (narrCol === -1) narrCol = 1;

    const parsedRows: BankStatementAutoEntry[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('***') || line.toLowerCase().includes('total') || line.toLowerCase().includes('page')) {
        continue;
      }

      const cols = parseCSVLine(line);
      if (cols.length < 2) continue;

      const rawDate = cols[dateCol] || '';
      const date = parseFlexibleDate(rawDate);
      const narration = (narrCol !== -1 && cols[narrCol]) ? cols[narrCol].trim() : '';
      const referenceNo = (refCol !== -1 && cols[refCol]) ? cols[refCol].trim() : '';
      
      let drAmount = 0;
      let crAmount = 0;

      if (drCol !== -1 && crCol !== -1) {
        drAmount = cleanNumber(cols[drCol]);
        crAmount = cleanNumber(cols[crCol]);
      } else if (amtCol !== -1) {
        const rawAmt = cleanNumber(cols[amtCol]);
        const typeStr = typeCol !== -1 ? cols[typeCol].toUpperCase() : '';
        
        if (typeStr.includes('CR') || typeStr.includes('DEP') || typeStr.includes('CREDIT')) {
          crAmount = rawAmt;
        } else if (typeStr.includes('DR') || typeStr.includes('WDL') || typeStr.includes('DEBIT')) {
          drAmount = rawAmt;
        } else {
          // Check sign or narration
          if (cols[amtCol].includes('-') || narration.toLowerCase().includes('dr') || narration.toLowerCase().includes('paid')) {
            drAmount = rawAmt;
          } else {
            crAmount = rawAmt;
          }
        }
      } else {
        // Look through remaining numeric columns
        for (let c = 2; c < cols.length; c++) {
          const num = cleanNumber(cols[c]);
          if (num > 0) {
            if (drAmount === 0 && crAmount === 0) {
              if (c === 2) drAmount = num;
              else crAmount = num;
            }
          }
        }
      }

      const balance = balCol !== -1 ? cleanNumber(cols[balCol]) : undefined;

      // Skip empty amount rows
      if (drAmount === 0 && crAmount === 0) continue;

      // =====================================================================
      // SMART AUTO-CLASSIFICATION & PARTY MATCHING
      // =====================================================================
      let entryType: BankEntryClassification = crAmount > 0 ? 'PAYMENT_IN' : 'PAYMENT_OUT';
      let matchedParty: Party | undefined = undefined;
      let matchedInvoiceId: string | undefined = undefined;
      let matchedInvoiceNumber: string | undefined = undefined;
      let matchedBillId: string | undefined = undefined;
      let matchedBillNumber: string | undefined = undefined;
      let expenseCategory: string | undefined = undefined;
      let contraAccountId: string | undefined = undefined;
      let contraAccountName: string | undefined = undefined;
      let matchReason = 'Standard Transaction';
      let status: 'VALID' | 'WARNING' | 'DUPLICATE' | 'IGNORED' = 'VALID';
      let paymentMethod: PaymentMethod = 'BANK_TRANSFER';

      const normNarr = narration.toUpperCase();

      // 1. Detect Payment Method
      if (normNarr.includes('UPI') || normNarr.includes('@') || normNarr.includes('VPA')) {
        paymentMethod = 'UPI';
      } else if (normNarr.includes('NEFT')) {
        paymentMethod = 'BANK_TRANSFER';
      } else if (normNarr.includes('RTGS') || normNarr.includes('IMPS')) {
        paymentMethod = 'BANK_TRANSFER';
      } else if (normNarr.includes('CHQ') || normNarr.includes('CHEQUE') || normNarr.includes('CLEARING')) {
        paymentMethod = 'CHEQUE';
      } else if (normNarr.includes('POS') || normNarr.includes('CARD') || normNarr.includes('SWIPE')) {
        paymentMethod = 'CREDIT_CARD';
      } else if (normNarr.includes('ATM') || normNarr.includes('CASH')) {
        paymentMethod = 'CASH';
      }

      // 2. Party Name Matching from Database
      for (const party of parties) {
        const pName = party.name.toUpperCase();
        const pComp = (party.companyName || '').toUpperCase();
        
        // Exact or strong substring match
        const nameTokens = pName.split(/\s+/).filter(t => t.length >= 4 && !['LTD', 'PVT', 'LLP', 'INDIA', 'CORP', 'SHOP'].includes(t));
        const matchesToken = nameTokens.some(t => normNarr.includes(t));

        if (normNarr.includes(pName) || (pComp && normNarr.includes(pComp)) || matchesToken) {
          matchedParty = party;
          matchReason = `Matched ${party.type === 'CUSTOMER' ? 'Customer' : 'Vendor'}: ${party.name}`;
          
          if (party.type === 'CUSTOMER' && crAmount > 0) {
            entryType = 'PAYMENT_IN';
          } else if (party.type === 'VENDOR' && drAmount > 0) {
            entryType = 'PAYMENT_OUT';
          }
          break;
        }
      }

      // 3. Invoice or Bill Auto-Matching
      if (matchedParty) {
        if (entryType === 'PAYMENT_IN') {
          const unpaidInvoices = invoices.filter(
            inv => (inv.customerId === matchedParty!.id || inv.customerName.toLowerCase() === matchedParty!.name.toLowerCase()) && 
                   inv.status !== 'PAID' && inv.status !== 'CANCELLED'
          );
          // Match by amount or reference
          const exactInv = unpaidInvoices.find(inv => Math.abs(inv.amountDue - crAmount) < 1 || (referenceNo && inv.invoiceNumber.includes(referenceNo)));
          if (exactInv) {
            matchedInvoiceId = exactInv.id;
            matchedInvoiceNumber = exactInv.invoiceNumber;
            matchReason += ` (Auto-linked Invoice: ${exactInv.invoiceNumber})`;
          }
        } else if (entryType === 'PAYMENT_OUT') {
          const unpaidBills = purchaseBills.filter(
            bill => (bill.vendorId === matchedParty!.id || bill.vendorName.toLowerCase() === matchedParty!.name.toLowerCase()) &&
                    bill.status !== 'PAID'
          );
          const exactBill = unpaidBills.find(bill => Math.abs(bill.amountDue - drAmount) < 1 || (referenceNo && bill.billNumber.includes(referenceNo)));
          if (exactBill) {
            matchedBillId = exactBill.id;
            matchedBillNumber = exactBill.billNumber;
            matchReason += ` (Auto-linked Bill: ${exactBill.billNumber})`;
          }
        }
      }

      // 4. Contra / Cash Transfers
      if (normNarr.includes('ATM WDL') || normNarr.includes('ATM CASH') || normNarr.includes('CASH WDL') || normNarr.includes('SELF WDL') || normNarr.includes('CASH WITHDRAWAL')) {
        entryType = 'CONTRA_TRANSFER';
        contraAccountId = 'acc-1';
        contraAccountName = 'Cash in Hand';
        matchReason = 'Cash Withdrawal (Bank -> Cash in Hand)';
      } else if (normNarr.includes('CASH DEP') || normNarr.includes('CDM CASH') || normNarr.includes('BY CASH') || normNarr.includes('CASH DEPOSIT') || normNarr.includes('SELF DEP')) {
        entryType = 'CONTRA_TRANSFER';
        contraAccountId = 'acc-1';
        contraAccountName = 'Cash in Hand';
        matchReason = 'Cash Deposit (Cash in Hand -> Bank)';
      }

      // 5. Operating Expenses
      else if (drAmount > 0 && !matchedParty) {
        if (normNarr.includes('RENT') || normNarr.includes('LEASE') || normNarr.includes('MAINTENANCE')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Rent, Rates & Office Space';
          contraAccountId = 'acc-16';
          contraAccountName = 'Rent & Office Expenses';
          matchReason = 'Office Rent & Space Expense';
        } else if (normNarr.includes('ELECTRICITY') || normNarr.includes('POWER') || normNarr.includes('DISCOM') || normNarr.includes('BSES') || normNarr.includes('BESCOM') || normNarr.includes('TNEB') || normNarr.includes('UTILITY')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Electricity, Fuel & Utilities';
          contraAccountId = 'acc-18';
          contraAccountName = 'Utility & Electricity Expenses';
          matchReason = 'Electricity / Utility Bill';
        } else if (normNarr.includes('COURIER') || normNarr.includes('FREIGHT') || normNarr.includes('BLUE DART') || normNarr.includes('DELHIVERY') || normNarr.includes('DTDC') || normNarr.includes('FEDEX') || normNarr.includes('LOGISTICS')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Freight, Logistics & Shipping';
          contraAccountId = 'acc-17';
          contraAccountName = 'Freight & Courier';
          matchReason = 'Courier & Freight Charge';
        } else if (normNarr.includes('SALARY') || normNarr.includes('PAYROLL') || normNarr.includes('WAGES') || normNarr.includes('STIPEND')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Staff Salaries, Wages & Bonus';
          contraAccountId = 'acc-16';
          contraAccountName = 'Staff Salaries & Wages';
          matchReason = 'Staff Payroll / Salary Disbursement';
        } else if (normNarr.includes('CHG') || normNarr.includes('CHARGES') || normNarr.includes('SMS CHG') || normNarr.includes('ANNUAL FEE') || normNarr.includes('MIN BAL') || normNarr.includes('IMPS CHG')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Bank Charges & Interest Paid';
          contraAccountId = 'acc-18';
          contraAccountName = 'Bank Service Charges';
          matchReason = 'Bank Service & Maintenance Charges';
        } else if (normNarr.includes('PETROL') || normNarr.includes('DIESEL') || normNarr.includes('FUEL') || normNarr.includes('HPCL') || normNarr.includes('IOCL') || normNarr.includes('BPCL')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Freight, Logistics & Shipping';
          matchReason = 'Fuel & Vehicle Conveyance';
        } else if (normNarr.includes('ZOMATO') || normNarr.includes('SWIGGY') || normNarr.includes('FOOD') || normNarr.includes('TEA') || normNarr.includes('REFRESHMENT') || normNarr.includes('PANTRY')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Miscellaneous Operating Expenses';
          matchReason = 'Staff Tea & Office Refreshments';
        } else if (normNarr.includes('AIRTEL') || normNarr.includes('JIO') || normNarr.includes('VODAFONE') || normNarr.includes('BROADBAND') || normNarr.includes('INTERNET')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Miscellaneous Operating Expenses';
          matchReason = 'Telecom & Internet Bill';
        } else if (normNarr.includes('AWS') || normNarr.includes('GOOGLE') || normNarr.includes('MICROSOFT') || normNarr.includes('SOFTWARE') || normNarr.includes('HOSTING') || normNarr.includes('DOMAINS')) {
          entryType = 'EXPENSE';
          expenseCategory = 'Legal & Professional Fees';
          matchReason = 'Software & Cloud Subscription';
        } else {
          entryType = 'PAYMENT_OUT';
          matchReason = 'Disbursement / Vendor Payment';
        }
      }

      // 6. Direct Incomes & Journal Entries
      else if (crAmount > 0 && !matchedParty) {
        if (normNarr.includes('INT.PD') || normNarr.includes('INTEREST') || normNarr.includes('INT CREDIT') || normNarr.includes('FD INT')) {
          entryType = 'JOURNAL_ENTRY';
          contraAccountId = 'acc-14';
          contraAccountName = 'Interest Income from Bank';
          matchReason = 'Bank Interest Income Credit';
        } else if (normNarr.includes('DIVIDEND') || normNarr.includes('DIV CREDIT')) {
          entryType = 'JOURNAL_ENTRY';
          contraAccountId = 'acc-14';
          contraAccountName = 'Dividend Income';
          matchReason = 'Dividend Income Credit';
        } else if (normNarr.includes('REFUND') || normNarr.includes('IT REFUND') || normNarr.includes('GST REFUND')) {
          entryType = 'JOURNAL_ENTRY';
          contraAccountId = 'acc-9';
          contraAccountName = 'Tax / Duty Refund';
          matchReason = 'Statutory Tax Refund';
        } else if (normNarr.includes('CAPITAL') || normNarr.includes('DIRECTOR') || normNarr.includes('OWNER CAPITAL')) {
          entryType = 'JOURNAL_ENTRY';
          contraAccountId = 'acc-12';
          contraAccountName = 'Capital Account (Owner Equity)';
          matchReason = 'Capital Infusion';
        } else {
          entryType = 'PAYMENT_IN';
          matchReason = 'Customer Receipt / Income';
        }
      }

      // 7. Duplicate Checking against Existing Records
      const checkAmount = crAmount > 0 ? crAmount : drAmount;
      const isDuplicatePayment = payments.some(
        p => p.date === date && Math.abs(p.amount - checkAmount) < 0.01 && (
          (referenceNo && p.referenceNo && p.referenceNo.toLowerCase() === referenceNo.toLowerCase()) ||
          (matchedParty && p.partyId === matchedParty.id)
        )
      );

      const isDuplicateExpense = expenses.some(
        e => e.date === date && Math.abs(e.amount - checkAmount) < 0.01 && (
          (referenceNo && e.referenceNo && e.referenceNo.toLowerCase() === referenceNo.toLowerCase())
        )
      );

      if (isDuplicatePayment || isDuplicateExpense) {
        status = 'DUPLICATE';
        matchReason += ' (⚠️ Matches existing voucher in system)';
      }

      // Infer clean party name from narration if not linked
      let autoPartyName = matchedParty?.name;
      if (!autoPartyName && (entryType === 'PAYMENT_IN' || entryType === 'PAYMENT_OUT')) {
        // Clean narration to extract payee/payer
        const cleanNarr = narration
          .replace(/^(UPI|NEFT|RTGS|IMPS|CHQ|TRANSFER|POS|BY|TO)[-/ ]+/i, '')
          .replace(/\b(CR|DR|DEP|WDL|IN|OUT|REF|HDFC|ICICI|SBI|AXIS|KOTAK)\b/gi, '')
          .replace(/[0-9]{6,}/g, '') // remove phone or long numbers
          .replace(/[/@#*_-]+/g, ' ')
          .trim();
        autoPartyName = cleanNarr.length >= 3 ? cleanNarr.slice(0, 40) : (entryType === 'PAYMENT_IN' ? 'Unidentified Client' : 'General Payee');
      }

      parsedRows.push({
        id: `bs-row-${i}-${Date.now()}`,
        date,
        rawDate,
        narration,
        referenceNo,
        chequeNo: referenceNo.startsWith('CHQ') ? referenceNo : undefined,
        withdrawalAmount: drAmount,
        depositAmount: crAmount,
        closingBalance: balance,
        entryType,
        paymentMethod,
        partyId: matchedParty?.id,
        partyName: autoPartyName,
        partyType: matchedParty?.type === 'BOTH' ? (entryType === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR') : matchedParty?.type || (entryType === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR'),
        expenseCategory,
        fromAccount: entryType === 'CONTRA_TRANSFER' ? (crAmount > 0 ? 'Cash in Hand (acc-1)' : `${currentBankAccount.name} (${currentBankAccount.id})`) : undefined,
        toAccount: entryType === 'CONTRA_TRANSFER' ? (crAmount > 0 ? `${currentBankAccount.name} (${currentBankAccount.id})` : 'Cash in Hand (acc-1)') : undefined,
        contraAccountId,
        contraAccountName,
        linkedInvoiceId: matchedInvoiceId,
        linkedInvoiceNumber: matchedInvoiceNumber,
        linkedBillId: matchedBillId,
        linkedBillNumber: matchedBillNumber,
        notes: narration,
        status,
        matchReason,
        selected: status !== 'DUPLICATE' // Auto-select unless duplicate
      });
    }

    setParsedEntries(parsedRows);
    setCurrentStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      processRawCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Row update handlers in Step 2
  const handleUpdateRow = (id: string, updates: Partial<BankStatementAutoEntry>) => {
    setParsedEntries(prev => prev.map(row => {
      if (row.id === id) {
        const updated = { ...row, ...updates };
        // If party changed, update partyType and clear invalid links
        if (updates.partyId !== undefined) {
          const p = parties.find(party => party.id === updates.partyId);
          if (p) {
            updated.partyName = p.name;
            updated.partyType = p.type === 'BOTH' ? (updated.entryType === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR') : p.type;
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedEntries(prev => prev.map(r => ({ ...r, selected: select })));
  };

  // Quick Add Bank Account
  const handleCreateBankAccount = () => {
    if (!newBankName.trim()) return;

    const newHead: AccountHead = {
      id: `acc-${Date.now()}`,
      code: newBankCode || '1011',
      name: newBankName.trim(),
      category: 'ASSET',
      subCategory: 'Bank Accounts',
      openingBalance: newBankOpeningBal || 0,
      balance: newBankOpeningBal || 0,
      isSystem: false
    };

    createAccountHead(newHead);
    setSelectedBankAccountId(newHead.id);
    setShowNewBankModal(false);
    setNewBankName('');
    setNewBankOpeningBal(0);
  };

  // Final Execution
  const handleExecuteImport = () => {
    const result = importBankStatementAutoEntries(parsedEntries, selectedBankAccountId, {
      autoCreateParties,
      autoSettleInvoices,
      autoSettleBills
    });
    setImportResult(result);
    setCurrentStep(3);
  };

  // Metrics computation for preview
  const summaryMetrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let inCount = 0;
    let outCount = 0;
    let expCount = 0;
    let contraCount = 0;
    let jvCount = 0;
    let dupCount = 0;
    let selectedCount = 0;

    parsedEntries.forEach(r => {
      if (r.depositAmount > 0) totalIn += r.depositAmount;
      if (r.withdrawalAmount > 0) totalOut += r.withdrawalAmount;

      if (r.entryType === 'PAYMENT_IN') inCount++;
      else if (r.entryType === 'PAYMENT_OUT') outCount++;
      else if (r.entryType === 'EXPENSE') expCount++;
      else if (r.entryType === 'CONTRA_TRANSFER') contraCount++;
      else if (r.entryType === 'JOURNAL_ENTRY') jvCount++;

      if (r.status === 'DUPLICATE') dupCount++;
      if (r.selected && r.entryType !== 'IGNORE') selectedCount++;
    });

    return {
      totalIn,
      totalOut,
      netFlow: totalIn - totalOut,
      inCount,
      outCount,
      expCount,
      contraCount,
      jvCount,
      dupCount,
      totalRows: parsedEntries.length,
      selectedCount
    };
  }, [parsedEntries]);

  // Filtered rows for Step 2 table
  const filteredRows = useMemo(() => {
    return parsedEntries.filter(r => {
      // Type Filter
      if (filterType !== 'ALL') {
        if (filterType === 'DUPLICATES' && r.status !== 'DUPLICATE') return false;
        if (filterType === 'PAYMENT_IN' && r.entryType !== 'PAYMENT_IN') return false;
        if (filterType === 'PAYMENT_OUT' && r.entryType !== 'PAYMENT_OUT') return false;
        if (filterType === 'EXPENSE' && r.entryType !== 'EXPENSE') return false;
        if (filterType === 'CONTRA_TRANSFER' && r.entryType !== 'CONTRA_TRANSFER') return false;
        if (filterType === 'JOURNAL_ENTRY' && r.entryType !== 'JOURNAL_ENTRY') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNarr = r.narration.toLowerCase().includes(q);
        const matchParty = (r.partyName || '').toLowerCase().includes(q);
        const matchRef = (r.referenceNo || '').toLowerCase().includes(q);
        const matchAmt = (r.depositAmount > 0 ? r.depositAmount : r.withdrawalAmount).toString().includes(q);
        return matchNarr || matchParty || matchRef || matchAmt;
      }

      return true;
    });
  }, [parsedEntries, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto modal-overlay animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-[98vw] md:max-w-5xl lg:max-w-6xl my-auto flex flex-col max-h-[96dvh] sm:max-h-[92dvh] overflow-hidden">
        
        {/* =========================================================================
            MODAL HEADER & WIZARD STEP INDICATOR
           ========================================================================= */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  Bank Statement Auto Entry & Reconciliation
                </h2>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  AI Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Import CSV bank statement, auto-classify Receipts, Vendor Payments, Expenses & Contra Transfers directly into Bank Ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 1 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                <span>1. Upload Statement</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 2 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                <span>2. Review & Match ({parsedEntries.length})</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 3 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                <span>3. Complete</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            STEP 1: UPLOAD / PASTE STATEMENT & BANK ACCOUNT SELECTOR
           ========================================================================= */}
        {currentStep === 1 && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Target Bank Account Selection Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                    Target Bank Account for Ledger Auto Entry:
                  </label>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    All transactions will be posted into this bank account head in the General Ledger.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedBankAccountId}
                  onChange={e => setSelectedBankAccountId(e.target.value)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs min-w-[240px]"
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name} (Bal: {formatINR(Math.abs(acc.balance))})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowNewBankModal(true)}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 border border-indigo-200 dark:border-indigo-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Add a new Bank Account Ledger Head"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Bank</span>
                </button>
              </div>
            </div>

            {/* Input Method Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputTab('FILE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inputTab === 'FILE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bank CSV / Excel File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('PASTE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inputTab === 'PASTE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Raw Text / Statement CSV</span>
                </button>
              </div>

              {/* Sample Download Dropdown / Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Sample Templates:
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadSample(SAMPLE_2_COLUMN_CSV, 'Standard_Bank_Statement.csv')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                  title="Download standard 2-column Debit/Credit format CSV"
                >
                  <Download className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Standard 2-Col CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSample(SAMPLE_HDFC_NETBANKING_CSV, 'HDFC_Statement_Sample.csv')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                  title="Download HDFC netbanking format CSV"
                >
                  <Download className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>HDFC / ICICI CSV</span>
                </button>
              </div>
            </div>

            {/* Tab 1: File Dropzone */}
            {inputTab === 'FILE' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-10 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-850/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md shadow-indigo-600/10">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Click to Browse or Drag & Drop Bank Statement CSV
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                  Supports all Indian bank statements (HDFC, ICICI, SBI, Axis, Kotak, PNB, Standard Chartered, Bank of Baroda, IDFC, UPI CSV exports).
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <span>Supported extensions: .csv, .txt, .tsv</span>
                </div>
              </div>
            )}

            {/* Tab 2: Paste Raw Text */}
            {inputTab === 'PASTE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Paste raw lines copied from Excel, Google Sheets, or Bank Portal:
                  </span>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_2_COLUMN_CSV)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Load Demo Sample Data</span>
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Date, Narration, Ref No, Withdrawal, Deposit, Balance&#10;2026-08-15, UPI/CR/829102/Acme InfoTech, UPI-101,,84368,430168&#10;2026-08-16, NEFT-DR-Redington Wholesale, NEFT-102,125000,,305168..."
                  className="w-full p-4 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => processRawCSV(rawText)}
                    disabled={!rawText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                  >
                    <span>Parse & Classify Statement</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Smart Detection Capabilities Features Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs mb-1">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Auto Customer Receipts</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  UPI/NEFT credits auto-matched to Customer debtors, updating balances & settling unpaid sales invoices.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Auto Vendor Payments</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Debit disbursements matched to Vendor creditors, auto-settling purchase bills and outstanding payables.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Contra & Expense Rules</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  ATM withdrawals mapped to Cash in Hand; Rent, Utilities, Salaries & Bank Charges auto-categorized.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: REVIEW, VERIFICATION & CUSTOMIZATION TABLE
           ========================================================================= */}
        {currentStep === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top Summary Metric Cards */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Txns</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">{summaryMetrics.totalRows}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Money In (Cr)</span>
                <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{formatINR(summaryMetrics.totalIn)}</span>
                <span className="text-[9px] text-emerald-600 block">{summaryMetrics.inCount} Receipts</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block">Money Out (Dr)</span>
                <span className="text-sm font-extrabold text-rose-800 dark:text-rose-300">{formatINR(summaryMetrics.totalOut)}</span>
                <span className="text-[9px] text-rose-600 block">{summaryMetrics.outCount + summaryMetrics.expCount} Payments</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Contra Transfers</span>
                <span className="text-sm font-extrabold text-blue-800 dark:text-blue-300">{summaryMetrics.contraCount}</span>
                <span className="text-[9px] text-blue-600 block">Cash & ATM</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Expenses / JV</span>
                <span className="text-sm font-extrabold text-purple-800 dark:text-purple-300">{summaryMetrics.expCount + summaryMetrics.jvCount}</span>
                <span className="text-[9px] text-purple-600 block">Auto-categorized</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">To Import</span>
                <span className="text-sm font-extrabold text-indigo-800 dark:text-indigo-300">{summaryMetrics.selectedCount} / {summaryMetrics.totalRows}</span>
                <span className="text-[9px] text-indigo-600 block">Selected entries</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search narration, party, ref # or amount..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-60 sm:w-72 text-slate-900 dark:text-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'PAYMENT_IN', label: `Receipts (${summaryMetrics.inCount})` },
                    { id: 'PAYMENT_OUT', label: `Payments (${summaryMetrics.outCount})` },
                    { id: 'EXPENSE', label: `Expenses (${summaryMetrics.expCount})` },
                    { id: 'CONTRA_TRANSFER', label: `Contra (${summaryMetrics.contraCount})` },
                    { id: 'DUPLICATES', label: `Duplicates (${summaryMetrics.dupCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterType(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        filterType === tab.id
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer transition-colors"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(false)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Interactive Grid Table */}
            <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-900/30">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={parsedEntries.length > 0 && parsedEntries.every(r => r.selected)}
                        onChange={e => handleToggleSelectAll(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Narration & Ref #</th>
                    <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                    <th className="py-2.5 px-3">Auto Classification</th>
                    <th className="py-2.5 px-3">Mapped Party / Account Head</th>
                    <th className="py-2.5 px-3">Match Reason & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                  {filteredRows.map(row => {
                    const isCredit = row.depositAmount > 0;
                    return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors ${
                          !row.selected ? 'opacity-60 bg-slate-50/50 dark:bg-slate-850/50' : ''
                        } ${row.status === 'DUPLICATE' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!row.selected}
                            onChange={e => handleUpdateRow(row.id, { selected: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {row.date}
                        </td>

                        {/* Narration */}
                        <td className="py-2.5 px-3 max-w-[280px]">
                          <div className="font-semibold text-slate-900 dark:text-white truncate" title={row.narration}>
                            {row.narration}
                          </div>
                          {row.referenceNo && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              Ref: {row.referenceNo}
                            </span>
                          )}
                        </td>

                        {/* Debit */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {row.withdrawalAmount > 0 ? formatINR(row.withdrawalAmount) : '-'}
                        </td>

                        {/* Credit */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.depositAmount > 0 ? formatINR(row.depositAmount) : '-'}
                        </td>

                        {/* Auto Classification Select */}
                        <td className="py-2.5 px-3">
                          <select
                            value={row.entryType}
                            onChange={e => handleUpdateRow(row.id, { 
                              entryType: e.target.value as BankEntryClassification,
                              selected: e.target.value !== 'IGNORE'
                            })}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                              row.entryType === 'PAYMENT_IN' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' :
                              row.entryType === 'PAYMENT_OUT' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' :
                              row.entryType === 'EXPENSE' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800' :
                              row.entryType === 'CONTRA_TRANSFER' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800' :
                              row.entryType === 'JOURNAL_ENTRY' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <option value="PAYMENT_IN">Payment In (Receipt)</option>
                            <option value="PAYMENT_OUT">Payment Out (Vendor)</option>
                            <option value="EXPENSE">Expense (Operating)</option>
                            <option value="CONTRA_TRANSFER">Contra (Cash / Bank)</option>
                            <option value="JOURNAL_ENTRY">Direct Journal (JV)</option>
                            <option value="IGNORE">Ignore / Skip</option>
                          </select>
                        </td>

                        {/* Mapped Party / Account Head */}
                        <td className="py-2.5 px-3 min-w-[200px]">
                          {row.entryType === 'PAYMENT_IN' || row.entryType === 'PAYMENT_OUT' ? (
                            <div className="space-y-1">
                              <select
                                value={row.partyId || ''}
                                onChange={e => handleUpdateRow(row.id, { partyId: e.target.value })}
                                className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                              >
                                <option value="">-- Create New: {row.partyName || 'Party'} --</option>
                                {parties.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.type})
                                  </option>
                                ))}
                              </select>
                              {row.linkedInvoiceNumber && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                  Auto-settling: {row.linkedInvoiceNumber}
                                </span>
                              )}
                              {row.linkedBillNumber && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                                  Auto-settling: {row.linkedBillNumber}
                                </span>
                              )}
                            </div>
                          ) : row.entryType === 'EXPENSE' ? (
                            <select
                              value={row.expenseCategory || 'Miscellaneous Operating Expenses'}
                              onChange={e => handleUpdateRow(row.id, { expenseCategory: e.target.value })}
                              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                            >
                              <option value="Rent, Rates & Office Space">Rent, Rates & Office Space</option>
                              <option value="Electricity, Fuel & Utilities">Electricity & Utilities</option>
                              <option value="Freight, Logistics & Shipping">Freight & Courier</option>
                              <option value="Staff Salaries, Wages & Bonus">Staff Salaries & Wages</option>
                              <option value="Bank Charges & Interest Paid">Bank Charges & Fees</option>
                              <option value="Printing, Stationery & Postage">Printing & Stationery</option>
                              <option value="Legal & Professional Fees">Legal & Software Fees</option>
                              <option value="Miscellaneous Operating Expenses">Miscellaneous Operating</option>
                            </select>
                          ) : row.entryType === 'CONTRA_TRANSFER' ? (
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              {isCredit ? `From: Cash in Hand (acc-1)` : `To: Cash in Hand (acc-1)`}
                            </div>
                          ) : row.entryType === 'JOURNAL_ENTRY' ? (
                            <select
                              value={row.contraAccountId || (isCredit ? 'acc-14' : 'acc-18')}
                              onChange={e => handleUpdateRow(row.id, { contraAccountId: e.target.value })}
                              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                            >
                              {accountHeads.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name} ({acc.category})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Skipped</span>
                          )}
                        </td>

                        {/* Reason / Status */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {row.status === 'DUPLICATE' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Duplicate</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {row.matchReason}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                        No transactions matching the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Config Toggles & Action Bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateParties}
                    onChange={e => setAutoCreateParties(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Auto-create new Customers / Vendors</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSettleInvoices}
                    onChange={e => setAutoSettleInvoices(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Auto-settle matching Invoices</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSettleBills}
                    onChange={e => setAutoSettleBills(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Auto-settle matching Purchase Bills</span>
                </label>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl cursor-pointer transition-colors"
                >
                  &larr; Back to Upload
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={summaryMetrics.selectedCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
                >
                  <span>Post {summaryMetrics.selectedCount} Entries to Bank Ledger</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: IMPORT SUCCESS SUMMARY & RECONCILIATION COMPLETE
           ========================================================================= */}
        {currentStep === 3 && importResult && (
          <div className="p-8 overflow-y-auto space-y-6 flex-1 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Bank Statement Auto Entry Successfully Posted!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                All selected bank transactions have been categorized, ledger accounts adjusted, and payment vouchers created.
              </p>
            </div>

            {/* Breakdown Result Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Imported</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{importResult.importedCount} Entries</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Payment Receipts</span>
                <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">{importResult.paymentsInCreated}</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block">Vendor Payments</span>
                <span className="text-xl font-extrabold text-rose-800 dark:text-rose-300">{importResult.paymentsOutCreated}</span>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Expenses Logged</span>
                <span className="text-xl font-extrabold text-purple-800 dark:text-purple-300">{importResult.expensesCreated}</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Contra Transfers</span>
                <span className="text-xl font-extrabold text-blue-800 dark:text-blue-300">{importResult.contraCreated}</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Parties Created</span>
                <span className="text-xl font-extrabold text-amber-800 dark:text-amber-300">{importResult.partiesCreated}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setParsedEntries([]);
                  setRawText('');
                  setFileName('');
                }}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl cursor-pointer transition-colors"
              >
                Import Another Statement
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 cursor-pointer transition-all"
              >
                Done & View Bank Account Ledger
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Bank Account Modal */}
      {showNewBankModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-2xs overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-2xl max-w-[96vw] sm:max-w-md w-full space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600" />
                <span>Create Bank Account Ledger Head</span>
              </h4>
              <button onClick={() => setShowNewBankModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bank Name & Branch:</label>
                <input
                  type="text"
                  placeholder="e.g. ICICI Current Bank Account - Connaught Place"
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Account Code:</label>
                  <input
                    type="text"
                    value={newBankCode}
                    onChange={e => setNewBankCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Opening Balance (₹):</label>
                  <input
                    type="number"
                    value={newBankOpeningBal}
                    onChange={e => setNewBankOpeningBal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowNewBankModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBankAccount}
                disabled={!newBankName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow cursor-pointer disabled:opacity-50"
              >
                Create Account Head
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
