import React, { useState, useRef } from 'react';
import { Product, GstTaxRate } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Check, 
  RefreshCw, 
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sparkles,
  Trash2,
  Filter
} from 'lucide-react';

interface ParsedProductRow {
  index: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  hsnCode: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: GstTaxRate;
  currentStock: number;
  minStockAlert: number;
  isService: boolean;
  description: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  messages: string[];
}

interface BulkProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Omit<Product, 'id' | 'createdAt'>[], updateExisting: boolean) => void;
  currencySymbol?: string;
}

export const BulkProductUploadModal: React.FC<BulkProductUploadModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currencySymbol = '₹'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');
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
      'Product Name*',
      'SKU',
      'Barcode',
      'Category',
      'HSN Code',
      'Unit',
      'Purchase Price',
      'Selling Price',
      'GST Rate (%)',
      'Current Stock',
      'Min Stock Alert',
      'Is Service (TRUE/FALSE)',
      'Description'
    ];

    const sampleRows = [
      [
        'Dell UltraSharp 27" 4K Monitor',
        'DELL-U2723QE',
        '8901234567890',
        'Hardware & Peripherals',
        '8528',
        'PCS',
        '42000',
        '54990',
        '18',
        '15',
        '3',
        'FALSE',
        '4K UHD USB-C Hub Monitor with IPS Black technology'
      ],
      [
        'Logitech MX Master 3S Wireless Mouse',
        'LOGI-MX3S-GR',
        '8901234567891',
        'Accessories',
        '8471',
        'PCS',
        '6500',
        '8999',
        '18',
        '24',
        '5',
        'FALSE',
        'Ergonomic wireless performance mouse'
      ],
      [
        'Annual IT Support & Maintenance Contract',
        'SRV-AMC-2026',
        '',
        'IT Services',
        '998313',
        'SET',
        '0',
        '25000',
        '18',
        '0',
        '0',
        'TRUE',
        'Annual enterprise server and workstation maintenance'
      ],
      [
        'SanDisk Extreme 1TB Portable NVMe SSD',
        'SD-1TB-NVME',
        '8901234567893',
        'Storage',
        '8523',
        'PCS',
        '8500',
        '11999',
        '18',
        '18',
        '4',
        'FALSE',
        'Rugged 1050MB/s USB 3.2 Gen 2 portable SSD'
      ],
      [
        'A4 Executive Copy Paper 75GSM (500 Sheets)',
        'PPR-A4-75G',
        '8901234567894',
        'Office Supplies',
        '4802',
        'REAM',
        '260',
        '350',
        '12',
        '100',
        '20',
        'FALSE',
        'Premium high brightness multipurpose paper'
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
    link.setAttribute('download', 'zookabusiness_inventory_sample_template.csv');
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

        const nameIdx = findIndex(['productname', 'itemname', 'name', 'item', 'title', 'description']);
        const skuIdx = findIndex(['sku', 'itemcode', 'code', 'partnumber', 'model']);
        const barcodeIdx = findIndex(['barcode', 'upc', 'ean', 'gtin']);
        const categoryIdx = findIndex(['category', 'group', 'department', 'type']);
        const hsnIdx = findIndex(['hsn', 'hsncode', 'sac', 'hsnsac']);
        const unitIdx = findIndex(['unit', 'uom', 'unitofmeasurement', 'pkg']);
        const purchasePriceIdx = findIndex(['purchaseprice', 'purchase', 'cost', 'costprice', 'buyrate', 'rate']);
        const sellingPriceIdx = findIndex(['sellingprice', 'selling', 'price', 'mrp', 'saleprice', 'sellrate']);
        const gstRateIdx = findIndex(['gstrate', 'gst', 'taxrate', 'tax', 'taxpercent']);
        const stockIdx = findIndex(['currentstock', 'stock', 'openingstock', 'qty', 'quantity', 'balance']);
        const minAlertIdx = findIndex(['minstockalert', 'minstock', 'lowstock', 'reorder', 'alert']);
        const isServiceIdx = findIndex(['isservice', 'service']);
        const descIdx = findIndex(['description', 'details', 'remarks', 'notes']);

        const parsedList: ParsedProductRow[] = [];

        for (let r = 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0 || row.every(cell => !cell)) continue;

          const messages: string[] = [];
          let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';

          // 1. Name
          const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : (row[0] || '').trim();
          if (!rawName) {
            status = 'ERROR';
            messages.push('Missing product name (Required).');
          }

          // 2. SKU
          let rawSku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim() : '';
          if (!rawSku && rawName) {
            rawSku = `SKU-${Date.now().toString().slice(-4)}${r}`;
            if (status !== 'ERROR') status = 'WARNING';
            messages.push(`Auto-generated SKU: ${rawSku}`);
          }

          // 3. Barcode
          const rawBarcode = barcodeIdx !== -1 && row[barcodeIdx] ? row[barcodeIdx].trim() : '';

          // 4. Category
          const rawCategory = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].trim() : 'General';

          // 5. HSN Code
          let rawHsn = hsnIdx !== -1 && row[hsnIdx] ? row[hsnIdx].trim().replace(/[^0-9]/g, '') : '';
          if (!rawHsn) {
            rawHsn = '8471';
            if (status !== 'ERROR') status = 'WARNING';
            messages.push('Defaulted HSN to 8471');
          }

          // 6. Unit
          const rawUnit = unitIdx !== -1 && row[unitIdx] ? row[unitIdx].trim().toUpperCase() : 'PCS';

          // 7. Purchase & Selling Prices
          const rawPurPrice = purchasePriceIdx !== -1 && row[purchasePriceIdx] 
            ? parseFloat(row[purchasePriceIdx].replace(/[^0-9.]/g, '')) || 0 
            : 0;

          const rawSellPrice = sellingPriceIdx !== -1 && row[sellingPriceIdx] 
            ? parseFloat(row[sellingPriceIdx].replace(/[^0-9.]/g, '')) || 0 
            : rawPurPrice * 1.25;

          // 8. GST Rate
          let rawGst = gstRateIdx !== -1 && row[gstRateIdx] 
            ? parseInt(row[gstRateIdx].replace(/[^0-9]/g, ''), 10) 
            : 18;
          
          if (![0, 5, 12, 18, 28].includes(rawGst)) {
            rawGst = 18;
            if (status !== 'ERROR') status = 'WARNING';
            messages.push('Normalized GST rate to standard 18% slab');
          }

          // 9. Stock & Min Alert
          const rawStock = stockIdx !== -1 && row[stockIdx] 
            ? parseFloat(row[stockIdx].replace(/[^0-9.-]/g, '')) || 0 
            : 0;

          const rawMinAlert = minAlertIdx !== -1 && row[minAlertIdx] 
            ? parseFloat(row[minAlertIdx].replace(/[^0-9.]/g, '')) || 5 
            : 5;

          // 10. Service flag
          const rawIsService = isServiceIdx !== -1 && row[isServiceIdx] 
            ? ['true', 'yes', '1', 'service'].includes(row[isServiceIdx].toLowerCase().trim())
            : false;

          // 11. Description
          const rawDesc = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';

          parsedList.push({
            index: r,
            name: rawName,
            sku: rawSku,
            barcode: rawBarcode,
            category: rawCategory,
            hsnCode: rawHsn,
            unit: rawUnit,
            purchasePrice: rawPurPrice,
            sellingPrice: rawSellPrice,
            gstRate: rawGst as GstTaxRate,
            currentStock: rawStock,
            minStockAlert: rawMinAlert,
            isService: rawIsService,
            description: rawDesc,
            status,
            messages
          });
        }

        setParsedRows(parsedList);
        setActiveStep('PREVIEW');
      } catch (err) {
        alert('Failed to parse the CSV file. Please make sure it is a valid CSV format.');
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
  const totalStockValuation = parsedRows
    .filter(r => r.status !== 'ERROR' && !r.isService)
    .reduce((sum, r) => sum + (r.currentStock * r.purchasePrice), 0);

  const displayRows = parsedRows.filter(r => {
    const matchesFilter = 
      filterStatus === 'ALL' ||
      (filterStatus === 'VALID' && r.status === 'VALID') ||
      (filterStatus === 'WARNING' && r.status === 'WARNING') ||
      (filterStatus === 'ERROR' && r.status === 'ERROR');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.hsnCode.includes(q);

    return matchesFilter && matchesSearch;
  });

  // -------------------------------------------------------------
  // CONFIRM IMPORT
  // -------------------------------------------------------------
  const handleConfirmImport = () => {
    const validItemsToImport: Omit<Product, 'id' | 'createdAt'>[] = parsedRows
      .filter(r => r.status !== 'ERROR')
      .map(r => ({
        name: r.name,
        sku: r.sku,
        barcode: r.barcode || undefined,
        description: r.description || undefined,
        category: r.category,
        hsnCode: r.hsnCode,
        unit: r.unit,
        purchasePrice: r.purchasePrice,
        sellingPrice: r.sellingPrice,
        gstRate: r.gstRate,
        currentStock: r.currentStock,
        minStockAlert: r.minStockAlert,
        isService: r.isService
      }));

    if (validItemsToImport.length === 0) {
      alert('No valid products to import. Please check for errors in the table.');
      return;
    }

    onImport(validItemsToImport, updateExisting);
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
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[98vw] md:max-w-4xl lg:max-w-5xl my-auto flex flex-col max-h-[96dvh] sm:max-h-[92dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 text-cyan-300 border border-indigo-400/20 flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 truncate">
                <span>Bulk CSV Product Upload</span>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-cyan-400/20 text-cyan-300 rounded-full border border-cyan-400/30">
                  Inventory Setup
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Import product catalogs, HSN codes, barcode tags, purchase/selling rates, and opening stock in seconds.
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

        {/* Stepper / Progress indicator */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveStep('UPLOAD')}
              className={`flex items-center gap-2 font-semibold cursor-pointer ${
                activeStep === 'UPLOAD' ? 'text-indigo-600 font-bold' : 'text-slate-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                activeStep === 'UPLOAD' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                1
              </span>
              <span>Upload CSV File</span>
            </button>

            <span className="text-slate-300">→</span>

            <button
              onClick={() => parsedRows.length > 0 && setActiveStep('PREVIEW')}
              disabled={parsedRows.length === 0}
              className={`flex items-center gap-2 font-semibold cursor-pointer ${
                activeStep === 'PREVIEW' ? 'text-indigo-600 font-bold' : 'text-slate-500 disabled:opacity-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                activeStep === 'PREVIEW' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              <span>Review & Validation ({parsedRows.length} Items)</span>
            </button>
          </div>

          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV Template</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: UPLOAD SCREEN */}
          {activeStep === 'UPLOAD' && (
            <div className="space-y-6">
              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:scale-110 flex items-center justify-center mx-auto mb-4 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  Click to select CSV or drag & drop file here
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                  Supports comma-separated values (.csv) with product names, SKU, Barcode, HSN, rates, GST %, and opening quantities.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Smart auto-mapping for missing columns & GST slabs</span>
                </div>
              </div>

              {/* Template Guidelines Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <span>CSV Format & Columns Reference</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">* Only Product Name is strictly required</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="font-bold text-slate-800 block">Product Name *</span>
                    <span className="text-[10px] text-slate-500">e.g. Dell Monitor 27"</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="font-bold text-slate-800 block">HSN Code</span>
                    <span className="text-[10px] text-slate-500">e.g. 8471, 8528</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="font-bold text-slate-800 block">GST Rate (%)</span>
                    <span className="text-[10px] text-slate-500">0, 5, 12, 18, or 28</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="font-bold text-slate-800 block">Unit of Measure</span>
                    <span className="text-[10px] text-slate-500">PCS, KGS, BOX, NOS</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Pre-filled Excel/CSV Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION SCREEN */}
          {activeStep === 'PREVIEW' && (
            <div className="space-y-4">
              {/* Summary KPIs & Options Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Parsed Rows</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{parsedRows.length}</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Valid to Import</span>
                  <div className="text-xl font-bold text-emerald-900 mt-0.5">{validRowsCount} items</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Auto-Adjusted</span>
                  <div className="text-xl font-bold text-amber-900 mt-0.5">{warningRowsCount} items</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Opening Stock Value</span>
                  <div className="text-xl font-bold text-indigo-950 mt-0.5 font-mono">
                    {formatCurrency(totalStockValuation, currencySymbol)}
                  </div>
                </div>
              </div>

              {/* Filters & Options Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs">
                    <button
                      onClick={() => setFilterStatus('ALL')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterStatus === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({parsedRows.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('VALID')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterStatus === 'VALID' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Valid
                    </button>
                    <button
                      onClick={() => setFilterStatus('WARNING')}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        filterStatus === 'WARNING' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Warnings ({warningRowsCount})
                    </button>
                    {errorRowsCount > 0 && (
                      <button
                        onClick={() => setFilterStatus('ERROR')}
                        className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                          filterStatus === 'ERROR' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:text-rose-900'
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
                    placeholder="Search in preview..."
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>Update existing items if SKU or Name matches</span>
                  </label>

                  <button
                    onClick={handleReset}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Clear file and upload again"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU / Code</th>
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                      <th className="py-2.5 px-3 text-center">GST %</th>
                      <th className="py-2.5 px-3 text-right">Stock</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayRows.map((row) => (
                      <tr 
                        key={row.index} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          row.status === 'ERROR' ? 'bg-rose-50/40' : row.status === 'WARNING' ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{row.index}</td>
                        <td className="py-2.5 px-3">
                          {row.status === 'VALID' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          )}
                          {row.status === 'WARNING' && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 cursor-help"
                              title={row.messages.join('\n')}
                            >
                              <AlertTriangle className="w-3 h-3" /> Adjusted
                            </span>
                          )}
                          {row.status === 'ERROR' && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 cursor-help"
                              title={row.messages.join('\n')}
                            >
                              <X className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{row.name || <span className="text-rose-500 italic">Missing Name</span>}</div>
                          {row.description && (
                            <div className="text-[10px] text-slate-400 line-clamp-1">{row.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{row.sku}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{row.hsnCode}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.category}</td>
                        <td className="py-2.5 px-3 text-slate-600 uppercase font-mono text-[11px]">{row.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(row.purchasePrice, currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.sellingPrice, currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {row.gstRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                          {row.isService ? 'Service' : `${row.currentStock} ${row.unit}`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.index)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                            title="Exclude this item from import"
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {activeStep === 'PREVIEW' ? (
              <span>
                File: <strong className="text-slate-800">{fileName}</strong> • Ready to import{' '}
                <strong className="text-emerald-700">{validRowsCount}</strong> items
              </span>
            ) : (
              <span>Fast CSV bulk loader for product catalogs, rates & opening stock</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
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
                <span>Import {validRowsCount} Products</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
