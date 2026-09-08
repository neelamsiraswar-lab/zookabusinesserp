import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calculator, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Scale, 
  ArrowUpRight, 
  ArrowDownLeft,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Package,
  Eye,
  Filter,
  Printer,
  RefreshCw,
  X,
  Building2,
  Tag,
  Truck,
  Plus,
  Edit2,
  Trash2,
  Cloud,
  Database,
  Copy,
  Check,
  Upload,
  BookOpen,
  HelpCircle,
  HardDrive
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { HSN_MASTER_LIST, COMMON_HSN_CODES, STANDARD_UNITS } from '../../utils/constants';
import { CustomHsnCode, GstTaxRate } from '../../types';
import { ModalWrapper } from '../common/Portal';

type GstTabType = 'gstr1' | 'gstr3b' | 'sale_register' | 'purchase_register' | 'hsn_finder';
type FilterMode = 'month' | 'date_range';

export const GstReturnsView: React.FC = () => {
  const { 
    business, 
    invoices, 
    purchaseBills, 
    showToast,
    customHsnCodes,
    addCustomHsnCode,
    updateCustomHsnCode,
    deleteCustomHsnCode,
    bulkImportCustomHsnCodes,
    currentCompanyId
  } = useApp();
  
  const [returnType, setReturnType] = useState<GstTabType>('sale_register');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('August 2026');
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');

  // HSN & SAC Tariff Directory State
  const [hsnScopeFilter, setHsnScopeFilter] = useState<'ALL' | 'CUSTOM' | 'STANDARD'>('ALL');
  const [hsnTypeFilter, setHsnTypeFilter] = useState<'ALL' | 'HSN' | 'SAC'>('ALL');
  const [hsnRateFilter, setHsnRateFilter] = useState<'ALL' | '0' | '5' | '12' | '18' | '28'>('ALL');

  // HSN Add/Edit Modal State
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false);
  const [editingHsnId, setEditingHsnId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'HSN' | 'SAC'>('HSN');
  const [formGstRate, setFormGstRate] = useState<GstTaxRate>(18);
  const [formUqc, setFormUqc] = useState('PCS');

  // HSN Bulk Import Modal State
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');

  // Delete Confirm Modal State
  const [deleteConfirmHsn, setDeleteConfirmHsn] = useState<CustomHsnCode | null>(null);

  // Copied feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // -------------------------------------------------------------
  // SALES & PURCHASE REGISTER FILTERS (Month & Date Filters)
  // -------------------------------------------------------------
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08'); // YYYY-MM or 'ALL' or 'Q2_2026' or 'FY_2026_27'
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Specific register filters
  const [salesTypeFilter, setSalesTypeFilter] = useState<'ALL' | 'B2B' | 'B2C' | 'INTER_STATE' | 'INTRA_STATE' | 'POS'>('ALL');
  const [purchaseItcFilter, setPurchaseItcFilter] = useState<'ALL' | 'ELIGIBLE_ALL' | 'ELIGIBLE_CAPITAL_GOODS' | 'INELIGIBLE_17_5' | 'INTER_STATE' | 'INTRA_STATE'>('ALL');

  // Expanded row details for itemized line item audit
  const [expandedSaleInvIds, setExpandedSaleInvIds] = useState<Record<string, boolean>>({});
  const [expandedPurchaseBillIds, setExpandedPurchaseBillIds] = useState<Record<string, boolean>>({});

  const toggleSaleInvoiceExpand = (id: string) => {
    setExpandedSaleInvIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const togglePurchaseBillExpand = (id: string) => {
    setExpandedPurchaseBillIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Quick Date Range helper
  const handleQuickPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_FY' | 'ALL_TIME') => {
    if (preset === 'THIS_MONTH') {
      setFilterMode('month');
      setSelectedMonth('2026-08');
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
    } else if (preset === 'LAST_MONTH') {
      setFilterMode('month');
      setSelectedMonth('2026-07');
      setStartDate('2026-07-01');
      setEndDate('2026-07-31');
    } else if (preset === 'THIS_QUARTER') {
      setFilterMode('month');
      setSelectedMonth('Q2_2026');
      setStartDate('2026-07-01');
      setEndDate('2026-09-30');
    } else if (preset === 'THIS_FY') {
      setFilterMode('month');
      setSelectedMonth('FY_2026_27');
      setStartDate('2026-04-01');
      setEndDate('2027-03-31');
    } else if (preset === 'ALL_TIME') {
      setFilterMode('month');
      setSelectedMonth('ALL');
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper date checker
  const isDateInRange = (dateStr: string): boolean => {
    if (!dateStr) return true;
    if (filterMode === 'month') {
      if (selectedMonth === 'ALL') return true;
      if (selectedMonth === 'Q1_2026') return dateStr >= '2026-04-01' && dateStr <= '2026-06-30';
      if (selectedMonth === 'Q2_2026') return dateStr >= '2026-07-01' && dateStr <= '2026-09-30';
      if (selectedMonth === 'FY_2026_27') return dateStr >= '2026-04-01' && dateStr <= '2027-03-31';
      return dateStr.startsWith(selectedMonth);
    } else {
      // Date Range mode
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    }
  };

  // -------------------------------------------------------------
  // FILTERED SALES REGISTER DATA
  // -------------------------------------------------------------
  const filteredSalesInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.status === 'CANCELLED') return false;

      // 1. Date / Month Filter
      if (!isDateInRange(inv.invoiceDate)) return false;

      // 2. Search Query (Invoice #, Customer Name, GSTIN, State, Product, HSN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInv = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesCust = inv.customerName.toLowerCase().includes(q);
        const matchesGstin = (inv.customerGstin || '').toLowerCase().includes(q);
        const matchesState = (inv.placeOfSupplyState || inv.customerState || '').toLowerCase().includes(q);
        const matchesProduct = (inv.items || []).some(item => 
          (item.name || '').toLowerCase().includes(q) ||
          (item.hsnCode || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
        if (!matchesInv && !matchesCust && !matchesGstin && !matchesState && !matchesProduct) return false;
      }

      // 3. Tax / Supply Category Filter
      if (salesTypeFilter === 'B2B') {
        return Boolean(inv.customerGstin && inv.customerGstin.trim().length === 15);
      }
      if (salesTypeFilter === 'B2C') {
        return !inv.customerGstin || inv.customerGstin.trim().length < 15;
      }
      if (salesTypeFilter === 'INTER_STATE') {
        return inv.isInterState;
      }
      if (salesTypeFilter === 'INTRA_STATE') {
        return !inv.isInterState;
      }
      if (salesTypeFilter === 'POS') {
        return inv.invoiceType === 'POS_SALE' || inv.notes?.toLowerCase().includes('pos');
      }

      return true;
    });
  }, [invoices, filterMode, selectedMonth, startDate, endDate, searchQuery, salesTypeFilter]);

  // Sales Register Aggregates
  const salesTotals = useMemo(() => {
    return filteredSalesInvoices.reduce((acc, inv) => {
      acc.count += 1;
      acc.taxable += inv.subTotalTaxable || 0;
      acc.cgst += inv.totalCgst || 0;
      acc.sgst += inv.totalSgst || 0;
      acc.igst += inv.totalIgst || 0;
      acc.cess += inv.totalCess || 0;
      acc.totalTax += inv.totalTax || 0;
      acc.grandTotal += inv.grandTotal || 0;
      return acc;
    }, { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, totalTax: 0, grandTotal: 0 });
  }, [filteredSalesInvoices]);

  // -------------------------------------------------------------
  // FILTERED PURCHASE REGISTER DATA
  // -------------------------------------------------------------
  const filteredPurchaseBills = useMemo(() => {
    return purchaseBills.filter(bill => {
      // 1. Date / Month Filter
      if (!isDateInRange(bill.billDate)) return false;

      // 2. Search Query (Bill #, Vendor Name, GSTIN, Products, HSN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBill = bill.billNumber.toLowerCase().includes(q) || (bill.vendorInvoiceNumber || '').toLowerCase().includes(q);
        const matchesVendor = bill.vendorName.toLowerCase().includes(q);
        const matchesGstin = (bill.vendorGstin || '').toLowerCase().includes(q);
        const matchesProduct = (bill.items || []).some(item => 
          (item.name || '').toLowerCase().includes(q) ||
          (item.hsnCode || '').toLowerCase().includes(q)
        );
        if (!matchesBill && !matchesVendor && !matchesGstin && !matchesProduct) return false;
      }

      // 3. ITC Eligibility Filter
      if (purchaseItcFilter === 'ELIGIBLE_ALL') {
        return bill.itcEligibility === 'ELIGIBLE_ALL';
      }
      if (purchaseItcFilter === 'ELIGIBLE_CAPITAL_GOODS') {
        return bill.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS';
      }
      if (purchaseItcFilter === 'INELIGIBLE_17_5') {
        return bill.itcEligibility === 'INELIGIBLE_17_5';
      }
      if (purchaseItcFilter === 'INTER_STATE') {
        return bill.isInterState;
      }
      if (purchaseItcFilter === 'INTRA_STATE') {
        return !bill.isInterState;
      }

      return true;
    });
  }, [purchaseBills, filterMode, selectedMonth, startDate, endDate, searchQuery, purchaseItcFilter]);

  // Purchase Register Aggregates
  const purchaseTotals = useMemo(() => {
    return filteredPurchaseBills.reduce((acc, bill) => {
      acc.count += 1;
      acc.taxable += bill.subTotalTaxable || 0;
      acc.cgst += bill.totalCgst || 0;
      acc.sgst += bill.totalSgst || 0;
      acc.igst += bill.totalIgst || 0;
      acc.totalTax += bill.totalTax || 0;
      acc.grandTotal += bill.grandTotal || 0;
      if (bill.itcEligibility !== 'INELIGIBLE_17_5') {
        acc.eligibleItc += bill.totalTax || 0;
      } else {
        acc.blockedItc += bill.totalTax || 0;
      }
      return acc;
    }, { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0, eligibleItc: 0, blockedItc: 0 });
  }, [filteredPurchaseBills]);

  // -------------------------------------------------------------
  // CSV EXPORT HANDLERS
  // -------------------------------------------------------------
  const handleExportSalesCsv = () => {
    if (filteredSalesInvoices.length === 0) {
      showToast('error', 'No Data to Export', 'No sales records match the selected date/month filter.');
      return;
    }

    const headers = [
      'Sr No',
      'Invoice Date',
      'Invoice Number',
      'Invoice Type',
      'Customer Name',
      'Customer GSTIN',
      'Products / Items',
      'HSN / SAC Code',
      'Place of Supply',
      'Supply Type',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Cess (INR)',
      'Total GST (INR)',
      'Invoice Value (INR)',
      'Payment Status'
    ];

    const rows = filteredSalesInvoices.map((inv, idx) => {
      const productDetails = (inv.items || []).map(it => `${it.name.replace(/"/g, '""')} (Qty: ${it.quantity} ${it.unit || 'NOS'})`).join('; ');
      const hsnCodes = Array.from(new Set((inv.items || []).map(it => it.hsnCode).filter(Boolean))).join(', ') || 'N/A';

      return [
        idx + 1,
        inv.invoiceDate,
        `"${inv.invoiceNumber}"`,
        inv.invoiceType,
        `"${inv.customerName.replace(/"/g, '""')}"`,
        inv.customerGstin || 'Unregistered / B2C',
        `"${productDetails}"`,
        `"${hsnCodes}"`,
        `"${inv.placeOfSupplyStateCode} - ${inv.placeOfSupplyState}"`,
        inv.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
        inv.subTotalTaxable.toFixed(2),
        inv.totalCgst.toFixed(2),
        inv.totalSgst.toFixed(2),
        inv.totalIgst.toFixed(2),
        inv.totalCess.toFixed(2),
        inv.totalTax.toFixed(2),
        inv.grandTotal.toFixed(2),
        inv.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Sale_Register_${business.gstin || 'Tax'}_${filterMode === 'month' ? selectedMonth : 'Custom'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Sale Register Exported', `Exported ${filteredSalesInvoices.length} sales records to CSV with Products & HSN breakdown.`);
  };

  const handleExportPurchaseCsv = () => {
    if (filteredPurchaseBills.length === 0) {
      showToast('error', 'No Data to Export', 'No purchase records match the selected date/month filter.');
      return;
    }

    const headers = [
      'Sr No',
      'Bill Date',
      'Internal Bill No',
      'Vendor Inv No',
      'Vendor Name',
      'Vendor GSTIN',
      'Products / Items',
      'HSN / SAC Code',
      'Supply Type',
      'ITC Eligibility',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total GST / ITC (INR)',
      'Bill Grand Total (INR)',
      'Payment Status'
    ];

    const rows = filteredPurchaseBills.map((bill, idx) => {
      const productDetails = (bill.items || []).map(it => `${it.name.replace(/"/g, '""')} (Qty: ${it.quantity} ${it.unit || 'NOS'})`).join('; ');
      const hsnCodes = Array.from(new Set((bill.items || []).map(it => it.hsnCode).filter(Boolean))).join(', ') || 'N/A';

      return [
        idx + 1,
        bill.billDate,
        `"${bill.billNumber}"`,
        `"${bill.vendorInvoiceNumber || ''}"`,
        `"${bill.vendorName.replace(/"/g, '""')}"`,
        bill.vendorGstin || 'Unregistered',
        `"${productDetails}"`,
        `"${hsnCodes}"`,
        bill.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
        bill.itcEligibility,
        bill.subTotalTaxable.toFixed(2),
        bill.totalCgst.toFixed(2),
        bill.totalSgst.toFixed(2),
        bill.totalIgst.toFixed(2),
        bill.totalTax.toFixed(2),
        bill.grandTotal.toFixed(2),
        bill.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Purchase_Register_${business.gstin || 'Tax'}_${filterMode === 'month' ? selectedMonth : 'Custom'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Purchase Register Exported', `Exported ${filteredPurchaseBills.length} purchase records to CSV with Products & HSN breakdown.`);
  };

  // -------------------------------------------------------------
  // GSTR-1 CALCULATIONS (Standard Statutory View)
  // -------------------------------------------------------------
  const activeInvoices = invoices.filter(i => i.status !== 'CANCELLED');
  const b2bInvoices = activeInvoices.filter(i => Boolean(i.customerGstin && i.customerGstin.trim().length === 15));
  const b2csInvoices = activeInvoices.filter(i => !i.customerGstin && !(i.isInterState && i.grandTotal > 250000));
  
  // HSN Summary aggregation
  const hsnSummaryMap: { [hsn: string]: { hsn: string; desc: string; uqc: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number; total: number } } = {};
  activeInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const code = item.hsnCode || '9999';
      if (!hsnSummaryMap[code]) {
        hsnSummaryMap[code] = {
          hsn: code,
          desc: item.name,
          uqc: item.unit || 'NOS',
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cess: 0,
          total: 0
        };
      }
      hsnSummaryMap[code].qty += item.quantity;
      hsnSummaryMap[code].taxable += item.taxableAmount;
      hsnSummaryMap[code].cgst += item.cgstAmount;
      hsnSummaryMap[code].sgst += item.sgstAmount;
      hsnSummaryMap[code].igst += item.igstAmount;
      hsnSummaryMap[code].cess += item.cessAmount || 0;
      hsnSummaryMap[code].total += item.totalAmount;
    });
  });
  const hsnSummaryList = Object.values(hsnSummaryMap);

  const b2bTaxable = b2bInvoices.reduce((s, i) => s + i.subTotalTaxable, 0);
  const b2csTaxable = b2csInvoices.reduce((s, i) => s + i.subTotalTaxable, 0);
  const b2csCgst = b2csInvoices.reduce((s, i) => s + i.totalCgst, 0);
  const b2csSgst = b2csInvoices.reduce((s, i) => s + i.totalSgst, 0);

  const totalOutwardTaxable = activeInvoices.reduce((s, i) => s + i.subTotalTaxable, 0);
  const totalOutwardCgst = activeInvoices.reduce((s, i) => s + i.totalCgst, 0);
  const totalOutwardSgst = activeInvoices.reduce((s, i) => s + i.totalSgst, 0);
  const totalOutwardIgst = activeInvoices.reduce((s, i) => s + i.totalIgst, 0);
  const totalOutwardTax = activeInvoices.reduce((s, i) => s + i.totalTax, 0);

  // -------------------------------------------------------------
  // GSTR-3B CALCULATIONS (Eligible ITC from Purchases)
  // -------------------------------------------------------------
  const eligiblePurchases = purchaseBills.filter(b => b.itcEligibility !== 'INELIGIBLE_17_5');
  const totalItcCgst = eligiblePurchases.reduce((s, b) => s + b.totalCgst, 0);
  const totalItcSgst = eligiblePurchases.reduce((s, b) => s + b.totalSgst, 0);
  const totalItcIgst = eligiblePurchases.reduce((s, b) => s + b.totalIgst, 0);
  const totalItcAvailable = eligiblePurchases.reduce((s, b) => s + b.totalTax, 0);
  const blockedPurchases = purchaseBills.filter(b => b.itcEligibility === 'INELIGIBLE_17_5');
  const totalBlockedItc = blockedPurchases.reduce((s, b) => s + b.totalTax, 0);

  const netCgstPayable = Math.max(0, totalOutwardCgst - totalItcCgst);
  const netSgstPayable = Math.max(0, totalOutwardSgst - totalItcSgst);
  const netIgstPayable = Math.max(0, totalOutwardIgst - totalItcIgst);
  const totalNetCashPayable = netCgstPayable + netSgstPayable + netIgstPayable;

  // JSON Download for GSTR-1
  const handleDownloadGstr1Json = () => {
    const gstr1Data = {
      gstin: business.gstin,
      fp: '082026',
      cur_gt: totalOutwardTaxable,
      b2b: b2bInvoices.map(inv => ({
        ctin: inv.customerGstin,
        inv: [{
          inum: inv.invoiceNumber,
          idt: inv.invoiceDate,
          val: inv.grandTotal,
          pos: inv.placeOfSupplyStateCode,
          rchrg: inv.isReverseCharge ? 'Y' : 'N',
          inv_typ: 'R',
          itms: inv.items.map(it => ({
            num: 1,
            itm_det: {
              rt: it.gstRate,
              txval: it.taxableAmount,
              iamt: it.igstAmount,
              camt: it.cgstAmount,
              samt: it.sgstAmount,
              csamt: it.cessAmount || 0
            }
          }))
        }]
      })),
      b2cs: [
        {
          sply_ty: 'INTRA',
          rt: 18,
          txval: b2csTaxable,
          camt: b2csCgst,
          samt: b2csSgst,
          iamt: 0,
          csamt: 0
        }
      ],
      hsn: {
        data: hsnSummaryList.map((h, i) => ({
          num: i + 1,
          hsn_sc: h.hsn,
          desc: h.desc,
          uqc: h.uqc,
          qty: h.qty,
          val: h.total,
          txval: h.taxable,
          iamt: h.igst,
          camt: h.cgst,
          samt: h.sgst,
          csamt: h.cess
        }))
      },
      doc_issue: {
        doc_det: [{
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          from: invoices[invoices.length - 1]?.invoiceNumber || 'INV-0001',
          to: invoices[0]?.invoiceNumber || 'INV-0001',
          totnum: invoices.length,
          canc: invoices.filter(i => i.status === 'CANCELLED').length,
          net_issue: activeInvoices.length
        }]
      }
    };

    const blob = new Blob([JSON.stringify(gstr1Data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${business.gstin}_082026.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'GSTR-1 JSON Exported', 'Valid JSON file generated for GST Offline Utility.');
  };

  // -------------------------------------------------------------
  // HSN & SAC TARIFF DIRECTORY FUNCTIONS & COMPUTATION
  // -------------------------------------------------------------
  const combinedTariffDirectory = useMemo(() => {
    const q = hsnSearchQuery.trim().toLowerCase();

    // Map custom codes by uppercase code string
    const customCodesMap = new Map<string, CustomHsnCode>();
    customHsnCodes.forEach(c => {
      customCodesMap.set(c.code.toUpperCase(), c);
    });

    interface DirectoryEntry {
      id: string;
      code: string;
      description: string;
      type: 'HSN' | 'SAC';
      gstRate: GstTaxRate;
      uqc: string;
      isCustom: boolean;
      isStandard: boolean;
      customData?: CustomHsnCode;
    }

    const list: DirectoryEntry[] = [];

    // First add all custom codes (synced with cloud database)
    customHsnCodes.forEach(c => {
      list.push({
        id: c.id,
        code: c.code,
        description: c.description,
        type: c.type || (c.code.startsWith('99') ? 'SAC' : 'HSN'),
        gstRate: c.gstRate,
        uqc: c.uqc || (c.code.startsWith('99') ? 'OTH' : 'PCS'),
        isCustom: true,
        isStandard: COMMON_HSN_CODES.some(std => std.code === c.code),
        customData: c
      });
    });

    // Then add standard codes that aren't yet in custom list
    COMMON_HSN_CODES.forEach(std => {
      const isSac = std.code.startsWith('99');
      const alreadyCustom = customCodesMap.has(std.code.toUpperCase());
      if (!alreadyCustom) {
        list.push({
          id: `std-${std.code}`,
          code: std.code,
          description: std.description,
          type: isSac ? 'SAC' : 'HSN',
          gstRate: (std.defaultGst as GstTaxRate) || 18,
          uqc: isSac ? 'OTH' : 'PCS',
          isCustom: false,
          isStandard: true
        });
      }
    });

    // Apply filters
    return list.filter(item => {
      // Scope filter
      if (hsnScopeFilter === 'CUSTOM' && !item.isCustom) return false;
      if (hsnScopeFilter === 'STANDARD' && item.isCustom) return false;

      // Type filter
      if (hsnTypeFilter !== 'ALL' && item.type !== hsnTypeFilter) return false;

      // Rate filter
      if (hsnRateFilter !== 'ALL' && item.gstRate.toString() !== hsnRateFilter) return false;

      // Search query
      if (q) {
        const matchCode = item.code.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchUnit = item.uqc.toLowerCase().includes(q);
        return matchCode || matchDesc || matchUnit;
      }

      return true;
    });
  }, [customHsnCodes, hsnSearchQuery, hsnScopeFilter, hsnTypeFilter, hsnRateFilter]);

  const handleOpenAddHsn = (initialCode = '', initialType: 'HSN' | 'SAC' = 'HSN') => {
    setEditingHsnId(null);
    setFormCode(initialCode.toUpperCase());
    setFormDescription('');
    setFormType(initialType);
    setFormGstRate(18);
    setFormUqc(initialType === 'SAC' ? 'OTH' : 'PCS');
    setIsHsnModalOpen(true);
  };

  const handleEditHsn = (item: CustomHsnCode) => {
    setEditingHsnId(item.id);
    setFormCode(item.code);
    setFormDescription(item.description);
    setFormType(item.type || (item.code.startsWith('99') ? 'SAC' : 'HSN'));
    setFormGstRate(item.gstRate);
    setFormUqc(item.uqc || (item.code.startsWith('99') ? 'OTH' : 'PCS'));
    setIsHsnModalOpen(true);
  };

  const handleCloneStandardHsn = (std: { code: string; description: string; defaultGst: number }) => {
    const isSac = std.code.startsWith('99');
    const newCode = addCustomHsnCode({
      code: std.code,
      description: std.description,
      type: isSac ? 'SAC' : 'HSN',
      gstRate: (std.defaultGst as GstTaxRate) || 18,
      uqc: isSac ? 'OTH' : 'PCS',
      isCustom: true
    });
    showToast('success', 'Saved to Cloud Database', `Added ${newCode.code} to your custom cloud tariff directory.`);
  };

  const handleCustomizeStandardHsn = (std: { code: string; description: string; gstRate: GstTaxRate; uqc: string; type: 'HSN' | 'SAC' }) => {
    setEditingHsnId(null);
    setFormCode(std.code);
    setFormDescription(std.description);
    setFormType(std.type);
    setFormGstRate(std.gstRate);
    setFormUqc(std.uqc);
    setIsHsnModalOpen(true);
  };

  const handleSaveHsnForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    const cleanDesc = formDescription.trim();

    if (!cleanCode) {
      showToast('error', 'Validation Error', 'Please specify an HSN or SAC code.');
      return;
    }
    if (!cleanDesc) {
      showToast('error', 'Validation Error', 'Please enter a description for the goods or services.');
      return;
    }

    if (editingHsnId) {
      updateCustomHsnCode(editingHsnId, {
        code: cleanCode,
        description: cleanDesc,
        type: formType,
        gstRate: formGstRate,
        uqc: formUqc
      });
      showToast('success', 'Updated in Cloud DB', `Custom code ${cleanCode} updated successfully in cloud.`);
    } else {
      const exists = customHsnCodes.some(c => c.code.toLowerCase() === cleanCode.toLowerCase());
      if (exists) {
        showToast('warning', 'Already Exists', `Custom code ${cleanCode} already exists in your directory.`);
        return;
      }
      addCustomHsnCode({
        code: cleanCode,
        description: cleanDesc,
        type: formType,
        gstRate: formGstRate,
        uqc: formUqc,
        isCustom: true
      });
      showToast('success', 'Saved to Cloud DB', `Added ${cleanCode} (${formType}) to your cloud database.`);
    }

    setIsHsnModalOpen(false);
  };

  const handleConfirmDeleteHsn = () => {
    if (!deleteConfirmHsn) return;
    deleteCustomHsnCode(deleteConfirmHsn.id);
    showToast('info', 'Deleted from Cloud DB', `Removed code ${deleteConfirmHsn.code} from custom directory.`);
    setDeleteConfirmHsn(null);
  };

  const handleBulkImportHsnSubmit = () => {
    if (!bulkImportText.trim()) {
      showToast('error', 'Import Empty', 'Please paste CSV or text lines with HSN/SAC codes.');
      return;
    }

    const lines = bulkImportText.split('\n');
    const itemsToAdd: Omit<CustomHsnCode, 'id'>[] = [];

    lines.forEach(line => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const itemCode = parts[0].toUpperCase();
        if (itemCode.toLowerCase() === 'code' || itemCode.toLowerCase() === 'hsn' || itemCode.toLowerCase() === 'sac') return;
        
        const itemDesc = parts[1];
        const rawGst = parts[2] ? parseInt(parts[2].replace(/[^0-9]/g, '')) : 18;
        const validGst: GstTaxRate = [0, 5, 12, 18, 28].includes(rawGst) ? (rawGst as GstTaxRate) : 18;
        const itemUqc = parts[3] ? parts[3].toUpperCase() : (itemCode.startsWith('99') ? 'OTH' : 'PCS');
        const itemType = itemCode.startsWith('99') ? 'SAC' : 'HSN';

        if (itemCode && itemDesc) {
          itemsToAdd.push({
            code: itemCode,
            description: itemDesc,
            type: itemType,
            gstRate: validGst,
            uqc: itemUqc,
            isCustom: true
          });
        }
      }
    });

    if (itemsToAdd.length === 0) {
      showToast('error', 'Invalid Format', 'No valid rows found. Format: Code, Description, GST Slab, Unit');
      return;
    }

    const addedCount = bulkImportCustomHsnCodes(itemsToAdd);
    showToast('success', 'Bulk Saved to Cloud DB', `Imported ${addedCount} custom HSN/SAC codes to Cloud Firestore.`);
    setBulkImportText('');
    setIsBulkImportOpen(false);
  };

  const handleExportTariffCsv = () => {
    const headers = ['HSN_SAC_Code', 'Type', 'Description', 'GST_Rate_Percent', 'CGST_Percent', 'SGST_Percent', 'IGST_Percent', 'UQC_Unit', 'Directory_Source'];
    const rows = combinedTariffDirectory.map(item => [
      `"${item.code}"`,
      `"${item.type}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      item.gstRate,
      item.gstRate / 2,
      item.gstRate / 2,
      item.gstRate,
      `"${item.uqc}"`,
      item.isCustom ? '"Custom Cloud Saved"' : '"Standard Reference"'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Tariff_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Exported Tariff Directory', `Saved ${combinedTariffDirectory.length} tariff entries to CSV.`);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    showToast('info', 'Copied to Clipboard', `HSN/SAC Code ${code} copied.`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            GST Returns & Statutory Registers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete GST compliance center with Sale Register, Purchase Register, GSTR-1, GSTR-3B and HSN directory.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {returnType === 'sale_register' && (
            <button
              onClick={handleExportSalesCsv}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Sales CSV</span>
            </button>
          )}

          {returnType === 'purchase_register' && (
            <button
              onClick={handleExportPurchaseCsv}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Purchase CSV</span>
            </button>
          )}

          {(returnType === 'sale_register' || returnType === 'purchase_register') && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Print current register"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {returnType === 'gstr1' && (
            <button
              onClick={handleDownloadGstr1Json}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Portal JSON</span>
            </button>
          )}

          {returnType === 'hsn_finder' && (
            <>
              <button
                onClick={handleExportTariffCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Export Tariff Directory to CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Bulk Import HSN/SAC Codes"
              >
                <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Bulk Import</span>
              </button>

              <button
                onClick={() => handleOpenAddHsn()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add HSN / SAC Code</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Switch Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setReturnType('sale_register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'sale_register'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Sale Register (Outward Tax)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {filteredSalesInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setReturnType('purchase_register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'purchase_register'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Purchase Register (Inward & ITC)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {filteredPurchaseBills.length}
          </span>
        </button>

        <button
          onClick={() => setReturnType('gstr1')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'gstr1'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          GSTR-1 (Outward Supplies Return)
        </button>

        <button
          onClick={() => setReturnType('gstr3b')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'gstr3b'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          GSTR-3B (Summary Return & ITC Offset)
        </button>

        <button
          onClick={() => setReturnType('hsn_finder')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'hsn_finder'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>HSN & SAC Tariff Directory</span>
          {customHsnCodes.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              {customHsnCodes.length}
            </span>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FILTER CONTROL BAR (Used by Sale Register & Purchase Register)    */}
      {/* ------------------------------------------------------------------ */}
      {(returnType === 'sale_register' || returnType === 'purchase_register') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Mode Toggle & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'month'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Filter by Month
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('date_range')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'date_range'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Filter by Date Range
                </button>
              </div>

              {/* Month Dropdown Selector */}
              {filterMode === 'month' ? (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="font-bold text-slate-800 dark:text-white bg-transparent outline-none cursor-pointer"
                  >
                    <option value="2026-08">August 2026 (Current)</option>
                    <option value="2026-07">July 2026</option>
                    <option value="2026-06">June 2026</option>
                    <option value="2026-05">May 2026</option>
                    <option value="2026-04">April 2026</option>
                    <option value="2026-03">March 2026</option>
                    <option value="2026-02">February 2026</option>
                    <option value="2026-01">January 2026</option>
                    <option value="Q2_2026">Q2 (Jul - Sep 2026)</option>
                    <option value="Q1_2026">Q1 (Apr - Jun 2026)</option>
                    <option value="FY_2026_27">Full Financial Year (2026-27)</option>
                    <option value="ALL">All Records (No Month Filter)</option>
                  </select>
                </div>
              ) : (
                /* Date Range Pickers */
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-slate-400 font-medium">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="font-semibold text-slate-800 dark:text-white bg-transparent outline-none cursor-pointer text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-slate-400 font-medium">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="font-semibold text-slate-800 dark:text-white bg-transparent outline-none cursor-pointer text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('THIS_MONTH')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('LAST_MONTH')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('THIS_QUARTER')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  This Quarter
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('ALL_TIME')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  All
                </button>
              </div>
            </div>

            {/* Right: Search & Sub-Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={returnType === 'sale_register' ? 'Search buyer, GSTIN, invoice #...' : 'Search vendor, bill #, GSTIN...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sales Category Filter */}
              {returnType === 'sale_register' && (
                <select
                  value={salesTypeFilter}
                  onChange={(e) => setSalesTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">All Supply Types</option>
                  <option value="B2B">B2B Registered Invoices</option>
                  <option value="B2C">B2C Retail Sales</option>
                  <option value="INTER_STATE">Inter-State (IGST)</option>
                  <option value="INTRA_STATE">Intra-State (CGST+SGST)</option>
                  <option value="POS">POS Quick Sales</option>
                </select>
              )}

              {/* Purchase ITC Filter */}
              {returnType === 'purchase_register' && (
                <select
                  value={purchaseItcFilter}
                  onChange={(e) => setPurchaseItcFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">All Inward Bills</option>
                  <option value="ELIGIBLE_ALL">Eligible ITC (Input Goods/Services)</option>
                  <option value="ELIGIBLE_CAPITAL_GOODS">Eligible Capital Goods</option>
                  <option value="INELIGIBLE_17_5">Ineligible ITC (Sec 17(5) Blocked)</option>
                  <option value="INTER_STATE">Inter-State Purchases (IGST)</option>
                  <option value="INTRA_STATE">Intra-State Purchases (CGST+SGST)</option>
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: SALE REGISTER                                                 */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'sale_register' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Invoices</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{salesTotals.count}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Tax & Retail Invoices</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Taxable Value</div>
              <div className="text-lg font-black text-indigo-900 dark:text-indigo-300 mt-1">{formatINR(salesTotals.taxable)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Net Taxable Turnover</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">CGST Output</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{formatINR(salesTotals.cgst)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Central Tax Output</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">SGST Output</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{formatINR(salesTotals.sgst)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">State / UT Tax Output</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">IGST Output</div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatINR(salesTotals.igst)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Integrated Tax Output</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Gross Total (Tax Incl.)</div>
              <div className="text-lg font-black text-indigo-950 dark:text-indigo-200 mt-1">{formatINR(salesTotals.grandTotal)}</div>
              <div className="text-[10px] text-indigo-700 dark:text-indigo-300">Total GST: {formatINR(salesTotals.totalTax)}</div>
            </div>
          </div>

          {/* Sales Register Detailed Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>GST Sales Outward Register</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed statutory record of outward tax invoices and retail sales
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                  {filteredSalesInvoices.length} invoices found
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-2 w-8 text-center"></th>
                    <th className="py-3 px-2.5 w-10 text-center">#</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Invoice No.</th>
                    <th className="py-3 px-4">Buyer / Customer Name</th>
                    <th className="py-3 px-3">GSTIN</th>
                    <th className="py-3 px-4 min-w-[180px]">Products / Items</th>
                    <th className="py-3 px-3 min-w-[100px]">HSN / SAC</th>
                    <th className="py-3 px-3">Place of Supply</th>
                    <th className="py-3 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3 px-3 text-right">CGST (₹)</th>
                    <th className="py-3 px-3 text-right">SGST (₹)</th>
                    <th className="py-3 px-3 text-right">IGST (₹)</th>
                    <th className="py-3 px-3 text-right">Total Tax (₹)</th>
                    <th className="py-3 px-3 text-right">Invoice Total (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSalesInvoices.length > 0 ? (
                    filteredSalesInvoices.map((inv, idx) => {
                      const isExpanded = Boolean(expandedSaleInvIds[inv.id]);
                      const uniqueHsns: string[] = Array.from(new Set((inv.items || []).map(it => it.hsnCode).filter(Boolean)));

                      return (
                        <React.Fragment key={inv.id}>
                          <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}>
                            <td className="py-2.5 px-2 text-center">
                              {inv.items && inv.items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleSaleInvoiceExpand(inv.id)}
                                  title={isExpanded ? "Collapse item breakdown" : "Expand item breakdown"}
                                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                                    isExpanded 
                                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                                      : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{inv.invoiceDate}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                              {inv.customerName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {inv.customerGstin ? (
                                <span className="text-indigo-700 dark:text-indigo-400 font-bold">{inv.customerGstin}</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic">B2C / Unregistered</span>
                              )}
                            </td>

                            {/* Products / Items Column */}
                            <td className="py-2.5 px-4 max-w-[240px]">
                              <div className="space-y-1">
                                {inv.items && inv.items.length > 0 ? (
                                  inv.items.slice(0, 2).map((item, itmIdx) => (
                                    <div 
                                      key={itmIdx} 
                                      className="flex items-center justify-between gap-1.5 text-[11px]" 
                                      title={`${item.name} (${item.quantity} ${item.unit || 'NOS'})`}
                                    >
                                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                        {item.quantity} {item.unit || 'PCS'}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No products</span>
                                )}
                                {inv.items && inv.items.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleSaleInvoiceExpand(inv.id)}
                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>+{inv.items.length - 2} more item{inv.items.length - 2 > 1 ? 's' : ''}</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* HSN / SAC Column */}
                            <td className="py-2.5 px-3">
                              {uniqueHsns.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[130px]">
                                  {uniqueHsns.map((hsn, hIdx) => {
                                    const isService = hsn.startsWith('99');
                                    return (
                                      <span
                                        key={hIdx}
                                        className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                          isService
                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
                                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60'
                                        }`}
                                        title={isService ? `Services SAC Code: ${hsn}` : `Goods HSN Code: ${hsn}`}
                                      >
                                        <Tag className="w-2.5 h-2.5 opacity-60" />
                                        <span>{hsn}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic text-[11px] font-mono">N/A</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <span className="font-mono">{inv.placeOfSupplyStateCode}</span> - {inv.placeOfSupplyState}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatINR(inv.subTotalTaxable)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {inv.totalCgst > 0 ? formatINR(inv.totalCgst) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {inv.totalSgst > 0 ? formatINR(inv.totalSgst) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                              {inv.totalIgst > 0 ? formatINR(inv.totalIgst) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatINR(inv.totalTax)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatINR(inv.grandTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'PAID'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                  : inv.status === 'PARTIALLY_PAID'
                                  ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>

                          {/* Expandable Line Items Details Table */}
                          {isExpanded && inv.items && inv.items.length > 0 && (
                            <tr className="bg-slate-50/90 dark:bg-slate-850 border-b border-indigo-100 dark:border-slate-800">
                              <td colSpan={16} className="p-3 pl-8">
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                                  <div className="bg-gradient-to-r from-slate-800 to-indigo-900 dark:from-slate-900 dark:to-indigo-950 text-white px-3 py-1.5 text-[11px] font-bold flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-indigo-300" />
                                      <span>Product & HSN Breakdown for Invoice #{inv.invoiceNumber}</span>
                                    </div>
                                    <span className="text-[10px] text-indigo-200 font-normal">{inv.items.length} Product Line Item{inv.items.length > 1 ? 's' : ''}</span>
                                  </div>
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[9px] font-bold">
                                      <tr>
                                        <th className="py-1.5 px-2.5">#</th>
                                        <th className="py-1.5 px-3">Product Name</th>
                                        <th className="py-1.5 px-2.5 font-mono">HSN / SAC</th>
                                        <th className="py-1.5 px-2.5 text-right">Quantity</th>
                                        <th className="py-1.5 px-2.5 text-right">Unit Rate (₹)</th>
                                        <th className="py-1.5 px-2.5 text-right">Taxable Amount (₹)</th>
                                        <th className="py-1.5 px-2.5 text-center">GST %</th>
                                        <th className="py-1.5 px-2.5 text-right">CGST (₹)</th>
                                        <th className="py-1.5 px-2.5 text-right">SGST (₹)</th>
                                        <th className="py-1.5 px-2.5 text-right">IGST (₹)</th>
                                        <th className="py-1.5 px-3 text-right">Line Total (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                      {inv.items.map((item, itmIdx) => (
                                        <tr key={itmIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="py-1.5 px-2.5 text-slate-400 dark:text-slate-500 font-mono">{itmIdx + 1}</td>
                                          <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                                          <td className="py-1.5 px-2.5 font-mono font-bold text-indigo-700 dark:text-indigo-400">{item.hsnCode || 'N/A'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono">{item.quantity} {item.unit || 'NOS'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono">{formatINR(item.rate)}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold">{formatINR(item.taxableAmount)}</td>
                                          <td className="py-1.5 px-2.5 text-center font-bold text-indigo-700 dark:text-indigo-400">{item.gstRate}%</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-500 dark:text-slate-400">{item.cgstAmount > 0 ? formatINR(item.cgstAmount) : '-'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-500 dark:text-slate-400">{item.sgstAmount > 0 ? formatINR(item.sgstAmount) : '-'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{item.igstAmount > 0 ? formatINR(item.igstAmount) : '-'}</td>
                                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">{formatINR(item.totalAmount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={16} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calculator className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No Sales Invoices Found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Try choosing a different month or expanding the date filter range above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Footer with Summary Sums */}
                {filteredSalesInvoices.length > 0 && (
                  <tfoot className="bg-slate-100/90 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <tr>
                      <td colSpan={9} className="py-3 px-4 text-right uppercase text-xs tracking-wider">
                        Total for {filteredSalesInvoices.length} Invoices:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{formatINR(salesTotals.taxable)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">{formatINR(salesTotals.cgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">{formatINR(salesTotals.sgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-indigo-700 dark:text-indigo-400">{formatINR(salesTotals.igst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-indigo-900 dark:text-indigo-300">{formatINR(salesTotals.totalTax)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800 dark:text-emerald-400 font-extrabold">{formatINR(salesTotals.grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: PURCHASE REGISTER                                             */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'purchase_register' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Purchase Bills</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{purchaseTotals.count}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Inward Supplies</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Taxable Purchases</div>
              <div className="text-lg font-black text-indigo-900 dark:text-indigo-300 mt-1">{formatINR(purchaseTotals.taxable)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Inward Taxable Value</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">CGST Input</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{formatINR(purchaseTotals.cgst)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Central Tax Input</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">SGST Input</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{formatINR(purchaseTotals.sgst)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">State / UT Tax Input</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">IGST Input</div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatINR(purchaseTotals.igst)}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Integrated Tax Input</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Eligible ITC Input</div>
              <div className="text-lg font-black text-emerald-950 dark:text-emerald-200 mt-1">{formatINR(purchaseTotals.eligibleItc)}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Gross: {formatINR(purchaseTotals.grandTotal)}</div>
            </div>
          </div>

          {/* Purchase Register Detailed Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>GST Purchase Inward Register & ITC Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Statutory inward purchase bills, vendor GSTIN reconciliation and ITC eligibility
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                  {filteredPurchaseBills.length} bills recorded
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-2 w-8 text-center"></th>
                    <th className="py-3 px-2.5 w-10 text-center">#</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Bill / Ref No.</th>
                    <th className="py-3 px-4">Supplier / Vendor Name</th>
                    <th className="py-3 px-3">Vendor GSTIN</th>
                    <th className="py-3 px-4 min-w-[180px]">Products / Items</th>
                    <th className="py-3 px-3 min-w-[100px]">HSN / SAC</th>
                    <th className="py-3 px-3">Supply Type</th>
                    <th className="py-3 px-3">ITC Status</th>
                    <th className="py-3 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3 px-3 text-right">CGST (₹)</th>
                    <th className="py-3 px-3 text-right">SGST (₹)</th>
                    <th className="py-3 px-3 text-right">IGST (₹)</th>
                    <th className="py-3 px-3 text-right">Total Tax (₹)</th>
                    <th className="py-3 px-3 text-right">Bill Total (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPurchaseBills.length > 0 ? (
                    filteredPurchaseBills.map((bill, idx) => {
                      const isExpanded = Boolean(expandedPurchaseBillIds[bill.id]);
                      const uniqueHsns: string[] = Array.from(new Set((bill.items || []).map(it => it.hsnCode).filter(Boolean)));

                      return (
                        <React.Fragment key={bill.id}>
                          <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isExpanded ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''}`}>
                            <td className="py-2.5 px-2 text-center">
                              {bill.items && bill.items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => togglePurchaseBillExpand(bill.id)}
                                  title={isExpanded ? "Collapse item breakdown" : "Expand item breakdown"}
                                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                                    isExpanded 
                                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' 
                                      : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{bill.billDate}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {bill.billNumber}
                              {bill.vendorInvoiceNumber && (
                                <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                  Ref: {bill.vendorInvoiceNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                              {bill.vendorName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {bill.vendorGstin ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{bill.vendorGstin}</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic">Unregistered Vendor</span>
                              )}
                            </td>

                            {/* Products / Items Column */}
                            <td className="py-2.5 px-4 max-w-[240px]">
                              <div className="space-y-1">
                                {bill.items && bill.items.length > 0 ? (
                                  bill.items.slice(0, 2).map((item, itmIdx) => (
                                    <div 
                                      key={itmIdx} 
                                      className="flex items-center justify-between gap-1.5 text-[11px]" 
                                      title={`${item.name} (${item.quantity} ${item.unit || 'NOS'})`}
                                    >
                                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                        {item.quantity} {item.unit || 'PCS'}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No products</span>
                                )}
                                {bill.items && bill.items.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => togglePurchaseBillExpand(bill.id)}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>+{bill.items.length - 2} more item{bill.items.length - 2 > 1 ? 's' : ''}</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* HSN / SAC Column */}
                            <td className="py-2.5 px-3">
                              {uniqueHsns.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[130px]">
                                  {uniqueHsns.map((hsn, hIdx) => {
                                    const isService = hsn.startsWith('99');
                                    return (
                                      <span
                                        key={hIdx}
                                        className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                          isService
                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
                                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                                        }`}
                                        title={isService ? `Services SAC Code: ${hsn}` : `Goods HSN Code: ${hsn}`}
                                      >
                                        <Tag className="w-2.5 h-2.5 opacity-60" />
                                        <span>{hsn}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic text-[11px] font-mono">N/A</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                bill.isInterState ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {bill.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                bill.itcEligibility === 'INELIGIBLE_17_5'
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                                  : bill.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS'
                                  ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              }`}>
                                {bill.itcEligibility === 'INELIGIBLE_17_5'
                                  ? 'Blocked Sec 17(5)'
                                  : bill.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS'
                                  ? 'Capital Goods'
                                  : 'Eligible ITC'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatINR(bill.subTotalTaxable)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {bill.totalCgst > 0 ? formatINR(bill.totalCgst) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {bill.totalSgst > 0 ? formatINR(bill.totalSgst) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                              {bill.totalIgst > 0 ? formatINR(bill.totalIgst) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatINR(bill.totalTax)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatINR(bill.grandTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                bill.status === 'PAID'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                  : bill.status === 'PARTIALLY_PAID'
                                  ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                              }`}>
                                {bill.status}
                              </span>
                            </td>
                          </tr>

                          {/* Expandable Line Items Details Table */}
                          {isExpanded && bill.items && bill.items.length > 0 && (
                            <tr className="bg-slate-50/90 dark:bg-slate-850 border-b border-emerald-100 dark:border-slate-800">
                              <td colSpan={17} className="p-3 pl-8">
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                                  <div className="bg-gradient-to-r from-slate-800 to-emerald-900 dark:from-slate-900 dark:to-emerald-950 text-white px-3 py-1.5 text-[11px] font-bold flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Product & HSN Breakdown for Purchase Bill #{bill.billNumber}</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-200 font-normal">{bill.items.length} Inward Line Item{bill.items.length > 1 ? 's' : ''}</span>
                                  </div>
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[9px] font-bold">
                                      <tr>
                                        <th className="py-1.5 px-2.5">#</th>
                                        <th className="py-1.5 px-3">Product Name</th>
                                        <th className="py-1.5 px-2.5 font-mono">HSN / SAC</th>
                                        <th className="py-1.5 px-2.5 text-right">Quantity</th>
                                        <th className="py-1.5 px-2.5 text-right">Unit Cost (₹)</th>
                                        <th className="py-1.5 px-2.5 text-right">Taxable Amount (₹)</th>
                                        <th className="py-1.5 px-2.5 text-center">GST %</th>
                                        <th className="py-1.5 px-2.5 text-right">CGST (₹)</th>
                                        <th className="py-1.5 px-2.5 text-right">SGST (₹)</th>
                                        <th className="py-1.5 px-2.5 text-right">IGST (₹)</th>
                                        <th className="py-1.5 px-3 text-right">Line Total (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                      {bill.items.map((item, itmIdx) => (
                                        <tr key={itmIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="py-1.5 px-2.5 text-slate-400 dark:text-slate-500 font-mono">{itmIdx + 1}</td>
                                          <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                                          <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">{item.hsnCode || 'N/A'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono">{item.quantity} {item.unit || 'NOS'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono">{formatINR(item.rate)}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold">{formatINR(item.taxableAmount)}</td>
                                          <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">{item.gstRate}%</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-500 dark:text-slate-400">{item.cgstAmount > 0 ? formatINR(item.cgstAmount) : '-'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-500 dark:text-slate-400">{item.sgstAmount > 0 ? formatINR(item.sgstAmount) : '-'}</td>
                                          <td className="py-1.5 px-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{item.igstAmount > 0 ? formatINR(item.igstAmount) : '-'}</td>
                                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">{formatINR(item.totalAmount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={17} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No Purchase Bills Found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Try choosing a different month or date range in the filter above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Footer with Summary Sums */}
                {filteredPurchaseBills.length > 0 && (
                  <tfoot className="bg-slate-100/90 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <tr>
                      <td colSpan={10} className="py-3 px-4 text-right uppercase text-xs tracking-wider">
                        Total for {filteredPurchaseBills.length} Inward Bills:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{formatINR(purchaseTotals.taxable)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">{formatINR(purchaseTotals.cgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">{formatINR(purchaseTotals.sgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-indigo-700 dark:text-indigo-400">{formatINR(purchaseTotals.igst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800 dark:text-emerald-400">{formatINR(purchaseTotals.totalTax)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-950 dark:text-slate-100 font-extrabold">{formatINR(purchaseTotals.grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: GSTR-1 RETURN                                                 */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'gstr1' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Total Taxable Outward</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{formatINR(totalOutwardTaxable)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{activeInvoices.length} active invoices</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Total Output Tax (IGST+CGST+SGST)</div>
              <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatINR(totalOutwardTax)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                CGST: {formatINR(totalOutwardCgst)} • SGST: {formatINR(totalOutwardSgst)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">4A - B2B Registered Sales</div>
              <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">{formatINR(b2bTaxable)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{b2bInvoices.length} Registered Buyers</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">7 - B2C Small & Retail</div>
              <div className="text-xl font-extrabold text-cyan-700 dark:text-cyan-400">{formatINR(b2csTaxable)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{b2csInvoices.length} Unregistered invoices</div>
            </div>
          </div>

          {/* Table 4A: B2B Invoices */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded font-mono text-xs">Table 4A</span>
                  B2B Tax Invoices (Registered Recipient)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Supplies made to GST registered buyers eligible for buyer ITC</p>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {b2bInvoices.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">GSTIN of Recipient</th>
                    <th className="py-2.5 px-4">Receiver Name</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Invoice Value</th>
                    <th className="py-2.5 px-4">Place of Supply</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">CGST</th>
                    <th className="py-2.5 px-4 text-right">SGST</th>
                    <th className="py-2.5 px-4 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {b2bInvoices.length > 0 ? (
                    b2bInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.customerGstin}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{inv.customerName}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{inv.invoiceDate}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">{formatINR(inv.grandTotal)}</td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{inv.placeOfSupplyStateCode}-{inv.placeOfSupplyState}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-slate-100">{formatINR(inv.subTotalTaxable)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(inv.totalCgst)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(inv.totalSgst)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(inv.totalIgst)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        No B2B invoices recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 12: HSN Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded font-mono text-xs">Table 12</span>
                  HSN-wise Summary of Outward Supplies
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mandatory 4-digit / 6-digit HSN code aggregate reporting</p>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {hsnSummaryList.length} HSN codes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">HSN/SAC</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">UQC</th>
                    <th className="py-2.5 px-4 text-right">Total Qty</th>
                    <th className="py-2.5 px-4 text-right">Total Value</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">CGST</th>
                    <th className="py-2.5 px-4 text-right">SGST</th>
                    <th className="py-2.5 px-4 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {hsnSummaryList.map(h => (
                    <tr key={h.hsn} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{h.hsn}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">{h.desc}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-mono">{h.uqc}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">{h.qty}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">{formatINR(h.total)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatINR(h.taxable)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(h.cgst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(h.sgst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{formatINR(h.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: GSTR-3B RETURN                                                */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'gstr3b' && (
        <div className="space-y-6">
          {/* GSTR-3B Table 3.1 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded font-mono text-xs">Table 3.1</span>
                Details of Outward Supplies and inward supplies liable to reverse charge
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Nature of Supplies</th>
                    <th className="py-2.5 px-4 text-right">Total Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">Integrated Tax (IGST)</th>
                    <th className="py-2.5 px-4 text-right">Central Tax (CGST)</th>
                    <th className="py-2.5 px-4 text-right">State/UT Tax (SGST)</th>
                    <th className="py-2.5 px-4 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">{formatINR(totalOutwardTaxable)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{formatINR(totalOutwardIgst)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{formatINR(totalOutwardCgst)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{formatINR(totalOutwardSgst)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* GSTR-3B Table 4: Eligible ITC */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded font-mono text-xs">Table 4</span>
                Eligible ITC (Input Tax Credit Available)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4 text-right">Integrated Tax (IGST)</th>
                    <th className="py-2.5 px-4 text-right">Central Tax (CGST)</th>
                    <th className="py-2.5 px-4 text-right">State/UT Tax (SGST)</th>
                    <th className="py-2.5 px-4 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      (A) ITC Available (whether in full or part) - All other ITC
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">{formatINR(totalItcIgst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">{formatINR(totalItcCgst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">{formatINR(totalItcSgst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400">₹0.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-rose-600 dark:text-rose-400">
                    <td className="py-2.5 px-4 font-semibold">
                      (D) Ineligible ITC / Blocked under Section 17(5)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">₹0.00</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(totalBlockedItc / 2)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(totalBlockedItc / 2)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* GSTR-3B Table 6.1: Net Tax Liability */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Net Tax Liability to be Paid in Cash
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Output tax after set-off with available Input Tax Credit (ITC)
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Total Cash Payable</div>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatINR(totalNetCashPayable)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">Central Tax (CGST)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Output Tax:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatINR(totalOutwardCgst)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Paid through ITC:</span>
                    <span className="font-mono font-semibold">- {formatINR(Math.min(totalOutwardCgst, totalItcCgst))}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Cash Payable:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatINR(netCgstPayable)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">State Tax (SGST)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Output Tax:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatINR(totalOutwardSgst)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Paid through ITC:</span>
                    <span className="font-mono font-semibold">- {formatINR(Math.min(totalOutwardSgst, totalItcSgst))}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Cash Payable:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatINR(netSgstPayable)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">Integrated Tax (IGST)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Output Tax:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatINR(totalOutwardIgst)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Paid through ITC:</span>
                    <span className="font-mono font-semibold">- {formatINR(Math.min(totalOutwardIgst, totalItcIgst))}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Cash Payable:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatINR(netIgstPayable)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: HSN/SAC MASTER TARIFF DIRECTORY                                */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'hsn_finder' && (
        <div className="space-y-4">
          {/* Main Directory Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
            
            {/* Header & Cloud Sync Status Banner */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-black text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
                    HSN & SAC Code GST Tariff Directory
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    GST Master Catalog
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage Goods HSN (Chapters 01-97) and Services SAC (Chapter 99) codes with prescribed GST tax slabs and unit codes. Custom codes are instantly synced to your Cloud Database.
                </p>
              </div>

              {/* Cloud DB Sync Status Badge */}
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Cloud Database Synced</span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                  {customHsnCodes.length} Custom Codes
                </span>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Directory Codes</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                  {combinedTariffDirectory.length}
                </div>
              </div>

              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-xl">
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Goods (HSN)</div>
                <div className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-0.5 font-mono">
                  {combinedTariffDirectory.filter(i => i.type === 'HSN').length}
                </div>
              </div>

              <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 p-3 rounded-xl">
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Services (SAC)</div>
                <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5 font-mono">
                  {combinedTariffDirectory.filter(i => i.type === 'SAC').length}
                </div>
              </div>

              <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-xl">
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Cloud Custom Codes</div>
                <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 font-mono">
                  {customHsnCodes.length}
                </div>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              {/* Search Box */}
              <div className="relative w-full lg:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by HSN/SAC code, description or unit..."
                  value={hsnSearchQuery}
                  onChange={e => setHsnSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                />
                {hsnSearchQuery && (
                  <button
                    onClick={() => setHsnSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Scope Filters */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-slate-700 dark:text-slate-300 font-bold">
                  {(['ALL', 'CUSTOM', 'STANDARD'] as const).map(scope => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setHsnScopeFilter(scope)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        hsnScopeFilter === scope
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {scope === 'ALL' ? 'All Codes' : scope === 'CUSTOM' ? `Custom Cloud (${customHsnCodes.length})` : 'Standard Catalog'}
                    </button>
                  ))}
                </div>

                {/* Type Filters */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-slate-700 dark:text-slate-300 font-bold">
                  {(['ALL', 'HSN', 'SAC'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setHsnTypeFilter(type)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        hsnTypeFilter === type
                          ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {type === 'ALL' ? 'All Types' : type === 'HSN' ? 'Goods (HSN)' : 'Services (SAC)'}
                    </button>
                  ))}
                </div>

                {/* GST Slab Filter */}
                <select
                  value={hsnRateFilter}
                  onChange={e => setHsnRateFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All GST Rates</option>
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>

            {/* Directory Table */}
            {combinedTariffDirectory.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No HSN / SAC Codes Found</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    No matching tariff codes found for your search criteria. Add a custom code, adjust filters, or bulk import codes.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddHsn()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New HSN / SAC Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHsnSearchQuery('');
                      setHsnScopeFilter('ALL');
                      setHsnTypeFilter('ALL');
                      setHsnRateFilter('ALL');
                    }}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-mono">HSN / SAC Code</th>
                      <th className="py-3 px-4">Goods / Services Description</th>
                      <th className="py-3 px-4 text-center">GST Slab</th>
                      <th className="py-3 px-4 text-center">CGST + SGST</th>
                      <th className="py-3 px-4 text-center">IGST</th>
                      <th className="py-3 px-4 text-center">Unit (UQC)</th>
                      <th className="py-3 px-4 text-center">Database Storage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {combinedTariffDirectory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        {/* HSN / SAC Code & Type */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide shrink-0 ${
                              item.type === 'SAC'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}>
                              {item.type}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              {item.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-opacity cursor-pointer"
                              title="Copy code"
                            >
                              {copiedCode === item.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-sm">
                          {item.description}
                        </td>

                        {/* GST Slab */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            item.gstRate === 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : item.gstRate === 5
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                              : item.gstRate === 12
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                              : item.gstRate === 18
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                          }`}>
                            {item.gstRate}%
                          </span>
                        </td>

                        {/* CGST + SGST (Intra-state) */}
                        <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {item.gstRate / 2}% + {item.gstRate / 2}%
                        </td>

                        {/* IGST (Inter-state) */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {item.gstRate}%
                        </td>

                        {/* UQC Unit */}
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                          {item.uqc}
                        </td>

                        {/* Database Storage Badge */}
                        <td className="py-3 px-4 text-center">
                          {item.isCustom ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Cloud Synced</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              <span>Standard Catalog</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.isCustom && item.customData ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditHsn(item.customData!)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit custom code"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmHsn(item.customData!)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete custom code"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCloneStandardHsn({ code: item.code, description: item.description, defaultGst: item.gstRate })}
                                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-[11px] border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Add copy to your cloud custom directory"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add to Custom</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCustomizeStandardHsn({ code: item.code, description: item.description, gstRate: item.gstRate, uqc: item.uqc, type: item.type })}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Customize before saving"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer Summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>All custom entries are automatically synced to Firebase Firestore database</span>
              </div>
              <div className="font-mono text-slate-600 dark:text-slate-400">
                Showing {combinedTariffDirectory.length} of {COMMON_HSN_CODES.length + customHsnCodes.length} total entries
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT HSN MODAL                                               */}
      {/* ------------------------------------------------------------------ */}
      <ModalWrapper
        isOpen={isHsnModalOpen}
        onClose={() => setIsHsnModalOpen(false)}
        zIndex={9999}
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[min(92vh,92dvh)] my-auto animate-in zoom-in-95">
          
          {/* Modal Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {editingHsnId ? 'Edit HSN / SAC Code' : 'Add New HSN / SAC Code'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Persisted directly to your Cloud Database (Firestore)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHsnModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Form */}
          <form onSubmit={handleSaveHsnForm} className="p-5 space-y-4 overflow-y-auto modal-content-scroll">
            
            {/* Type Switcher */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Classification Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('HSN');
                    if (formUqc === 'OTH') setFormUqc('PCS');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    formType === 'HSN'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Goods (HSN Code)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormType('SAC');
                    if (!formCode) setFormCode('99');
                    if (formUqc === 'PCS') setFormUqc('OTH');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    formType === 'SAC'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-800 dark:text-amber-300 shadow-xs ring-2 ring-amber-600/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Services (SAC Code)</span>
                </button>
              </div>
            </div>

            {/* Code and Unit Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {formType === 'SAC' ? 'SAC Code (Starts with 99) *' : 'HSN Code (4/6/8 Digits) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'SAC' ? 'e.g. 998313' : 'e.g. 847130'}
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {formType === 'SAC' ? 'Services Accounting Code (e.g. 9983 for IT, 9982 for Legal)' : 'Harmonized System of Nomenclature (e.g. 8471, 8517)'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Unit of Quantity (UQC) *
                </label>
                <select
                  value={formUqc}
                  onChange={e => setFormUqc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-900 dark:text-white"
                >
                  {STANDARD_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="OTH">OTH (Others / Services)</option>
                </select>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Standard statutory unit for GST returns</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Goods / Services Description *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Automatic data processing machines, laptops and personal computers"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* GST Tax Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Prescribed GST Tax Slab *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {([0, 5, 12, 18, 28] as const).map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFormGstRate(rate)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                      formGstRate === rate
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-sm font-black">{rate}%</span>
                    <span className="text-[9px] opacity-80">{rate === 0 ? 'Exempt' : 'GST'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Tax Split Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Statutory Tax Breakdown</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">CGST (Central)</div>
                  <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{formGstRate / 2}%</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">SGST (State)</div>
                  <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{formGstRate / 2}%</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">IGST (Inter-State)</div>
                  <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{formGstRate}%</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Saves to Firestore DB</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHsnModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingHsnId ? 'Update & Save to Cloud' : 'Save to Cloud DB'}</span>
                </button>
              </div>
            </div>

          </form>
        </div>
      </ModalWrapper>

      {/* ------------------------------------------------------------------ */}
      {/* BULK IMPORT HSN MODAL                                              */}
      {/* ------------------------------------------------------------------ */}
      <ModalWrapper
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        zIndex={9999}
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[min(92vh,92dvh)] my-auto animate-in zoom-in-95">
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">Bulk Import HSN & SAC Codes</h3>
                <p className="text-[11px] text-slate-300">Paste CSV or delimited lines to bulk upload to Cloud Database</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto modal-content-scroll">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200">Format Template:</div>
              <p className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                Code, Description, GST Slab, Unit
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Example: <code className="text-slate-800 dark:text-slate-200">8471, Computer Peripherals & RAM, 18, PCS</code><br />
                Example: <code className="text-slate-800 dark:text-slate-200">9983, Cloud Consulting Services, 18, OTH</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Paste Rows (One per line) *
              </label>
              <textarea
                rows={8}
                placeholder={`8471, Computer accessories and RAM sticks, 18, PCS\n8517, Wireless routers and 5G equipment, 18, PCS\n9983, Web development and cloud devops services, 18, OTH`}
                value={bulkImportText}
                onChange={e => setBulkImportText(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {bulkImportText.trim() ? bulkImportText.trim().split('\n').length : 0} rows entered
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImportHsnSubmit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload to Cloud Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalWrapper>

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      <ModalWrapper
        isOpen={Boolean(deleteConfirmHsn)}
        onClose={() => setDeleteConfirmHsn(null)}
        zIndex={9999}
      >
        {deleteConfirmHsn && (
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Delete Custom HSN/SAC Code</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This will remove the code from your Cloud database.</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Code:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{deleteConfirmHsn.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Description:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{deleteConfirmHsn.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">GST Rate:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{deleteConfirmHsn.gstRate}%</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmHsn(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteHsn}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        )}
      </ModalWrapper>

    </div>
  );
};
