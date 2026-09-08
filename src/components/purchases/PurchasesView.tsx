import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseBill, PurchaseBillItem, Expense, GstTaxRate, PaymentMethod } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { STANDARD_UNITS, COMMON_HSN_CODES } from '../../utils/constants';
import { calculateBaseRateFromInclusive } from '../../utils/gstCalculations';
import { CustomHsnModal } from '../common/CustomHsnModal';
import { HsnLookupDialog } from '../common/HsnLookupDialog';
import { 
  Truck, 
  Search, 
  Plus, 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  Trash2, 
  X,
  Building2,
  DollarSign,
  TrendingDown,
  PackagePlus,
  ArrowRight,
  Eye,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { 
    purchaseBills, 
    expenses, 
    parties, 
    products, 
    customHsnCodes,
    business, 
    createPurchaseBill, 
    deletePurchaseBill, 
    recordPurchasePayment, 
    createExpense, 
    deleteExpense, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'BILLS' | 'EXPENSES'>('BILLS');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCustomHsnModalOpen, setIsCustomHsnModalOpen] = useState(false);
  const [hsnLookupTargetIndex, setHsnLookupTargetIndex] = useState<number | null>(null);
  const [selectedBillForView, setSelectedBillForView] = useState<PurchaseBill | null>(null);

  // Purchase form state
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [itcEligibility, setItcEligibility] = useState<PurchaseBill['itcEligibility']>('ELIGIBLE_ALL');
  const [isInterState, setIsInterState] = useState(false);
  // Two Flexible Entry Modes: Base Cost Rate (Tax Exclusive) vs Total Line Amount (Tax Inclusive)
  const [purchasePriceMode, setPurchasePriceMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');

  // Purchase items state
  const [pItems, setPItems] = useState<PurchaseBillItem[]>([
    {
      id: 'pbi-1',
      productId: products[0]?.id || '',
      name: products[0]?.name || 'Standard Raw Material / Product',
      hsnCode: products[0]?.hsnCode || '',
      quantity: 10,
      unit: products[0]?.unit || 'PCS',
      rate: products[0]?.purchasePrice || 1000,
      taxableAmount: 10000,
      gstRate: products[0]?.gstRate || 18,
      cgstAmount: 900,
      sgstAmount: 900,
      igstAmount: 0,
      totalAmount: 11800,
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      expiryDate: '2028-12-31'
    }
  ]);

  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState('Office Rent & Maintenance');
  const [expensePayee, setExpensePayee] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseGstRate, setExpenseGstRate] = useState<GstTaxRate>(18);
  const [hasGstBill, setHasGstBill] = useState(true);
  const [expenseVendorGstin, setExpenseVendorGstin] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');

  const totalPurchasesAmount = purchaseBills.reduce((s, b) => s + b.grandTotal, 0);
  const totalPurchasesItc = purchaseBills
    .filter(b => b.itcEligibility === 'ELIGIBLE_ALL' || b.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS')
    .reduce((s, b) => s + b.totalTax, 0);

  const totalExpensesAmount = expenses.reduce((s, e) => s + e.amount, 0);

  const handleVendorSelect = (vId: string) => {
    setVendorId(vId);
    const vendor = parties.find(p => p.id === vId);
    if (vendor) {
      setVendorName(vendor.name);
      setVendorGstin(vendor.gstin || '');
      const isInter = vendor.stateCode ? vendor.stateCode !== business.stateCode : false;
      setIsInterState(isInter);
      recalculateAllItems(pItems, isInter);
    }
  };

  const handleOpenPurchaseModal = () => {
    const defaultVendor = parties.find(p => p.type !== 'CUSTOMER') || parties[0];
    const firstProd = products[0];
    
    setVendorId(defaultVendor?.id || '');
    setVendorName(defaultVendor?.name || '');
    setVendorGstin(defaultVendor?.gstin || '');
    setVendorInvoiceNo(`VIN-${Date.now().toString().slice(-4)}`);
    setBillDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setItcEligibility('ELIGIBLE_ALL');

    const isInter = defaultVendor?.stateCode ? defaultVendor.stateCode !== business.stateCode : false;
    setIsInterState(isInter);

    if (firstProd) {
      const initialItem: PurchaseBillItem = {
        id: 'pbi-' + Date.now(),
        productId: firstProd.id,
        name: firstProd.name,
        hsnCode: firstProd.hsnCode,
        quantity: 10,
        unit: firstProd.unit,
        rate: firstProd.purchasePrice || 500,
        taxableAmount: 10 * (firstProd.purchasePrice || 500),
        gstRate: firstProd.gstRate || 18,
        cgstAmount: isInter ? 0 : (10 * (firstProd.purchasePrice || 500) * ((firstProd.gstRate || 18) / 2)) / 100,
        sgstAmount: isInter ? 0 : (10 * (firstProd.purchasePrice || 500) * ((firstProd.gstRate || 18) / 2)) / 100,
        igstAmount: isInter ? (10 * (firstProd.purchasePrice || 500) * (firstProd.gstRate || 18)) / 100 : 0,
        totalAmount: (10 * (firstProd.purchasePrice || 500)) * (1 + (firstProd.gstRate || 18) / 100),
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: '2028-12-31'
      };
      setPItems([initialItem]);
    }

    setIsPurchaseModalOpen(true);
  };

  const recalculateItem = (item: PurchaseBillItem, interState: boolean): PurchaseBillItem => {
    const taxable = item.quantity * item.rate;
    const gstRateVal = item.gstRate || 0;
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (interState) {
      igst = (taxable * gstRateVal) / 100;
    } else {
      cgst = (taxable * (gstRateVal / 2)) / 100;
      sgst = (taxable * (gstRateVal / 2)) / 100;
    }

    const total = taxable + cgst + sgst + igst;

    return {
      ...item,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalAmount: total
    };
  };

  const recalculateAllItems = (items: PurchaseBillItem[], interState: boolean) => {
    const updated = items.map(item => recalculateItem(item, interState));
    setPItems(updated);
  };

  const handleProductSelect = (index: number, selectedProdId: string) => {
    const prod = products.find(p => p.id === selectedProdId);
    if (!prod) return;

    setPItems(prev => {
      const next = [...prev];
      const updatedItem: PurchaseBillItem = {
        ...next[index],
        productId: prod.id,
        name: prod.name,
        hsnCode: prod.hsnCode,
        unit: prod.unit,
        rate: prod.purchasePrice || prod.sellingPrice * 0.7,
        gstRate: prod.gstRate
      };
      next[index] = recalculateItem(updatedItem, isInterState);
      return next;
    });
  };

  const handleItemFieldChange = (index: number, field: keyof PurchaseBillItem, value: any) => {
    setPItems(prev => {
      const next = [...prev];
      const updatedItem = {
        ...next[index],
        [field]: value
      };

      if (field === 'hsnCode') {
        const valStr = String(value).trim();
        const matchCustom = customHsnCodes.find(c => c.code.toLowerCase() === valStr.toLowerCase());
        if (matchCustom) {
          updatedItem.gstRate = matchCustom.gstRate;
          if (matchCustom.uqc && matchCustom.uqc !== 'OTH' && (!updatedItem.unit || updatedItem.unit === 'PCS')) {
            updatedItem.unit = matchCustom.uqc;
          }
        } else {
          const matchStandard = COMMON_HSN_CODES.find(c => c.code === valStr);
          if (matchStandard) {
            updatedItem.gstRate = matchStandard.defaultGst as GstTaxRate;
          }
        }
      }

      next[index] = recalculateItem(updatedItem, isInterState);
      return next;
    });
  };

  // Direct Total Line Purchase Amount (Tax Inclusive) Change Handler
  // Back-calculates Base Unit Cost Rate, Taxable Value, and item-wise CGST/SGST/IGST breakdown
  const handleItemInclusiveTotalChange = (index: number, val: number) => {
    const totalInclusive = Math.max(0, val);
    setPItems(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;

      const qty = Math.max(0.0001, target.quantity || 1);
      const gst = target.gstRate || 0;

      const calculatedRate = calculateBaseRateFromInclusive(totalInclusive, qty, 0, gst, 0);
      const updatedItem: PurchaseBillItem = {
        ...target,
        rate: calculatedRate,
        totalAmount: totalInclusive
      };
      next[index] = recalculateItem(updatedItem, isInterState);
      return next;
    });
  };

  const applyGstRateToAllPurchaseItems = (rate: GstTaxRate) => {
    setPItems(prev => {
      return prev.map(item => {
        const updated = { ...item, gstRate: rate };
        return recalculateItem(updated, isInterState);
      });
    });
    showToast('info', 'Tax Rate Applied', `Applied ${rate}% GST (${isInterState ? 'IGST' : 'CGST+SGST'}) to all purchase bill items.`);
  };

  const handleAddItemRow = () => {
    const firstProd = products[0];
    const newItem: PurchaseBillItem = {
      id: 'pbi-' + Date.now() + Math.random().toString(36).substr(2, 4),
      productId: firstProd?.id || '',
      name: firstProd?.name || 'New Inward Item',
      hsnCode: firstProd?.hsnCode || '',
      quantity: 5,
      unit: firstProd?.unit || 'PCS',
      rate: firstProd?.purchasePrice || 500,
      taxableAmount: 2500,
      gstRate: firstProd?.gstRate || 18,
      cgstAmount: isInterState ? 0 : 225,
      sgstAmount: isInterState ? 0 : 225,
      igstAmount: isInterState ? 450 : 0,
      totalAmount: 2950,
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      expiryDate: '2028-12-31'
    };
    setPItems(prev => [...prev, newItem]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (pItems.length <= 1) {
      showToast('warning', 'Minimum 1 Item Required', 'A purchase bill must have at least one line item.');
      return;
    }
    setPItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePurchaseBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      showToast('error', 'Missing Vendor', 'Please select or enter a supplier / vendor name.');
      return;
    }

    if (pItems.length === 0) {
      showToast('error', 'Empty Bill', 'Please add at least one line item to the purchase bill.');
      return;
    }

    let subTotalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    pItems.forEach(item => {
      subTotalTaxable += item.taxableAmount;
      if (isInterState) {
        totalIgst += (item.taxableAmount * item.gstRate) / 100;
      } else {
        totalCgst += (item.taxableAmount * (item.gstRate / 2)) / 100;
        totalSgst += (item.taxableAmount * (item.gstRate / 2)) / 100;
      }
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    const grandTotal = Math.round(subTotalTaxable + totalTax);

    createPurchaseBill({
      billNumber: `PB/2026/${String(purchaseBills.length + 1).padStart(3, '0')}`,
      vendorInvoiceNumber: vendorInvoiceNo || `VIN-${Date.now().toString().slice(-4)}`,
      vendorId: vendorId || 'vendor-misc',
      vendorName,
      vendorGstin,
      billDate,
      dueDate,
      status: 'UNPAID',
      isInterState,
      items: pItems,
      subTotalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundOff: 0,
      grandTotal,
      amountPaid: 0,
      amountDue: grandTotal,
      itcEligibility
    });

    setIsPurchaseModalOpen(false);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Expense amount must be greater than zero.');
      return;
    }

    const gstAmount = hasGstBill ? (expenseAmount * expenseGstRate) / 100 : 0;

    createExpense({
      date: new Date().toISOString().split('T')[0],
      category: expenseCategory,
      payee: expensePayee || 'Various Payees',
      amount: expenseAmount,
      gstRate: hasGstBill ? expenseGstRate : 0,
      gstAmount,
      hasGstBill,
      vendorGstin: expenseVendorGstin || undefined,
      paymentMethod: 'BANK_TRANSFER',
      notes: expenseNotes
    });

    setIsExpenseModalOpen(false);
    setExpenseAmount(0);
    setExpenseNotes('');
  };

  // Filtered bills
  const filteredBills = purchaseBills.filter(bill => 
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bill.vendorGstin && bill.vendorGstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
    bill.vendorInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Purchases, Stock Inward & ITC</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record supplier purchase bills, auto-replenish stock levels, track ITC credit & manage vendor payables
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>
          <button
            onClick={handleOpenPurchaseModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Add Stock by Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Purchase Bills</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalPurchasesAmount, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{purchaseBills.length} Inward bills logged</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Eligible Input Tax Credit (ITC)</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalPurchasesItc, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Available to offset GSTR-3B tax</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Operating Expenses</span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalExpensesAmount, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{expenses.length} Expense records</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('BILLS')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'BILLS'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Inward Purchase Bills ({purchaseBills.length})
          </button>
          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'EXPENSES'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Operating Expenses ({expenses.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search bills or vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {activeTab === 'BILLS' ? (
        /* Purchase Bills Table */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="py-3 px-4">Bill No & Date</th>
                  <th className="py-3 px-4">Vendor & GSTIN</th>
                  <th className="py-3 px-4">Stock Items Inward</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">ITC (GST)</th>
                  <th className="py-3 px-4 text-right">Bill Total</th>
                  <th className="py-3 px-4 text-center">ITC Eligibility</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No purchase bills found. Click &quot;Add Stock by Purchase Bill&quot; to log your first bill.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-medium">
                        <div className="font-bold text-slate-900 dark:text-white">{bill.billNumber}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          Ref: {bill.vendorInvoiceNumber} • {formatDate(bill.billDate)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{bill.vendorName}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {bill.vendorGstin ? `GSTIN: ${bill.vendorGstin}` : 'Unregistered'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {bill.items.map((it, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-medium border border-indigo-100 dark:border-indigo-800">
                              <span>{it.name}</span>
                              <strong className="text-indigo-900 dark:text-indigo-200">+{it.quantity} {it.unit}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(bill.subTotalTaxable, business.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {formatCurrency(bill.totalTax, business.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(bill.grandTotal, business.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {bill.itcEligibility.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                          bill.status === 'PAID'
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedBillForView(bill)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View Purchase Bill Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePurchaseBill(bill.id)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Purchase Bill & Rollback Stock"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Expenses Table */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category & Payee</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-right">GST Input (₹)</th>
                  <th className="py-3 px-4">Method & Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{formatDate(exp.date)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{exp.category}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{exp.payee}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(exp.amount, business.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {exp.hasGstBill ? formatCurrency(exp.gstAmount, business.currencySymbol) : 'Nil (No GST)'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{exp.paymentMethod}</span>
                      {exp.notes && <div className="text-[10px] text-slate-500 dark:text-slate-400">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Purchase Bill & Add Stock Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[98vw] md:max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[92dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Stock by Inward Purchase Bill</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Record supplier invoice and auto-update inventory stock quantities</p>
                </div>
              </div>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseBill} className="mt-4 space-y-4 text-xs">
              {/* Supplier & Bill Header Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Registered Vendor</label>
                    <select
                      value={vendorId}
                      onChange={(e) => handleVendorSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    >
                      <option value="">-- Or enter custom vendor --</option>
                      {parties.filter(p => p.type !== 'CUSTOMER').map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.gstin ? `(${p.gstin})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. Acme Tech Distributors"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier GSTIN</label>
                    <input
                      type="text"
                      value={vendorGstin}
                      onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                      placeholder="27ABCDE1234F1Z5"
                      className="w-full px-3 py-2 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier Bill Ref No *</label>
                    <input
                      type="text"
                      value={vendorInvoiceNo}
                      onChange={(e) => setVendorInvoiceNo(e.target.value)}
                      placeholder="e.g. INV-9842"
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bill Date</label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ITC Claim Category</label>
                    <select
                      value={itcEligibility}
                      onChange={(e) => setItcEligibility(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                    >
                      <option value="ELIGIBLE_ALL">Eligible Inward Supplies</option>
                      <option value="ELIGIBLE_CAPITAL_GOODS">Capital Goods ITC</option>
                      <option value="INELIGIBLE_17_5">Blocked u/s 17(5)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="interstateCheck"
                    checked={isInterState}
                    onChange={(e) => {
                      setIsInterState(e.target.checked);
                      recalculateAllItems(pItems, e.target.checked);
                    }}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="interstateCheck" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Inter-State Purchase (Charge Integrated GST / IGST instead of CGST+SGST)
                  </label>
                </div>
              </div>

              {/* Line Items & Stock Inward Table */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Purchase Items & Stock Addition</span>
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold rounded border border-emerald-200 dark:border-emerald-800">
                      ⚡ Stock Auto-Increments
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Two Flexible Entry Modes Selector */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="px-2 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Mode:</span>
                      <button
                        type="button"
                        onClick={() => setPurchasePriceMode('EXCLUSIVE')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          purchasePriceMode === 'EXCLUSIVE'
                            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-600'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Enter supplier cost rate directly before tax (Tax Exclusive)"
                      >
                        Cost Rate (Excl.)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchasePriceMode('INCLUSIVE')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          purchasePriceMode === 'INCLUSIVE'
                            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-600'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Enter total purchase bill line amount inclusive of GST (Tax Inclusive)"
                      >
                        Line Total (Incl.)
                      </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px]">
                      <span className="px-2 text-slate-500 dark:text-slate-400 font-medium">Quick GST:</span>
                      {([0, 5, 12, 18, 28] as GstTaxRate[]).map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => applyGstRateToAllPurchaseItems(rate)}
                          className="px-2 py-0.5 rounded-lg font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item Row</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3">Item / Product Name</th>
                        <th className="py-2.5 px-2 text-center w-28">
                          <div className="flex items-center justify-center gap-1">
                            <span>HSN</span>
                            <button
                              type="button"
                              onClick={() => setIsCustomHsnModalOpen(true)}
                              className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold cursor-pointer"
                              title="Custom HSN Codes"
                            >
                              ⚙
                            </button>
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center w-28">Batch / Exp</th>
                        <th className="py-2.5 px-2 text-center w-18">Qty</th>
                        <th className="py-2.5 px-2 text-center w-18">Unit</th>
                        <th className={`py-2.5 px-2 w-28 ${purchasePriceMode === 'EXCLUSIVE' ? 'bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold' : ''}`}>
                          <div className="flex items-center gap-1">
                            <span>Cost Rate (₹ Excl.)</span>
                            {purchasePriceMode === 'EXCLUSIVE' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                          </div>
                        </th>
                        <th className="py-2.5 px-2 w-36">
                          Item GST ({isInterState ? 'IGST' : 'CGST+SGST'})
                        </th>
                        <th className={`py-2.5 px-3 text-right w-32 ${purchasePriceMode === 'INCLUSIVE' ? 'bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold' : ''}`}>
                          <div className="flex items-center justify-end gap-1">
                            {purchasePriceMode === 'INCLUSIVE' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                            <span>Total (₹ Incl.)</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pItems.map((item, idx) => {
                        const matchedProduct = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
                        const currentStock = matchedProduct ? matchedProduct.currentStock : 0;
                        const newCalculatedStock = currentStock + (Number(item.quantity) || 0);

                        return (
                          <tr key={item.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            {/* Product Selector / Name */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <select
                                  value={item.productId || ''}
                                  onChange={(e) => handleProductSelect(idx, e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none"
                                >
                                  <option value="">-- Choose From Catalog --</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (Stock: {p.currentStock} {p.unit})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                                  placeholder="Custom product name..."
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg font-medium"
                                  required
                                />
                                {/* Stock Impact Badge */}
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="text-slate-500 dark:text-slate-400">Current: <strong>{currentStock}</strong></span>
                                  <ArrowRight className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                                  <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                    New: {newCalculatedStock} {item.unit} (+{item.quantity})
                                  </span>
                                </div>
                              </div>
                            </td>

                             {/* HSN */}
                            <td className="py-2.5 px-2 text-center align-top">
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`purch-hsn-list-${idx}`}
                                  value={item.hsnCode}
                                  onChange={(e) => handleItemFieldChange(idx, 'hsnCode', e.target.value)}
                                  placeholder="HSN/SAC"
                                  className="w-full px-2 py-1 text-xs font-mono uppercase text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <datalist id={`purch-hsn-list-${idx}`}>
                                  {customHsnCodes.map(h => (
                                    <option key={`c-${h.id}`} value={h.code}>
                                      [Custom] {h.code} - {h.description} ({h.gstRate}%)
                                    </option>
                                  ))}
                                  {COMMON_HSN_CODES.map(h => (
                                    <option key={`s-${h.code}`} value={h.code}>
                                      {h.code} - {h.description} ({h.defaultGst}%)
                                    </option>
                                  ))}
                                </datalist>
                                <button
                                  type="button"
                                  onClick={() => setHsnLookupTargetIndex(idx)}
                                  className="mt-1 w-full text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/60 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800 rounded py-0.5 px-1 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs truncate"
                                  title="Lookup code in App Dialog"
                                >
                                  <Search className="w-2.5 h-2.5 shrink-0" />
                                  <span>Lookup...</span>
                                </button>
                              </div>
                            </td>

                            {/* Batch & Expiry */}
                            <td className="py-2.5 px-2 align-top space-y-1">
                              <input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'batchNumber', e.target.value)}
                                placeholder="Batch No"
                                className="w-full px-1.5 py-1 text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                              />
                              <input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'expiryDate', e.target.value)}
                                className="w-full px-1.5 py-1 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="py-2.5 px-2 text-center align-top">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                                required
                              />
                            </td>

                            {/* Unit */}
                            <td className="py-2.5 px-2 text-center align-top">
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                                className="w-full px-1 py-1 text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                              >
                                {STANDARD_UNITS.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>

                            {/* Base Cost Rate (Tax Exclusive) Column */}
                            <td className="py-2.5 px-2 text-right align-top">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.rate || ''}
                                  onChange={(e) => handleItemFieldChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                  className={`w-full px-2 py-1 text-xs font-mono font-semibold text-right rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                    purchasePriceMode === 'EXCLUSIVE'
                                      ? 'bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-2xs font-bold'
                                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                  }`}
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 text-right">
                                Cost Excl.
                              </div>
                            </td>

                            {/* ITEM-WISE GST RATE & BREAKDOWN */}
                            <td className="py-2.5 px-2 align-top">
                              <div className="space-y-1">
                                <select
                                  value={item.gstRate}
                                  onChange={(e) => handleItemFieldChange(idx, 'gstRate', parseInt(e.target.value) as GstTaxRate)}
                                  className="w-full px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                                >
                                  <option value="0">0% (Nil / Exempt)</option>
                                  <option value="5">5% (Essential)</option>
                                  <option value="12">12% (Standard 12)</option>
                                  <option value="18">18% (Standard 18)</option>
                                  <option value="28">28% (Luxury 28)</option>
                                </select>

                                {/* Dynamic Item-Wise Tax Split Tag */}
                                <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight ${
                                  isInterState ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                  {isInterState ? (
                                    <span>IGST: {formatCurrency(item.igstAmount, '')}</span>
                                  ) : (
                                    <span>CGST+SGST: {formatCurrency(item.cgstAmount + item.sgstAmount, '')}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Total Line Purchase Amount (Tax Inclusive) Column */}
                            <td className="py-2.5 px-3 text-right font-mono align-top">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.totalAmount || ''}
                                  onChange={(e) => handleItemInclusiveTotalChange(idx, parseFloat(e.target.value) || 0)}
                                  className={`w-full px-2 py-1 text-xs font-mono font-bold text-right rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                    purchasePriceMode === 'INCLUSIVE'
                                      ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-2xs'
                                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold'
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                                Taxable: {formatCurrency(item.taxableAmount, '')}
                              </div>
                            </td>

                            {/* Delete */}
                            <td className="py-2.5 px-2 text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Totals Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <strong>Automatic Stock & Accounting Updates:</strong>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-snug">
                      Saving this inward purchase bill will immediately increment the inventory quantities for all items listed above, update their purchase costs, and register eligible input tax credits.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(pItems.reduce((s, it) => s + it.taxableAmount, 0), business.currencySymbol)}
                    </span>
                  </div>
                  {!isInterState ? (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>CGST Input:</span>
                        <span className="font-mono">
                          {formatCurrency(pItems.reduce((s, it) => s + it.cgstAmount, 0), business.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>SGST Input:</span>
                        <span className="font-mono">
                          {formatCurrency(pItems.reduce((s, it) => s + it.sgstAmount, 0), business.currencySymbol)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>IGST Input:</span>
                      <span className="font-mono">
                        {formatCurrency(pItems.reduce((s, it) => s + it.igstAmount, 0), business.currencySymbol)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span>Grand Total Bill Amount:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(pItems.reduce((s, it) => s + it.totalAmount, 0), business.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Save Bill & Add Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill View Details Modal */}
      {selectedBillForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedBillForView.billNumber}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    {selectedBillForView.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Supplier: {selectedBillForView.vendorName} • Ref: {selectedBillForView.vendorInvoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedBillForView(null)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Bill Date:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedBillForView.billDate)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">GSTIN:</span>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedBillForView.vendorGstin || 'Unregistered'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Supply Type:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedBillForView.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">ITC Claim:</span>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300">{selectedBillForView.itcEligibility.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {/* Items */}
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] block mb-2">Purchased Inventory Items</span>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-2 text-center">HSN</th>
                        <th className="py-2 px-2 text-center">Qty Added</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">Taxable</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedBillForView.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-900 dark:text-white">{it.name}</span>
                            {it.batchNumber && (
                              <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                Batch: {it.batchNumber} {it.expiryDate ? `• Exp: ${it.expiryDate}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300">{it.hsnCode}</td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-700 dark:text-emerald-300">+{it.quantity} {it.unit}</td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(it.rate, '')}</td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(it.taxableAmount, '')}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(it.totalAmount, '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-64 space-y-1 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Taxable Value:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(selectedBillForView.subTotalTaxable, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Total Tax:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(selectedBillForView.totalTax, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-900 dark:text-white">Grand Total:</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-400">{formatCurrency(selectedBillForView.grandTotal, business.currencySymbol)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Record Operating Expense</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Post direct or indirect business expenses</p>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                >
                  <option value="Office Rent & Maintenance">Office Rent & Maintenance</option>
                  <option value="Electricity & Utilities">Electricity & Utilities</option>
                  <option value="Courier & Freight Outward">Courier & Freight Outward</option>
                  <option value="Staff Salaries & Wages">Staff Salaries & Wages</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                  <option value="Software & Cloud ERP">Software & Cloud Subscriptions</option>
                  <option value="Travel & Conveyance">Travel & Conveyance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payee / Vendor Name</label>
                <input
                  type="text"
                  value={expensePayee}
                  onChange={(e) => setExpensePayee(e.target.value)}
                  placeholder="e.g. BSES or Blue Dart"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={expenseAmount || ''}
                    onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">GST Rate</label>
                  <select
                    value={expenseGstRate}
                    onChange={(e) => setExpenseGstRate(parseInt(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. August month billing"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HSN / SAC Code App Lookup Dialog */}
      <HsnLookupDialog
        isOpen={hsnLookupTargetIndex !== null}
        onClose={() => setHsnLookupTargetIndex(null)}
        currentCode={hsnLookupTargetIndex !== null && pItems[hsnLookupTargetIndex] ? pItems[hsnLookupTargetIndex].hsnCode : ''}
        onSelect={(item) => {
          if (hsnLookupTargetIndex !== null && pItems[hsnLookupTargetIndex]) {
            handleItemFieldChange(hsnLookupTargetIndex, 'hsnCode', item.code);
            handleItemFieldChange(hsnLookupTargetIndex, 'gstRate', item.gstRate as GstTaxRate);
            if (item.uqc && item.uqc !== 'OTH') {
              handleItemFieldChange(hsnLookupTargetIndex, 'unit', item.uqc);
            }
          }
        }}
        onOpenCustomManager={() => setIsCustomHsnModalOpen(true)}
      />

      {/* Custom HSN & SAC Management Modal */}
      <CustomHsnModal
        isOpen={isCustomHsnModalOpen}
        onClose={() => setIsCustomHsnModalOpen(false)}
        onSelectHsn={(item) => {
          if (pItems.length > 0) {
            const targetIdx = pItems.length - 1;
            handleItemFieldChange(targetIdx, 'hsnCode', item.code);
            handleItemFieldChange(targetIdx, 'gstRate', item.gstRate);
            if (item.uqc && item.uqc !== 'OTH') handleItemFieldChange(targetIdx, 'unit', item.uqc);
          }
        }}
      />
    </div>
  );
};
