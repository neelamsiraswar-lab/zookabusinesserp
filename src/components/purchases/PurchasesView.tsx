import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseBill, PurchaseBillItem, Expense, GstTaxRate, PaymentMethod, Product } from '../../types';
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
  Package,
  ArrowRight,
  Eye,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Tag,
  ShieldCheck,
  FileText,
  Calculator,
  SlidersHorizontal,
  Hash,
  AlertTriangle,
  Check,
  Boxes
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
    createProduct,
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

  // State for product search autocomplete dropdown
  const [activeSuggestIndex, setActiveSuggestIndex] = useState<number | null>(null);

  // Quick Add Product Modal State (for creating product directly from purchase dialog if not in stock/catalog)
  const [isQuickAddProductModalOpen, setIsQuickAddProductModalOpen] = useState(false);
  const [quickAddTargetRowIndex, setQuickAddTargetRowIndex] = useState<number | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('General');
  const [newProdUnit, setNewProdUnit] = useState('PCS');
  const [newProdHsn, setNewProdHsn] = useState('');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<number>(0);
  const [newProdSellingPrice, setNewProdSellingPrice] = useState<number>(0);
  const [newProdGstRate, setNewProdGstRate] = useState<GstTaxRate>(18);
  const [newProdOpeningStock, setNewProdOpeningStock] = useState<number>(0);
  const [newProdMinStock, setNewProdMinStock] = useState<number>(5);
  const [newProdIsService, setNewProdIsService] = useState(false);
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [isQuickAddHsnLookupOpen, setIsQuickAddHsnLookupOpen] = useState(false);

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

  const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

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
  const [hasGstBill, setHasGstBill] = useState(false);
  const [expenseVendorGstin, setExpenseVendorGstin] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [expenseNotes, setExpenseNotes] = useState('');

  const totalPurchasesAmount = purchaseBills.reduce((s, b) => s + b.grandTotal, 0);
  const totalPurchasesItc = purchaseBills
    .filter(b => b.itcEligibility === 'ELIGIBLE_ALL' || b.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS')
    .reduce((s, b) => s + b.totalTax, 0);

  const totalExpensesAmount = expenses.reduce((s, e) => s + e.amount, 0);

  const recalculateItem = (
    item: PurchaseBillItem,
    interState: boolean,
    mode: 'EXCLUSIVE' | 'INCLUSIVE' = purchasePriceMode
  ): PurchaseBillItem => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const gstRateVal = Number(item.gstRate) || 0;

    let rate = Math.max(0, Number(item.rate) || 0);
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let total = 0;

    if (mode === 'INCLUSIVE' && (item.totalAmount !== undefined && item.totalAmount > 0)) {
      total = round2(item.totalAmount);
      const taxFactor = 1 + gstRateVal / 100;
      taxable = round2(total / taxFactor);
      rate = qty > 0 ? round2(taxable / qty) : 0;
      const totalTax = round2(total - taxable);

      if (interState) {
        igst = totalTax;
        cgst = 0;
        sgst = 0;
      } else {
        cgst = round2(totalTax / 2);
        sgst = round2(totalTax - cgst);
        igst = 0;
      }
    } else {
      taxable = round2(qty * rate);

      if (interState) {
        igst = round2((taxable * gstRateVal) / 100);
        cgst = 0;
        sgst = 0;
      } else {
        cgst = round2((taxable * (gstRateVal / 2)) / 100);
        sgst = round2((taxable * (gstRateVal / 2)) / 100);
        igst = 0;
      }

      total = round2(taxable + cgst + sgst + igst);
    }

    return {
      ...item,
      quantity: qty,
      rate,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalAmount: total
    };
  };

  const recalculateAllItems = (
    items: PurchaseBillItem[],
    interState: boolean,
    mode: 'EXCLUSIVE' | 'INCLUSIVE' = purchasePriceMode
  ) => {
    const updated = items.map(item => recalculateItem(item, interState, mode));
    setPItems(updated);
  };

  const handleVendorSelect = (vId: string) => {
    setVendorId(vId);
    if (!vId) {
      return;
    }
    const vendor = parties.find(p => p.id === vId);
    if (vendor) {
      setVendorName(vendor.name);
      setVendorGstin(vendor.gstin || '');
      let isInter = false;
      if (vendor.stateCode) {
        isInter = vendor.stateCode !== business.stateCode;
      } else if (vendor.gstin && /^\d{2}/.test(vendor.gstin.trim())) {
        isInter = vendor.gstin.trim().slice(0, 2) !== business.stateCode;
      }
      setIsInterState(isInter);
      recalculateAllItems(pItems, isInter);
    }
  };

  const handleVendorGstinChange = (gstinVal: string) => {
    const upper = gstinVal.toUpperCase();
    setVendorGstin(upper);
    const clean = upper.trim();
    if (clean.length >= 2 && /^\d{2}/.test(clean)) {
      const gstinState = clean.slice(0, 2);
      const isInter = gstinState !== business.stateCode;
      if (isInter !== isInterState) {
        setIsInterState(isInter);
        recalculateAllItems(pItems, isInter);
      }
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

    let isInter = false;
    if (defaultVendor?.stateCode) {
      isInter = defaultVendor.stateCode !== business.stateCode;
    } else if (defaultVendor?.gstin && /^\d{2}/.test(defaultVendor.gstin.trim())) {
      isInter = defaultVendor.gstin.trim().slice(0, 2) !== business.stateCode;
    }
    setIsInterState(isInter);

    if (firstProd) {
      const pPrice = (firstProd.purchasePrice !== undefined && firstProd.purchasePrice > 0)
        ? firstProd.purchasePrice
        : (firstProd.sellingPrice ? round2(firstProd.sellingPrice * 0.7) : 500);
      const gstR = (firstProd.gstRate !== undefined ? firstProd.gstRate : 18) as GstTaxRate;
      const initialItem: PurchaseBillItem = {
        id: 'pbi-' + Date.now(),
        productId: firstProd.id,
        name: firstProd.name,
        hsnCode: firstProd.hsnCode || '',
        quantity: 10,
        unit: firstProd.unit || 'PCS',
        rate: pPrice,
        taxableAmount: 0,
        gstRate: gstR,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: 0,
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: '2028-12-31'
      };
      setPItems([recalculateItem(initialItem, isInter, 'EXCLUSIVE')]);
    } else {
      const initialItem: PurchaseBillItem = {
        id: 'pbi-' + Date.now(),
        productId: '',
        name: '',
        hsnCode: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        taxableAmount: 0,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: 0,
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: ''
      };
      setPItems([initialItem]);
    }

    setIsPurchaseModalOpen(true);
  };

  const handleProductSelect = (index: number, selectedProdId: string) => {
    if (!selectedProdId) {
      // Clear product link but keep row for custom item entry
      setPItems(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          productId: '',
        };
        return next;
      });
      return;
    }

    const prod = products.find(p => p.id === selectedProdId);
    if (!prod) return;

    handleSelectProductForIndex(index, prod);
  };

  const handleSelectProductForIndex = (index: number, prod: Product) => {
    setPItems(prev => {
      const next = [...prev];
      const purchasePrice = (prod.purchasePrice !== undefined && prod.purchasePrice > 0)
        ? prod.purchasePrice
        : (prod.sellingPrice ? round2(prod.sellingPrice * 0.7) : 0);

      const updatedItem: PurchaseBillItem = {
        ...next[index],
        productId: prod.id,
        name: prod.name,
        hsnCode: prod.hsnCode || next[index]?.hsnCode || '',
        unit: prod.unit || next[index]?.unit || 'PCS',
        rate: purchasePrice,
        gstRate: (prod.gstRate !== undefined ? prod.gstRate : 18) as GstTaxRate
      };
      next[index] = recalculateItem(updatedItem, isInterState, purchasePriceMode);
      return next;
    });
    setActiveSuggestIndex(null);
  };

  const handleClearProductForIndex = (index: number) => {
    setPItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: '',
      };
      return next;
    });
  };

  const getFilteredProductsForItem = (itemName: string) => {
    const query = (itemName || '').trim().toLowerCase();
    if (!query) return products.slice(0, 25);
    return products.filter(p => {
      return (
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.hsnCode && p.hsnCode.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.includes(query))
      );
    }).slice(0, 30);
  };

  const openQuickAddProduct = (rowIndex?: number, initialName?: string) => {
    const row = rowIndex !== undefined && pItems[rowIndex] ? pItems[rowIndex] : null;
    const nameToUse = initialName !== undefined ? initialName : (row ? row.name : '');
    const rateToUse = row && row.rate ? row.rate : 0;
    const hsnToUse = row && row.hsnCode ? row.hsnCode : '';
    const unitToUse = row && row.unit ? row.unit : 'PCS';
    const gstToUse = row && row.gstRate !== undefined ? row.gstRate : 18;

    setQuickAddTargetRowIndex(rowIndex !== undefined ? rowIndex : null);
    setNewProdName(nameToUse);
    setNewProdSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewProdCategory('General');
    setNewProdUnit(unitToUse);
    setNewProdHsn(hsnToUse);
    setNewProdPurchasePrice(rateToUse);
    setNewProdSellingPrice(rateToUse > 0 ? round2(rateToUse * 1.25) : 0);
    setNewProdGstRate(gstToUse as GstTaxRate);
    setNewProdOpeningStock(0);
    setNewProdMinStock(5);
    setNewProdIsService(false);
    setNewProdBarcode('');
    setIsQuickAddProductModalOpen(true);
  };

  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      showToast('error', 'Product Name Required', 'Please enter a valid product name.');
      return;
    }

    const created = createProduct({
      name: newProdName.trim(),
      sku: newProdSku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      category: newProdCategory.trim() || 'General',
      unit: newProdUnit || 'PCS',
      hsnCode: newProdHsn.trim(),
      purchasePrice: Number(newProdPurchasePrice) || 0,
      sellingPrice: Number(newProdSellingPrice) || 0,
      gstRate: newProdGstRate,
      currentStock: Number(newProdOpeningStock) || 0,
      minStockAlert: Number(newProdMinStock) || 5,
      isService: newProdIsService,
      barcode: newProdBarcode.trim() || undefined
    });

    if (quickAddTargetRowIndex !== null && pItems[quickAddTargetRowIndex]) {
      handleSelectProductForIndex(quickAddTargetRowIndex, created);
    } else {
      const newItem: PurchaseBillItem = {
        id: `pbi-${Date.now()}`,
        productId: created.id,
        name: created.name,
        hsnCode: created.hsnCode || '',
        quantity: 1,
        unit: created.unit || 'PCS',
        rate: created.purchasePrice || 0,
        taxableAmount: 0,
        gstRate: created.gstRate,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: 0
      };
      setPItems(prev => [...prev, recalculateItem(newItem, isInterState, purchasePriceMode)]);
    }

    setIsQuickAddProductModalOpen(false);
    setActiveSuggestIndex(null);
    showToast('success', 'Product Created', `Added "${created.name}" to catalog and linked to purchase bill.`);
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

      // If user edits rate directly, use EXCLUSIVE mode to calculate total
      const modeToUse = (field === 'rate') ? 'EXCLUSIVE' : purchasePriceMode;
      next[index] = recalculateItem(updatedItem, isInterState, modeToUse);
      return next;
    });
  };

  // Direct Total Line Purchase Amount (Tax Inclusive) Change Handler
  // Back-calculates Base Unit Cost Rate, Taxable Value, and item-wise CGST/SGST/IGST breakdown
  const handleItemInclusiveTotalChange = (index: number, val: number) => {
    const totalInclusive = Math.max(0, val || 0);
    setPItems(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;

      const updatedItem: PurchaseBillItem = {
        ...target,
        totalAmount: totalInclusive
      };
      next[index] = recalculateItem(updatedItem, isInterState, 'INCLUSIVE');
      return next;
    });
  };

  const applyGstRateToAllPurchaseItems = (rate: GstTaxRate) => {
    setPItems(prev => {
      return prev.map(item => {
        const updated = { ...item, gstRate: rate };
        return recalculateItem(updated, isInterState, purchasePriceMode);
      });
    });
    showToast('info', 'Tax Rate Applied', `Applied ${rate}% GST (${isInterState ? 'IGST' : 'CGST+SGST'}) to all purchase bill items.`);
  };

  const handleAddItemRow = () => {
    const rawItem: PurchaseBillItem = {
      id: 'pbi-' + Date.now() + Math.random().toString(36).substr(2, 4),
      productId: '',
      name: '',
      hsnCode: '',
      quantity: 1,
      unit: 'PCS',
      rate: 0,
      taxableAmount: 0,
      gstRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      expiryDate: ''
    };
    setPItems(prev => {
      const nextList = [...prev, recalculateItem(rawItem, isInterState, purchasePriceMode)];
      setActiveSuggestIndex(nextList.length - 1);
      return nextList;
    });
  };

  // Allow removing any item row freely without blocking constraint
  const handleRemoveItemRow = (index: number) => {
    setPItems(prev => prev.filter((_, i) => i !== index));
    if (activeSuggestIndex === index) {
      setActiveSuggestIndex(null);
    }
  };

  const handleSavePurchaseBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      showToast('error', 'Missing Vendor', 'Please select or enter a supplier / vendor name.');
      return;
    }

    if (pItems.length === 0) {
      showToast('error', 'Line Items Required', 'Please add at least one line item to the purchase bill before saving.');
      return;
    }

    const invalidItem = pItems.find(it => !it.name.trim() || it.quantity <= 0);
    if (invalidItem) {
      showToast('error', 'Invalid Item Row', 'Please provide a product name and quantity greater than 0 for all items.');
      return;
    }

    const subTotalTaxable = round2(pItems.reduce((s, it) => s + (it.taxableAmount || 0), 0));
    const totalCgst = round2(pItems.reduce((s, it) => s + (it.cgstAmount || 0), 0));
    const totalSgst = round2(pItems.reduce((s, it) => s + (it.sgstAmount || 0), 0));
    const totalIgst = round2(pItems.reduce((s, it) => s + (it.igstAmount || 0), 0));
    const totalTax = round2(totalCgst + totalSgst + totalIgst);
    const rawGrandTotal = round2(subTotalTaxable + totalTax);
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = round2(grandTotal - rawGrandTotal);

    createPurchaseBill({
      billNumber: `PB/2026/${String(purchaseBills.length + 1).padStart(3, '0')}`,
      vendorInvoiceNumber: vendorInvoiceNo.trim() || `VIN-${Date.now().toString().slice(-4)}`,
      vendorId: vendorId || 'vendor-misc',
      vendorName: vendorName.trim(),
      vendorGstin: vendorGstin.trim() ? vendorGstin.trim().toUpperCase() : undefined,
      billDate,
      dueDate,
      status: 'UNPAID',
      isInterState,
      items: pItems.map(it => ({
        ...it,
        quantity: Number(it.quantity) || 0,
        rate: round2(Number(it.rate) || 0),
        taxableAmount: round2(it.taxableAmount),
        cgstAmount: round2(it.cgstAmount),
        sgstAmount: round2(it.sgstAmount),
        igstAmount: round2(it.igstAmount),
        totalAmount: round2(it.totalAmount)
      })),
      subTotalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundOff,
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

    const total = round2(expenseAmount);
    let gstAmount = 0;
    if (hasGstBill && expenseGstRate > 0) {
      const taxFactor = 1 + expenseGstRate / 100;
      const taxable = round2(total / taxFactor);
      gstAmount = round2(total - taxable);
    }

    createExpense({
      date: new Date().toISOString().split('T')[0],
      category: expenseCategory,
      payee: expensePayee.trim() || 'Various Payees',
      amount: total,
      gstRate: hasGstBill ? expenseGstRate : 0,
      gstAmount: hasGstBill ? gstAmount : 0,
      hasGstBill,
      vendorGstin: expenseVendorGstin.trim() ? expenseVendorGstin.trim().toUpperCase() : undefined,
      paymentMethod: expensePaymentMethod,
      notes: expenseNotes.trim() || undefined
    });

    setIsExpenseModalOpen(false);
    setExpenseAmount(0);
    setExpenseNotes('');
    setExpenseVendorGstin('');
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
      {isPurchaseModalOpen && (() => {
        const modalSubTotalTaxable = round2(pItems.reduce((s, it) => s + (it.taxableAmount || 0), 0));
        const modalTotalCgst = round2(pItems.reduce((s, it) => s + (it.cgstAmount || 0), 0));
        const modalTotalSgst = round2(pItems.reduce((s, it) => s + (it.sgstAmount || 0), 0));
        const modalTotalIgst = round2(pItems.reduce((s, it) => s + (it.igstAmount || 0), 0));
        const modalTotalTax = round2(modalTotalCgst + modalTotalSgst + modalTotalIgst);
        const modalRawGrandTotal = round2(modalSubTotalTaxable + modalTotalTax);
        const modalGrandTotal = Math.round(modalRawGrandTotal);
        const modalRoundOff = round2(modalGrandTotal - modalRawGrandTotal);
        const modalTotalUnits = pItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-hidden modal-overlay">
            <div className="w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col h-[98dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              
              {/* Sticky Modal Header */}
              <div className="shrink-0 px-3.5 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                    <PackagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        Add Stock by Inward Purchase Bill
                      </h3>
                      <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                        ⚡ Auto-Increments Stock
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Record supplier inward invoice, allocate expenses, and update inventory counts
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)} 
                  className="p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body + Sticky Footer */}
              <form onSubmit={handleSavePurchaseBill} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5 modal-content-scroll text-xs">
                  
                  {/* Supplier & Bill Header Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                    
                    {/* Supplier Card */}
                    <div className="lg:col-span-6 p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Supplier Information</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Step 1 of 2</span>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            Select Registered Vendor
                          </label>
                          <select
                            value={vendorId}
                            onChange={(e) => handleVendorSelect(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
                          >
                            <option value="">-- Or enter custom vendor details below --</option>
                            {parties.filter(p => p.type !== 'CUSTOMER').map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.gstin ? `(${p.gstin})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                              Supplier / Vendor Name *
                            </label>
                            <input
                              type="text"
                              value={vendorName}
                              onChange={(e) => setVendorName(e.target.value)}
                              placeholder="e.g. Acme Tech Distributors"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                              Supplier GSTIN
                            </label>
                            <input
                              type="text"
                              value={vendorGstin}
                              onChange={(e) => handleVendorGstinChange(e.target.value)}
                              placeholder="27ABCDE1234F1Z5"
                              className="w-full px-3 py-2 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bill Info & Tax Settings Card */}
                    <div className="lg:col-span-6 p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Bill Details & Tax Type</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Step 2 of 2</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            Supplier Bill Ref # *
                          </label>
                          <input
                            type="text"
                            value={vendorInvoiceNo}
                            onChange={(e) => setVendorInvoiceNo(e.target.value)}
                            placeholder="e.g. INV-2026-904"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            Bill Date
                          </label>
                          <input
                            type="date"
                            value={billDate}
                            onChange={(e) => setBillDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            Payment Due Date
                          </label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            required
                          />
                        </div>
                      </div>

                      {/* ITC & Inter-State Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            ITC Claim Category (GSTR-2B)
                          </label>
                          <select
                            value={itcEligibility}
                            onChange={(e) => setItcEligibility(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                          >
                            <option value="ELIGIBLE_ALL">Eligible ITC - All other inputs & services</option>
                            <option value="ELIGIBLE_CAPITAL_GOODS">Eligible ITC - Capital Goods</option>
                            <option value="INELIGIBLE_17_5">Ineligible ITC - Section 17(5) Blocked</option>
                            <option value="INELIGIBLE_OTHER">Ineligible ITC - Others / Exempt</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            GST Place of Supply
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !isInterState;
                              setIsInterState(next);
                              setPItems(prev => prev.map(item => recalculateItem(item, next, purchasePriceMode)));
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                              isInterState
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isInterState ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                              <span className="font-bold text-xs truncate">
                                {isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST)'}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase opacity-80 shrink-0">
                              Switch
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Purchased Items Section Header & Controls */}
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                          Purchased Items ({pItems.length})
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {modalTotalUnits} units total
                        </span>
                      </div>

                      {/* Mode Toggle & Actions Toolbar */}
                      <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
                        {/* Price Entry Mode Pill Switch */}
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
                          <span className="hidden sm:inline-block px-1.5 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                            Edit:
                          </span>
                          <button
                            type="button"
                            onClick={() => setPurchasePriceMode('EXCLUSIVE')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              purchasePriceMode === 'EXCLUSIVE'
                                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-indigo-200 dark:border-indigo-600'
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
                                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-indigo-200 dark:border-indigo-600'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Enter total purchase bill line amount inclusive of GST (Tax Inclusive)"
                          >
                            Line Total (Incl.)
                          </button>
                        </div>

                        {/* Quick GST Chips (Visible on Mobile + Desktop) */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] overflow-x-auto max-w-full">
                          <span className="hidden xs:inline-block px-1 text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase">
                            GST:
                          </span>
                          {([0, 5, 12, 18, 28] as GstTaxRate[]).map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => applyGstRateToAllPurchaseItems(rate)}
                              className="px-1.5 py-0.5 rounded-lg font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 shadow-2xs transition-all cursor-pointer text-xs"
                              title={`Set all items to ${rate}% GST`}
                            >
                              {rate}%
                            </button>
                          ))}
                        </div>

                        {/* Action Buttons: Add Item & Quick Create Product */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openQuickAddProduct()}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-all border border-indigo-200/80 dark:border-indigo-800/80 cursor-pointer shadow-2xs shrink-0"
                            title="Quickly add a new product to inventory catalog"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">New Product</span>
                            <span className="sm:hidden">+ Product</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddItemRow}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Item</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* A. Mobile & Tablet Card View (Screen width < lg) */}
                    <div className="block lg:hidden space-y-3">
                      {pItems.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                          <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No items added to this purchase bill</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Add items to inward supplier goods into stock</p>
                          <button
                            type="button"
                            onClick={handleAddItemRow}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add First Item</span>
                          </button>
                        </div>
                      ) : (
                        pItems.map((item, idx) => {
                          const matchedProduct = products.find(p => p.id === item.productId || (item.name && p.name.toLowerCase() === item.name.toLowerCase()));
                          const currentStock = matchedProduct ? matchedProduct.currentStock : 0;
                          const newCalculatedStock = currentStock + (Number(item.quantity) || 0);
                          const isOutOfStock = matchedProduct ? currentStock <= 0 : false;
                          const filteredSuggestions = getFilteredProductsForItem(item.name);

                          return (
                            <div key={item.id} className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-3">
                              {/* Item Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    #{idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    {/* Catalog Linked Badge */}
                                    {matchedProduct && (
                                      <div className="flex items-center justify-between gap-1 px-2 py-1 bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 rounded-xl text-[11px]">
                                        <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                          <span className="truncate">{matchedProduct.name}</span>
                                          {matchedProduct.sku && <span className="opacity-75 font-mono text-[10px]">({matchedProduct.sku})</span>}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleClearProductForIndex(idx)}
                                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold shrink-0 cursor-pointer ml-1 text-xs"
                                          title="Unlink product catalog link"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}

                                    {/* Interactive Search Input */}
                                    <div className="relative">
                                      <div className="relative flex items-center">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                        <input
                                          type="text"
                                          value={item.name}
                                          onChange={(e) => {
                                            handleItemFieldChange(idx, 'name', e.target.value);
                                            setActiveSuggestIndex(idx);
                                          }}
                                          onFocus={() => setActiveSuggestIndex(idx)}
                                          placeholder="Search catalog or type item name..."
                                          className="w-full pl-8 pr-16 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                          required
                                        />
                                        <div className="absolute right-1.5 flex items-center gap-1">
                                          {item.name && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleItemFieldChange(idx, 'name', '');
                                                handleClearProductForIndex(idx);
                                                setActiveSuggestIndex(idx);
                                              }}
                                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                                              title="Clear text"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => openQuickAddProduct(idx, item.name)}
                                            className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md border border-indigo-200/80 dark:border-indigo-800 cursor-pointer shrink-0"
                                            title="Add as new product to inventory catalog"
                                          >
                                            + New
                                          </button>
                                        </div>
                                      </div>

                                      {/* Autocomplete Dropdown */}
                                      {activeSuggestIndex === idx && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 modal-content-scroll">
                                          {/* Dropdown Header */}
                                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider sticky top-0 backdrop-blur-xs z-10">
                                            <span className="flex items-center gap-1">
                                              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                              Catalog Products ({filteredSuggestions.length})
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openQuickAddProduct(idx, item.name);
                                                }}
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                              >
                                                + Create New
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveSuggestIndex(null);
                                                }}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 font-bold"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </div>

                                          {/* Dropdown Items */}
                                          {filteredSuggestions.length > 0 ? (
                                            filteredSuggestions.map(p => {
                                              const pStock = p.currentStock || 0;
                                              const pIsOutOfStock = pStock <= 0;
                                              const pIsLowStock = !pIsOutOfStock && pStock <= (p.minStockAlert || 5);
                                              return (
                                                <div
                                                  key={p.id}
                                                  onClick={() => handleSelectProductForIndex(idx, p)}
                                                  className={`p-2.5 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                                                    pIsOutOfStock ? 'bg-rose-50/25 dark:bg-rose-950/20' : ''
                                                  }`}
                                                >
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{p.name}</span>
                                                      {p.sku && (
                                                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                          {p.sku}
                                                        </span>
                                                      )}
                                                      {p.category && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                                                          {p.category}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                                      <span>Cost: <strong className="text-slate-700 dark:text-slate-200 font-semibold">₹{p.purchasePrice || (p.sellingPrice ? round2(p.sellingPrice * 0.7) : 0)}</strong></span>
                                                      <span>•</span>
                                                      <span>MRP: ₹{p.sellingPrice || 0}</span>
                                                      <span>•</span>
                                                      <span>GST: {p.gstRate}%</span>
                                                      {p.hsnCode && <span>• HSN: {p.hsnCode}</span>}
                                                    </div>
                                                  </div>

                                                  <div className="text-right shrink-0 flex flex-col items-end">
                                                    {pIsOutOfStock ? (
                                                      <div className="space-y-0.5 text-right">
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                                          Out of Stock (0 {p.unit})
                                                        </span>
                                                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                          + Adds on inward
                                                        </div>
                                                      </div>
                                                    ) : pIsLowStock ? (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                        Low: {pStock} {p.unit}
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        {pStock} {p.unit} in stock
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="p-4 text-center space-y-2">
                                              <Package className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                No catalog product found matching "{item.name}"
                                              </div>
                                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                Not available in inventory. Add it now to track stock automatically!
                                              </p>
                                              <button
                                                type="button"
                                                onClick={() => openQuickAddProduct(idx, item.name)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Create "{item.name}" in Catalog</span>
                                              </button>
                                            </div>
                                          )}

                                          {/* Dropdown Footer */}
                                          {filteredSuggestions.length > 0 && (
                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                              <span className="text-slate-400 text-[11px]">Product not listed?</span>
                                              <button
                                                type="button"
                                                onClick={() => openQuickAddProduct(idx, item.name)}
                                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
                                              >
                                                <Plus className="w-3 h-3" /> Add New Product to Catalog
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                                  title="Remove Item Row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Stock Impact Preview Badge */}
                              <div className="flex items-center justify-between gap-1.5 text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 flex-wrap">
                                {matchedProduct ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-slate-500 dark:text-slate-400">
                                      Current Stock:{' '}
                                      <strong className={isOutOfStock ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-200 font-bold'}>
                                        {currentStock} {matchedProduct.unit} {isOutOfStock ? '(Out of Stock)' : ''}
                                      </strong>
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                      New Stock: {newCalculatedStock} {item.unit} (+{item.quantity || 0})
                                      {isOutOfStock && <span className="text-[10px] px-1 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded font-semibold">⚡ Replenished</span>}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1">
                                      <Info className="w-3.5 h-3.5 shrink-0" /> Custom Item (Not in Catalog)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openQuickAddProduct(idx, item.name)}
                                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                                    >
                                      + Add to Catalog
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Mobile Sub-Grid 1: Quantity & Unit */}
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block font-semibold text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                                    Quantity *
                                  </label>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.quantity || ''}
                                    onChange={(e) => handleItemFieldChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                                    Unit
                                  </label>
                                  <select
                                    value={item.unit}
                                    onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                                    className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
                                  >
                                    {STANDARD_UNITS.map(u => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Mobile Sub-Grid 2: Pricing (Exclusive vs Inclusive) */}
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="font-semibold text-[11px] text-slate-600 dark:text-slate-300">
                                      Cost Rate (₹ Excl.)
                                    </label>
                                    {purchasePriceMode === 'EXCLUSIVE' && (
                                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.rate || ''}
                                    onChange={(e) => handleItemFieldChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                    className={`w-full px-3 py-2 text-xs font-mono font-bold text-right rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                      purchasePriceMode === 'EXCLUSIVE'
                                        ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500 dark:border-indigo-400 text-indigo-950 dark:text-indigo-200 shadow-2xs'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                    }`}
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="font-semibold text-[11px] text-slate-600 dark:text-slate-300">
                                      Line Total (₹ Incl.)
                                    </label>
                                    {purchasePriceMode === 'INCLUSIVE' && (
                                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.totalAmount || ''}
                                    onChange={(e) => handleItemInclusiveTotalChange(idx, parseFloat(e.target.value) || 0)}
                                    className={`w-full px-3 py-2 text-xs font-mono font-bold text-right rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                      purchasePriceMode === 'INCLUSIVE'
                                        ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                    }`}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              {/* Mobile Sub-Grid 3: GST & Tax Calculation Breakdown */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
                                <div>
                                  <label className="block font-semibold text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                                    GST Tax Rate
                                  </label>
                                  <select
                                    value={item.gstRate}
                                    onChange={(e) => handleItemFieldChange(idx, 'gstRate', parseInt(e.target.value) as GstTaxRate)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white font-medium cursor-pointer"
                                  >
                                    <option value="0">0% (Nil / Exempt)</option>
                                    <option value="5">5% (Essential 5%)</option>
                                    <option value="12">12% (Standard 12%)</option>
                                    <option value="18">18% (Standard 18%)</option>
                                    <option value="28">28% (Luxury 28%)</option>
                                  </select>
                                </div>
                                <div className="flex flex-col justify-end space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400">Taxable Value:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                      {formatCurrency(item.taxableAmount, business.currencySymbol)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400">{isInterState ? 'IGST Tax:' : 'CGST+SGST Tax:'}</span>
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                      {formatCurrency(isInterState ? item.igstAmount : (item.cgstAmount + item.sgstAmount), business.currencySymbol)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Sub-Grid 4: HSN & Batch / Expiry */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                <div>
                                  <label className="block font-semibold text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                    HSN / SAC Code
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      list={`purch-hsn-list-m-${idx}`}
                                      value={item.hsnCode}
                                      onChange={(e) => handleItemFieldChange(idx, 'hsnCode', e.target.value)}
                                      placeholder="HSN code"
                                      className="w-full px-2 py-1 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                                    />
                                    <datalist id={`purch-hsn-list-m-${idx}`}>
                                      {customHsnCodes.map(h => (
                                        <option key={`cm-${h.id}`} value={h.code}>
                                          [Custom] {h.code} - {h.description} ({h.gstRate}%)
                                        </option>
                                      ))}
                                      {COMMON_HSN_CODES.map(h => (
                                        <option key={`sm-${h.code}`} value={h.code}>
                                          {h.code} - {h.description} ({h.defaultGst}%)
                                        </option>
                                      ))}
                                    </datalist>
                                    <button
                                      type="button"
                                      onClick={() => setHsnLookupTargetIndex(idx)}
                                      className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-indigo-200/60 dark:border-indigo-800 shrink-0 cursor-pointer"
                                      title="Lookup HSN in directory"
                                    >
                                      <Search className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block font-semibold text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                    Batch Number
                                  </label>
                                  <input
                                    type="text"
                                    value={item.batchNumber || ''}
                                    onChange={(e) => handleItemFieldChange(idx, 'batchNumber', e.target.value)}
                                    placeholder="e.g. BATCH-01"
                                    className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                    Expiry Date
                                  </label>
                                  <input
                                    type="date"
                                    value={item.expiryDate || ''}
                                    onChange={(e) => handleItemFieldChange(idx, 'expiryDate', e.target.value)}
                                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* B. Desktop Accounting Table View (Screen width >= lg) */}
                    <div className="hidden lg:block border border-slate-200/90 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto min-w-[920px]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2.5 px-3 min-w-[220px]">Item Description & Product</th>
                              <th className="py-2.5 px-2 w-28">HSN / SAC</th>
                              <th className="py-2.5 px-2 w-32">Batch / Exp</th>
                              <th className="py-2.5 px-2 w-20 text-center">Qty *</th>
                              <th className="py-2.5 px-2 w-20">Unit</th>
                              <th className={`py-2.5 px-2 w-32 text-right transition-colors ${
                                purchasePriceMode === 'EXCLUSIVE'
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold border-x border-indigo-200 dark:border-indigo-800'
                                  : ''
                              }`}>
                                Cost Rate (₹ Excl.)
                              </th>
                              <th className="py-2.5 px-2 w-36 text-center">GST Rate & Tax</th>
                              <th className={`py-2.5 px-3 w-32 text-right transition-colors ${
                                purchasePriceMode === 'INCLUSIVE'
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold border-x border-indigo-200 dark:border-indigo-800'
                                  : ''
                              }`}>
                                Line Total (₹ Incl.)
                              </th>
                              <th className="py-2.5 px-2 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {pItems.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                                  No items added yet. Click &quot;Add Item Row&quot; above.
                                </td>
                              </tr>
                            ) : (
                              pItems.map((item, idx) => {
                                const matchedProduct = products.find(p => p.id === item.productId || (item.name && p.name.toLowerCase() === item.name.toLowerCase()));
                                const currentStock = matchedProduct ? matchedProduct.currentStock : 0;
                                const newCalculatedStock = currentStock + (Number(item.quantity) || 0);
                                const isOutOfStock = matchedProduct ? currentStock <= 0 : false;
                                const filteredSuggestions = getFilteredProductsForItem(item.name);

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    {/* Item / Product */}
                                    <td className="py-2 px-3 align-top">
                                      <div className="relative space-y-1">
                                        {/* Catalog Linked Badge */}
                                        {matchedProduct && (
                                          <div className="flex items-center justify-between gap-1 text-[10px] px-2 py-0.5 bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 rounded-md font-medium">
                                            <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate flex items-center gap-1">
                                              <CheckCircle2 className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                              <span className="truncate">{matchedProduct.name}</span>
                                              {matchedProduct.sku && <span className="opacity-75 font-mono text-[9px]">({matchedProduct.sku})</span>}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleClearProductForIndex(idx)}
                                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold ml-1 cursor-pointer text-xs"
                                              title="Unlink catalog item"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        )}

                                        {/* Search & Name Input */}
                                        <div className="relative flex items-center">
                                          <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                          <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => {
                                              handleItemFieldChange(idx, 'name', e.target.value);
                                              setActiveSuggestIndex(idx);
                                            }}
                                            onFocus={() => setActiveSuggestIndex(idx)}
                                            placeholder="Search catalog or item name..."
                                            className="w-full pl-7 pr-16 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            required
                                          />
                                          <div className="absolute right-1 flex items-center gap-0.5">
                                            {item.name && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleItemFieldChange(idx, 'name', '');
                                                  handleClearProductForIndex(idx);
                                                  setActiveSuggestIndex(idx);
                                                }}
                                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                                title="Clear text"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => openQuickAddProduct(idx, item.name)}
                                              className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded border border-indigo-200/80 dark:border-indigo-800 cursor-pointer shrink-0"
                                              title="Create as new product in catalog"
                                            >
                                              + New
                                            </button>
                                          </div>
                                        </div>

                                        {/* Dropdown Menu */}
                                        {activeSuggestIndex === idx && (
                                          <div className="absolute left-0 top-full mt-1 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 modal-content-scroll">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider sticky top-0 backdrop-blur-xs z-10">
                                              <span className="flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                Matching Products ({filteredSuggestions.length})
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openQuickAddProduct(idx, item.name);
                                                  }}
                                                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                                >
                                                  + Create New
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveSuggestIndex(null);
                                                  }}
                                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 font-bold"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            </div>

                                            {filteredSuggestions.length > 0 ? (
                                              filteredSuggestions.map(p => {
                                                const pStock = p.currentStock || 0;
                                                const pIsOutOfStock = pStock <= 0;
                                                const pIsLowStock = !pIsOutOfStock && pStock <= (p.minStockAlert || 5);
                                                return (
                                                  <div
                                                    key={p.id}
                                                    onClick={() => handleSelectProductForIndex(idx, p)}
                                                    className={`p-2 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                                                      pIsOutOfStock ? 'bg-rose-50/25 dark:bg-rose-950/20' : ''
                                                    }`}
                                                  >
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{p.name}</span>
                                                        {p.sku && (
                                                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                            {p.sku}
                                                          </span>
                                                        )}
                                                        {p.category && (
                                                          <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                                                            {p.category}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                                        <span>Cost: <strong className="text-slate-700 dark:text-slate-200 font-semibold">₹{p.purchasePrice || (p.sellingPrice ? round2(p.sellingPrice * 0.7) : 0)}</strong></span>
                                                        <span>•</span>
                                                        <span>MRP: ₹{p.sellingPrice || 0}</span>
                                                        <span>•</span>
                                                        <span>GST: {p.gstRate}%</span>
                                                        {p.hsnCode && <span>• HSN: {p.hsnCode}</span>}
                                                      </div>
                                                    </div>

                                                    <div className="text-right shrink-0 flex flex-col items-end">
                                                      {pIsOutOfStock ? (
                                                        <div className="space-y-0.5 text-right">
                                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                                            Out of Stock (0 {p.unit})
                                                          </span>
                                                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                            + Adds on inward
                                                          </div>
                                                        </div>
                                                      ) : pIsLowStock ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                          Low: {pStock} {p.unit}
                                                        </span>
                                                      ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                          {pStock} {p.unit} in stock
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="p-3.5 text-center space-y-1.5">
                                                <Package className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                  No catalog product found matching "{item.name}"
                                                </div>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                                  Not in stock or catalog. Create it now to track inward stock automatically.
                                                </p>
                                                <button
                                                  type="button"
                                                  onClick={() => openQuickAddProduct(idx, item.name)}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span>Create "{item.name}" in Catalog</span>
                                                </button>
                                              </div>
                                            )}

                                            {filteredSuggestions.length > 0 && (
                                              <div className="p-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                                <span className="text-slate-400 text-[10px]">Product not listed?</span>
                                                <button
                                                  type="button"
                                                  onClick={() => openQuickAddProduct(idx, item.name)}
                                                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                                                >
                                                  <Plus className="w-3 h-3" /> Add Product to Catalog
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Stock preview badge */}
                                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                                          {matchedProduct ? (
                                            <div className="flex items-center gap-1">
                                              <span>Stock: <strong className={isOutOfStock ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-200'}>{currentStock} {matchedProduct.unit} {isOutOfStock ? '(0)' : ''}</strong></span>
                                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                                New: {newCalculatedStock} {item.unit} (+{item.quantity || 0})
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-between w-full">
                                              <span className="text-amber-600 dark:text-amber-400 text-[10px]">Not in catalog</span>
                                              <button
                                                type="button"
                                                onClick={() => openQuickAddProduct(idx, item.name)}
                                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline text-[10px]"
                                              >
                                                + Add to Catalog
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* HSN/SAC */}
                                    <td className="py-2 px-2 align-top">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          list={`purch-hsn-list-${idx}`}
                                          value={item.hsnCode}
                                          onChange={(e) => handleItemFieldChange(idx, 'hsnCode', e.target.value)}
                                          placeholder="HSN"
                                          className="w-full px-1.5 py-1 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-center"
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
                                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                                          title="Lookup HSN Code"
                                        >
                                          <Search className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>

                                    {/* Batch & Exp */}
                                    <td className="py-2 px-2 align-top">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          value={item.batchNumber || ''}
                                          onChange={(e) => handleItemFieldChange(idx, 'batchNumber', e.target.value)}
                                          placeholder="Batch #"
                                          className="w-full px-1.5 py-1 text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                                        />
                                        <input
                                          type="date"
                                          value={item.expiryDate || ''}
                                          onChange={(e) => handleItemFieldChange(idx, 'expiryDate', e.target.value)}
                                          className="w-full px-1 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                                        />
                                      </div>
                                    </td>

                                    {/* Quantity */}
                                    <td className="py-2 px-2 align-top">
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={item.quantity || ''}
                                        onChange={(e) => handleItemFieldChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full px-1.5 py-1 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                                        required
                                      />
                                    </td>

                                    {/* Unit */}
                                    <td className="py-2 px-2 align-top">
                                      <select
                                        value={item.unit}
                                        onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                                        className="w-full px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                                      >
                                        {STANDARD_UNITS.map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* Cost Rate (Excl.) */}
                                    <td className={`py-2 px-2 align-top ${
                                      purchasePriceMode === 'EXCLUSIVE'
                                        ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-x border-indigo-200 dark:border-indigo-800/40'
                                        : ''
                                    }`}>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.rate || ''}
                                        onChange={(e) => handleItemFieldChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                        className={`w-full px-2 py-1 text-xs font-mono font-bold text-right rounded-lg focus:outline-none ${
                                          purchasePriceMode === 'EXCLUSIVE'
                                            ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500 dark:border-indigo-400 text-indigo-950 dark:text-indigo-200'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                        }`}
                                        placeholder="0.00"
                                        required
                                      />
                                      <div className="text-[10px] text-right text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                        Taxable: {formatCurrency(item.taxableAmount, '')}
                                      </div>
                                    </td>

                                    {/* Item GST */}
                                    <td className="py-2 px-2 align-top text-center">
                                      <select
                                        value={item.gstRate}
                                        onChange={(e) => handleItemFieldChange(idx, 'gstRate', parseInt(e.target.value) as GstTaxRate)}
                                        className="w-full px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-center cursor-pointer"
                                      >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                      </select>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                        {isInterState ? `IGST: ${formatCurrency(item.igstAmount, '')}` : `Tax: ${formatCurrency(item.cgstAmount + item.sgstAmount, '')}`}
                                      </div>
                                    </td>

                                    {/* Total (Incl.) */}
                                    <td className={`py-2 px-3 align-top ${
                                      purchasePriceMode === 'INCLUSIVE'
                                        ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-x border-indigo-200 dark:border-indigo-800/40'
                                        : ''
                                    }`}>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.totalAmount || ''}
                                        onChange={(e) => handleItemInclusiveTotalChange(idx, parseFloat(e.target.value) || 0)}
                                        className={`w-full px-2 py-1 text-xs font-mono font-bold text-right rounded-lg focus:outline-none ${
                                          purchasePriceMode === 'INCLUSIVE'
                                            ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                        }`}
                                        placeholder="0.00"
                                      />
                                    </td>

                                    {/* Action */}
                                    <td className="py-2 px-2 align-middle text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItemRow(idx)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                        title="Remove row"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown & Stock Accounting Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pt-2">
                    
                    {/* Stock & ITC Notice Box */}
                    <div className="md:col-span-6 lg:col-span-7 p-3.5 sm:p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-xs flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="font-bold text-slate-900 dark:text-white">
                          Automated Inventory & Tax Ledger Posting
                        </div>
                        <p>
                          Saving this bill immediately adds <strong className="text-emerald-700 dark:text-emerald-400">{modalTotalUnits} units</strong> to your stock catalog and records <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(modalTotalTax, business.currencySymbol)}</strong> under your GSTR-2B Input Tax Credit ledger.
                        </p>
                      </div>
                    </div>

                    {/* Financial Totals Card */}
                    <div className="md:col-span-6 lg:col-span-5 p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Taxable Subtotal:</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(modalSubTotalTaxable, business.currencySymbol)}
                        </span>
                      </div>

                      {isInterState ? (
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Integrated Tax (IGST):</span>
                          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(modalTotalIgst, business.currencySymbol)}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>Central Tax (CGST):</span>
                            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(modalTotalCgst, business.currencySymbol)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>State Tax (SGST):</span>
                            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(modalTotalSgst, business.currencySymbol)}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Round Off:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {modalRoundOff >= 0 ? `+${modalRoundOff.toFixed(2)}` : modalRoundOff.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline font-bold text-sm sm:text-base pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-900 dark:text-white">Grand Total Bill:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-base sm:text-lg">
                          {formatCurrency(modalGrandTotal, business.currencySymbol)}
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Sticky Modal Action Footer */}
                <div className="shrink-0 px-3.5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">
                  {/* Live Total Pill */}
                  <div className="flex items-center justify-between xs:justify-start gap-2.5">
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                        Total Amount
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono leading-none mt-0.5">
                        {formatCurrency(modalGrandTotal, business.currencySymbol)}
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden xs:block"></div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{pItems.length}</span> {pItems.length === 1 ? 'item' : 'items'} • <span className="font-semibold text-slate-700 dark:text-slate-300">{modalTotalUnits}</span> units
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPurchaseModalOpen(false)}
                      className="flex-1 xs:flex-none px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 xs:flex-none px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <PackagePlus className="w-4 h-4 shrink-0" />
                      <span>Save Bill & Add Stock</span>
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* Bill View Details Modal */}
      {selectedBillForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-hidden modal-overlay">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[90dvh] sm:h-auto sm:max-h-[88dvh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedBillForView.billNumber}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    {selectedBillForView.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supplier: {selectedBillForView.vendorName} • Ref: {selectedBillForView.vendorInvoiceNumber}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBillForView(null)} 
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 modal-content-scroll text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Bill Date:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(selectedBillForView.billDate)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">GSTIN:</span>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedBillForView.vendorGstin || 'Unregistered'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Supply Type:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedBillForView.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">ITC Claim:</span>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">{selectedBillForView.itcEligibility.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] block mb-2">
                  Purchased Inventory Items ({selectedBillForView.items.length})
                </span>
                
                {/* Mobile View */}
                <div className="block sm:hidden space-y-2.5">
                  {selectedBillForView.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{it.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            HSN: {it.hsnCode || 'N/A'} {it.batchNumber ? `• Batch: ${it.batchNumber}` : ''}
                          </div>
                        </div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                          +{it.quantity} {it.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-slate-500 dark:text-slate-400">Rate: {formatCurrency(it.rate, business.currencySymbol)}</span>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">Total: {formatCurrency(it.totalAmount, business.currencySymbol)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet / Desktop View */}
                <div className="hidden sm:block border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-2 text-center">HSN</th>
                        <th className="py-2.5 px-2 text-center">Qty Added</th>
                        <th className="py-2.5 px-2 text-right">Rate</th>
                        <th className="py-2.5 px-2 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
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
                <div className="w-full sm:w-64 space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Taxable Value:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(selectedBillForView.subTotalTaxable, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Total Tax:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(selectedBillForView.totalTax, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-900 dark:text-white">Grand Total:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{formatCurrency(selectedBillForView.grandTotal, business.currencySymbol)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBillForView(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
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

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Expense Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* GST Bill / ITC Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasGstBillCheck"
                    checked={hasGstBill}
                    onChange={(e) => setHasGstBill(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="hasGstBillCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Vendor Provided GST Invoice (Claim Input Tax Credit)
                  </label>
                </div>

                {hasGstBill && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-[11px] text-slate-600 dark:text-slate-400 mb-1">GST Rate</label>
                        <select
                          value={expenseGstRate}
                          onChange={(e) => setExpenseGstRate(parseInt(e.target.value) as GstTaxRate)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none text-xs"
                        >
                          <option value="0">0% (Nil / Exempt)</option>
                          <option value="5">5% (Essential)</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium text-[11px] text-slate-600 dark:text-slate-400 mb-1">Vendor GSTIN (Optional)</label>
                        <input
                          type="text"
                          value={expenseVendorGstin}
                          onChange={(e) => setExpenseVendorGstin(e.target.value.toUpperCase())}
                          placeholder="27ABCDE1234F1Z5"
                          className="w-full px-2 py-1.5 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none text-xs"
                        />
                      </div>
                    </div>

                    {expenseAmount > 0 && expenseGstRate > 0 && (
                      <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-lg border border-emerald-200/60 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex justify-between font-mono">
                        <span>Taxable: ₹{round2(expenseAmount / (1 + expenseGstRate / 100)).toFixed(2)}</span>
                        <span>ITC Claim: ₹{round2(expenseAmount - round2(expenseAmount / (1 + expenseGstRate / 100))).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. August month office electricity bill"
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

      {/* Backdrop for closing active product suggestion dropdowns on outside clicks */}
      {activeSuggestIndex !== null && (
        <div 
          className="fixed inset-0 z-40 bg-transparent pointer-events-auto"
          onClick={() => setActiveSuggestIndex(null)} 
        />
      )}

      {/* Quick Add Product to Inventory Catalog Modal */}
      {isQuickAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto modal-content-scroll my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Product to Catalog
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Create item in inventory and immediately link to inward purchase bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickProduct} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Product / Item Name *
                </label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. Wireless Ergonomic Keyboard"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU / Item Code
                  </label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="quick-prod-categories"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    placeholder="e.g. Hardware, Electronics, Raw Material"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  />
                  <datalist id="quick-prod-categories">
                    <option value="Electronics" />
                    <option value="Hardware" />
                    <option value="Raw Materials" />
                    <option value="Office Supplies" />
                    <option value="FMCG & Groceries" />
                    <option value="Packaging" />
                    <option value="General" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measure
                  </label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      HSN / SAC Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddHsnLookupOpen(true)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <Search className="w-2.5 h-2.5" /> Lookup
                    </button>
                  </div>
                  <input
                    type="text"
                    list="quick-prod-hsn-list"
                    value={newProdHsn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProdHsn(val);
                      const matchCustom = customHsnCodes.find(c => c.code.toLowerCase() === val.trim().toLowerCase());
                      if (matchCustom) {
                        setNewProdGstRate(matchCustom.gstRate);
                        if (matchCustom.uqc && matchCustom.uqc !== 'OTH') setNewProdUnit(matchCustom.uqc);
                        if (matchCustom.type === 'SAC') setNewProdIsService(true);
                      } else {
                        const matchStandard = COMMON_HSN_CODES.find(c => c.code === val.trim());
                        if (matchStandard) {
                          setNewProdGstRate(matchStandard.defaultGst as GstTaxRate);
                          if (matchStandard.code.startsWith('99')) setNewProdIsService(true);
                        }
                      }
                    }}
                    placeholder="e.g. 8471, 9983"
                    className="w-full px-3 py-2 font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  />
                  <datalist id="quick-prod-hsn-list">
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
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Cost Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProdPurchasePrice || ''}
                    onChange={(e) => setNewProdPurchasePrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price / MRP (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProdSellingPrice || ''}
                    onChange={(e) => setNewProdSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST Tax Rate (%)
                  </label>
                  <select
                    value={newProdGstRate}
                    onChange={(e) => setNewProdGstRate(parseInt(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Essentials)</option>
                    <option value="12">12% (Standard)</option>
                    <option value="18">18% (General Goods)</option>
                    <option value="28">28% (Luxury / De-merit)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdOpeningStock}
                    onChange={(e) => setNewProdOpeningStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Informative Note About Stock Replenishment */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/70 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Inward Stock Note:</strong> You can keep opening stock at <strong>0</strong>. Saving this purchase bill will automatically inward and increase stock in your inventory!
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save & Link to Purchase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HSN Lookup Dialog for Quick Add Product */}
      <HsnLookupDialog
        isOpen={isQuickAddHsnLookupOpen}
        onClose={() => setIsQuickAddHsnLookupOpen(false)}
        currentCode={newProdHsn}
        onSelect={(item) => {
          setNewProdHsn(item.code);
          setNewProdGstRate(item.gstRate as GstTaxRate);
          if (item.uqc && item.uqc !== 'OTH') setNewProdUnit(item.uqc);
          if (item.code.startsWith('99')) setNewProdIsService(true);
          setIsQuickAddHsnLookupOpen(false);
        }}
        onOpenCustomManager={() => setIsCustomHsnModalOpen(true)}
      />
    </div>
  );
};
