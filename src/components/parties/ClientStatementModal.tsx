import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Party, Invoice, PurchaseBill, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, normalizeSignatureUrl } from '../../utils/formatters';
import { buildUpiPaymentUri, cleanUpiId } from '../../utils/upi';
import { QrCodeSvg } from '../common/QrCodeSvg';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  FileText, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Share2, 
  Copy, 
  Calendar, 
  Check, 
  X, 
  Search, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Building2, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface ClientStatementModalProps {
  partyId?: string;
  onClose: () => void;
  onSelectInvoiceForPrint?: (invoiceId: string) => void;
}

export type DateRangePreset = 
  | 'THIS_MONTH' 
  | 'LAST_MONTH' 
  | 'THIS_QUARTER' 
  | 'CURRENT_FY' 
  | 'PREVIOUS_FY' 
  | 'LAST_30_DAYS' 
  | 'LAST_90_DAYS' 
  | 'ALL_TIME' 
  | 'CUSTOM';

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'PURCHASE' | 'VENDOR_PAYMENT' | 'OPENING_BALANCE' | 'CREDIT_NOTE';
  typeName: string;
  docNo: string;
  refInvoiceId?: string;
  description: string;
  debit: number;   // Invoiced to customer / money they owe
  credit: number;  // Paid by customer / money they settled
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
  status?: string;
}

export const ClientStatementModal: React.FC<ClientStatementModalProps> = ({
  partyId,
  onClose,
  onSelectInvoiceForPrint
}) => {
  const { 
    parties, 
    invoices, 
    purchaseBills, 
    business, 
    recordInvoicePayment, 
    showToast 
  } = useApp();

  // Selected party state
  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    partyId || parties[0]?.id || ''
  );

  // Date range presets calculation
  const getDatePresetRange = (preset: DateRangePreset): { start: string; end: string } => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    switch (preset) {
      case 'THIS_MONTH': {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0);
        return { start: formatYMD(start), end: formatYMD(end) };
      }
      case 'LAST_MONTH': {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0);
        return { start: formatYMD(start), end: formatYMD(end) };
      }
      case 'THIS_QUARTER': {
        const quarterMonth = Math.floor(currentMonth / 3) * 3;
        const start = new Date(currentYear, quarterMonth, 1);
        const end = new Date(currentYear, quarterMonth + 3, 0);
        return { start: formatYMD(start), end: formatYMD(end) };
      }
      case 'CURRENT_FY': {
        // Indian Financial Year: April 1 to March 31
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const start = new Date(fyStartYear, 3, 1); // April 1
        const end = new Date(fyStartYear + 1, 2, 31); // March 31
        return { start: formatYMD(start), end: formatYMD(end) };
      }
      case 'PREVIOUS_FY': {
        const fyStartYear = (currentMonth >= 3 ? currentYear : currentYear - 1) - 1;
        const start = new Date(fyStartYear, 3, 1);
        const end = new Date(fyStartYear + 1, 2, 31);
        return { start: formatYMD(start), end: formatYMD(end) };
      }
      case 'LAST_30_DAYS': {
        const start = new Date(today.getTime() - 30 * 86400000);
        return { start: formatYMD(start), end: formatYMD(today) };
      }
      case 'LAST_90_DAYS': {
        const start = new Date(today.getTime() - 90 * 86400000);
        return { start: formatYMD(start), end: formatYMD(today) };
      }
      case 'ALL_TIME': {
        return { start: '2020-01-01', end: formatYMD(today) };
      }
      case 'CUSTOM':
      default: {
        const start = new Date(currentYear, currentMonth, 1);
        return { start: formatYMD(start), end: formatYMD(today) };
      }
    }
  };

  const [datePreset, setDatePreset] = useState<DateRangePreset>('CURRENT_FY');
  const initialRange = getDatePresetRange('CURRENT_FY');
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const [viewMode, setViewMode] = useState<'INTERACTIVE' | 'PRINT_PREVIEW'>('INTERACTIVE');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Quick Payment Modal inside Statement
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<string>('');

  const statementRef = useRef<HTMLDivElement>(null);

  const currentParty = parties.find(p => p.id === selectedPartyId) || parties[0];

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== 'CUSTOM') {
      const range = getDatePresetRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  // Compile all chronological transactions for the selected party
  const {
    openingBalance,
    entries,
    totalDebits,
    totalCredits,
    closingBalance,
    unpaidInvoices
  } = useMemo(() => {
    if (!currentParty) {
      return {
        openingBalance: 0,
        entries: [],
        totalDebits: 0,
        totalCredits: 0,
        closingBalance: 0,
        unpaidInvoices: []
      };
    }

    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();

    // 1. Collect all raw events across all time
    interface RawEvent {
      id: string;
      date: string;
      timestamp: number;
      type: 'INVOICE' | 'PAYMENT' | 'PURCHASE' | 'VENDOR_PAYMENT' | 'CREDIT_NOTE';
      typeName: string;
      docNo: string;
      refInvoiceId?: string;
      description: string;
      debit: number;
      credit: number;
      status?: string;
    }

    const allEvents: RawEvent[] = [];

    // Party Invoices (as customer including POS sales)
    invoices.filter(inv => 
      inv.customerId === currentParty.id || 
      (currentParty.phone && inv.customerPhone && currentParty.phone.replace(/[^0-9]/g, '').slice(-10) === inv.customerPhone.replace(/[^0-9]/g, '').slice(-10))
    ).forEach(inv => {
      const isPos = inv.invoiceType === 'POS_SALE';
      // Invoiced amount (Debit)
      allEvents.push({
        id: 'inv-' + inv.id,
        date: inv.invoiceDate,
        timestamp: new Date(inv.invoiceDate + 'T10:00:00').getTime(),
        type: 'INVOICE',
        typeName: isPos ? 'POS Quick Sale' : inv.invoiceType.replace(/_/g, ' '),
        docNo: inv.invoiceNumber,
        refInvoiceId: inv.id,
        description: isPos 
          ? `POS Counter Sale (${inv.items.length} items)`
          : `Tax Invoice (${inv.items.length} items) - Due ${formatDate(inv.dueDate)}`,
        debit: inv.grandTotal,
        credit: 0,
        status: inv.status
      });

      // Payments recorded against this invoice
      if (inv.amountPaid > 0) {
        allEvents.push({
          id: 'pay-' + inv.id,
          date: inv.invoiceDate, // or payment date if recorded
          timestamp: new Date(inv.invoiceDate + 'T15:00:00').getTime(),
          type: 'PAYMENT',
          typeName: isPos ? 'POS Cash/UPI Tender' : 'Payment Receipt',
          docNo: `RCPT-${inv.invoiceNumber}`,
          refInvoiceId: inv.id,
          description: `Payment received via ${inv.paymentMethod || 'Cash/UPI'} against ${inv.invoiceNumber}`,
          debit: 0,
          credit: inv.amountPaid,
          status: 'SETTLED'
        });
      }
    });

    // Party Purchase Bills (if vendor / both)
    purchaseBills.filter(bill => bill.vendorId === currentParty.id).forEach(bill => {
      allEvents.push({
        id: 'pb-' + bill.id,
        date: bill.billDate,
        timestamp: new Date(bill.billDate + 'T11:00:00').getTime(),
        type: 'PURCHASE',
        typeName: 'Inward Purchase Bill',
        docNo: bill.billNumber,
        description: `Purchase Bill (Ref: ${bill.vendorInvoiceNumber})`,
        debit: 0,
        credit: bill.grandTotal,
        status: bill.status
      });

      if (bill.amountPaid > 0) {
        allEvents.push({
          id: 'vpay-' + bill.id,
          date: bill.billDate,
          timestamp: new Date(bill.billDate + 'T16:00:00').getTime(),
          type: 'VENDOR_PAYMENT',
          typeName: 'Supplier Payment',
          docNo: `PMT-${bill.billNumber}`,
          description: `Disbursement to vendor against ${bill.billNumber}`,
          debit: bill.amountPaid,
          credit: 0,
          status: 'PAID'
        });
      }
    });

    // Sort all events chronologically
    allEvents.sort((a, b) => a.timestamp - b.timestamp);

    // 2. Compute Opening Balance (initial party balance + sum of events before startDate)
    let calculatedOpening = currentParty.openingBalance || 0;
    allEvents.forEach(evt => {
      if (evt.timestamp < startTimestamp) {
        calculatedOpening += (evt.debit - evt.credit);
      }
    });

    // 3. Filter events inside the selected date range & compute running balance
    let running = calculatedOpening;
    let periodDebits = 0;
    let periodCredits = 0;

    const ledgerEntries: LedgerEntry[] = [];

    allEvents.forEach(evt => {
      if (evt.timestamp >= startTimestamp && evt.timestamp <= endTimestamp) {
        running += (evt.debit - evt.credit);
        periodDebits += evt.debit;
        periodCredits += evt.credit;

        ledgerEntries.push({
          id: evt.id,
          date: evt.date,
          type: evt.type,
          typeName: evt.typeName,
          docNo: evt.docNo,
          refInvoiceId: evt.refInvoiceId,
          description: evt.description,
          debit: evt.debit,
          credit: evt.credit,
          runningBalance: Math.abs(running),
          balanceType: running >= 0 ? 'Dr' : 'Cr',
          status: evt.status
        });
      }
    });

    // Unpaid invoices for quick payment recording
    const partyUnpaid = invoices.filter(
      inv => inv.customerId === currentParty.id && inv.amountDue > 0 && inv.status !== 'CANCELLED'
    );

    return {
      openingBalance: calculatedOpening,
      entries: ledgerEntries,
      totalDebits: periodDebits,
      totalCredits: periodCredits,
      closingBalance: running,
      unpaidInvoices: partyUnpaid
    };
  }, [currentParty, startDate, endDate, invoices, purchaseBills]);

  // Export to PDF
  const handleDownloadPdf = async () => {
    const element = statementRef.current || document.getElementById('client-statement-printable');
    if (!element || !currentParty) {
      showToast('error', 'Error', 'Statement document is not ready.');
      return;
    }
    setIsGeneratingPdf(true);

    try {
      showToast('info', 'Rendering PDF', 'Generating high-resolution client account statement...');

      const canvas = await html2canvas(element, {
        scale: 3, // 300+ DPI
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794 // Standard A4 width in px (96 DPI)
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const a4Width = 210;
      const a4Height = 297;
      const margin = 6;
      const printableWidth = a4Width - (margin * 2);
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      if (imgHeight <= (a4Height - margin * 2)) {
        // Fits in single page
        pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, imgHeight, undefined, 'FAST');
      } else {
        // Multi-page slicing
        let heightLeft = imgHeight;
        let position = margin;
        const pagePrintableHeight = a4Height - (margin * 2);

        pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pagePrintableHeight;

        while (heightLeft > 0) {
          position = -(pagePrintableHeight * (pdf.getNumberOfPages())) + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pagePrintableHeight;
        }
      }

      const sanitizedName = currentParty.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      pdf.save(`Statement_${sanitizedName}_${startDate}_to_${endDate}.pdf`);
      showToast('success', 'PDF Downloaded', 'Statement saved successfully.');
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      showToast('error', 'PDF Export Failed', err.message || 'Unable to generate PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dedicated A4 Statement Printing (Isolated iframe guarantees only the statement page prints)
  const handlePrint = () => {
    if (!currentParty) return;

    try {
      showToast('info', 'Opening Print Dialog', 'Preparing statement document for printing...');

      const oldFrame = document.getElementById('print-statement-iframe');
      if (oldFrame) oldFrame.remove();

      const printIframe = document.createElement('iframe');
      printIframe.id = 'print-statement-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = '0';
      printIframe.style.visibility = 'hidden';
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      const statementEl = statementRef.current || document.getElementById('client-statement-printable');

      if (iframeDoc && statementEl) {
        // Capture application stylesheet references so formatting matches exactly
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => el.outerHTML)
          .join('\n');

        const statementHtml = statementEl.outerHTML;

        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Statement - ${currentParty.name} (${formatDate(startDate)} to ${formatDate(endDate)})</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              ${styles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 8mm 8mm;
                }
                html, body {
                  background: #ffffff !important;
                  color: #0f172a !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .a4-sheet, .statement-sheet {
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  min-height: auto !important;
                }
                table {
                  page-break-inside: auto;
                  width: 100% !important;
                }
                tr, .avoid-break {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                thead {
                  display: table-header-group;
                }
                tfoot {
                  display: table-footer-group;
                }
              </style>
            </head>
            <body>
              ${statementHtml}
            </body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (e) {
            console.error('Print iframe error, falling back to window.print:', e);
            window.print();
          }
        }, 350);
        return;
      }
    } catch (err) {
      console.error('Print iframe failed:', err);
    }

    // Fallback: trigger browser print
    window.print();
  };

  // Export to CSV / Excel
  const handleExportCsv = () => {
    if (!currentParty) return;

    const headers = [
      'Date',
      'Transaction Type',
      'Document Number',
      'Description',
      'Debit (Dr)',
      'Credit (Cr)',
      'Running Balance',
      'Dr/Cr'
    ];

    const rows = [
      // Statement Metadata Header
      [`Client Account Statement: ${currentParty.name}`],
      [`Company: ${currentParty.companyName || 'N/A'}`],
      [`GSTIN: ${currentParty.gstin || 'Unregistered'}`],
      [`Statement Period: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      [`Opening Balance as on ${formatDate(startDate)}`, '', '', '', '', '', Math.abs(openingBalance).toFixed(2), openingBalance >= 0 ? 'Dr' : 'Cr'],
      headers,
      ...entries.map(e => [
        formatDate(e.date),
        e.typeName,
        e.docNo,
        `"${e.description.replace(/"/g, '""')}"`,
        e.debit ? e.debit.toFixed(2) : '0.00',
        e.credit ? e.credit.toFixed(2) : '0.00',
        e.runningBalance.toFixed(2),
        e.balanceType
      ]),
      [],
      ['Total Period Debits', '', '', '', totalDebits.toFixed(2), '', '', ''],
      ['Total Period Credits', '', '', '', '', totalCredits.toFixed(2), '', ''],
      [`Closing Balance as on ${formatDate(endDate)}`, '', '', '', '', '', Math.abs(closingBalance).toFixed(2), closingBalance >= 0 ? 'Dr (Receivable)' : 'Cr (Payable)']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const sanitizedName = currentParty.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    link.setAttribute('download', `Statement_${sanitizedName}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'CSV Exported', 'Account statement spreadsheet downloaded.');
  };

  // WhatsApp Share Statement
  const handleShareWhatsApp = () => {
    if (!currentParty) return;

    const isDebtor = closingBalance > 0;
    const msg = 
`*STATEMENT OF ACCOUNT*
From: *${business.tradeName || business.name}*
To: *${currentParty.name}* ${currentParty.companyName ? `(${currentParty.companyName})` : ''}
Period: ${formatDate(startDate)} to ${formatDate(endDate)}

*Summary:*
• Opening Balance: ${formatCurrency(Math.abs(openingBalance), business.currencySymbol)} (${openingBalance >= 0 ? 'Dr' : 'Cr'})
• Invoiced / Debits: ${formatCurrency(totalDebits, business.currencySymbol)}
• Payments / Credits: ${formatCurrency(totalCredits, business.currencySymbol)}
• *Net Outstanding Balance: ${formatCurrency(Math.abs(closingBalance), business.currencySymbol)} ${isDebtor ? '(To Pay)' : '(Credit Balance)'}*

${isDebtor ? `*Payment Remittance Details:*
• UPI ID: ${business.upiId || 'N/A'}
• Bank: ${business.bankName || 'N/A'}
• A/C No: ${business.accountNumber || 'N/A'}
• IFSC: ${business.ifscCode || 'N/A'}` : ''}

_Please contact us if you need any clarification._`;

    const phoneNum = (currentParty.phone || '').replace(/[^0-9]/g, '');
    const url = phoneNum 
      ? `https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    if (!currentParty) return;

    const summaryText = 
`STATEMENT OF ACCOUNT
Client: ${currentParty.name} ${currentParty.companyName ? `(${currentParty.companyName})` : ''}
GSTIN: ${currentParty.gstin || 'Unregistered'}
Period: ${formatDate(startDate)} to ${formatDate(endDate)}
Opening Balance: ${formatCurrency(Math.abs(openingBalance), business.currencySymbol)} (${openingBalance >= 0 ? 'Dr' : 'Cr'})
Total Debits: ${formatCurrency(totalDebits, business.currencySymbol)}
Total Credits: ${formatCurrency(totalCredits, business.currencySymbol)}
Closing Balance: ${formatCurrency(Math.abs(closingBalance), business.currencySymbol)} (${closingBalance >= 0 ? 'Dr' : 'Cr'})
Transactions: ${entries.length} records`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    showToast('info', 'Copied to Clipboard', 'Account summary copied.');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Handle Quick Payment
  const handleOpenPayment = (invId?: string) => {
    if (invId) {
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
        setSelectedInvoiceForPayment(inv.id);
        setPaymentAmount(inv.amountDue);
      }
    } else if (unpaidInvoices.length > 0) {
      setSelectedInvoiceForPayment(unpaidInvoices[0].id);
      setPaymentAmount(unpaidInvoices[0].amountDue);
    } else {
      setSelectedInvoiceForPayment('');
      setPaymentAmount(Math.max(0, closingBalance));
    }
    setIsRecordPaymentOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }

    if (!selectedInvoiceForPayment) {
      showToast('error', 'Select Invoice', 'Please select an invoice to record payment against.');
      return;
    }

    recordInvoicePayment(selectedInvoiceForPayment, paymentAmount, paymentMethod, paymentNotes);
    setIsRecordPaymentOpen(false);
  };

  if (!currentParty) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto modal-overlay">
        <div className="bg-white p-6 rounded-2xl max-w-[96vw] sm:max-w-sm w-full text-center my-auto shadow-2xl">
          <p className="text-sm text-slate-600">No parties found in the system.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs rounded-xl font-semibold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Pure printable statement document content
  const renderStatementDocumentContent = () => (
    <>
      <div>
        {/* Business Header */}
        <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                {business.tradeName ? business.tradeName.charAt(0) : 'E'}
              </div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                {business.tradeName || business.name}
              </h1>
            </div>
            <p className="text-[11px] text-slate-600 max-w-sm leading-relaxed">
              {business.address}, {business.city}, {business.state} - {business.pincode}
            </p>
            <div className="flex flex-wrap gap-x-3 text-[10px] font-mono text-slate-600 pt-0.5">
              <span>GSTIN: <strong>{business.gstin}</strong></span>
              <span>PAN: <strong>{business.pan}</strong></span>
              <span>Phone: <strong>{business.phone}</strong></span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs tracking-wider uppercase rounded">
              Statement of Account
            </span>
            <div className="text-[11px] font-semibold text-slate-700 pt-1">
              Statement Period:
            </div>
            <div className="text-xs font-bold font-mono text-indigo-900">
              {formatDate(startDate)} to {formatDate(endDate)}
            </div>
            <div className="text-[10px] text-slate-500">
              Generated on: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Client & Account Details Card */}
        <div className="grid grid-cols-2 gap-4 my-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Account / Client Information
            </span>
            <div className="text-sm font-extrabold text-slate-900">
              {currentParty.name}
            </div>
            {currentParty.companyName && (
              <div className="text-xs font-semibold text-slate-700">
                {currentParty.companyName}
              </div>
            )}
            <div className="text-[11px] text-slate-600 leading-snug">
              {currentParty.billingAddress}, {currentParty.city}, {currentParty.state} - {currentParty.pincode}
            </div>
            <div className="text-[10px] font-mono text-slate-600 pt-1 space-y-0.5">
              <div>GSTIN: <strong>{currentParty.gstin || 'Unregistered (URP)'}</strong></div>
              <div>Phone: <strong>{currentParty.phone}</strong></div>
              {currentParty.email && <div>Email: <strong>{currentParty.email}</strong></div>}
            </div>
          </div>

          <div className="space-y-2 border-l border-slate-200 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Account Balance Summary
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Opening Balance:</span>
                <div className="font-bold font-mono">
                  {formatCurrency(Math.abs(openingBalance), business.currencySymbol)} {openingBalance >= 0 ? 'Dr' : 'Cr'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Period Debits (Sales):</span>
                <div className="font-bold font-mono text-indigo-900">
                  {formatCurrency(totalDebits, business.currencySymbol)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Period Credits (Paid):</span>
                <div className="font-bold font-mono text-emerald-800">
                  {formatCurrency(totalCredits, business.currencySymbol)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Net Period Change:</span>
                <div className="font-bold font-mono">
                  {formatCurrency(Math.abs(totalDebits - totalCredits), business.currencySymbol)}
                </div>
              </div>
            </div>

            <div className="p-2 bg-slate-900 text-white rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Closing Balance:</span>
              <span className="text-sm font-extrabold font-mono text-amber-300">
                {formatCurrency(Math.abs(closingBalance), business.currencySymbol)}
                <span className="text-[11px] ml-1 text-white font-sans">
                  {closingBalance > 0 ? '(Dr - Due)' : closingBalance < 0 ? '(Cr - Advance)' : '(Nil)'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Ref / Doc No</th>
                <th className="py-2 px-3">Transaction Description</th>
                <th className="py-2 px-3 text-right">Debit (₹)</th>
                <th className="py-2 px-3 text-right">Credit (₹)</th>
                <th className="py-2 px-3 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Opening Balance */}
              <tr className="bg-slate-50 font-semibold">
                <td className="py-2 px-3 font-mono">{formatDate(startDate)}</td>
                <td className="py-2 px-3 font-mono text-slate-500">OB-{startDate.replace(/-/g, '')}</td>
                <td className="py-2 px-3 italic">Opening Balance Brought Forward</td>
                <td className="py-2 px-3 text-right font-mono">
                  {openingBalance > 0 ? formatCurrency(openingBalance, '') : '-'}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {openingBalance < 0 ? formatCurrency(Math.abs(openingBalance), '') : '-'}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold">
                  {formatCurrency(Math.abs(openingBalance), '')} {openingBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>

              {/* Transactions */}
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono">{formatDate(entry.date)}</td>
                  <td className="py-2 px-3 font-mono font-bold">{entry.docNo}</td>
                  <td className="py-2 px-3">{entry.description}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">
                    {entry.debit > 0 ? formatCurrency(entry.debit, '') : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">
                    {entry.credit > 0 ? formatCurrency(entry.credit, '') : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold">
                    {formatCurrency(entry.runningBalance, '')} {entry.balanceType}
                  </td>
                </tr>
              ))}

              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    No transaction records in this statement period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 uppercase text-[10px] text-slate-800">
                  Total Period Debits & Credits
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totalDebits, '')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totalCredits, '')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-xs">
                  {formatCurrency(Math.abs(closingBalance), '')} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer Section: Remittance, Notes & Signatory */}
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Bank Remittance Details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-600 block">
              Bank Remittance Details:
            </span>
            <div className="font-mono space-y-0.5 text-slate-700">
              <div>Account Name: <strong>{business.name}</strong></div>
              <div>Bank Name: <strong>{business.bankName || 'HDFC Bank Ltd'}</strong></div>
              <div>A/C Number: <strong>{business.accountNumber || '50200012345678'}</strong></div>
              <div>IFSC Code: <strong>{business.ifscCode || 'HDFC0000240'}</strong></div>
              <div>UPI ID: <strong>{business.upiId || 'acme@okaxis'}</strong></div>
            </div>
          </div>

          {/* QR Code & Confirmation Note */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {business.upiId && (
              <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-200 flex flex-col items-center">
                <QrCodeSvg 
                  value={buildUpiPaymentUri({
                    upiId: business.upiId,
                    payeeName: business.tradeName || business.name,
                    amount: closingBalance > 0 ? closingBalance : undefined,
                    note: `Statement Settlement ${currentParty.name}`,
                  })}
                  size={64}
                />
              </div>
            )}
            <div className="text-[10px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Statement Confirmation:</span>
              <p className="leading-snug">
                Please verify this statement and notify us within 7 days in case of any discrepancy. Payments can be transferred directly via UPI or NEFT/RTGS.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end pt-2">
          <div className="text-[9px] text-slate-400">
            This is a computer-generated account statement. Page 1 of 1.
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="text-[10px] font-bold text-slate-800">
              For {business.tradeName || business.name}
            </div>
            {business.showSignatureOnInvoice !== false ? (
              <div className="my-1 flex items-center justify-center">
                <img
                  src={normalizeSignatureUrl(business.signatureUrl)}
                  alt="Authorized Signature"
                  className="h-10 max-w-[140px] object-contain"
                />
              </div>
            ) : (
              <div className="h-8" />
            )}
            <div className="border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-900 px-6 min-w-[140px]">
              {business.signatoryName || 'Authorized Signatory'}
            </div>
            {business.signatoryDesignation && (
              <div className="text-[8px] text-slate-500">
                {business.signatoryDesignation}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div id="client-statement-container" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:backdrop-blur-none">
      <div className="w-full max-w-[98vw] md:max-w-4xl lg:max-w-5xl bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[96dvh] sm:max-h-[96vh] overflow-hidden my-auto print:border-none print:shadow-none print:w-full print:max-w-full print:h-auto print:max-h-none print:bg-white print:rounded-none print:overflow-visible print:m-0 print:p-0">
        
        {/* Top App Header & Controls */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Client Account Statement</h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-100 text-indigo-800">
                  LEDGER
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Detailed transaction history, running balance & outstanding receivables
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('INTERACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'INTERACTIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Interactive
              </button>
              <button
                onClick={() => setViewMode('PRINT_PREVIEW')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'PRINT_PREVIEW' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Document
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Export as Excel / CSV Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel/CSV</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Download formatted A4 PDF Statement"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Client Selector & Date Range Presets */}
        <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          {/* Party Selector */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="font-semibold text-slate-600 shrink-0">Client:</span>
            <div className="relative w-full">
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.companyName ? `(${p.companyName})` : ''} — {formatCurrency(Math.abs(p.currentBalance), business.currencySymbol)} {p.currentBalance > 0 ? 'Dr' : p.currentBalance < 0 ? 'Cr' : 'Nil'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Filter Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none"
              >
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="THIS_QUARTER">This Quarter</option>
                <option value="CURRENT_FY">Current FY (2026-27)</option>
                <option value="PREVIOUS_FY">Previous FY (2025-26)</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="LAST_90_DAYS">Last 90 Days</option>
                <option value="ALL_TIME">All Time</option>
                <option value="CUSTOM">Custom Range...</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Modal Body: Interactive Dashboard or A4 Document View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:m-0 print:overflow-visible print:block">
          {viewMode === 'INTERACTIVE' ? (
            <>
              {/* Interactive Ledger Dashboard */}
              <div className="space-y-5 max-w-4xl mx-auto print:hidden">
              {/* Client Profile & Balance Banner */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{currentParty.name}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700">
                      {currentParty.type}
                    </span>
                  </div>
                  {currentParty.companyName && (
                    <p className="text-xs font-semibold text-slate-600">{currentParty.companyName}</p>
                  )}
                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-500 pt-1 font-mono">
                    <span>GSTIN: <strong>{currentParty.gstin || 'Unregistered (URP)'}</strong></span>
                    <span>State: <strong>{currentParty.state} ({currentParty.stateCode})</strong></span>
                    <span>Phone: <strong>{currentParty.phone}</strong></span>
                    {currentParty.email && <span>Email: <strong>{currentParty.email}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp Share</span>
                  </button>

                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                  </button>

                  {closingBalance > 0 && (
                    <button
                      onClick={() => handleOpenPayment()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Opening Balance</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-slate-800 mt-1">
                    {formatCurrency(Math.abs(openingBalance), business.currencySymbol)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    As on {formatDate(startDate)} ({openingBalance >= 0 ? 'Dr' : 'Cr'})
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">Invoiced (Debits)</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-indigo-700 mt-1">
                    +{formatCurrency(totalDebits, business.currencySymbol)}
                  </div>
                  <span className="text-[10px] text-slate-400">Period sales/billings</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Received (Credits)</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-1">
                    -{formatCurrency(totalCredits, business.currencySymbol)}
                  </div>
                  <span className="text-[10px] text-slate-400">Payments & settlements</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">Closing Balance</span>
                  <div className={`text-base sm:text-lg font-bold font-mono mt-1 ${
                    closingBalance > 0 ? 'text-amber-400' : closingBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {formatCurrency(Math.abs(closingBalance), business.currencySymbol)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {closingBalance > 0 ? 'To Collect (Dr)' : closingBalance < 0 ? 'Excess/Payable (Cr)' : 'Fully Settled'}
                  </span>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Statement Ledger</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-200 text-slate-700 rounded-md font-semibold">
                      {entries.length} Entries
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatDate(startDate)} → {formatDate(endDate)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Voucher / Doc No</th>
                        <th className="py-2.5 px-3">Transaction Details</th>
                        <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                        <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                        <th className="py-2.5 px-3 text-right">Running Balance</th>
                        <th className="py-2.5 px-2 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/60 font-semibold text-slate-700">
                        <td className="py-2.5 px-3 font-mono text-[11px]">{formatDate(startDate)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">OB-{startDate.replace(/-/g, '')}</td>
                        <td className="py-2.5 px-3 italic text-slate-600">
                          Opening Balance Brought Forward
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {openingBalance > 0 ? formatCurrency(openingBalance, business.currencySymbol) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {openingBalance < 0 ? formatCurrency(Math.abs(openingBalance), business.currencySymbol) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(Math.abs(openingBalance), business.currencySymbol)}
                          <span className="text-[10px] ml-1 text-slate-500 font-sans">{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                        </td>
                        <td className="py-2.5 px-2"></td>
                      </tr>

                      {/* Entries Rows */}
                      {entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] font-medium text-slate-800">
                            {formatDate(entry.date)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 font-mono">{entry.docNo}</div>
                            <span className="text-[10px] text-slate-500 font-sans">{entry.typeName}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-slate-700 font-medium">{entry.description}</div>
                            {entry.status && (
                              <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                entry.status === 'PAID' || entry.status === 'SETTLED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : entry.status === 'UNPAID'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {entry.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                            {entry.debit > 0 ? formatCurrency(entry.debit, business.currencySymbol) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {entry.credit > 0 ? formatCurrency(entry.credit, business.currencySymbol) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(entry.runningBalance, business.currencySymbol)}
                            <span className={`text-[10px] ml-1 font-sans ${entry.balanceType === 'Dr' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                              {entry.balanceType}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {entry.refInvoiceId && onSelectInvoiceForPrint && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onSelectInvoiceForPrint(entry.refInvoiceId!);
                                }}
                                title="View / Print Tax Invoice"
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            No ledger transactions recorded in this date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs">
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-slate-800 uppercase font-extrabold">
                          Period Totals & Closing Balance ({formatDate(endDate)})
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-indigo-700">
                          {formatCurrency(totalDebits, business.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700">
                          {formatCurrency(totalCredits, business.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900 font-extrabold text-sm">
                          {formatCurrency(Math.abs(closingBalance), business.currencySymbol)}
                          <span className="text-xs ml-1 font-sans text-slate-600">
                            {closingBalance >= 0 ? 'Dr' : 'Cr'}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

              {/* Offscreen A4 Document Sheet: Mounted for instant PDF export & direct browser print */}
              <div 
                className="absolute left-[-9999px] top-0 opacity-0 pointer-events-none print:static print:left-0 print:opacity-100 print:pointer-events-auto print:block print:w-full print:m-0 print:p-0"
                aria-hidden="true"
              >
                <div 
                  id="client-statement-printable"
                  ref={statementRef}
                  className="a4-sheet statement-sheet bg-white text-slate-900 p-8 sm:p-10 w-[794px] min-h-[1123px] text-xs flex flex-col justify-between print:shadow-none print:p-0 print:border-none print:w-full print:min-h-0 print:m-0"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {renderStatementDocumentContent()}
                </div>
              </div>
            </>
          ) : (
            /* A4 Document Printable Canvas Preview */
            <div className="flex justify-center bg-slate-200/70 p-4 sm:p-6 rounded-2xl overflow-x-auto print:bg-white print:p-0 print:overflow-visible print:block">
              <div 
                id="client-statement-printable"
                ref={statementRef}
                className="a4-sheet statement-sheet bg-white text-slate-900 shadow-xl rounded-sm p-8 sm:p-10 w-[794px] min-h-[1123px] text-xs flex flex-col justify-between print:shadow-none print:p-0 print:border-none print:w-full print:min-h-0 print:m-0"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {renderStatementDocumentContent()}
              </div>
            </div>
          )}
        </div>

        {/* Quick Payment Modal */}
        {isRecordPaymentOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay print:hidden">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-5 max-w-[96vw] sm:max-w-md w-full max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll text-xs space-y-3 my-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
                <h4 className="font-bold text-slate-900 text-sm">Record Client Payment</h4>
                <button onClick={() => setIsRecordPaymentOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Against Payment *</label>
                  <select
                    value={selectedInvoiceForPayment}
                    onChange={(e) => {
                      setSelectedInvoiceForPayment(e.target.value);
                      const inv = invoices.find(i => i.id === e.target.value);
                      if (inv) setPaymentAmount(inv.amountDue);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    required
                  >
                    <option value="">-- Choose Unpaid Invoice --</option>
                    {unpaidInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Due: {formatCurrency(inv.amountDue, business.currencySymbol)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['UPI', 'BANK_TRANSFER', 'CASH'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 rounded-xl font-bold transition-all ${
                          paymentMethod === m
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes / Transaction Reference</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. UTR / IMPS ref #12345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRecordPaymentOpen(false)}
                    className="px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
