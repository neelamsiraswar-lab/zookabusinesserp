import React, { useState, useRef } from 'react';
import { Party } from '../../types';
import { formatCurrency, validateGstin } from '../../utils/formatters';
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
  Users,
  Building2,
  Trash2,
  Sparkles,
  Phone,
  MapPin
} from 'lucide-react';

interface ParsedPartyRow {
  index: number;
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  name: string;
  companyName: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  billingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  creditLimit: number;
  creditPeriodDays: number;
  openingBalance: number;
  status: 'VALID' | 'WARNING' | 'ERROR';
  messages: string[];
}

interface BulkPartyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parties: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[], updateExisting: boolean) => void;
  currencySymbol?: string;
}

export const BulkPartyUploadModal: React.FC<BulkPartyUploadModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currencySymbol = '₹'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedPartyRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOMER' | 'VENDOR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<'UPLOAD' | 'PREVIEW'>('UPLOAD');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // CSV TEMPLATE GENERATOR & DOWNLOAD
  // -------------------------------------------------------------
  const handleDownloadSampleTemplate = () => {
    const headers = [
      'Party Type (CUSTOMER/VENDOR/BOTH)*',
      'Contact Person / Party Name*',
      'Company / Trade Name',
      'GSTIN (15-digit)',
      'Phone / Mobile Number*',
      'Email Address',
      'Billing Address',
      'City',
      'State',
      'State Code',
      'PIN Code',
      'Credit Limit (INR)',
      'Credit Period (Days)',
      'Opening Balance (+Receivable / -Payable)'
    ];

    const sampleRows = [
      [
        'CUSTOMER',
        'Rajesh Kumar Sharma',
        'Apex Tech Solutions Pvt Ltd',
        '07AAAAA0000A1Z5',
        '9811223344',
        'accounts@apextech.in',
        'Plot 45, Okhla Industrial Area Phase 3',
        'New Delhi',
        'Delhi',
        '07',
        '110020',
        '250000',
        '30',
        '45000'
      ],
      [
        'CUSTOMER',
        'Priya Sundaram',
        'Zenith Retail Enterprises',
        '27BBBBB1111B1Z2',
        '9822334455',
        'priya@zenithretail.com',
        '12, Linking Road, Bandra West',
        'Mumbai',
        'Maharashtra',
        '27',
        '400050',
        '500000',
        '45',
        '0'
      ],
      [
        'VENDOR',
        'Amit Patel',
        'National Hardware Suppliers',
        '24CCCCC2222C1Z9',
        '9876543210',
        'sales@nationalhardware.com',
        'GIDC Electronics Zone, Sector 26',
        'Gandhinagar',
        'Gujarat',
        '24',
        '382028',
        '1000000',
        '60',
        '-78500'
      ],
      [
        'VENDOR',
        'Vikramaditya Roy',
        'Eastern Logistics & Transport Co',
        '19DDDDD3333D1Z6',
        '9833445566',
        'dispatch@easternlogistics.in',
        '8, Strand Road, BBD Bagh',
        'Kolkata',
        'West Bengal',
        '19',
        '700001',
        '300000',
        '15',
        '-12000'
      ],
      [
        'BOTH',
        'Suresh Menon',
        'Menon Traders & Wholesalers',
        '32EEEEE4444E1Z3',
        '9844556677',
        'contact@menontraders.com',
        'MG Road, Ernakulam',
        'Kochi',
        'Kerala',
        '32',
        '682011',
        '400000',
        '30',
        '15000'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'zookabusiness_contacts_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // ROBUST CSV PARSER (RFC 4180 COMPLIANT)
  // -------------------------------------------------------------
  const parseCSVString = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          cell += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip CRLF
        }
        row.push(cell.trim());
        if (row.length > 0 && row.some(c => c.length > 0)) {
          result.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c.length > 0)) {
        result.push(row);
      }
    }

    return result;
  };

  // -------------------------------------------------------------
  // FILE SELECTION & SMART NORMALIZATION
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
      processFile(droppedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawRows = parseCSVString(text);

        if (rawRows.length < 2) {
          alert('CSV file is empty or only contains headers. Please check the file.');
          setIsProcessing(false);
          return;
        }

        const headers = rawRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        // Find column indices with intelligent aliases
        const findIndex = (aliases: string[]) => {
          return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
        };

        const typeIdx = findIndex(['partytype', 'type', 'contacttype', 'role', 'customervendor']);
        const nameIdx = findIndex(['contactperson', 'partyname', 'customername', 'vendorname', 'name', 'clientname']);
        const companyIdx = findIndex(['companyname', 'company', 'tradename', 'firmname', 'organization', 'businessname']);
        const gstinIdx = findIndex(['gstin', 'gstno', 'gstnumber', 'gst', 'taxnumber']);
        const phoneIdx = findIndex(['phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact', 'telephone', 'cell']);
        const emailIdx = findIndex(['email', 'emailaddress', 'mail']);
        const addressIdx = findIndex(['billingaddress', 'address', 'street', 'location']);
        const cityIdx = findIndex(['city', 'district', 'town']);
        const stateIdx = findIndex(['state', 'statename', 'province']);
        const stateCodeIdx = findIndex(['statecode', 'poscode', 'code']);
        const pincodeIdx = findIndex(['pincode', 'pin', 'zip', 'postalcode']);
        const creditLimitIdx = findIndex(['creditlimit', 'limit', 'credit']);
        const creditPeriodIdx = findIndex(['creditperiod', 'creditdays', 'days', 'paymentterms', 'terms']);
        const openingBalIdx = findIndex(['openingbalance', 'balance', 'openingdue', 'dueamount', 'currentbalance']);

        const parsedList: ParsedPartyRow[] = [];

        for (let r = 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0 || row.every(cell => !cell)) continue;

          const messages: string[] = [];
          let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';

          // 1. Party Type
          let rawTypeStr = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].trim().toUpperCase() : 'CUSTOMER';
          let parsedType: 'CUSTOMER' | 'VENDOR' | 'BOTH' = 'CUSTOMER';

          if (rawTypeStr.includes('VENDOR') || rawTypeStr.includes('SUPPLIER')) {
            parsedType = rawTypeStr.includes('BOTH') || rawTypeStr.includes('CUSTOMER') ? 'BOTH' : 'VENDOR';
          } else if (rawTypeStr.includes('BOTH')) {
            parsedType = 'BOTH';
          } else {
            parsedType = 'CUSTOMER';
          }

          // 2. Name
          let rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : (row[1] || row[0] || '').trim();
          const rawCompany = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : '';

          if (!rawName && rawCompany) {
            rawName = rawCompany;
            status = 'WARNING';
            messages.push('Used company name as contact person name.');
          }

          if (!rawName) {
            status = 'ERROR';
            messages.push('Missing Party / Contact Name (Required).');
          }

          // 3. GSTIN & PAN & State Detection
          let rawGstin = gstinIdx !== -1 && row[gstinIdx] ? row[gstinIdx].trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
          let pan = '';
          let stateFromGstin = '';
          let stateCodeFromGstin = '';

          if (rawGstin) {
            if (rawGstin.length === 15) {
              pan = rawGstin.substring(2, 12);
              stateCodeFromGstin = rawGstin.substring(0, 2);
              const foundState = INDIAN_STATES.find(s => s.code === stateCodeFromGstin);
              if (foundState) {
                stateFromGstin = foundState.name;
              }
            } else {
              if (status !== 'ERROR') status = 'WARNING';
              messages.push(`Invalid GSTIN length (${rawGstin.length} chars, expected 15).`);
            }
          }

          // 4. Phone
          let rawPhone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : '';
          if (!rawPhone) {
            rawPhone = '9800000000';
            if (status !== 'ERROR') status = 'WARNING';
            messages.push('Phone missing; placeholder 9800000000 applied.');
          }

          // 5. Email
          const rawEmail = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';

          // 6. Address & City
          const rawAddress = addressIdx !== -1 && row[addressIdx] ? row[addressIdx].trim() : 'Industrial Area';
          const rawCity = cityIdx !== -1 && row[cityIdx] ? row[cityIdx].trim() : 'New Delhi';

          // 7. State & State Code
          let rawState = stateIdx !== -1 && row[stateIdx] ? row[stateIdx].trim() : (stateFromGstin || 'Delhi');
          let rawStateCode = stateCodeIdx !== -1 && row[stateCodeIdx] ? row[stateCodeIdx].trim() : (stateCodeFromGstin || '07');

          // Ensure state code is 2 digits
          if (rawStateCode.length === 1) rawStateCode = '0' + rawStateCode;

          // Cross-match state code with state name if not aligned
          if (rawState && (!rawStateCode || rawStateCode === '07')) {
            const matchedState = INDIAN_STATES.find(s => s.name.toLowerCase() === rawState.toLowerCase());
            if (matchedState) {
              rawStateCode = matchedState.code;
              rawState = matchedState.name;
            }
          }

          // 8. PIN Code
          const rawPincode = pincodeIdx !== -1 && row[pincodeIdx] ? row[pincodeIdx].trim() : '110001';

          // 9. Credit Limit & Period
          const rawCreditLimit = creditLimitIdx !== -1 && row[creditLimitIdx]
            ? parseFloat(row[creditLimitIdx].replace(/[^0-9.]/g, '')) || 100000
            : 100000;

          const rawCreditPeriod = creditPeriodIdx !== -1 && row[creditPeriodIdx]
            ? parseInt(row[creditPeriodIdx].replace(/[^0-9]/g, ''), 10) || 30
            : 30;

          // 10. Opening Balance
          let rawOpeningBal = openingBalIdx !== -1 && row[openingBalIdx]
            ? parseFloat(row[openingBalIdx].replace(/[^0-9.-]/g, '')) || 0
            : 0;

          // If vendor and positive opening balance was entered, make it negative (payable)
          if (parsedType === 'VENDOR' && rawOpeningBal > 0) {
            rawOpeningBal = -rawOpeningBal;
          }

          parsedList.push({
            index: r,
            type: parsedType,
            name: rawName,
            companyName: rawCompany,
            gstin: rawGstin,
            pan,
            phone: rawPhone,
            email: rawEmail,
            billingAddress: rawAddress,
            city: rawCity,
            state: rawState,
            stateCode: rawStateCode,
            pincode: rawPincode,
            creditLimit: rawCreditLimit,
            creditPeriodDays: rawCreditPeriod,
            openingBalance: rawOpeningBal,
            status,
            messages
          });
        }

        setParsedRows(parsedList);
        setActiveStep('PREVIEW');
      } catch (err) {
        alert('Failed to parse the CSV file. Please check that it is properly formatted.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(selectedFile);
  };

  // -------------------------------------------------------------
  // ROW MANAGEMENT & FILTERING
  // -------------------------------------------------------------
  const handleDeleteRow = (index: number) => {
    setParsedRows(prev => prev.filter(r => r.index !== index));
  };

  const validRowsCount = parsedRows.filter(r => r.status !== 'ERROR').length;
  const warningRowsCount = parsedRows.filter(r => r.status === 'WARNING').length;
  const errorRowsCount = parsedRows.filter(r => r.status === 'ERROR').length;
  
  const customerCount = parsedRows.filter(r => r.status !== 'ERROR' && (r.type === 'CUSTOMER' || r.type === 'BOTH')).length;
  const vendorCount = parsedRows.filter(r => r.status !== 'ERROR' && (r.type === 'VENDOR' || r.type === 'BOTH')).length;
  
  const totalReceivables = parsedRows
    .filter(r => r.status !== 'ERROR' && r.openingBalance > 0)
    .reduce((sum, r) => sum + r.openingBalance, 0);

  const totalPayables = parsedRows
    .filter(r => r.status !== 'ERROR' && r.openingBalance < 0)
    .reduce((sum, r) => sum + Math.abs(r.openingBalance), 0);

  const displayRows = parsedRows.filter(r => {
    const matchesStatus = 
      filterStatus === 'ALL' ||
      (filterStatus === 'VALID' && r.status === 'VALID') ||
      (filterStatus === 'WARNING' && r.status === 'WARNING') ||
      (filterStatus === 'ERROR' && r.status === 'ERROR');

    const matchesType = 
      filterType === 'ALL' ||
      r.type === filterType ||
      r.type === 'BOTH';

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.gstin.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q);

    return matchesStatus && matchesType && matchesSearch;
  });

  // -------------------------------------------------------------
  // CONFIRM IMPORT
  // -------------------------------------------------------------
  const handleConfirmImport = () => {
    const validPartiesToImport: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[] = parsedRows
      .filter(r => r.status !== 'ERROR')
      .map(r => ({
        type: r.type,
        name: r.name,
        companyName: r.companyName || undefined,
        gstin: r.gstin || undefined,
        pan: r.pan || undefined,
        phone: r.phone,
        email: r.email || undefined,
        billingAddress: r.billingAddress,
        city: r.city,
        state: r.state,
        stateCode: r.stateCode,
        pincode: r.pincode,
        creditLimit: r.creditLimit,
        creditPeriodDays: r.creditPeriodDays,
        openingBalance: r.openingBalance
      }));

    if (validPartiesToImport.length === 0) {
      alert('No valid contacts to import. Please resolve the errors indicated in the preview.');
      return;
    }

    onImport(validPartiesToImport, updateExisting);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setFileName('');
    setParsedRows([]);
    setActiveStep('UPLOAD');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto modal-overlay">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[98vw] md:max-w-4xl lg:max-w-5xl my-auto flex flex-col max-h-[96dvh] sm:max-h-[92dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 text-cyan-300 border border-indigo-400/20 flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 truncate">
                <span>Bulk CSV Contacts Upload</span>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-cyan-400/20 text-cyan-300 rounded-full border border-cyan-400/30">
                  Contacts
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Import client directories, vendor accounts, GSTIN master data, credit terms & opening ledgers in bulk.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper / Subheader */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveStep('UPLOAD')}
              className={`flex items-center gap-2 font-semibold cursor-pointer ${
                activeStep === 'UPLOAD' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                activeStep === 'UPLOAD' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                1
              </span>
              <span>Upload CSV File</span>
            </button>

            <span className="text-slate-300 dark:text-slate-600">→</span>

            <button
              onClick={() => parsedRows.length > 0 && setActiveStep('PREVIEW')}
              disabled={parsedRows.length === 0}
              className={`flex items-center gap-2 font-semibold cursor-pointer ${
                activeStep === 'PREVIEW' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 disabled:opacity-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                activeStep === 'PREVIEW' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                2
              </span>
              <span>Review & Validation ({parsedRows.length} Contacts)</span>
            </button>
          </div>

          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample Contacts CSV Template</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900">
          {/* STEP 1: UPLOAD SCREEN */}
          {activeStep === 'UPLOAD' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-4 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Click to select CSV or drag & drop contact list here
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                  Supports customer and vendor directories with GSTIN, phone, addresses, state codes, and opening ledger balances.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Auto-extracts PAN and state codes directly from GSTIN</span>
                </div>
              </div>

              {/* Guidelines */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>CSV Fields & Formats</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">* Only Party Name is strictly required</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Party Type</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">CUSTOMER, VENDOR, BOTH</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Party Name *</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Person or Firm Name</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">GSTIN (15-digit)</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">e.g. 07AAAAA0000A1Z5</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Opening Balance</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">+ve: Receivable, -ve: Payable</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Pre-filled Contacts Sample File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION SCREEN */}
          {activeStep === 'PREVIEW' && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Contacts</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{parsedRows.length}</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Customers / Vendors</span>
                  <div className="text-base font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">
                    {customerCount} Cust • {vendorCount} Vend
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Opening Receivables (Dr)</span>
                  <div className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-0.5 font-mono">
                    {formatCurrency(totalReceivables, currencySymbol)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Opening Payables (Cr)</span>
                  <div className="text-base font-bold text-rose-800 dark:text-rose-300 mt-0.5 font-mono">
                    {formatCurrency(totalPayables, currencySymbol)}
                  </div>
                </div>
              </div>

              {/* Filters & Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-xs">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All Types
                    </button>
                    <button
                      onClick={() => setFilterType('CUSTOMER')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterType === 'CUSTOMER' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Customers
                    </button>
                    <button
                      onClick={() => setFilterType('VENDOR')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterType === 'VENDOR' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Vendors
                    </button>
                  </div>

                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-xs">
                    <button
                      onClick={() => setFilterStatus('ALL')}
                      className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterStatus === 'ALL' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({parsedRows.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('VALID')}
                      className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterStatus === 'VALID' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Valid ({validRowsCount})
                    </button>
                    {warningRowsCount > 0 && (
                      <button
                        onClick={() => setFilterStatus('WARNING')}
                        className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                          filterStatus === 'WARNING' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Adjusted ({warningRowsCount})
                      </button>
                    )}
                    {errorRowsCount > 0 && (
                      <button
                        onClick={() => setFilterStatus('ERROR')}
                        className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                          filterStatus === 'ERROR' ? 'bg-rose-600 text-white' : 'text-rose-600 dark:text-rose-400 hover:text-rose-900'
                        }`}
                      >
                        Errors ({errorRowsCount})
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contact, GSTIN, phone..."
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>Update if GSTIN, phone or name matches</span>
                  </label>

                  <button
                    onClick={handleReset}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Clear file and upload again"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Contact / Party Name</th>
                      <th className="py-2.5 px-3">GSTIN / PAN</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">City, State</th>
                      <th className="py-2.5 px-3 text-right">Opening Balance</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {displayRows.map((row) => (
                      <tr 
                        key={row.index} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                          row.status === 'ERROR' ? 'bg-rose-50/40 dark:bg-rose-950/20' : row.status === 'WARNING' ? 'bg-amber-50/20 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-400 dark:text-slate-500 text-[11px]">{row.index}</td>
                        <td className="py-2.5 px-3">
                          {row.status === 'VALID' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          )}
                          {row.status === 'WARNING' && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 cursor-help"
                              title={row.messages.join('\n')}
                            >
                              <AlertTriangle className="w-3 h-3" /> Adjusted
                            </span>
                          )}
                          {row.status === 'ERROR' && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 cursor-help"
                              title={row.messages.join('\n')}
                            >
                              <X className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.type === 'CUSTOMER' 
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300' 
                              : row.type === 'VENDOR' 
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300' 
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.name || <span className="text-rose-500 italic">Missing Name</span>}
                          </div>
                          {row.companyName && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{row.companyName}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 font-semibold">
                            {row.gstin || <span className="text-slate-400 dark:text-slate-500 font-normal">Unregistered</span>}
                          </div>
                          {row.pan && (
                            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">PAN: {row.pan}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {row.phone}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <div>{row.city}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{row.state} ({row.stateCode})</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className={`font-bold ${
                            row.openingBalance > 0 
                              ? 'text-emerald-700 dark:text-emerald-400' 
                              : row.openingBalance < 0 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {formatCurrency(Math.abs(row.openingBalance), currencySymbol)}
                            {row.openingBalance > 0 ? ' (Dr)' : row.openingBalance < 0 ? ' (Cr)' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.index)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                            title="Exclude from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeStep === 'PREVIEW' ? (
              <span>
                File: <strong className="text-slate-800 dark:text-slate-200">{fileName}</strong> • Ready to import{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">{validRowsCount}</strong> contacts
              </span>
            ) : (
              <span>Rapid CSV bulk loader for customer, vendor and ledger setups</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {activeStep === 'PREVIEW' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validRowsCount === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Import {validRowsCount} Contacts</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
