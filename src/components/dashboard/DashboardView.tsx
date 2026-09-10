import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Package, 
  Users, 
  AlertTriangle, 
  Plus, 
  ShoppingCart, 
  Truck, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle2, 
  Clock, 
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ArrowRightLeft,
  Filter,
  Eye,
  Printer,
  Sparkles,
  BarChart3,
  Activity,
  Maximize2,
  Edit3,
  ShieldAlert,
  Ban,
  Send
} from 'lucide-react';
import { ShareInvoiceModal } from '../invoices/ShareInvoiceModal';
import { MonthlyReportCard } from './MonthlyReportCard';
import { 
  normalizeLowStockSettings, 
  getProductStockThreshold, 
  isProductLowStock, 
  isProductOutOfStock,
  isProductCriticalStock,
  computeInventoryHealth
} from '../../utils/stockUtils';
import { Invoice } from '../../types';

interface DashboardViewProps {
  onOpenNewInvoice: () => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenNewInvoice, onEditInvoice }) => {
  const { 
    invoices, 
    purchaseBills, 
    products, 
    parties, 
    expenses, 
    business, 
    updateBusiness,
    showToast,
    setActiveTab,
    setSelectedInvoiceIdForPrint
  } = useApp();

  const [shareModalInvoice, setShareModalInvoice] = useState<any | null>(null);

  // Dynamic Today Date String
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Selected Day for Daily Sales & Purchases (Default to real today date)
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodayDateString());

  // Helper date shifting
  const shiftDate = (days: number) => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDay(`${yyyy}-${mm}-${dd}`);
  };

  // -------------------------------------------------------------
  // DAILY METRICS FOR SELECTED DAY
  // -------------------------------------------------------------
  const dayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.invoiceDate === selectedDay && inv.status !== 'CANCELLED');
  }, [invoices, selectedDay]);

  const dayPurchases = useMemo(() => {
    return purchaseBills.filter(bill => bill.billDate === selectedDay);
  }, [purchaseBills, selectedDay]);

  const dailySaleTotal = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [dayInvoices]);

  const dailySaleTaxable = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.subTotalTaxable, 0);
  }, [dayInvoices]);

  const dailySaleTax = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.totalTax, 0);
  }, [dayInvoices]);

  const dailyPurchaseTotal = useMemo(() => {
    return dayPurchases.reduce((sum, bill) => sum + bill.grandTotal, 0);
  }, [dayPurchases]);

  const dailyPurchaseTaxable = useMemo(() => {
    return dayPurchases.reduce((sum, bill) => sum + bill.subTotalTaxable, 0);
  }, [dayPurchases]);

  const dailyPurchaseItc = useMemo(() => {
    return dayPurchases
      .filter(b => b.itcEligibility !== 'INELIGIBLE_17_5')
      .reduce((sum, bill) => sum + bill.totalTax, 0);
  }, [dayPurchases]);

  const dailyNetSpread = dailySaleTotal - dailyPurchaseTotal;

  // -------------------------------------------------------------
  // ALL-TIME CUMULATIVE METRICS
  // -------------------------------------------------------------
  const totalSales = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalPurchases = purchaseBills
    .reduce((sum, bill) => sum + bill.grandTotal, 0);

  const totalReceivables = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

  const totalPayables = purchaseBills
    .reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

  const totalOutputGst = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.totalTax, 0);

  const totalInputItc = purchaseBills
    .filter(b => b.itcEligibility === 'ELIGIBLE_ALL' || b.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS')
    .reduce((sum, bill) => sum + bill.totalTax, 0) + 
    expenses.filter(e => e.hasGstBill).reduce((sum, exp) => sum + exp.gstAmount, 0);

  const netGstPayable = Math.max(0, totalOutputGst - totalInputItc);

  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);
  const health = computeInventoryHealth(products, stockSettings);
  const lowStockProducts = products.filter(p => isProductLowStock(p, stockSettings));
  
  // Recent invoices sorted latest first (by invoiceDate descending, then createdAt descending, then invoiceNumber descending)
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => {
        const timeA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
        const timeB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
        const validTimeA = Number.isNaN(timeA) ? 0 : timeA;
        const validTimeB = Number.isNaN(timeB) ? 0 : timeB;

        if (validTimeB !== validTimeA) {
          return validTimeB - validTimeA;
        }

        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const validCreatedA = Number.isNaN(createdA) ? 0 : createdA;
        const validCreatedB = Number.isNaN(createdB) ? 0 : createdB;

        if (validCreatedB !== validCreatedA) {
          return validCreatedB - validCreatedA;
        }

        return (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true, sensitivity: 'base' });
      })
      .slice(0, 6);
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions with Rotating Conic-Gradient Border */}
      <div className="relative rounded-2xl p-[2px] overflow-hidden shadow-2xl">
        {/* Ambient Outer Conic Glow */}
        <div 
          className="absolute top-1/2 left-1/2 w-[350%] aspect-square animate-rotate-conic pointer-events-none opacity-40 blur-xl will-change-transform"
          style={{
            background: 'conic-gradient(from 0deg, #6366f1 0deg, #a855f7 72deg, #ec4899 144deg, #06b6d4 216deg, #10b981 288deg, #6366f1 360deg)'
          }}
        />

        {/* Sharp Rotating Conic-Gradient Border */}
        <div 
          className="absolute top-1/2 left-1/2 w-[350%] aspect-square animate-rotate-conic pointer-events-none will-change-transform"
          style={{
            background: 'conic-gradient(from 0deg, #6366f1 0deg, #a855f7 72deg, #ec4899 144deg, #06b6d4 216deg, #10b981 288deg, #6366f1 360deg)'
          }}
        />

        {/* Inner Card Body */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-[calc(1rem-2px)] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Good day, {business.tradeName || business.name} 👋
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-300">
              GSTIN: <span className="font-mono font-semibold text-cyan-300">{business.gstin}</span> • State Code: {business.stateCode} ({business.state})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('pos_billing')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              <span>POS Counter Sale</span>
            </button>

            <button
              onClick={onOpenNewInvoice}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Tax Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DAILY SALE & PURCHASE CONTROL & HIGHLIGHT HUB                 */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header & Date Switcher Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 dark:from-slate-850 via-indigo-50/40 dark:via-indigo-950/20 to-slate-50 dark:to-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Daily Sale & Purchase Tracker</h2>
              {selectedDay === getTodayDateString() && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live daily turnover, purchases, net cash flow, and transaction breakdown by date.
            </p>
          </div>

          {/* Interactive Day Date Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs p-1">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
              />

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(getTodayDateString())}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                selectedDay === getTodayDateString()
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Daily Top 3 Metric Cards for Selected Date */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Sale Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 dark:from-emerald-950/40 via-white dark:via-slate-900 to-emerald-50/30 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Daily Sales</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatDate(selectedDay)}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-lg">
                {dayInvoices.length} {dayInvoices.length === 1 ? 'sale' : 'sales'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
                {formatCurrency(dailySaleTotal, business.currencySymbol)}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Taxable: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(dailySaleTaxable, business.currencySymbol)}</strong></span>
                <span>GST: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatCurrency(dailySaleTax, business.currencySymbol)}</strong></span>
              </div>
            </div>
          </div>

          {/* Daily Purchase Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 dark:from-rose-950/40 via-white dark:via-slate-900 to-rose-50/30 dark:to-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shadow-xs">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Daily Purchases</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatDate(selectedDay)}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold font-mono bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 rounded-lg">
                {dayPurchases.length} {dayPurchases.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-200 font-mono">
                {formatCurrency(dailyPurchaseTotal, business.currencySymbol)}
              </div>
              <div className="mt-2 pt-2 border-t border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Taxable: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(dailyPurchaseTaxable, business.currencySymbol)}</strong></span>
                <span>ITC Credit: <strong className="text-rose-700 dark:text-rose-400 font-mono">{formatCurrency(dailyPurchaseItc, business.currencySymbol)}</strong></span>
              </div>
            </div>
          </div>

          {/* Daily Net Cash Flow / Spread Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 dark:from-indigo-950/40 via-white dark:via-slate-900 to-cyan-50/30 dark:to-cyan-950/20 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">Daily Net Spread</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Sales minus Purchases</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                dailyNetSpread >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
              }`}>
                {dailyNetSpread >= 0 ? 'Net Surplus' : 'Net Outflow'}
              </span>
            </div>

            <div className="mt-3">
              <div className={`text-2xl sm:text-3xl font-black font-mono ${
                dailyNetSpread >= 0 ? 'text-indigo-950 dark:text-indigo-200' : 'text-rose-700 dark:text-rose-300'
              }`}>
                {dailyNetSpread >= 0 ? '+' : ''}{formatCurrency(dailyNetSpread, business.currencySymbol)}
              </div>
              <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <button
                  onClick={() => setActiveTab('gst_returns')}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View GST Registers</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {dayInvoices.length + dayPurchases.length} total entries
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MONTHLY BUSINESS REPORT CARD & PERFORMANCE METRICS            */}
      {/* ------------------------------------------------------------- */}
      <MonthlyReportCard 
        onOpenNewInvoice={onOpenNewInvoice}
        onEditInvoice={onEditInvoice}
      />

      {/* ------------------------------------------------------------- */}
      {/* ALL-TIME CUMULATIVE FINANCIAL KPIS GRID                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cumulative Revenue (Sales)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalSales, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{invoices.length} Invoices issued</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
              FY 2026-27
            </span>
          </div>
        </div>

        {/* GST Output vs Input ITC */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net GST Liability</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-950 dark:text-indigo-200">
            {formatCurrency(netGstPayable, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>ITC: {formatCurrency(totalInputItc, business.currencySymbol)}</span>
            <button
              onClick={() => setActiveTab('gst_returns')}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center cursor-pointer"
            >
              GSTR-3B <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Receivables (Debtors) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Accounts Receivable</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-300">
            {formatCurrency(totalReceivables, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Pending from customers</span>
            <button
              onClick={() => setActiveTab('parties')}
              className="text-amber-700 dark:text-amber-400 font-medium hover:underline cursor-pointer"
            >
              View Debtors
            </button>
          </div>
        </div>

        {/* Purchases & Payables */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Accounts Payable</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-300">
            {formatCurrency(totalPayables, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Due to suppliers</span>
            <button
              onClick={() => setActiveTab('purchases')}
              className="text-rose-700 dark:text-rose-400 font-medium hover:underline cursor-pointer"
            >
              View Bills
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* OPERATIONS & HUBS ROW                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Parties & Client Accounts Hub Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-cyan-300 border border-indigo-400/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Parties & Client Accounts</h3>
                  <p className="text-[11px] text-slate-300">Customer & Vendor Ledger Balances</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                {parties.length} Contacts
              </span>
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-slate-300">Total Receivables (Debtors):</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(totalReceivables, business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-slate-300">Total Payables (Vendors):</span>
                <span className="font-bold text-rose-300 font-mono">
                  {formatCurrency(totalPayables, business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-300">Registered GSTIN Parties:</span>
                <span className="font-bold text-cyan-300">
                  {parties.filter(p => p.gstin).length} Verified
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('parties')}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <span>View Parties & Statements</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Low Stock & Inventory Health */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Inventory Status</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{products.length} catalog items</p>
                </div>
              </div>
              {lowStockProducts.length > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full">
                  {lowStockProducts.length} Low Stock
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full">
                  Healthy
                </span>
              )}
            </div>

            <div className="space-y-2 mt-3">
              {lowStockProducts.slice(0, 3).map(prod => {
                const effectiveThreshold = getProductStockThreshold(prod, stockSettings);
                const isOutOfStock = isProductOutOfStock(prod);
                const isCritical = isProductCriticalStock(prod, stockSettings);

                return (
                  <div key={prod.id} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{prod.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Min Alert: {effectiveThreshold} {prod.unit}</p>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-xs font-mono shrink-0 flex items-center gap-1 ${
                      isOutOfStock 
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800' 
                        : isCritical
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                    }`}>
                      {isOutOfStock && <Ban className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                      {prod.currentStock} {prod.unit}
                    </span>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  All inventory stock levels are above threshold limits.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('inventory')}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-full sm:rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <span>Manage Inventory & Stock</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GST Filing Quick Status Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">GST & Tax Registers</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Sale & Purchase Registers</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full">
                August 2026
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Taxable Outward Supplies:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatCurrency(invoices.reduce((s, i) => s + i.subTotalTaxable, 0), business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Total Output Tax (CGST+SGST+IGST):</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatCurrency(totalOutputGst, business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400">Eligible Inward ITC:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(totalInputItc, business.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('gst_returns')}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Open Sale & Purchase Registers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECENT INVOICES FEED TABLE                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Tax Invoices & Sales</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest sales invoices issued with payment tracking</p>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View all {invoices.length} invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/50">
                <th className="py-2.5 px-3">Invoice No & Date</th>
                <th className="py-2.5 px-3">Customer & GSTIN</th>
                <th className="py-2.5 px-3">Products / Items</th>
                <th className="py-2.5 px-3">Tax Type</th>
                <th className="py-2.5 px-3 text-right">Taxable</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No sales invoices recorded yet.
                  </td>
                </tr>
              ) : (
                recentInvoices.map(inv => {
                  const isPaid = inv.status === 'PAID';
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                      <div className="font-semibold">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(inv.invoiceDate)}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {inv.customerGstin || 'Unregistered / Retail'}
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      {inv.items && inv.items.length > 0 ? (
                        <div className="space-y-0.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium truncate flex items-center gap-1" title={inv.items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}>
                            <Package className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">{inv.items[0]?.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({inv.items[0]?.quantity} {inv.items[0]?.unit})</span>
                          </div>
                          {inv.items.length > 1 && (
                            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              +{inv.items.length - 1} more item{inv.items.length - 1 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">No items</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                        {inv.isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra)'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(inv.subTotalTaxable, business.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(inv.grandTotal, business.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditInvoice && (
                          <button
                            onClick={() => onEditInvoice(inv)}
                            className="px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-900/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => setShareModalInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-900/60 rounded-lg transition-colors cursor-pointer"
                          title="Dispatch invoice via WhatsApp or Email"
                        >
                          <Send className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Dispatch</span>
                        </button>
                        <button
                          onClick={() => setSelectedInvoiceIdForPrint(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          Print / PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

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
