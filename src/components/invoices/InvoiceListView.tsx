import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceStatus, InvoiceType, PaymentMethod } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getInvoiceDraft, clearInvoiceDraft, hasMeaningfulDraftData, formatDraftTime } from '../../utils/invoiceDraftManager';
import { ClientStatementModal } from '../parties/ClientStatementModal';
import { ImportSaleInvoicesModal } from './ImportSaleInvoicesModal';
import { ShareInvoiceModal } from './ShareInvoiceModal';
import { InvoiceCardGrid } from './InvoiceCardGrid';
import { AutoUpdateInvoiceNumbersModal } from './AutoUpdateInvoiceNumbersModal';
import { formatInvoiceSequence } from '../../utils/invoiceNumberUtils';
import { 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Share2, 
  Trash2, 
  DollarSign, 
  Truck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BookOpen,
  Package,
  Boxes,
  Edit3,
  Upload,
  FileSpreadsheet,
  History,
  RotateCcw,
  Send,
  X,
  Percent,
  Receipt,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  Hash
} from 'lucide-react';

type InvoiceSortField = 'invoiceNumber' | 'invoiceDate' | 'customerName' | 'itemsCount' | 'subTotalTaxable' | 'totalTax' | 'grandTotal' | 'status';
type SortDirection = 'asc' | 'desc';
type InvoiceViewMode = 'list' | 'card';

interface InvoiceListViewProps {
  onOpenNewInvoice: () => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({ onOpenNewInvoice, onEditInvoice }) => {
  const { 
    invoices, 
    parties,
    business, 
    updateBusiness,
    setSelectedInvoiceIdForPrint, 
    recordInvoicePayment,
    deleteInvoice,
    showToast,
    setActiveTab,
    currentCompanyId
  } = useApp();

  const [activeDraft, setActiveDraft] = useState(() => getInvoiceDraft(currentCompanyId));
  const [shareModalInvoice, setShareModalInvoice] = useState<Invoice | null>(null);

  // View Mode: List vs Card
  const [viewMode, setViewMode] = useState<InvoiceViewMode>(() => {
    return (localStorage.getItem('invoice_view_mode') as InvoiceViewMode) || 'list';
  });

  const handleViewModeChange = (mode: InvoiceViewMode) => {
    setViewMode(mode);
    localStorage.setItem('invoice_view_mode', mode);
  };

  // Expanded rows state (accessible for mobile and desktop expandable views)
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({});

  // Sorting state
  const [sortField, setSortField] = useState<InvoiceSortField>('invoiceDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to descending for dates and currency amounts, ascending for names/numbers
      if (['invoiceDate', 'subTotalTaxable', 'totalTax', 'grandTotal', 'itemsCount'].includes(field)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const toggleExpandInvoice = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedInvoiceIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleExpandAll = () => {
    const allExpanded = sortedInvoices.length > 0 && sortedInvoices.every(inv => expandedInvoiceIds[inv.id]);
    const newMap: Record<string, boolean> = {};
    if (!allExpanded) {
      sortedInvoices.forEach(inv => {
        newMap[inv.id] = true;
      });
    }
    setExpandedInvoiceIds(newMap);
  };

  // Keep draft status in sync with localStorage
  useEffect(() => {
    const checkDraft = () => {
      const d = getInvoiceDraft(currentCompanyId);
      if (d && hasMeaningfulDraftData(d, business.defaultNotes, business.defaultTerms)) {
        setActiveDraft(d);
      } else {
        setActiveDraft(null);
      }
    };
    checkDraft();
    window.addEventListener('focus', checkDraft);
    return () => window.removeEventListener('focus', checkDraft);
  }, [currentCompanyId, business.defaultNotes, business.defaultTerms]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Client Statement Modal State
  const [statementPartyId, setStatementPartyId] = useState<string | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAutoUpdateModalOpen, setIsAutoUpdateModalOpen] = useState(false);

  // Payment recording modal state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q)) ||
      (inv.items && inv.items.some(item => 
        item.name.toLowerCase().includes(q) || 
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      ));

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inv.invoiceType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let compareResult = 0;
    switch (sortField) {
      case 'invoiceNumber':
        compareResult = a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true, sensitivity: 'base' });
        break;
      case 'invoiceDate':
        compareResult = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
        break;
      case 'customerName':
        compareResult = a.customerName.localeCompare(b.customerName, undefined, { sensitivity: 'base' });
        break;
      case 'itemsCount': {
        const aUnits = a.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0;
        const bUnits = b.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0;
        compareResult = aUnits - bUnits;
        break;
      }
      case 'subTotalTaxable':
        compareResult = (a.subTotalTaxable || 0) - (b.subTotalTaxable || 0);
        break;
      case 'totalTax':
        compareResult = (a.totalTax || 0) - (b.totalTax || 0);
        break;
      case 'grandTotal':
        compareResult = (a.grandTotal || 0) - (b.grandTotal || 0);
        break;
      case 'status':
        compareResult = a.status.localeCompare(b.status);
        break;
      default:
        compareResult = 0;
    }
    return sortDirection === 'asc' ? compareResult : -compareResult;
  });

  const handleOpenPayment = (inv: Invoice) => {
    setPaymentModalInvoice(inv);
    setPaymentAmount(inv.amountDue);
    setPaymentNotes(`Payment for ${inv.invoiceNumber}`);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    if (paymentAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }
    recordInvoicePayment(paymentModalInvoice.id, paymentAmount, paymentMethod, paymentNotes);
    setPaymentModalInvoice(null);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const text = encodeURIComponent(
      `Hello ${inv.customerName},\nYour invoice ${inv.invoiceNumber} dated ${formatDate(inv.invoiceDate)} for ${formatCurrency(inv.grandTotal, business.currencySymbol)} is ready.\nDue amount: ${formatCurrency(inv.amountDue, business.currencySymbol)}.\nBank/UPI: ${business.upiId}\nThank you!\n- ${business.tradeName || business.name}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const isAllExpanded = filteredInvoices.length > 0 && filteredInvoices.every(inv => expandedInvoiceIds[inv.id]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Tax Invoices & Billing</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create, track, and manage GST compliant tax invoices & receipts</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsAutoUpdateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs group"
            title="Auto-update & re-sequence invoice numbers from starting number in company and system settings"
          >
            <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Auto Invoice No.</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Import historical and bulk sale invoices from CSV, Excel, or JSON"
          >
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import Sale Invoice</span>
          </button>
          <button
            onClick={() => {
              setStatementPartyId(parties[0]?.id || null);
              setIsStatementOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Generate and export client account statement"
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Account Statement</span>
          </button>
          <button
            onClick={() => setActiveTab('pos_billing')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <span>POS Quick Sale</span>
          </button>
          <button
            onClick={onOpenNewInvoice}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Uncommitted Invoice Draft Notification Banner */}
      {activeDraft && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-indigo-500/10 border border-amber-500/30 dark:border-amber-500/20 text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                  Unsaved Invoice Draft
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300">
                  {formatDraftTime(activeDraft.savedAt)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Draft for <strong className="font-semibold text-slate-900 dark:text-white">{activeDraft.customerName || 'Unnamed Party'}</strong> with {activeDraft.items?.length || 0} items ({formatCurrency(activeDraft.grandTotal || 0, business.currencySymbol)}) was saved to localStorage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={onOpenNewInvoice}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Draft</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearInvoiceDraft(currentCompanyId);
                setActiveDraft(null);
                showToast('info', 'Draft Removed', 'Unsaved draft was cleared.');
              }}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Discard draft"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Discard</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, customer name, GSTIN..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Types</option>
              <option value="TAX_INVOICE">Tax Invoice (GST)</option>
              <option value="BILL_OF_SUPPLY">Bill of Supply</option>
              <option value="POS_SALE">POS Sale</option>
              <option value="QUOTATION">Quotation / Estimate</option>
              <option value="CREDIT_NOTE">Credit Note</option>
            </select>
          </div>

          {/* View Mode Toggle Button: List vs Card */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View as tabular list"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View as cards grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoices List Container (Desktop Table + Mobile Cards OR Card Grid) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Controls & Sorting Bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {sortedInvoices.length} {sortedInvoices.length === 1 ? 'Invoice' : 'Invoices'}
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as InvoiceSortField)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="invoiceDate">Date</option>
                <option value="invoiceNumber">Invoice #</option>
                <option value="grandTotal">Grand Total</option>
                <option value="customerName">Customer</option>
                <option value="subTotalTaxable">Taxable</option>
                <option value="totalTax">GST</option>
                <option value="status">Status</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-0.5 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title={`Order: ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sortedInvoices.length > 0 && (
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg border border-indigo-200/70 dark:border-indigo-800 transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                {sortedInvoices.length > 0 && sortedInvoices.every(inv => expandedInvoiceIds[inv.id]) ? (
                  <>
                    <Minimize2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {viewMode === 'card' ? (
          <InvoiceCardGrid
            invoices={sortedInvoices}
            expandedInvoiceIds={expandedInvoiceIds}
            toggleExpandInvoice={toggleExpandInvoice}
            onSelectInvoiceForPrint={setSelectedInvoiceIdForPrint}
            onEditInvoice={onEditInvoice}
            onOpenPayment={handleOpenPayment}
            onShareInvoice={setShareModalInvoice}
            onOpenStatement={(partyId) => {
              setStatementPartyId(partyId || parties[0]?.id || null);
              setIsStatementOpen(true);
            }}
            onDeleteInvoice={deleteInvoice}
            currencySymbol={business.currencySymbol}
          />
        ) : (
          <>
            {/* 1. Mobile Card List (Hidden on md+ screens in List mode) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sortedInvoices.map(inv => {
                const isPaid = inv.status === 'PAID';
                const hasPendingPayment = (inv.amountDue || 0) > 0;
                const totalItemsCount = inv.items?.length || 0;
                const totalUnitsCount = inv.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                const isExpanded = !!expandedInvoiceIds[inv.id];

                return (
                  <div key={inv.id} className="p-3.5 space-y-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    {/* Mobile Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div 
                      onClick={() => setSelectedInvoiceIdForPrint(inv.id)}
                      className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{inv.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {inv.invoiceType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDate(inv.invoiceDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        isPaid
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                        {formatCurrency(inv.grandTotal, business.currencySymbol)}
                      </div>
                      {hasPendingPayment && (
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          Due: {formatCurrency(inv.amountDue, business.currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Details Snapshot */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{inv.customerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                      {inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'Retail / Consumer'} • POS: {inv.placeOfSupplyState || 'Local'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} ({totalUnitsCount} units)
                    </span>
                  </div>
                </div>

                {/* Expand / Collapse In-line Secondary Details Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => toggleExpandInvoice(inv.id, e)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isExpanded
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-0.5 rounded transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                    <span>{isExpanded ? 'Hide Tax & HSN Breakdown' : 'Show HSN Code & Tax Breakdown'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60">
                    {isExpanded ? 'Collapse' : 'Details'}
                  </span>
                </button>

                {/* Expandable Secondary Details Panel (HSN Code, Itemized Taxes, Statutory Breakdown) */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-800/40 rounded-xl border border-slate-200/90 dark:border-slate-700 space-y-3 animate-in fade-in-50 duration-150">
                    {/* 1. Itemized Products with HSN Code Breakdown */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Line Items & HSN Codes ({inv.items?.length || 0})
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          {totalUnitsCount} Units Total
                        </span>
                      </div>

                      <div className="space-y-2">
                        {inv.items && inv.items.length > 0 ? (
                          inv.items.map((item, idx) => {
                            const itemTax = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
                            return (
                              <div 
                                key={idx} 
                                className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900 dark:text-white truncate">
                                      {item.name}
                                    </div>
                                    {item.description && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                                    )}
                                  </div>
                                  <div className="text-right font-mono font-bold text-slate-900 dark:text-white shrink-0">
                                    {formatCurrency(item.totalAmount, business.currencySymbol)}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between flex-wrap gap-1.5 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                                  {/* HSN Code Badge */}
                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/70 dark:border-indigo-800 text-[10px]">
                                      HSN: {item.hsnCode || 'N/A'}
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {item.quantity} {item.unit || 'PCS'} @ {formatCurrency(item.rate, business.currencySymbol)}
                                    </span>
                                  </div>

                                  {/* Item Tax Tag */}
                                  <div className="flex items-center gap-1 font-mono text-[10px]">
                                    <span className="text-slate-500 dark:text-slate-400">
                                      Taxable: {formatCurrency(item.taxableAmount, business.currencySymbol)}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                                      {item.gstRate}% GST ({formatCurrency(itemTax, business.currencySymbol)})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-400 italic p-2 bg-white dark:bg-slate-900 rounded-lg">
                            No product lines attached
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Statutory GST & Tax Breakdown Box */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Statutory Tax & Calculation Breakdown
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {inv.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Taxable Amount</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(inv.subTotalTaxable, business.currencySymbol)}
                          </span>
                        </div>

                        {!inv.isInterState ? (
                          <>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">CGST Amount</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatCurrency(inv.totalCgst, business.currencySymbol)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">SGST / UTGST</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatCurrency(inv.totalSgst, business.currencySymbol)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Integrated GST (IGST)</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(inv.totalIgst, business.currencySymbol)}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Total Tax (GST)</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            {formatCurrency(inv.totalTax, business.currencySymbol)}
                          </span>
                        </div>

                        {inv.roundOff !== 0 && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Round Off</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {formatCurrency(inv.roundOff, business.currencySymbol)}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Grand Total</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(inv.grandTotal, business.currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {/* Additional Compliance Meta */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                        <span>Place of Supply: <strong>{inv.placeOfSupplyState} ({inv.placeOfSupplyStateCode})</strong></span>
                        <span>Due Date: <strong>{formatDate(inv.dueDate)}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Actions Toolbar */}
                <div className="flex items-center justify-between gap-1.5 pt-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceIdForPrint(inv.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Print / View Invoice"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Print</span>
                  </button>

                  {onEditInvoice && (
                    <button
                      type="button"
                      onClick={() => onEditInvoice(inv)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-xl border border-amber-200/80 dark:border-amber-800 transition-colors cursor-pointer shrink-0"
                      title="Edit Invoice"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShareModalInvoice(inv)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl border border-emerald-200/80 dark:border-emerald-800 transition-colors cursor-pointer shrink-0"
                    title="Share Invoice"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Dispatch</span>
                  </button>

                  {hasPendingPayment && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(inv)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                      title="Record Payment"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Pay</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setStatementPartyId(inv.customerId || parties[0]?.id || null);
                      setIsStatementOpen(true);
                    }}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Account Statement"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteInvoice(inv.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredInvoices.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No invoices match your search filter criteria.
            </div>
          )}
        </div>

        {/* 2. Desktop Table View (Visible on md+ screens with in-table expandable rows) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold select-none">
                <th className="py-3.5 px-3 w-10 text-center"></th>
                
                <th 
                  onClick={() => handleSort('invoiceNumber')}
                  className={`py-3.5 px-4 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'invoiceNumber' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Type & Invoice Number"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Type & Number</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'invoiceNumber' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'invoiceNumber' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('invoiceDate')}
                  className={`py-3.5 px-4 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'invoiceDate' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Date & Due Date"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date & Due Date</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'invoiceDate' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'invoiceDate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('customerName')}
                  className={`py-3.5 px-4 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'customerName' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Customer Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer Details</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'customerName' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'customerName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('itemsCount')}
                  className={`py-3.5 px-4 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'itemsCount' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Item Units Count"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Products & Items</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'itemsCount' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'itemsCount' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('subTotalTaxable')}
                  className={`py-3.5 px-4 text-right cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'subTotalTaxable' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Taxable Amount"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Taxable</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'subTotalTaxable' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'subTotalTaxable' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('totalTax')}
                  className={`py-3.5 px-4 text-right cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'totalTax' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by GST Tax Total"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>GST Total</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'totalTax' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'totalTax' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('grandTotal')}
                  className={`py-3.5 px-4 text-right cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'grandTotal' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Grand Total Value"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Grand Total</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'grandTotal' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'grandTotal' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('status')}
                  className={`py-3.5 px-4 text-center cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'status' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Payment Status"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Payment</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'status' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedInvoices.map(inv => {
                const isPaid = inv.status === 'PAID';
                const hasPendingPayment = (inv.amountDue || 0) > 0;
                const totalItemsCount = inv.items?.length || 0;
                const totalUnitsCount = inv.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                const isExpanded = !!expandedInvoiceIds[inv.id];

                return (
                  <React.Fragment key={inv.id}>
                    <tr className={`hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors group ${isExpanded ? 'bg-indigo-50/20 dark:bg-slate-800/30' : ''}`}>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleExpandInvoice(inv.id, e)}
                          className="p-1 rounded-lg hover:bg-indigo-100/70 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse Row' : 'Expand HSN & Tax Breakdown'}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`} />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
                          <span>{inv.invoiceNumber}</span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          {inv.invoiceType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                        <div className="text-slate-800 dark:text-slate-200 font-medium">{formatDate(inv.invoiceDate)}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Due: {formatDate(inv.dueDate)}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px] cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{inv.customerName}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'Retail / Unregistered'}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          POS: {inv.placeOfSupplyState} ({inv.placeOfSupplyStateCode})
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[200px] max-w-[280px] cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                        {inv.items && inv.items.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex flex-col gap-1">
                              {inv.items.slice(0, 2).map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 rounded-lg text-[11px] transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Package className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <span className="font-semibold text-slate-900 dark:text-slate-200 truncate" title={item.name}>
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-900/60 text-[10px] shrink-0">
                                    {item.quantity} {item.unit || 'PCS'}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {inv.items.length > 2 && (
                              <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-800"
                                  title={inv.items.slice(2).map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                                >
                                  <Boxes className="w-3 h-3" />
                                  +{inv.items.length - 2} more products
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 font-medium">
                                  Total: {totalUnitsCount} units
                                </span>
                              </div>
                            )}
                            {inv.items.length <= 2 && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                                <span>•</span>
                                <span>{totalUnitsCount} units</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs italic">No items attached</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(inv.subTotalTaxable, business.currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        <div>{formatCurrency(inv.totalTax, business.currencySymbol)}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500">
                          {inv.isInterState ? 'IGST' : 'CGST+SGST'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inv.grandTotal, business.currencySymbol)}
                        </div>
                        {hasPendingPayment && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                            Due: {formatCurrency(inv.amountDue, business.currencySymbol)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onEditInvoice && (
                            <button
                              onClick={() => onEditInvoice(inv)}
                              title="Edit Invoice"
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Edit</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedInvoiceIdForPrint(inv.id)}
                            title="Print / View Invoice"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Print</span>
                          </button>

                          <button
                            onClick={() => {
                              setStatementPartyId(inv.customerId || parties[0]?.id || null);
                              setIsStatementOpen(true);
                            }}
                            title="Generate & View Client Statement"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {hasPendingPayment && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              title="Record Payment"
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setShareModalInvoice(inv)}
                            title="Dispatch Invoice via WhatsApp & Email"
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Dispatch</span>
                          </button>

                          <button
                            onClick={() => deleteInvoice(inv.id)}
                            title="Delete Invoice"
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable In-Table Sub-Row (Desktop) */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30 dark:bg-slate-800/50 border-y border-indigo-100 dark:border-slate-800">
                        <td colSpan={10} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-750 shadow-xs">
                            {/* Products & HSN breakdown */}
                            <div className="lg:col-span-2 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span className="flex items-center gap-1.5">
                                  <Package className="w-4 h-4 text-indigo-600" />
                                  Line Items & HSN Code Breakdown
                                </span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  {inv.items?.length || 0} Line Items • {totalUnitsCount} Units Total
                                </span>
                              </div>

                              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                      <th className="py-1.5 px-2">Item Name</th>
                                      <th className="py-1.5 px-2">HSN Code</th>
                                      <th className="py-1.5 px-2 text-right">Qty</th>
                                      <th className="py-1.5 px-2 text-right">Rate</th>
                                      <th className="py-1.5 px-2 text-right">Taxable</th>
                                      <th className="py-1.5 px-2 text-right">GST Rate</th>
                                      <th className="py-1.5 px-2 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                    {inv.items?.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-1.5 px-2 font-sans font-medium text-slate-900 dark:text-slate-200">
                                          {item.name}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/70 dark:border-indigo-800 text-[10px]">
                                            {item.hsnCode || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-right">{item.quantity} {item.unit}</td>
                                        <td className="py-1.5 px-2 text-right">{formatCurrency(item.rate, business.currencySymbol)}</td>
                                        <td className="py-1.5 px-2 text-right">{formatCurrency(item.taxableAmount, business.currencySymbol)}</td>
                                        <td className="py-1.5 px-2 text-right">{item.gstRate}%</td>
                                        <td className="py-1.5 px-2 text-right font-bold">{formatCurrency(item.totalAmount, business.currencySymbol)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Statutory & Place of Supply Summary */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-1">
                                <span>Statutory Tax Breakdown</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold">
                                  {inv.isInterState ? 'IGST Applicable' : 'CGST + SGST'}
                                </span>
                              </div>

                              <div className="space-y-1 text-[11px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">Place of Supply:</span>
                                  <span className="font-semibold">{inv.placeOfSupplyState} ({inv.placeOfSupplyStateCode})</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">Taxable Subtotal:</span>
                                  <span>{formatCurrency(inv.subTotalTaxable, business.currencySymbol)}</span>
                                </div>
                                {!inv.isInterState ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500 font-sans">Central GST (CGST):</span>
                                      <span>{formatCurrency(inv.totalCgst, business.currencySymbol)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500 font-sans">State GST (SGST):</span>
                                      <span>{formatCurrency(inv.totalSgst, business.currencySymbol)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Integrated GST (IGST):</span>
                                    <span>{formatCurrency(inv.totalIgst, business.currencySymbol)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-indigo-700 dark:text-indigo-300 pt-1 border-t border-slate-200/80 dark:border-slate-700">
                                  <span className="font-sans">Total GST Tax:</span>
                                  <span>{formatCurrency(inv.totalTax, business.currencySymbol)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1">
                                  <span className="font-sans">Invoice Total:</span>
                                  <span>{formatCurrency(inv.grandTotal, business.currencySymbol)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No invoices match your search filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-md max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 my-auto">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
              Record Customer Payment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Invoice {paymentModalInvoice.invoiceNumber} • Total: {formatCurrency(paymentModalInvoice.grandTotal, business.currencySymbol)}
            </p>

            <form onSubmit={handleSubmitPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received ({business.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentModalInvoice.amountDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Due Balance: {formatCurrency(paymentModalInvoice.amountDue, business.currencySymbol)}</span>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(paymentModalInvoice.amountDue)}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Pay Full Amount
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS / IMPS</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Notes / Reference ID
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. UTR #1882910 or Cheque #004821"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Statement of Account Modal */}
      {isStatementOpen && (
        <ClientStatementModal
          partyId={statementPartyId || undefined}
          onClose={() => {
            setIsStatementOpen(false);
            setStatementPartyId(null);
          }}
          onSelectInvoiceForPrint={setSelectedInvoiceIdForPrint}
        />
      )}

      {/* Import Sale Invoices Bulk Modal */}
      <ImportSaleInvoicesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Auto-Update Invoice Numbers from Company & System Settings Modal */}
      <AutoUpdateInvoiceNumbersModal
        isOpen={isAutoUpdateModalOpen}
        onClose={() => setIsAutoUpdateModalOpen(false)}
      />

      {/* WhatsApp & Email Dispatch Modal */}
      <ShareInvoiceModal
        isOpen={!!shareModalInvoice}
        onClose={() => setShareModalInvoice(null)}
        invoice={shareModalInvoice}
        business={business}
        onUpdateDispatchSettings={(newSettings) => {
          updateBusiness({ dispatchSettings: newSettings }, true);
        }}
        showToast={showToast}
      />
    </div>
  );
};
