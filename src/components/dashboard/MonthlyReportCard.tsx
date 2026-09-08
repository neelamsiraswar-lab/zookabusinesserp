import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  CreditCard, 
  Users, 
  Package, 
  BarChart3, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  X,
  PieChart,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Invoice } from '../../types';

interface MonthlyReportCardProps {
  onOpenNewInvoice?: () => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthlyReportCard: React.FC<MonthlyReportCardProps> = () => {
  const { 
    invoices, 
    purchaseBills, 
    expenses, 
    payments, 
    business, 
    setActiveTab 
  } = useApp();

  // Current year-month as default 'YYYY-MM'
  const getCurrentMonthString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthString());
  const [activeTabSubView, setActiveTabSubView] = useState<'kpi' | 'daily_chart' | 'top_performers' | 'breakdowns'>('kpi');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Parse Year and Month number
  const { year, monthNum, monthName, daysInMonth, monthLabel, isCurrentMonth } = useMemo(() => {
    const parts = selectedMonth.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const mName = MONTH_NAMES[m - 1] || 'Month';
    const days = new Date(y, m, 0).getDate();
    const isCur = selectedMonth === getCurrentMonthString();
    return {
      year: y,
      monthNum: m,
      monthName: mName,
      daysInMonth: days,
      monthLabel: `${mName} ${y}`,
      isCurrentMonth: isCur
    };
  }, [selectedMonth]);

  // Navigate months
  const shiftMonth = (delta: number) => {
    let newYear = year;
    let newMonth = monthNum + delta;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // Previous Month string for MoM comparison
  const prevMonthString = useMemo(() => {
    let prevY = year;
    let prevM = monthNum - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  }, [year, monthNum]);

  // Filter Records for selected month
  const monthInvoices = useMemo(() => {
    return invoices.filter(inv => inv.invoiceDate?.startsWith(selectedMonth) && inv.status !== 'CANCELLED');
  }, [invoices, selectedMonth]);

  const prevMonthInvoices = useMemo(() => {
    return invoices.filter(inv => inv.invoiceDate?.startsWith(prevMonthString) && inv.status !== 'CANCELLED');
  }, [invoices, prevMonthString]);

  const monthPurchases = useMemo(() => {
    return purchaseBills.filter(b => b.billDate?.startsWith(selectedMonth));
  }, [purchaseBills, selectedMonth]);

  const prevMonthPurchases = useMemo(() => {
    return purchaseBills.filter(b => b.billDate?.startsWith(prevMonthString));
  }, [purchaseBills, prevMonthString]);

  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.date?.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const monthPaymentsIn = useMemo(() => {
    return payments.filter(p => p.type === 'PAYMENT_IN' && p.date?.startsWith(selectedMonth));
  }, [payments, selectedMonth]);

  // -------------------------------------------------------------
  // FINANCIAL CALCULATIONS
  // -------------------------------------------------------------
  // 1. Sales
  const grossSales = useMemo(() => {
    return monthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [monthInvoices]);

  const taxableSales = useMemo(() => {
    return monthInvoices.reduce((sum, inv) => sum + (inv.subTotalTaxable || 0), 0);
  }, [monthInvoices]);

  const outputGst = useMemo(() => {
    return monthInvoices.reduce((sum, inv) => sum + (inv.totalTax || 0), 0);
  }, [monthInvoices]);

  const prevGrossSales = useMemo(() => {
    return prevMonthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [prevMonthInvoices]);

  const salesMomGrowth = useMemo(() => {
    if (prevGrossSales <= 0) return null;
    return ((grossSales - prevGrossSales) / prevGrossSales) * 100;
  }, [grossSales, prevGrossSales]);

  // 2. Purchases
  const grossPurchases = useMemo(() => {
    return monthPurchases.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  }, [monthPurchases]);

  const taxablePurchases = useMemo(() => {
    return monthPurchases.reduce((sum, b) => sum + (b.subTotalTaxable || 0), 0);
  }, [monthPurchases]);

  const purchasesItc = useMemo(() => {
    return monthPurchases
      .filter(b => b.itcEligibility !== 'INELIGIBLE_17_5')
      .reduce((sum, b) => sum + (b.totalTax || 0), 0);
  }, [monthPurchases]);

  // 3. Operating Expenses
  const totalExpenses = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [monthExpenses]);

  const expensesItc = useMemo(() => {
    return monthExpenses
      .filter(e => e.hasGstBill)
      .reduce((sum, e) => sum + (e.gstAmount || 0), 0);
  }, [monthExpenses]);

  // 4. Net Operating Spread / Profit
  const totalOutflow = grossPurchases + totalExpenses;
  const netOperatingSpread = grossSales - totalOutflow;
  const profitMarginPercent = grossSales > 0 ? (netOperatingSpread / grossSales) * 100 : 0;

  // 5. Collections & Inflow Realization
  const invoiceCashRealized = useMemo(() => {
    return monthInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  }, [monthInvoices]);

  const invoiceAmountDue = useMemo(() => {
    return monthInvoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
  }, [monthInvoices]);

  const directPaymentInTotal = useMemo(() => {
    return monthPaymentsIn.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [monthPaymentsIn]);

  const totalCashCollected = invoiceCashRealized + directPaymentInTotal;
  const collectionRatio = grossSales > 0 ? Math.min(100, Math.round((invoiceCashRealized / grossSales) * 100)) : 0;

  // 6. GST Position for the month
  const totalEligibleItc = purchasesItc + expensesItc;
  const netGstPayable = Math.max(0, outputGst - totalEligibleItc);
  const netItcCreditForward = Math.max(0, totalEligibleItc - outputGst);

  // -------------------------------------------------------------
  // DAY-BY-DAY ACTIVITY FOR THE MONTH
  // -------------------------------------------------------------
  const dailyBreakdown = useMemo(() => {
    const list: {
      dayNum: number;
      dateStr: string;
      sales: number;
      purchases: number;
      invoicesCount: number;
      isToday: boolean;
    }[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayInvs = monthInvoices.filter(i => i.invoiceDate === dayStr);
      const dayPurchs = monthPurchases.filter(b => b.billDate === dayStr);

      const daySaleTotal = dayInvs.reduce((s, i) => s + i.grandTotal, 0);
      const dayPurchTotal = dayPurchs.reduce((s, b) => s + b.grandTotal, 0);

      list.push({
        dayNum: d,
        dateStr: dayStr,
        sales: daySaleTotal,
        purchases: dayPurchTotal,
        invoicesCount: dayInvs.length,
        isToday: dayStr === todayStr
      });
    }
    return list;
  }, [daysInMonth, year, monthNum, monthInvoices, monthPurchases]);

  const maxDailySale = useMemo(() => {
    const max = Math.max(...dailyBreakdown.map(d => d.sales), 0);
    return max > 0 ? max : 1;
  }, [dailyBreakdown]);

  const peakSalesDay = useMemo(() => {
    const sorted = [...dailyBreakdown].sort((a, b) => b.sales - a.sales);
    return sorted[0]?.sales > 0 ? sorted[0] : null;
  }, [dailyBreakdown]);

  const activeSalesDaysCount = useMemo(() => {
    return dailyBreakdown.filter(d => d.sales > 0).length;
  }, [dailyBreakdown]);

  // -------------------------------------------------------------
  // TOP CUSTOMERS & TOP PRODUCTS
  // -------------------------------------------------------------
  const topCustomers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; count: number; paid: number; due: number }>();
    monthInvoices.forEach(inv => {
      const id = inv.customerId || inv.customerName || 'Unknown';
      const existing = map.get(id) || {
        id,
        name: inv.customerName || 'Unnamed Customer',
        total: 0,
        count: 0,
        paid: 0,
        due: 0
      };
      existing.total += inv.grandTotal || 0;
      existing.count += 1;
      existing.paid += inv.amountPaid || 0;
      existing.due += inv.amountDue || 0;
      map.set(id, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthInvoices]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; quantity: number; revenue: number; unit?: string }>();
    monthInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const key = item.productId || item.name || 'item';
        const existing = map.get(key) || {
          id: key,
          name: item.name || 'Unnamed Item',
          quantity: 0,
          revenue: 0,
          unit: item.unit || 'pcs'
        };
        existing.quantity += item.quantity || 0;
        existing.revenue += item.total || 0;
        map.set(key, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [monthInvoices]);

  // Payment Methods breakdown
  const paymentMethodsStats = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
      OTHER: 0
    };
    monthInvoices.forEach(inv => {
      if (inv.paymentMethod && counts[inv.paymentMethod] !== undefined) {
        counts[inv.paymentMethod] += (inv.amountPaid || 0);
      } else if (inv.amountPaid > 0) {
        counts.OTHER += inv.amountPaid;
      }
    });
    return counts;
  }, [monthInvoices]);

  // Expense Categories breakdown
  const expenseCategoriesStats = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach(e => {
      const cat = e.category || 'General Expense';
      map.set(cat, (map.get(cat) || 0) + (e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* ------------------------------------------------------------- */}
      {/* CARD HEADER & MONTH SELECTOR                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 dark:from-slate-850 via-slate-100/60 dark:via-slate-800/40 to-slate-50 dark:to-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Monthly Report Card
                </h2>
                {isCurrentMonth ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                    Current Active Month
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                    Historical Archive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consolidated turnover, inward costs, operating margin, cash collection, and monthly GST position for <strong className="text-slate-800 dark:text-slate-200">{monthLabel}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector Controls & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          {/* Stepper & Month Input */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs p-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonth(getCurrentMonthString())}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
            >
              Jump to This Month
            </button>
          )}

          {/* Print / Export Report Card Button */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Print or Export Monthly Report Card"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* EXECUTIVE SCORE STRIP (Month Health, MoM Growth, Billing Days) */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Operating Status:</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
              netOperatingSpread >= 0 
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}>
              {netOperatingSpread >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Net Operating Surplus ({profitMarginPercent.toFixed(1)}% Margin)</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Operating Deficit</span>
                </>
              )}
            </span>
          </div>

          {salesMomGrowth !== null && (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 pl-2 border-l border-slate-300 dark:border-slate-700">
              <span>MoM Sales:</span>
              <span className={`font-bold font-mono ${salesMomGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {salesMomGrowth >= 0 ? '+' : ''}{salesMomGrowth.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span>Active Billing Days: <strong className="text-slate-800 dark:text-slate-200 font-mono">{activeSalesDaysCount}/{daysInMonth} days</strong></span>
          <span>•</span>
          <span>Invoices: <strong className="text-slate-800 dark:text-slate-200 font-mono">{monthInvoices.length}</strong></span>
          <span>•</span>
          <span>Purchases: <strong className="text-slate-800 dark:text-slate-200 font-mono">{monthPurchases.length}</strong></span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW TABS (KPIs, Daily Chart, Top Performers, Breakdowns)  */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 sm:px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTabSubView('kpi')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTabSubView === 'kpi'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Core Monthly Metrics</span>
        </button>

        <button
          onClick={() => setActiveTabSubView('daily_chart')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTabSubView === 'daily_chart'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Daily Trend ({daysInMonth} Days)</span>
        </button>

        <button
          onClick={() => setActiveTabSubView('top_performers')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTabSubView === 'top_performers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Top Clients & Items</span>
        </button>

        <button
          onClick={() => setActiveTabSubView('breakdowns')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTabSubView === 'breakdowns'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Payment & Expense Mix</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW CONTENT 1: CORE MONTHLY METRIC MATRIX (6 CARDS)           */}
      {/* ------------------------------------------------------------- */}
      {activeTabSubView === 'kpi' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Monthly Revenue (Gross Sales) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 dark:from-emerald-950/30 via-white dark:via-slate-900 to-emerald-50/20 dark:to-emerald-950/10 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Monthly Sales Turnover
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Gross Billed Supplies</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-lg">
                {monthInvoices.length} {monthInvoices.length === 1 ? 'invoice' : 'invoices'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
                {formatCurrency(grossSales, business.currencySymbol)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-emerald-100 dark:border-emerald-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Taxable Outward:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(taxableSales, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Output GST Collected:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatCurrency(outputGst, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500">
                  <span>Avg Invoice Ticket:</span>
                  <span className="font-mono">{monthInvoices.length > 0 ? formatCurrency(grossSales / monthInvoices.length, business.currencySymbol) : '₹0'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Monthly Purchases (Inward Supply) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/60 dark:from-rose-950/30 via-white dark:via-slate-900 to-rose-50/20 dark:to-rose-950/10 border border-rose-200/80 dark:border-rose-900/50 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Monthly Purchases
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Vendor Inward Bills</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 rounded-lg">
                {monthPurchases.length} {monthPurchases.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-200 font-mono">
                {formatCurrency(grossPurchases, business.currencySymbol)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-rose-100 dark:border-rose-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Taxable Inward:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(taxablePurchases, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Input Tax Credit (ITC):</span>
                  <strong className="text-rose-700 dark:text-rose-400 font-mono">{formatCurrency(purchasesItc, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500">
                  <span>Unpaid Supplier Bills:</span>
                  <span className="font-mono">{formatCurrency(monthPurchases.reduce((s, b) => s + (b.amountDue || 0), 0), business.currencySymbol)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Monthly Operating Expenses */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 dark:from-amber-950/30 via-white dark:via-slate-900 to-amber-50/20 dark:to-amber-950/10 border border-amber-200/80 dark:border-amber-900/50 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Operating Expenses
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Overhead & Operational</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-lg">
                {monthExpenses.length} entries
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-200 font-mono">
                {formatCurrency(totalExpenses, business.currencySymbol)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-amber-100 dark:border-amber-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>GST on Expenses (ITC):</span>
                  <strong className="text-amber-700 dark:text-amber-400 font-mono">{formatCurrency(expensesItc, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Categories Logged:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{expenseCategoriesStats.length} heads</strong>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500">
                  <span>Combined Inward + Spend:</span>
                  <span className="font-mono">{formatCurrency(totalOutflow, business.currencySymbol)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Net Operating Spread (Sales - Purchases - Expenses) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 dark:from-indigo-950/30 via-white dark:via-slate-900 to-cyan-50/20 dark:to-cyan-950/10 border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                    Net Operating Spread
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Sales minus Inward & Expenses</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                netOperatingSpread >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
              }`}>
                {netOperatingSpread >= 0 ? 'Gross Profit' : 'Deficit'}
              </span>
            </div>

            <div className="mt-3">
              <div className={`text-2xl sm:text-3xl font-black font-mono ${
                netOperatingSpread >= 0 ? 'text-indigo-950 dark:text-indigo-200' : 'text-rose-700 dark:text-rose-300'
              }`}>
                {netOperatingSpread >= 0 ? '+' : ''}{formatCurrency(netOperatingSpread, business.currencySymbol)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-indigo-100 dark:border-indigo-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Operating Margin:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{profitMarginPercent.toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Inflow (Sales):</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(grossSales, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500">
                  <span>Total Outflow (Cost+Exp):</span>
                  <span className="font-mono">{formatCurrency(totalOutflow, business.currencySymbol)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Collections & Cash Realization */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 dark:from-blue-950/30 via-white dark:via-slate-900 to-blue-50/20 dark:to-blue-950/10 border border-blue-200/80 dark:border-blue-900/50 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                    Collections & Inflow
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Realized Cash & Debtor Due</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 rounded-lg">
                {collectionRatio}% Collected
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-blue-200 font-mono">
                {formatCurrency(totalCashCollected, business.currencySymbol)}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-blue-100 dark:border-blue-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>From Month Invoices:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(invoiceCashRealized, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Customer Due:</span>
                  <strong className="text-amber-700 dark:text-amber-400 font-mono">{formatCurrency(invoiceAmountDue, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500">
                  <span>Payment Receipts Logged:</span>
                  <span className="font-mono">{monthPaymentsIn.length} vouchers</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Monthly GST Position (GSTR-3B Balance) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/60 dark:from-purple-950/30 via-white dark:via-slate-900 to-purple-50/20 dark:to-purple-950/10 border border-purple-200/80 dark:border-purple-900/50 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                    Monthly GST Position
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Output Tax vs Eligible ITC</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('gst_returns')}
                className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>GSTR-3B</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-purple-950 dark:text-purple-200 font-mono">
                {netGstPayable > 0 
                  ? formatCurrency(netGstPayable, business.currencySymbol)
                  : formatCurrency(netItcCreditForward, business.currencySymbol)}
              </div>
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  netGstPayable > 0 
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' 
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {netGstPayable > 0 ? 'Net GST Payable to Govt' : 'ITC Balance Carried Forward'}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Output Tax (Sales):</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(outputGst, business.currencySymbol)}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Eligible ITC (Purchases+Exp):</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalEligibleItc, business.currencySymbol)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW CONTENT 2: DAILY TREND BAR GRAPH                         */}
      {/* ------------------------------------------------------------- */}
      {activeTabSubView === 'daily_chart' && (
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Sales Activity Across {monthLabel}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turnover distribution for each day of the month ({daysInMonth} days). Hover over any day for details.
              </p>
            </div>
            {peakSalesDay && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-600 dark:text-slate-300">
                  Peak Day: <strong>Day {peakSalesDay.dayNum} ({formatDate(peakSalesDay.dateStr)})</strong> — <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(peakSalesDay.sales, business.currencySymbol)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Bar Graph Container */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="h-48 flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 overflow-x-auto no-scrollbar">
              {dailyBreakdown.map((item) => {
                const heightPercent = maxDailySale > 0 ? Math.max(6, Math.round((item.sales / maxDailySale) * 100)) : 6;
                const hasSales = item.sales > 0;
                const isPeak = peakSalesDay?.dayNum === item.dayNum && item.sales > 0;

                return (
                  <div 
                    key={item.dayNum} 
                    className="flex-1 min-w-[20px] sm:min-w-[24px] flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 shadow-xl whitespace-nowrap border border-slate-700">
                        <div className="font-bold text-cyan-300">{formatDate(item.dateStr, 'long')}</div>
                        <div className="flex justify-between gap-3 text-slate-300 mt-1">
                          <span>Sales:</span>
                          <span className="font-mono font-bold text-emerald-400">{formatCurrency(item.sales, business.currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-slate-300">
                          <span>Purchases:</span>
                          <span className="font-mono font-bold text-rose-300">{formatCurrency(item.purchases, business.currencySymbol)}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {item.invoicesCount} {item.invoicesCount === 1 ? 'sale' : 'sales'}
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700" />
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${hasSales ? heightPercent : 4}%` }}
                      className={`w-full rounded-t-md transition-all duration-200 cursor-pointer ${
                        isPeak
                          ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md ring-2 ring-indigo-400/40'
                          : hasSales
                          ? 'bg-indigo-500/80 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400'
                          : 'bg-slate-200 dark:bg-slate-700/60'
                      } ${item.isToday ? 'ring-2 ring-emerald-500' : ''}`}
                    />

                    {/* Day number */}
                    <span className={`text-[10px] mt-1.5 font-mono ${
                      item.isToday 
                        ? 'font-bold text-emerald-600 dark:text-emerald-400' 
                        : isPeak 
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400'
                    }`}>
                      {item.dayNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
                  <span>Sales Days</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-600 ring-1 ring-indigo-400 inline-block" />
                  <span>Peak Sales Day</span>
                </div>
                {isCurrentMonth && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded ring-2 ring-emerald-500 bg-transparent inline-block" />
                    <span>Today</span>
                  </div>
                )}
              </div>
              <div>
                <span>Total Active Billing: <strong className="text-slate-800 dark:text-slate-200 font-mono">{activeSalesDaysCount} of {daysInMonth} days</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW CONTENT 3: TOP CLIENTS & TOP ITEMS                       */}
      {/* ------------------------------------------------------------- */}
      {activeTabSubView === 'top_performers' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top Customers */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Top Revenue Customers ({monthLabel})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">By Total Billed</span>
            </div>

            {topCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No sales invoices recorded for this month.</p>
            ) : (
              <div className="space-y-2.5">
                {topCustomers.map((cust, idx) => (
                  <div 
                    key={cust.id} 
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{cust.name}</p>
                        <p className="text-[10px] text-slate-500">{cust.count} {cust.count === 1 ? 'bill' : 'bills'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cust.total, business.currencySymbol)}
                      </div>
                      {cust.due > 0 ? (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                          Due: {formatCurrency(cust.due, business.currencySymbol)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Fully Paid
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Top Selling Products & Services ({monthLabel})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">By Sales Value</span>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No product line items billed in this month.</p>
            ) : (
              <div className="space-y-2.5">
                {topProducts.map((prod, idx) => (
                  <div 
                    key={prod.id} 
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{prod.name}</p>
                        <p className="text-[10px] text-slate-500">{prod.quantity} {prod.unit || 'units'} sold</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(prod.revenue, business.currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {grossSales > 0 ? `${((prod.revenue / grossSales) * 100).toFixed(1)}% of sales` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW CONTENT 4: PAYMENT & EXPENSE MIX                         */}
      {/* ------------------------------------------------------------- */}
      {activeTabSubView === 'breakdowns' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Payment Methods */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Payment Collection Modes
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">{monthLabel}</span>
            </div>

            <div className="space-y-2 mt-3">
              {(() => {
                const values = Object.values(paymentMethodsStats) as number[];
                const totalPaid = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
                return Object.entries(paymentMethodsStats).map(([method, val]) => {
                  const amount = typeof val === 'number' ? val : 0;
                  const percent = totalPaid > 0 ? Math.round((amount / totalPaid) * 100) : 0;

                  return (
                    <div key={method} className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {method.replace('_', ' ')}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(amount, business.currencySymbol)} <span className="text-[10px] text-slate-500 font-normal">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-750 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Operational Spend by Category
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">{monthExpenses.length} entries</span>
            </div>

            {expenseCategoriesStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No overhead expenses recorded for this month.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {expenseCategoriesStats.slice(0, 5).map(cat => {
                  const percent = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0;

                  return (
                    <div key={cat.category} className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.category}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(cat.amount, business.currencySymbol)} <span className="text-[10px] text-slate-500 font-normal">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-750 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* QUICK FOOTER LINKS & SUMMARY                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>All GST taxable amounts and ITC figures are computed per Indian GST filing specifications.</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>All Sales</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('purchases')}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>All Purchases</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('gst_returns')}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>GST Registers</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRINTABLE / OFFICIAL REPORT CARD MODAL                         */}
      {/* ------------------------------------------------------------- */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Monthly Statement & Report Card ({monthLabel})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Printable Sheet Body */}
            <div id="monthly-report-printable-area" className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200 text-xs">
              {/* Business Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {business.tradeName || business.name}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    GSTIN: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{business.gstin || 'UNREGISTERED'}</span>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {business.address}, {business.city} ({business.state})
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-sm">
                    {monthLabel}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Generated: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Financial Performance Table */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
                  Executive Financial Statement
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-center">Volume</th>
                        <th className="p-2.5 text-right">Taxable Value</th>
                        <th className="p-2.5 text-right">Tax (GST)</th>
                        <th className="p-2.5 text-right">Gross Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="p-2.5 font-medium text-emerald-700 dark:text-emerald-400">Gross Outward Supplies (Sales)</td>
                        <td className="p-2.5 text-center font-mono">{monthInvoices.length}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(taxableSales, business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(outputGst, business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-bold font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(grossSales, business.currencySymbol)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-rose-700 dark:text-rose-400">Inward Supplies (Purchases)</td>
                        <td className="p-2.5 text-center font-mono">{monthPurchases.length}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(taxablePurchases, business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(purchasesItc, business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-bold font-mono text-rose-700 dark:text-rose-400">{formatCurrency(grossPurchases, business.currencySymbol)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-amber-700 dark:text-amber-400">Operating Overhead Expenses</td>
                        <td className="p-2.5 text-center font-mono">{monthExpenses.length}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(totalExpenses - expensesItc, business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(expensesItc, business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-bold font-mono text-amber-700 dark:text-amber-400">{formatCurrency(totalExpenses, business.currencySymbol)}</td>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                        <td className="p-2.5 text-slate-900 dark:text-white">Net Operating Spread (Margin: {profitMarginPercent.toFixed(1)}%)</td>
                        <td className="p-2.5 text-center">—</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(taxableSales - taxablePurchases - (totalExpenses - expensesItc), business.currencySymbol)}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(outputGst - totalEligibleItc, business.currencySymbol)}</td>
                        <td className={`p-2.5 text-right font-black font-mono text-sm ${netOperatingSpread >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {netOperatingSpread >= 0 ? '+' : ''}{formatCurrency(netOperatingSpread, business.currencySymbol)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collections & GST Position Split */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase">Cash Realization</h5>
                  <div className="flex justify-between">
                    <span>Collected Against Sales:</span>
                    <strong className="font-mono">{formatCurrency(invoiceCashRealized, business.currencySymbol)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Accounts Receivable:</span>
                    <strong className="font-mono text-amber-600">{formatCurrency(invoiceAmountDue, business.currencySymbol)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                    <span>Collection Efficiency:</span>
                    <strong className="font-mono">{collectionRatio}%</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase">Monthly GST Position</h5>
                  <div className="flex justify-between">
                    <span>Output Tax Liability:</span>
                    <strong className="font-mono">{formatCurrency(outputGst, business.currencySymbol)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Eligible ITC:</span>
                    <strong className="font-mono text-emerald-600">{formatCurrency(totalEligibleItc, business.currencySymbol)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                    <span>{netGstPayable > 0 ? 'Net GST to Pay in Cash:' : 'ITC Forward Balance:'}</span>
                    <strong className={`font-mono ${netGstPayable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {netGstPayable > 0 ? formatCurrency(netGstPayable, business.currencySymbol) : formatCurrency(netItcCreditForward, business.currencySymbol)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center pt-2">
                This document is a computer-generated monthly performance and compliance summary generated by {business.tradeName || business.name} system.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
