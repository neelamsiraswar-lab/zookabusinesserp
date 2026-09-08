import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem, InvoiceType, InvoiceStatus, PaymentMethod, GstTaxRate } from '../../types';
import { formatCurrency, formatINR, formatDate, validateGstin, getCodeFromStateName, getStateFromCode } from '../../utils/formatters';
import { INDIAN_STATES } from '../../utils/constants';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Check, 
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sparkles,
  Trash2,
  Filter,
  Search,
  Receipt,
  UserCheck,
  Package,
  Calendar,
  DollarSign,
  Building2,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  ClipboardPaste
} from 'lucide-react';

interface ParsedInvoiceItemRow {
  index: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceType: InvoiceType;
  customerName: string;
  customerGstin: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerStateCode: string;
  customerPincode: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstRate: GstTaxRate;
  status: InvoiceStatus;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  notes: string;
  rowStatus: 'VALID' | 'WARNING' | 'ERROR';
  messages: string[];
}

interface GroupedInvoicePreview {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceType: InvoiceType;
  customerName: string;
  customerGstin: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerStateCode: string;
  customerPincode: string;
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  isInterState: boolean;
  items: InvoiceItem[];
  subTotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalDiscount: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  hasErrors: boolean;
  hasWarnings: boolean;
  messages: string[];
}

interface ImportSaleInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportSaleInvoicesModal: React.FC<ImportSaleInvoicesModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    business, 
    parties, 
    products, 
    invoices, 
    bulkCreateInvoices, 
    showToast 
  } = useApp();

  const [activeStep, setActiveStep] = useState<'UPLOAD' | 'PREVIEW'>('UPLOAD');
  const [inputTab, setInputTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rawPastedText, setRawPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Grouped Invoices state
  const [groupedInvoices, setGroupedInvoices] = useState<GroupedInvoicePreview[]>([]);
  const [expandedInvoiceNum, setExpandedInvoiceNum] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');

  // Import options
  const [updateExisting, setUpdateExisting] = useState(true);
  const [autoCreateParties, setAutoCreateParties] = useState(true);
  const [deductInventory, setDeductInventory] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // CSV SAMPLE TEMPLATE DOWNLOAD
  // -------------------------------------------------------------
  const handleDownloadSampleCsv = (type: 'detailed' | 'simple') => {
    let headers: string[];
    let sampleRows: string[][];

    if (type === 'detailed') {
      headers = [
        'Invoice Number*',
        'Invoice Date (YYYY-MM-DD)*',
        'Due Date (YYYY-MM-DD)',
        'Invoice Type (TAX_INVOICE/BILL_OF_SUPPLY/POS_SALE)',
        'Customer Name*',
        'Customer GSTIN',
        'Customer Phone',
        'Customer Email',
        'Customer Address',
        'Customer City',
        'Customer State',
        'Customer State Code',
        'Customer PIN',
        'Item Name*',
        'HSN Code',
        'Quantity*',
        'Unit',
        'Rate (Unit Price)*',
        'Discount (%)',
        'GST Rate (%)*',
        'Payment Status (PAID/UNPAID/PARTIALLY_PAID)',
        'Amount Paid',
        'Payment Method (CASH/UPI/BANK_TRANSFER/CREDIT_CARD)',
        'Notes'
      ];

      sampleRows = [
        // Multi-line Invoice 1 (INV-2026-001)
        [
          'INV-2026-001',
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          'TAX_INVOICE',
          'Sharma Enterprises Pvt Ltd',
          '07AAAAA1234A1Z5',
          '9811002233',
          'accounts@sharmaent.com',
          '42 Commercial Hub, Connaught Place',
          'New Delhi',
          'Delhi',
          '07',
          '110001',
          'Dell UltraSharp 27" 4K Monitor',
          '8528',
          '2',
          'PCS',
          '45000',
          '5',
          '18',
          'PARTIALLY_PAID',
          '50000',
          'BANK_TRANSFER',
          'PO Ref: PO-SHAR-992'
        ],
        [
          'INV-2026-001',
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          'TAX_INVOICE',
          'Sharma Enterprises Pvt Ltd',
          '07AAAAA1234A1Z5',
          '9811002233',
          'accounts@sharmaent.com',
          '42 Commercial Hub, Connaught Place',
          'New Delhi',
          'Delhi',
          '07',
          '110001',
          'Logitech MX Master 3S Wireless Mouse',
          '8471',
          '4',
          'PCS',
          '8500',
          '0',
          '18',
          'PARTIALLY_PAID',
          '50000',
          'BANK_TRANSFER',
          'PO Ref: PO-SHAR-992'
        ],
        // Invoice 2: Inter-state client (INV-2026-002)
        [
          'INV-2026-002',
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          'TAX_INVOICE',
          'TechNova Solutions Bengaluru',
          '29AAACT9876Q1ZB',
          '9845012345',
          'billing@technova.io',
          '7th Block Koramangala Industrial Layout',
          'Bengaluru',
          'Karnataka',
          '29',
          '560095',
          'Enterprise Cloud Management Retainer',
          '9983',
          '1',
          'MONTH',
          '75000',
          '0',
          '18',
          'PAID',
          '88500',
          'UPI',
          'Monthly AMC SLA Contract'
        ],
        // Invoice 3: Cash POS retail counter sale (INV-2026-003)
        [
          'INV-2026-003',
          new Date().toISOString().split('T')[0],
          new Date().toISOString().split('T')[0],
          'POS_SALE',
          'Walk-in Retail Customer',
          '',
          '9876543210',
          '',
          'Local Retail Counter',
          business.city || 'Local',
          business.state || 'Delhi',
          business.stateCode || '07',
          business.pincode || '110001',
          'USB-C Fast Charging Multi Cable',
          '8544',
          '3',
          'PCS',
          '499',
          '10',
          '18',
          'PAID',
          '1589',
          'CASH',
          'Counter Slip #412'
        ]
      ];
    } else {
      // Simple format
      headers = [
        'Invoice Number*',
        'Invoice Date (YYYY-MM-DD)*',
        'Customer Name*',
        'Customer GSTIN',
        'Customer State',
        'Item Name*',
        'HSN Code',
        'Quantity*',
        'Rate*',
        'GST Rate (%)*',
        'Payment Status (PAID/UNPAID)'
      ];

      sampleRows = [
        [
          'INV-101',
          new Date().toISOString().split('T')[0],
          'Acme Corp',
          '07AAAAA0000A1Z5',
          'Delhi',
          'Office Chair Ergonomic',
          '9403',
          '5',
          '4500',
          '18',
          'PAID'
        ],
        [
          'INV-102',
          new Date().toISOString().split('T')[0],
          'Nexus Systems',
          '27AAACN1234P1Z2',
          'Maharashtra',
          'Web Development Service',
          '9983',
          '1',
          '25000',
          '18',
          'UNPAID'
        ]
      ];
    }

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => 
        row.map(field => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sample_sales_invoices_${type}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Template Downloaded', `Downloaded sample sales invoices (${type}) template.`);
  };

  // -------------------------------------------------------------
  // PARSER ENGINE: CSV / TEXT -> Grouped Invoices
  // -------------------------------------------------------------
  const parseCSVLines = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f.length > 0)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f.length > 0)) {
        lines.push(currentLine);
      }
    }

    return lines;
  };

  const processImportContent = (content: string) => {
    setIsProcessing(true);

    try {
      const trimmed = content.trim();
      if (!trimmed) {
        showToast('error', 'Empty Content', 'The provided file or text is empty.');
        setIsProcessing(false);
        return;
      }

      // Check if JSON format
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsedJson = JSON.parse(trimmed);
          if (Array.isArray(parsedJson)) {
            processJsonInvoices(parsedJson);
            return;
          }
        } catch {
          // fallback to CSV
        }
      }

      const rows = parseCSVLines(trimmed);
      if (rows.length < 2) {
        showToast('error', 'Invalid CSV Format', 'CSV must contain at least a header row and one data row.');
        setIsProcessing(false);
        return;
      }

      // Header column detection
      const rawHeaderRow = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      const colMap: Record<string, number> = {
        invoiceNumber: -1,
        invoiceDate: -1,
        dueDate: -1,
        invoiceType: -1,
        customerName: -1,
        customerGstin: -1,
        customerPhone: -1,
        customerEmail: -1,
        customerAddress: -1,
        customerCity: -1,
        customerState: -1,
        customerStateCode: -1,
        customerPincode: -1,
        itemName: -1,
        hsnCode: -1,
        quantity: -1,
        unit: -1,
        rate: -1,
        discount: -1,
        gstRate: -1,
        status: -1,
        amountPaid: -1,
        paymentMethod: -1,
        notes: -1,
      };

      rawHeaderRow.forEach((col, idx) => {
        if (col.includes('invoiceno') || col.includes('invoicenumber') || col.includes('invno') || col.includes('billno') || col === 'number') {
          colMap.invoiceNumber = idx;
        } else if (col.includes('invoicedate') || col.includes('billdate') || col === 'date') {
          colMap.invoiceDate = idx;
        } else if (col.includes('duedate') || col.includes('paymentdue')) {
          colMap.dueDate = idx;
        } else if (col.includes('invoicetype') || col.includes('type') || col.includes('billtype')) {
          colMap.invoiceType = idx;
        } else if (col.includes('customername') || col.includes('partyname') || col.includes('buyername') || col.includes('client') || col === 'customer' || col === 'party') {
          colMap.customerName = idx;
        } else if (col.includes('gstin') || col.includes('gstno') || col.includes('taxid')) {
          colMap.customerGstin = idx;
        } else if (col.includes('phone') || col.includes('mobile') || col.includes('contact')) {
          colMap.customerPhone = idx;
        } else if (col.includes('email') || col.includes('mail')) {
          colMap.customerEmail = idx;
        } else if (col.includes('address') || col.includes('billingaddress')) {
          colMap.customerAddress = idx;
        } else if (col.includes('city')) {
          colMap.customerCity = idx;
        } else if (col.includes('statecode') || col.includes('poscode')) {
          colMap.customerStateCode = idx;
        } else if (col.includes('state') || col.includes('placeofsupply') || col.includes('pos')) {
          colMap.customerState = idx;
        } else if (col.includes('pin') || col.includes('zip')) {
          colMap.customerPincode = idx;
        } else if (col.includes('itemname') || col.includes('productname') || col.includes('description') || col.includes('item') || col === 'product') {
          colMap.itemName = idx;
        } else if (col.includes('hsn') || col.includes('sac')) {
          colMap.hsnCode = idx;
        } else if (col.includes('quantity') || col.includes('qty') || col === 'units') {
          colMap.quantity = idx;
        } else if (col.includes('unit') || col.includes('uom')) {
          colMap.unit = idx;
        } else if (col.includes('rate') || col.includes('price') || col.includes('unitprice') || col === 'cost') {
          colMap.rate = idx;
        } else if (col.includes('discount') || col.includes('disc')) {
          colMap.discount = idx;
        } else if (col.includes('gstrate') || col.includes('taxrate') || col.includes('gst') || col.includes('tax')) {
          colMap.gstRate = idx;
        } else if (col.includes('status') || col.includes('paymentstatus')) {
          colMap.status = idx;
        } else if (col.includes('amountpaid') || col.includes('paidamount') || col.includes('paid')) {
          colMap.amountPaid = idx;
        } else if (col.includes('paymentmethod') || col.includes('paymentmode') || col.includes('mode')) {
          colMap.paymentMethod = idx;
        } else if (col.includes('notes') || col.includes('remarks') || col.includes('narration') || col.includes('terms')) {
          colMap.notes = idx;
        }
      });

      // Default fallback if headers weren't found by name
      if (colMap.invoiceNumber === -1) colMap.invoiceNumber = 0;
      if (colMap.invoiceDate === -1) colMap.invoiceDate = 1;
      if (colMap.customerName === -1) colMap.customerName = 2;
      if (colMap.itemName === -1) colMap.itemName = 3;

      const parsedItemsList: ParsedInvoiceItemRow[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length === 0 || row.every(c => c.trim() === '')) continue;

        const getVal = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');

        let invNumber = getVal(colMap.invoiceNumber);
        let invDate = getVal(colMap.invoiceDate);
        let dueDate = getVal(colMap.dueDate);
        let invTypeRaw = getVal(colMap.invoiceType).toUpperCase();
        let custName = getVal(colMap.customerName);
        let custGstin = getVal(colMap.customerGstin).toUpperCase();
        let custPhone = getVal(colMap.customerPhone);
        let custEmail = getVal(colMap.customerEmail);
        let custAddress = getVal(colMap.customerAddress);
        let custCity = getVal(colMap.customerCity);
        let custState = getVal(colMap.customerState);
        let custStateCode = getVal(colMap.customerStateCode);
        let custPincode = getVal(colMap.customerPincode);
        let itemName = getVal(colMap.itemName);
        let hsnCode = getVal(colMap.hsnCode);
        let qtyStr = getVal(colMap.quantity);
        let unitStr = getVal(colMap.unit) || 'PCS';
        let rateStr = getVal(colMap.rate);
        let discStr = getVal(colMap.discount);
        let gstStr = getVal(colMap.gstRate);
        let statusRaw = getVal(colMap.status).toUpperCase();
        let amountPaidStr = getVal(colMap.amountPaid);
        let payMethodRaw = getVal(colMap.paymentMethod).toUpperCase();
        let notes = getVal(colMap.notes);

        const messages: string[] = [];
        let rowStatus: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';

        // Validation & normalization
        if (!invNumber) {
          invNumber = `INV-IMP-${Date.now().toString().slice(-4)}-${r}`;
          messages.push('Invoice number was missing; auto-assigned placeholder.');
          rowStatus = 'WARNING';
        }

        if (!invDate) {
          invDate = new Date().toISOString().split('T')[0];
        } else {
          // Normalize date format if DD/MM/YYYY or DD-MM-YYYY
          if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(invDate)) {
            const parts = invDate.split(/[/-]/);
            invDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        if (!dueDate) {
          dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
        }

        let invType: InvoiceType = 'TAX_INVOICE';
        if (invTypeRaw.includes('POS')) invType = 'POS_SALE';
        else if (invTypeRaw.includes('SUPPLY')) invType = 'BILL_OF_SUPPLY';
        else if (invTypeRaw.includes('QUOT')) invType = 'QUOTATION';
        else if (invTypeRaw.includes('CREDIT')) invType = 'CREDIT_NOTE';
        else if (invTypeRaw.includes('DEBIT')) invType = 'DEBIT_NOTE';

        if (!custName) {
          custName = 'Unregistered Cash Customer';
          messages.push('Customer name was missing; defaulted to Unregistered Cash Customer.');
          if (rowStatus === 'VALID') rowStatus = 'WARNING';
        }

        // GSTIN Check
        if (custGstin) {
          const gstinCheck = validateGstin(custGstin);
          if (gstinCheck.isValid) {
            if (!custState && gstinCheck.stateName) custState = gstinCheck.stateName;
            if (!custStateCode && gstinCheck.stateCode) custStateCode = gstinCheck.stateCode;
          } else {
            messages.push(`Invalid GSTIN format (${custGstin}).`);
            if (rowStatus === 'VALID') rowStatus = 'WARNING';
          }
        }

        if (custState && !custStateCode) {
          custStateCode = getCodeFromStateName(custState);
        } else if (custStateCode && !custState) {
          custState = getStateFromCode(custStateCode);
        } else if (!custState && !custStateCode) {
          custState = business.state || 'Delhi';
          custStateCode = business.stateCode || '07';
        }

        if (!itemName) {
          itemName = 'General Supply / Product';
          messages.push('Item name missing; assigned generic item name.');
          if (rowStatus === 'VALID') rowStatus = 'WARNING';
        }

        const quantity = parseFloat(qtyStr) || 1;
        const rate = parseFloat(rateStr) || 0;
        const discountPercent = parseFloat(discStr) || 0;

        let gstRate: GstTaxRate = 18;
        const parsedGst = parseInt(gstStr, 10);
        if ([0, 5, 12, 18, 28].includes(parsedGst)) {
          gstRate = parsedGst as GstTaxRate;
        }

        let status: InvoiceStatus = 'UNPAID';
        if (statusRaw.includes('PAID') && !statusRaw.includes('UN') && !statusRaw.includes('PART')) {
          status = 'PAID';
        } else if (statusRaw.includes('PART')) {
          status = 'PARTIALLY_PAID';
        } else if (statusRaw.includes('CANCEL')) {
          status = 'CANCELLED';
        }

        const amountPaid = parseFloat(amountPaidStr) || (status === 'PAID' ? 0 : 0);

        let paymentMethod: PaymentMethod = 'UPI';
        if (payMethodRaw.includes('CASH')) paymentMethod = 'CASH';
        else if (payMethodRaw.includes('BANK') || payMethodRaw.includes('NEFT') || payMethodRaw.includes('RTGS')) paymentMethod = 'BANK_TRANSFER';
        else if (payMethodRaw.includes('CARD')) paymentMethod = 'CREDIT_CARD';
        else if (payMethodRaw.includes('CHEQUE')) paymentMethod = 'CHEQUE';

        if (rate <= 0) {
          messages.push('Unit rate is 0. Please verify.');
          if (rowStatus === 'VALID') rowStatus = 'WARNING';
        }

        parsedItemsList.push({
          index: r,
          invoiceNumber: invNumber,
          invoiceDate: invDate,
          dueDate,
          invoiceType: invType,
          customerName: custName,
          customerGstin: custGstin,
          customerPhone: custPhone,
          customerEmail: custEmail,
          customerAddress: custAddress || `${custCity ? custCity + ', ' : ''}${custState}`,
          customerCity: custCity,
          customerState: custState,
          customerStateCode: custStateCode,
          customerPincode: custPincode,
          itemName,
          hsnCode: hsnCode || '9983',
          quantity,
          unit: unitStr,
          rate,
          discountPercent,
          gstRate,
          status,
          amountPaid,
          paymentMethod,
          notes,
          rowStatus,
          messages
        });
      }

      // Group parsed items by Invoice Number + Customer
      groupAndCalculateInvoices(parsedItemsList);
      setActiveStep('PREVIEW');
    } catch (err: any) {
      console.error('CSV Parse Error:', err);
      showToast('error', 'Processing Failed', `Failed to parse file: ${err?.message || 'Invalid format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processJsonInvoices = (jsonArray: any[]) => {
    try {
      const itemsList: ParsedInvoiceItemRow[] = [];

      jsonArray.forEach((inv, idx) => {
        const invNum = inv.invoiceNumber || inv.number || `INV-JSON-${idx + 1}`;
        const invDate = inv.invoiceDate || inv.date || new Date().toISOString().split('T')[0];
        const dueDate = inv.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
        const custName = inv.customerName || inv.customer || 'Valued Customer';
        const custGstin = (inv.customerGstin || inv.gstin || '').toUpperCase();
        const custPhone = inv.customerPhone || inv.phone || '';
        const custEmail = inv.customerEmail || inv.email || '';
        const custAddress = inv.customerAddress || inv.address || '';
        const custCity = inv.customerCity || inv.city || '';
        const custState = inv.customerState || inv.state || business.state || 'Delhi';
        const custStateCode = inv.customerStateCode || inv.stateCode || business.stateCode || '07';
        const custPincode = inv.customerPincode || inv.pincode || '';
        const status: InvoiceStatus = inv.status || 'UNPAID';
        const amountPaid = typeof inv.amountPaid === 'number' ? inv.amountPaid : (status === 'PAID' ? inv.grandTotal || 0 : 0);
        const paymentMethod: PaymentMethod = inv.paymentMethod || 'UPI';
        const notes = inv.notes || '';

        const lineItems = Array.isArray(inv.items) ? inv.items : [inv];

        lineItems.forEach((it: any, itemIdx: number) => {
          itemsList.push({
            index: idx * 100 + itemIdx,
            invoiceNumber: invNum,
            invoiceDate: invDate,
            dueDate,
            invoiceType: inv.invoiceType || 'TAX_INVOICE',
            customerName: custName,
            customerGstin: custGstin,
            customerPhone: custPhone,
            customerEmail: custEmail,
            customerAddress: custAddress,
            customerCity: custCity,
            customerState: custState,
            customerStateCode: custStateCode,
            customerPincode: custPincode,
            itemName: it.name || it.itemName || 'Standard Item',
            hsnCode: it.hsnCode || it.hsn || '9983',
            quantity: typeof it.quantity === 'number' ? it.quantity : 1,
            unit: it.unit || 'PCS',
            rate: typeof it.rate === 'number' ? it.rate : 1000,
            discountPercent: typeof it.discountPercent === 'number' ? it.discountPercent : 0,
            gstRate: (it.gstRate || 18) as GstTaxRate,
            status,
            amountPaid,
            paymentMethod,
            notes,
            rowStatus: 'VALID',
            messages: []
          });
        });
      });

      groupAndCalculateInvoices(itemsList);
      setActiveStep('PREVIEW');
    } catch (err: any) {
      showToast('error', 'JSON Import Failed', err.message);
    }
  };

  const groupAndCalculateInvoices = (itemsList: ParsedInvoiceItemRow[]) => {
    const map = new Map<string, ParsedInvoiceItemRow[]>();

    itemsList.forEach(item => {
      const key = `${item.invoiceNumber.toUpperCase()}__${item.customerName.toUpperCase()}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    const sellerStateCode = business.stateCode || '07';
    const finalInvoices: GroupedInvoicePreview[] = [];

    map.forEach((groupItems) => {
      const first = groupItems[0];
      const isInterState = (first.customerStateCode || '07') !== sellerStateCode;

      let subTotalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalCess = 0;
      let totalDiscount = 0;

      const invoiceItems: InvoiceItem[] = groupItems.map((gi, idx) => {
        const grossAmount = gi.quantity * gi.rate;
        const itemDiscount = (grossAmount * (gi.discountPercent || 0)) / 100;
        const taxableAmount = grossAmount - itemDiscount;

        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;

        if (isInterState) {
          igstRate = gi.gstRate;
          igstAmount = (taxableAmount * igstRate) / 100;
        } else {
          cgstRate = gi.gstRate / 2;
          cgstAmount = (taxableAmount * cgstRate) / 100;
          sgstRate = gi.gstRate / 2;
          sgstAmount = (taxableAmount * sgstRate) / 100;
        }

        const totalTaxForItem = cgstAmount + sgstAmount + igstAmount;
        const totalAmount = taxableAmount + totalTaxForItem;

        subTotalTaxable += taxableAmount;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        totalIgst += igstAmount;
        totalDiscount += itemDiscount;

        // Try to match productId in catalog
        const matchedProd = products.find(p => p.name.toLowerCase() === gi.itemName.toLowerCase());

        return {
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          productId: matchedProd?.id,
          name: gi.itemName,
          hsnCode: gi.hsnCode,
          quantity: gi.quantity,
          unit: gi.unit,
          rate: gi.rate,
          discountPercent: gi.discountPercent,
          discountAmount: itemDiscount,
          taxableAmount,
          gstRate: gi.gstRate,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          cessRate: 0,
          cessAmount: 0,
          totalAmount
        };
      });

      const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
      const rawGrandTotal = subTotalTaxable + totalTax;
      const roundedGrandTotal = Math.round(rawGrandTotal);
      const roundOff = +(roundedGrandTotal - rawGrandTotal).toFixed(2);
      const grandTotal = roundedGrandTotal;

      let amountPaid = first.amountPaid;
      if (first.status === 'PAID') {
        amountPaid = grandTotal;
      }
      const amountDue = Math.max(0, grandTotal - amountPaid);
      let status = first.status;
      if (amountDue === 0 && amountPaid > 0) status = 'PAID';
      else if (amountPaid > 0 && amountDue > 0) status = 'PARTIALLY_PAID';
      else if (amountPaid === 0) status = 'UNPAID';

      const hasErrors = groupItems.some(i => i.rowStatus === 'ERROR');
      const hasWarnings = groupItems.some(i => i.rowStatus === 'WARNING');
      const allMessages = Array.from(new Set(groupItems.flatMap(i => i.messages)));

      // Check if invoice number already exists
      const alreadyExists = invoices.some(i => i.invoiceNumber.toLowerCase() === first.invoiceNumber.toLowerCase());
      if (alreadyExists) {
        allMessages.push(`Invoice ${first.invoiceNumber} already exists in database (will be overwritten if enabled).`);
      }

      finalInvoices.push({
        invoiceNumber: first.invoiceNumber,
        invoiceDate: first.invoiceDate,
        dueDate: first.dueDate,
        invoiceType: first.invoiceType,
        customerName: first.customerName,
        customerGstin: first.customerGstin,
        customerPhone: first.customerPhone,
        customerEmail: first.customerEmail,
        customerAddress: first.customerAddress,
        customerCity: first.customerCity,
        customerState: first.customerState,
        customerStateCode: first.customerStateCode,
        customerPincode: first.customerPincode,
        placeOfSupplyState: first.customerState,
        placeOfSupplyStateCode: first.customerStateCode,
        isInterState,
        items: invoiceItems,
        subTotalTaxable,
        totalCgst,
        totalSgst,
        totalIgst,
        totalCess,
        totalTax,
        totalDiscount,
        roundOff,
        grandTotal,
        amountPaid,
        amountDue,
        status,
        paymentMethod: first.paymentMethod,
        notes: first.notes,
        hasErrors,
        hasWarnings,
        messages: allMessages
      });
    });

    setGroupedInvoices(finalInvoices);
  };

  // -------------------------------------------------------------
  // FILE INPUT HANDLER
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setFileName(uploadedFile.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processImportContent(content);
    };
    reader.readAsText(uploadedFile);
  };

  const handlePasteProcess = () => {
    if (!rawPastedText.trim()) {
      showToast('warning', 'No Text Entered', 'Please paste CSV or tabular data first.');
      return;
    }
    setFileName('Pasted_Sales_Data.csv');
    processImportContent(rawPastedText);
  };

  // -------------------------------------------------------------
  // FINAL COMMIT / IMPORT EXECUTION
  // -------------------------------------------------------------
  const handleExecuteImport = () => {
    if (groupedInvoices.length === 0) {
      showToast('error', 'No Invoices to Import', 'Please upload or paste valid invoice rows.');
      return;
    }

    setIsProcessing(true);

    try {
      const invoicesToSave: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>[] = groupedInvoices.map(inv => {
        // Find or prepare customer ID
        const matchedParty = parties.find(
          p => (inv.customerGstin && p.gstin && p.gstin.toUpperCase() === inv.customerGstin.toUpperCase()) ||
               p.name.toLowerCase() === inv.customerName.toLowerCase()
        );

        const customerId = matchedParty?.id || `party-imp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

        return {
          invoiceNumber: inv.invoiceNumber,
          invoiceType: inv.invoiceType,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          status: inv.status,
          sellerGstin: business.gstin || 'UNREGISTERED',
          sellerStateCode: business.stateCode || '07',
          sellerState: business.state || 'Delhi',
          customerId,
          customerName: inv.customerName,
          customerGstin: inv.customerGstin,
          customerPhone: inv.customerPhone,
          customerEmail: inv.customerEmail,
          customerAddress: inv.customerAddress,
          customerCity: inv.customerCity,
          customerState: inv.customerState,
          customerStateCode: inv.customerStateCode,
          customerPincode: inv.customerPincode,
          placeOfSupplyState: inv.placeOfSupplyState,
          placeOfSupplyStateCode: inv.placeOfSupplyStateCode,
          isInterState: inv.isInterState,
          isReverseCharge: false,
          items: inv.items,
          subTotalTaxable: inv.subTotalTaxable,
          totalCgst: inv.totalCgst,
          totalSgst: inv.totalSgst,
          totalIgst: inv.totalIgst,
          totalCess: inv.totalCess,
          totalTax: inv.totalTax,
          totalDiscount: inv.totalDiscount,
          roundOff: inv.roundOff,
          grandTotal: inv.grandTotal,
          amountPaid: inv.amountPaid,
          amountDue: inv.amountDue,
          paymentMethod: inv.paymentMethod,
          paymentReference: inv.notes,
          notes: inv.notes
        };
      });

      const result = bulkCreateInvoices(invoicesToSave, {
        updateExisting,
        autoCreateParties,
        deductInventory
      });

      showToast(
        'success',
        'Sales Invoices Imported!',
        `Successfully imported ${result.added} new invoice${result.added === 1 ? '' : 's'}${result.updated > 0 ? ` and updated ${result.updated} existing records` : ''}.`
      );

      onClose();
    } catch (err: any) {
      console.error('Import Execution Error:', err);
      showToast('error', 'Import Failed', err?.message || 'An error occurred during invoice creation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculations for summary banner
  const totalTaxable = groupedInvoices.reduce((acc, i) => acc + i.subTotalTaxable, 0);
  const totalTax = groupedInvoices.reduce((acc, i) => acc + i.totalTax, 0);
  const totalGrand = groupedInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const totalItemsCount = groupedInvoices.reduce((acc, i) => acc + i.items.length, 0);

  const filteredInvoices = groupedInvoices.filter(inv => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q)) ||
      inv.items.some(it => it.name.toLowerCase().includes(q));

    if (filterStatus === 'VALID') return matchesSearch && !inv.hasErrors && !inv.hasWarnings;
    if (filterStatus === 'WARNING') return matchesSearch && inv.hasWarnings;
    if (filterStatus === 'ERROR') return matchesSearch && inv.hasErrors;
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
      <div 
        className="w-full max-w-[98vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96dvh] sm:max-h-[92dvh] my-auto transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  Import Sale Invoices
                </h2>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  GST Multi-Line
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Bulk upload historical invoices, POS receipts, and tax bills with automated GST & customer ledger sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={() => setActiveStep('UPLOAD')}
              className={`flex items-center gap-2 font-bold transition-colors cursor-pointer ${
                activeStep === 'UPLOAD'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 'UPLOAD' ? 'bg-indigo-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>1</span>
              <span>1. Upload or Paste Data</span>
            </button>

            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

            <button
              onClick={() => {
                if (groupedInvoices.length > 0) setActiveStep('PREVIEW');
              }}
              disabled={groupedInvoices.length === 0}
              className={`flex items-center gap-2 font-bold transition-colors ${
                activeStep === 'PREVIEW'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : groupedInvoices.length > 0 
                    ? 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer' 
                    : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 'PREVIEW' ? 'bg-indigo-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>2</span>
              <span>2. Review & Validate ({groupedInvoices.length} Invoices)</span>
            </button>
          </div>

          {/* Sample Download Shortcuts in Bar */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadSampleCsv('detailed')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-750 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sample CSV Template</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeStep === 'UPLOAD' ? (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Input Mode Selector */}
              <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mx-auto border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setInputTab('FILE')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    inputTab === 'FILE'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload CSV / Excel File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('PASTE')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    inputTab === 'PASTE'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Paste Raw Text / CSV</span>
                </button>
              </div>

              {inputTab === 'FILE' ? (
                /* Drag & Drop File Box */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-8 sm:p-10 text-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group space-y-4"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Click to choose CSV file, or drag and drop here
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Supports GST formatted sales registers, Excel exported CSVs, Tally sales exports, and JSON array files.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
                      Supported: .csv, .txt, .json
                    </span>
                  </div>
                </div>
              ) : (
                /* Raw Text / Copy-Paste Box */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Paste Comma-Separated (CSV) or Tab-Separated Invoices Data:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRawPastedText(
                          `Invoice Number,Invoice Date,Customer Name,Customer GSTIN,Customer State,Item Name,HSN Code,Quantity,Rate,GST Rate (%),Payment Status\nINV-2026-101,2026-08-20,Apex Dynamics,07AAAAA0000A1Z5,Delhi,Cloud Servers Setup,9983,1,45000,18,PAID\nINV-2026-102,2026-08-20,Royal Infotech,27AAACR1234P1Z2,Maharashtra,Ergonomic Keyboards,8471,5,3200,18,UNPAID`
                        );
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Fill Example Text
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={rawPastedText}
                    onChange={(e) => setRawPastedText(e.target.value)}
                    placeholder="Invoice Number,Invoice Date,Customer Name,Customer GSTIN,Customer State,Item Name,HSN Code,Quantity,Rate,GST Rate (%),Payment Status&#10;INV-001,2026-08-20,Acme Pvt Ltd,07AAAAA0000A1Z5,Delhi,4K Monitor,8528,2,24000,18,PAID"
                    className="w-full p-4 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasteProcess}
                      disabled={!rawPastedText.trim()}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      Parse and Review Invoices
                    </button>
                  </div>
                </div>
              )}

              {/* Sample Templates & Guidelines Section */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Download Pre-Formatted Excel/CSV Sales Templates:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadSampleCsv('detailed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Multi-Line GST Template (Recommended)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSampleCsv('simple')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Simple Sales Template</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Multi-Item Grouping:</strong> Rows with the same Invoice Number are automatically grouped into a single multi-item bill.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Automated Tax Split:</strong> Calculates CGST+SGST for home state and IGST for inter-state supplies.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Customer Ledger:</strong> Auto-creates customer directory profiles and updates outstanding balances.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-5">
              {/* Summary Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60">
                  <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Total Invoices</div>
                  <div className="text-xl font-bold text-indigo-950 dark:text-indigo-100 mt-0.5">
                    {groupedInvoices.length} <span className="text-xs font-normal text-slate-500">({totalItemsCount} items)</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Taxable Value</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatINR(totalTaxable)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total GST Tax</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {formatINR(totalTax)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60">
                  <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Grand Total</div>
                  <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100 mt-0.5">
                    {formatINR(totalGrand)}
                  </div>
                </div>
              </div>

              {/* Options Checkboxes */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateParties}
                    onChange={(e) => setAutoCreateParties(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Auto-register new customers in Party Master</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductInventory}
                    onChange={(e) => setDeductInventory(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Deduct stock from Inventory for matching products</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Update if Invoice Number already exists</span>
                </label>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search parsed invoices by number, buyer name, item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filterStatus === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      All ({groupedInvoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('WARNING')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filterStatus === 'WARNING' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200' : 'text-slate-500'
                      }`}
                    >
                      Warnings ({groupedInvoices.filter(i => i.hasWarnings).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ERROR')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filterStatus === 'ERROR' ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200' : 'text-slate-500'
                      }`}
                    >
                      Errors ({groupedInvoices.filter(i => i.hasErrors).length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Grouped Invoices Preview Accordion List */}
              <div className="space-y-3">
                {filteredInvoices.map((inv, idx) => {
                  const isExpanded = expandedInvoiceNum === inv.invoiceNumber;

                  return (
                    <div
                      key={inv.invoiceNumber + '-' + idx}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        inv.hasErrors
                          ? 'border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20'
                          : inv.hasWarnings
                          ? 'border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'
                      }`}
                    >
                      {/* Accordion Row Header */}
                      <div
                        onClick={() => setExpandedInvoiceNum(isExpanded ? null : inv.invoiceNumber)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-800">
                            {inv.invoiceNumber}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {inv.customerName}
                              </span>
                              {inv.customerGstin && (
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {inv.customerGstin}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                inv.isInterState
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              }`}>
                                {inv.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>Date: {formatDate(inv.invoiceDate)}</span>
                              <span>•</span>
                              <span>{inv.items.length} Line Item{inv.items.length === 1 ? '' : 's'}</span>
                              <span>•</span>
                              <span>State: {inv.customerState} ({inv.customerStateCode})</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {formatINR(inv.grandTotal)}
                            </div>
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {inv.status}
                            </span>
                          </div>

                          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Line Items & Tax Breakdown Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                          {inv.messages.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                              {inv.messages.map((msg, mIdx) => (
                                <div key={mIdx} className="flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{msg}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                                  <th className="pb-1.5">Item Description</th>
                                  <th className="pb-1.5">HSN</th>
                                  <th className="pb-1.5 text-right">Qty</th>
                                  <th className="pb-1.5 text-right">Rate</th>
                                  <th className="pb-1.5 text-right">Taxable</th>
                                  <th className="pb-1.5 text-right">GST %</th>
                                  <th className="pb-1.5 text-right">Tax Amt</th>
                                  <th className="pb-1.5 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {inv.items.map((it, itIdx) => (
                                  <tr key={itIdx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                                    <td className="py-2 font-medium">{it.name}</td>
                                    <td className="py-2 font-mono text-slate-400">{it.hsnCode}</td>
                                    <td className="py-2 text-right">{it.quantity} {it.unit}</td>
                                    <td className="py-2 text-right">{formatINR(it.rate)}</td>
                                    <td className="py-2 text-right">{formatINR(it.taxableAmount)}</td>
                                    <td className="py-2 text-right font-semibold">{it.gstRate}%</td>
                                    <td className="py-2 text-right">{formatINR(it.cgstAmount + it.sgstAmount + it.igstAmount)}</td>
                                    <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{formatINR(it.totalAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                            <div>
                              <span>Billing Address: {inv.customerAddress || 'Local State'}</span>
                            </div>
                            <div className="flex items-center gap-4 font-semibold">
                              <span>Taxable: {formatINR(inv.subTotalTaxable)}</span>
                              <span>Tax: {formatINR(inv.totalTax)}</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">Grand Total: {formatINR(inv.grandTotal)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredInvoices.length === 0 && (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-sm font-medium">No parsed invoices match your search/filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
          <div>
            {activeStep === 'PREVIEW' && (
              <button
                type="button"
                onClick={() => setActiveStep('UPLOAD')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Back to Upload</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {activeStep === 'UPLOAD' ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Select File to Parse</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing || groupedInvoices.length === 0}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Invoices...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Import {groupedInvoices.length} Invoices Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
