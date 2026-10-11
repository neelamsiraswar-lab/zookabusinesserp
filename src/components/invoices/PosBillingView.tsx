import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PaymentMethod, InvoiceItem, Party, InvoiceStatus, GstTaxRate, Invoice, PosSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  calculateItemGst, 
  recalculateInvoiceTotals, 
  getProductSaleRates,
  calculateRateWithTax,
  calculateBaseRateFromRateWithTax 
} from '../../utils/gstCalculations';
import { DEFAULT_POS_SETTINGS } from '../../utils/cleanDefaults';
import confetti from 'canvas-confetti';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  QrCode, 
  Printer, 
  CreditCard, 
  Banknote, 
  Percent, 
  Sparkles,
  PackageCheck,
  CheckCircle2,
  Scan,
  Users,
  UserCheck,
  UserPlus,
  Phone,
  MapPin,
  Mail,
  ChevronDown,
  X,
  Check,
  AlertTriangle,
  Ban,
  ShieldAlert,
  Edit3,
  Tag,
  SlidersHorizontal,
  RotateCcw,
  Receipt,
  PlusCircle,
  Calculator,
  LayoutGrid,
  List,
  FileText,
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Package,
  Sliders,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle
} from 'lucide-react';
import { 
  normalizeLowStockSettings, 
  getProductStockThreshold, 
  isProductLowStock, 
  isProductCriticalStock, 
  isProductOutOfStock 
} from '../../utils/stockUtils';

interface CartItem extends InvoiceItem {
  maxStock: number;
  originalPrice?: number;
  isCustomItem?: boolean;
}

export const PosBillingView: React.FC = () => {
  const { 
    products, 
    parties, 
    business, 
    updateBusiness,
    createInvoice, 
    createParty, 
    getNextSequentialInvoiceNumber,
    setSelectedInvoiceIdForPrint, 
    showToast,
    confirmDelete
  } = useApp();

  const posSettings: PosSettings = {
    ...DEFAULT_POS_SETTINGS,
    ...(business.posSettings || {})
  };

  const [showPosSettingsModal, setShowPosSettingsModal] = useState(false);
  const [lastCompletedInvoice, setLastCompletedInvoice] = useState<Invoice | null>(null);
  const [showFastSaleCompletedModal, setShowFastSaleCompletedModal] = useState(false);

  const handleToggleAutoPrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !posSettings.autoPrintReceipt;
    const updated: PosSettings = {
      ...posSettings,
      autoPrintReceipt: nextVal
    };
    updateBusiness({
      ...business,
      posSettings: updated
    });
    if (nextVal) {
      showToast('success', 'Auto-Print Enabled', 'Receipt preview will automatically open when a POS sale is completed.');
    } else {
      showToast('info', 'Auto-Print Disabled (Fast Checkout)', 'Sale will complete instantly without opening receipt printer, speeding up counter workflow.');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [itemViewMode, setItemViewMode] = useState<'grid' | 'list'>('grid');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  
  // Customer selection & contacts state
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [discountOverall, setDiscountOverall] = useState<number>(0);

  // Settlement & Partial Payment State
  const [settlementType, setSettlementType] = useState<'FULL' | 'PARTIAL' | 'CREDIT'>('FULL');
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Custom Item & Custom Sale Amount Modal States
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editPriceMode, setEditPriceMode] = useState<'EXCLUSIVE' | 'RATE_INCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [editUnitRate, setEditUnitRate] = useState<number>(0);
  const [editRateWithTax, setEditRateWithTax] = useState<number>(0);
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editDiscountPercent, setEditDiscountPercent] = useState<number>(0);
  const [editGstRate, setEditGstRate] = useState<GstTaxRate>(18);
  const [editDescription, setEditDescription] = useState<string>('');

  // Add Brand-New Custom / Open Sale Item Modal State
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('Custom Service / Item');
  const [customItemHsn, setCustomItemHsn] = useState('9987');
  const [customItemUnit, setCustomItemUnit] = useState('Pcs');
  const [customItemPriceMode, setCustomItemPriceMode] = useState<'EXCLUSIVE' | 'RATE_INCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [customItemPrice, setCustomItemPrice] = useState<number>(500);
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [customItemGstRate, setCustomItemGstRate] = useState<GstTaxRate>(18);
  const [customItemDiscount, setCustomItemDiscount] = useState<number>(0);
  const [customItemNotes, setCustomItemNotes] = useState('');

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter contacts matching name or phone
  const matchingParties = parties.filter(p => {
    if (!customerName && !customerPhone) return p.type === 'CUSTOMER' || p.type === 'BOTH';
    const term = (customerName || customerPhone).toLowerCase();
    return (
      (p.type === 'CUSTOMER' || p.type === 'BOTH') &&
      (p.name.toLowerCase().includes(term) ||
       p.phone.includes(term) ||
       (p.companyName && p.companyName.toLowerCase().includes(term)))
    );
  });

  const handleSelectParty = (party: Party) => {
    setSelectedPartyId(party.id);
    setCustomerName(party.name);
    setCustomerPhone(party.phone || '');
    setCustomerEmail(party.email || '');
    setCustomerAddress(party.billingAddress || '');
    setCustomerGstin(party.gstin || '');
    setShowPartyDropdown(false);
    showToast('info', 'Customer Selected', `${party.name} linked from Contacts.`);
  };

  const handleClearPartySelection = () => {
    setSelectedPartyId(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerGstin('');
  };

  // Extract categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(prod => {
    const matchesSearch = 
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.barcode && prod.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate cart totals
  const totals = recalculateInvoiceTotals(cart, false); // Intra-state by default for counter sales
  const changeToReturn = Math.max(0, cashTendered - totals.grandTotal);

  // Add product to cart
  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);

  const handleAddToCart = (product: Product) => {
    if (!product.isService && product.currentStock <= 0) {
      if (stockSettings.blockBillingOnOutOfStock) {
        showToast('error', 'Billing Blocked', `${product.name} is out of stock (Stock: 0). Billing blocked by company policy.`);
        return;
      } else {
        showToast('warning', 'Negative Stock Warning', `${product.name} is out of stock. Proceeding with negative inventory.`);
      }
    } else if (!product.isService && isProductLowStock(product, stockSettings) && stockSettings.warnOnLowStockBilling) {
      showToast('warning', 'Low Stock Alert', `${product.name} is running low (${product.currentStock} ${product.unit} left).`);
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (!product.isService && existing.quantity >= product.currentStock && stockSettings.blockBillingOnOutOfStock) {
          showToast('warning', 'Stock Limit Exceeded', `Only ${product.currentStock} units in stock. Cannot add more.`);
          return prev;
        }
        const updatedQty = existing.quantity + 1;
        const calcs = calculateItemGst(existing.rate, updatedQty, existing.discountPercent, existing.gstRate, false);
        return prev.map(item => item.productId === product.id ? { ...item, ...calcs } : item);
      } else {
        const rates = getProductSaleRates(product);
        const calcs = calculateItemGst(rates.baseRate, 1, 0, product.gstRate, false);
        const newItem: CartItem = {
          id: 'pos-' + Date.now() + Math.random().toString(36).substring(2, 7),
          productId: product.id,
          name: product.name,
          hsnCode: product.hsnCode,
          unit: product.unit,
          maxStock: product.currentStock,
          originalPrice: rates.baseRate,
          isCustomItem: false,
          isTaxInclusive: rates.isTaxInclusive,
          taxIncludedRate: rates.rateWithTax,
          ...calcs
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId || item.productId === itemId) {
          const newQty = Math.max(0, item.quantity + delta);
          if (newQty <= 0) return null as any;
          if (item.maxStock && newQty > item.maxStock) {
            showToast('warning', 'Max Stock Reached', `Available stock is ${item.maxStock}`);
            return item;
          }
          const calcs = calculateItemGst(item.rate, newQty, item.discountPercent, item.gstRate, false);
          return { ...item, ...calcs };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const handleDirectQtyChange = (itemId: string, newQty: number) => {
    if (isNaN(newQty) || newQty <= 0) return;
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          if (item.maxStock && newQty > item.maxStock && stockSettings.blockBillingOnOutOfStock) {
            showToast('warning', 'Stock Exceeded', `Available stock is only ${item.maxStock}`);
            newQty = item.maxStock;
          }
          const calcs = calculateItemGst(item.rate, newQty, item.discountPercent, item.gstRate, false);
          return { ...item, ...calcs };
        }
        return item;
      });
    });
  };

  const handleRemoveFromCart = async (item: CartItem) => {
    const confirmed = await confirmDelete({
      title: 'Remove from Cart',
      itemName: item.name,
      itemType: `Quantity: ${item.quantity} ${item.unit || 'units'}`,
      message: `Are you sure you want to remove "${item.name}" from the POS checkout cart?`,
      confirmText: 'Remove Item',
      variant: 'warning'
    });
    if (confirmed) {
      setCart(prev => prev.filter(i => i.id !== item.id && i.productId !== item.id));
    }
  };

  // Open Edit Item Sale Price Modal
  const handleOpenEditItem = (item: CartItem) => {
    setEditingCartItem(item);
    const mode = item.isTaxInclusive ? 'RATE_INCLUSIVE' : 'EXCLUSIVE';
    setEditPriceMode(mode);
    setEditUnitRate(item.rate);
    const rWithTax = item.taxIncludedRate || calculateRateWithTax(item.rate, item.gstRate);
    setEditRateWithTax(rWithTax);
    setEditTotalAmount(item.totalAmount);
    setEditQuantity(item.quantity);
    setEditDiscountPercent(item.discountPercent || 0);
    setEditGstRate(item.gstRate);
    setEditDescription(item.description || '');
  };

  // Reset Cart Item Rate to original master price
  const handleResetItemPrice = (itemId: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId && item.originalPrice !== undefined) {
        const calcs = calculateItemGst(item.originalPrice, item.quantity, item.discountPercent, item.gstRate, false);
        return {
          ...item,
          rate: item.originalPrice,
          ...calcs
        };
      }
      return item;
    }));
    showToast('info', 'Price Reset', 'Reset item to original catalog selling price.');
  };

  // Save changes from Edit Custom Sale Price Modal
  const handleSaveItemEdit = () => {
    if (!editingCartItem) return;

    let computedRate = editUnitRate;
    const qty = Math.max(0.01, editQuantity);
    const disc = Math.max(0, Math.min(100, editDiscountPercent));
    const gst = editGstRate;

    if (editPriceMode === 'RATE_INCLUSIVE') {
      computedRate = calculateBaseRateFromRateWithTax(editRateWithTax, gst, 0);
    } else if (editPriceMode === 'INCLUSIVE') {
      // Back calculate base unit rate from inclusive gross total
      // total = rate * qty * (1 - disc/100) * (1 + gst/100)
      const discountFactor = (1 - disc / 100);
      const taxFactor = (1 + gst / 100);
      if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
        computedRate = Number((editTotalAmount / (qty * discountFactor * taxFactor)).toFixed(2));
      }
    }

    const calcs = calculateItemGst(computedRate, qty, disc, gst, false);
    const finalTaxIncludedRate = editPriceMode === 'RATE_INCLUSIVE'
      ? editRateWithTax
      : Number((computedRate * (1 + gst / 100)).toFixed(2));

    setCart(prev => prev.map(item => {
      if (item.id === editingCartItem.id) {
        return {
          ...item,
          rate: computedRate,
          gstRate: gst,
          discountPercent: disc,
          description: editDescription.trim() || undefined,
          isTaxInclusive: editPriceMode === 'RATE_INCLUSIVE' || editPriceMode === 'INCLUSIVE',
          taxIncludedRate: finalTaxIncludedRate,
          ...calcs
        };
      }
      return item;
    }));

    showToast('success', 'Custom Amount Applied', `Item sale rate updated to ${formatCurrency(computedRate, business.currencySymbol)}`);
    setEditingCartItem(null);
  };

  // Add Brand-New Custom / Open Sale Item into Cart
  const handleAddCustomSaleItem = () => {
    if (!customItemName.trim()) {
      showToast('error', 'Item Name Required', 'Please enter a name for the custom sale item.');
      return;
    }

    const qty = Math.max(0.01, customItemQty);
    const disc = Math.max(0, Math.min(100, customItemDiscount));
    const gst = customItemGstRate;
    let computedRate = customItemPrice;

    if (customItemPriceMode === 'RATE_INCLUSIVE') {
      computedRate = calculateBaseRateFromRateWithTax(customItemPrice, gst, 0);
    } else if (customItemPriceMode === 'INCLUSIVE') {
      const discountFactor = (1 - disc / 100);
      const taxFactor = (1 + gst / 100);
      if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
        computedRate = Number((customItemPrice / (qty * discountFactor * taxFactor)).toFixed(2));
      }
    }

    const calcs = calculateItemGst(computedRate, qty, disc, gst, false);
    const finalTaxIncludedRate = customItemPriceMode === 'RATE_INCLUSIVE'
      ? customItemPrice
      : Number((computedRate * (1 + gst / 100)).toFixed(2));

    const customCartItem: CartItem = {
      id: 'custom-' + Date.now() + Math.random().toString(36).substring(2, 7),
      name: customItemName.trim(),
      hsnCode: customItemHsn.trim() || '9987',
      unit: customItemUnit.trim() || 'Pcs',
      maxStock: 99999,
      originalPrice: computedRate,
      isCustomItem: true,
      isTaxInclusive: customItemPriceMode === 'RATE_INCLUSIVE' || customItemPriceMode === 'INCLUSIVE',
      taxIncludedRate: finalTaxIncludedRate,
      description: customItemNotes.trim() || undefined,
      ...calcs
    };

    setCart(prev => [...prev, customCartItem]);
    showToast('success', 'Custom Item Added', `Added "${customItemName}" to sale cart.`);

    // Reset custom item modal
    setCustomItemName('Custom Service / Item');
    setCustomItemPrice(500);
    setCustomItemQty(1);
    setCustomItemNotes('');
    setShowCustomItemModal(false);
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showToast('error', 'Cart Empty', 'Please add products to the cart first.');
      return;
    }

    let finalPartyId: string | undefined = selectedPartyId || undefined;
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    // If not explicitly selected from contacts, check if party already exists by phone or name
    if (!finalPartyId && (cleanName || cleanPhone)) {
      const existing = parties.find(p => 
        (cleanPhone && p.phone && p.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone.replace(/[^0-9]/g, '').slice(-10)) ||
        (cleanName && cleanName.toLowerCase() !== 'walk-in customer' && p.name.toLowerCase() === cleanName.toLowerCase())
      );

      if (existing) {
        finalPartyId = existing.id;
      } else if (saveToContacts || cleanPhone || (cleanName && cleanName.toLowerCase() !== 'walk-in customer')) {
        // Automatically create new contact in Contacts Master
        const newParty = createParty({
          type: 'CUSTOMER',
          name: cleanName || `Retail Customer ${cleanPhone}`,
          phone: cleanPhone || business.phone,
          email: customerEmail.trim() || undefined,
          gstin: customerGstin.trim() ? customerGstin.trim().toUpperCase() : undefined,
          billingAddress: customerAddress.trim() || 'POS Counter Sale, ' + business.city,
          city: business.city,
          state: business.state,
          stateCode: business.stateCode,
          pincode: business.pincode,
          openingBalance: 0,
          creditLimit: 50000,
          creditPeriodDays: 15
        });
        finalPartyId = newParty.id;
      }
    }

    if (!finalPartyId) {
      // Find standard walkin or fallback
      const walkinParty = parties.find(p => p.id === 'party-3' || p.name.toLowerCase().includes('walk-in'));
      finalPartyId = walkinParty?.id || 'party-retail-walkin';
    }

    // Calculate settlement amounts
    let calculatedPaid = totals.grandTotal;
    if (settlementType === 'CREDIT') {
      calculatedPaid = 0;
    } else if (settlementType === 'PARTIAL') {
      calculatedPaid = Math.min(totals.grandTotal, Math.max(0, partialAmount));
    }
    const calculatedDue = Math.max(0, totals.grandTotal - calculatedPaid);
    const invoiceStatus = (calculatedDue === 0 ? 'PAID' : (calculatedPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID')) as InvoiceStatus;

    // Get dynamic next sequential invoice number guaranteed to be non-colliding
    const liveNextInfo = getNextSequentialInvoiceNumber();
    
    const invoice = createInvoice({
      invoiceNumber: liveNextInfo.invoiceNumber,
      invoiceType: 'TAX_INVOICE',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: invoiceStatus,
      sellerGstin: business.gstin,
      sellerStateCode: business.stateCode,
      sellerState: business.state,
      customerId: finalPartyId,
      customerName: cleanName || 'Walk-in Retail Customer',
      customerPhone: cleanPhone || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerGstin: customerGstin.trim() ? customerGstin.trim().toUpperCase() : undefined,
      customerAddress: customerAddress.trim() || 'Counter Retail Sale',
      customerCity: business.city,
      customerState: business.state,
      customerStateCode: business.stateCode,
      placeOfSupplyState: business.state,
      placeOfSupplyStateCode: business.stateCode,
      isInterState: false,
      isReverseCharge: false,
      items: cart,
      subTotalTaxable: totals.subTotalTaxable,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      totalIgst: 0,
      totalCess: 0,
      totalTax: totals.totalTax,
      totalDiscount: totals.totalDiscount,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      amountPaid: calculatedPaid,
      amountDue: calculatedDue,
      paymentMethod,
      notes: settlementType === 'PARTIAL' 
        ? `Counter POS sale - Partial payment collected: ${business.currencySymbol}${calculatedPaid}, Balance Due: ${business.currencySymbol}${calculatedDue}`
        : settlementType === 'CREDIT'
        ? `Counter POS sale - Credit transaction (Amount Due: ${business.currencySymbol}${calculatedDue})`
        : 'Counter POS quick tax invoice (Full settlement)'
    });

    // Celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setCart([]);
    setCashTendered(0);
    setSettlementType('FULL');
    setPartialAmount(0);
    setShowSettlementModal(false);
    setMobileTab('products');

    // Check automatic receipt print preference
    if (posSettings.autoPrintReceipt) {
      setSelectedInvoiceIdForPrint(invoice.id);
    } else {
      setLastCompletedInvoice(invoice);
      setShowFastSaleCompletedModal(true);
      showToast(
        'success', 
        'Sale Completed (Fast Checkout)', 
        `Invoice #${invoice.invoiceNumber} recorded. Terminal is ready for the next customer.`
      );
    }
  };

  const currentNextInfo = getNextSequentialInvoiceNumber();
  const totalCartItemsCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleClearEntireCart = async () => {
    if (cart.length === 0) return;
    const confirmed = await confirmDelete({
      title: 'Clear Entire Sale Cart',
      itemName: `${totalCartItemsCount} Item${totalCartItemsCount > 1 ? 's' : ''}`,
      itemType: 'POS Counter Cart',
      message: 'Are you sure you want to clear all items from the current checkout cart?',
      confirmText: 'Clear Cart',
    });
    if (confirmed) {
      setCart([]);
      showToast('info', 'Cart Cleared', 'All items have been removed from the cart.');
    }
  };

  return (
    <div className="space-y-2 pb-20 md:pb-3 lg:pb-1">
      {/* Top Header Bar - Minimized & Compact */}
      <div className="p-2 sm:px-3 sm:py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                POS Counter Billing
              </h1>
              <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate hidden xs:block">
              Fast barcode lookup, tap-to-add cart & thermal printer
            </p>
          </div>
        </div>

        {/* Right side compact badges & action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {/* Quick-Access Auto-Print Toggle */}
          <button
            type="button"
            onClick={handleToggleAutoPrint}
            id="pos-quick-autoprint-header-btn"
            title={
              posSettings.autoPrintReceipt
                ? 'Auto-print receipt is ON. Click to disable for fast checkout.'
                : 'Auto-print receipt is OFF (Fast Checkout). Click to enable auto-print.'
            }
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 ${
              posSettings.autoPrintReceipt
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <Printer className={`w-3 h-3 ${posSettings.autoPrintReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span className="text-[10px] font-medium hidden sm:inline">Auto-Print:</span>
            <span className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase ${
              posSettings.autoPrintReceipt ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white dark:bg-slate-600'
            }`}>
              {posSettings.autoPrintReceipt ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* POS Settings Dialog Button */}
          <button
            type="button"
            onClick={() => setShowPosSettingsModal(true)}
            id="pos-terminal-settings-header-btn"
            title="Configure POS Terminal & Receipt Settings"
            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <Sliders className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline text-[10px]">Settings</span>
          </button>

          {/* Unified Serial Rule Next Invoice No */}
          <div className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1 text-[11px] shadow-2xs">
            <span className="text-[9px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase hidden sm:inline">
              Inv:
            </span>
            <span className="font-mono font-bold text-xs text-indigo-950 dark:text-white bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-700/80">
              {currentNextInfo.invoiceNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Switchable Segmented Capsule: Product vs Cart (Optimized for Mobile Phones < md) */}
      <div className="md:hidden sticky top-1 z-20 bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-700/80 transition-all">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'products'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Catalog</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              mobileTab === 'products' ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'
            }`}>
              {filteredProducts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
              mobileTab === 'cart'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>Cart</span>
            {totalCartItemsCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                mobileTab === 'cart' ? 'bg-emerald-700 text-white' : 'bg-emerald-500 text-white animate-pulse'
              }`}>
                {totalCartItemsCount}
              </span>
            )}
            {totals.grandTotal > 0 && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                mobileTab === 'cart' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-700 text-emerald-400'
              }`}>
                {formatCurrency(totals.grandTotal, business.currencySymbol)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2-Column POS Layout - Dual-Pane Fitting Desktop and Tablets */}
      <div className="grid grid-cols-1 md:grid-cols-12 md:gap-2.5 lg:gap-3.5 md:items-stretch md:h-[calc(100vh-8.25rem)] lg:h-[calc(100vh-7.25rem)] min-h-0">
        {/* Left: Product Grid & Search (7 cols on Tablet/Desktop, 8 cols on XL) */}
        <div className={`md:col-span-7 lg:col-span-7 xl:col-span-8 flex flex-col md:h-full min-h-0 space-y-2 ${mobileTab === 'products' ? 'flex' : 'hidden md:flex'}`}>
          {/* Search & Category Filter Card - Compact */}
          <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan barcode, SKU, or search products..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCustomItemModal(true)}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Add ad-hoc custom item / service with custom rate & GST"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">+ Custom Item</span>
                <span className="sm:hidden">+ Custom</span>
              </button>
            </div>

            {/* Category chips and View Mode switcher */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar flex-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* View Switcher & Count */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                  {filteredProducts.length} items
                </span>
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setItemViewMode('grid')}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      itemViewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title="Grid View (Cards)"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemViewMode('list')}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      itemViewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title="List View (Table / Rows)"
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Items: Grid or List View with Smooth Viewport Scroll */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-0.5 rounded-xl">
            {itemViewMode === 'grid' ? (
              /* Product Cards Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                {filteredProducts.map(prod => {
                  const inCart = cart.find(i => i.productId === prod.id);
                  const isOutOfStock = isProductOutOfStock(prod);
                  const isCritical = isProductCriticalStock(prod, stockSettings);
                  const isLow = isProductLowStock(prod, stockSettings);
                  const isDisabled = isOutOfStock && stockSettings.blockBillingOnOutOfStock;
                  const saleRates = getProductSaleRates(prod);

                  return (
                    <button
                      key={prod.id}
                      disabled={isDisabled}
                      onClick={() => handleAddToCart(prod)}
                      className={`p-2 sm:p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer active:scale-95 ${
                        isDisabled
                          ? 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                          : isOutOfStock
                          ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700'
                          : isLow
                          ? 'bg-amber-50/30 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-0.5 gap-1">
                          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[70px]">
                            {prod.sku}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isOutOfStock && (
                              <span className="text-[8px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1 py-0.2 rounded">
                                Out
                              </span>
                            )}
                            {isLow && !isOutOfStock && (
                              <span className="text-[8px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1 py-0.2 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2 h-2" /> Low
                              </span>
                            )}
                            <span className="text-[8px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1 py-0.2 rounded">
                              {prod.gstRate}%
                            </span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 leading-tight">
                          {prod.name}
                        </h3>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 truncate">
                            <span>{formatCurrency(saleRates.rateWithTax, business.currencySymbol)}</span>
                            <span className="text-[8px] font-sans font-normal text-slate-400">Incl.</span>
                          </div>
                          <div className={`text-[9px] font-medium truncate ${
                            isOutOfStock ? 'text-rose-600 dark:text-rose-400 font-bold' : isLow ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {prod.isService ? 'Service' : `${prod.currentStock} left`}
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                          inCart ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300'
                        }`}>
                          {inCart ? (
                            <span className="text-[11px]">{inCart.quantity}</span>
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                    No products found matching "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              /* Product Table / List View */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col h-full">
                <div className="overflow-x-auto flex-1 no-scrollbar">
                  <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="py-1.5 px-2.5">Product & Category</th>
                        <th className="py-1.5 px-2 text-center">SKU</th>
                        <th className="py-1.5 px-2 text-center">Stock</th>
                        <th className="py-1.5 px-2 text-right">Price (Incl.)</th>
                        <th className="py-1.5 px-2 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredProducts.map(prod => {
                        const inCart = cart.find(i => i.productId === prod.id);
                        const isOutOfStock = isProductOutOfStock(prod);
                        const isLow = isProductLowStock(prod, stockSettings);
                        const isDisabled = isOutOfStock && stockSettings.blockBillingOnOutOfStock;
                        const saleRates = getProductSaleRates(prod);

                        return (
                          <tr
                            key={prod.id}
                            className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                              inCart ? 'bg-indigo-50/20 dark:bg-indigo-950/30' : ''
                            }`}
                          >
                            <td className="py-1.5 px-2.5">
                              <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-[180px]">
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {prod.category} {prod.unit ? `• / ${prod.unit}` : ''}
                              </div>
                            </td>

                            <td className="py-1.5 px-2 text-center font-mono text-[10px] text-slate-700 dark:text-slate-300">
                              {prod.sku}
                            </td>

                            <td className="py-1.5 px-2 text-center">
                              {prod.isService ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                  Service
                                </span>
                              ) : isOutOfStock ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                  Out
                                </span>
                              ) : isLow ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                  {prod.currentStock} left
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                  {prod.currentStock}
                                </span>
                              )}
                            </td>

                            <td className="py-1.5 px-2 text-right">
                              <div className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                                {formatCurrency(saleRates.rateWithTax, business.currencySymbol)}
                              </div>
                              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                GST {prod.gstRate}%
                              </div>
                            </td>

                            <td className="py-1.5 px-2 text-center">
                              {inCart ? (
                                <div className="inline-flex items-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateQty(inCart.id, -1);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold transition-all cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="w-6 text-center font-mono font-extrabold text-xs text-indigo-900 dark:text-indigo-200">
                                    {inCart.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToCart(prod);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold transition-all cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => handleAddToCart(prod)}
                                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-0.5 ${
                                    isDisabled
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                      : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                                  }`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                            No products found matching "{searchQuery}"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: POS Cart & Pinned Checkout Drawer (5 cols on Tablet/Desktop, 4 cols on XL) */}
        <div className={`md:col-span-5 lg:col-span-5 xl:col-span-4 flex flex-col md:h-full min-h-0 ${mobileTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Mobile Back Button (only in mobile phone view) */}
            <div className="md:hidden flex items-center justify-between p-1.5 px-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab('products')}
                className="flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Catalog</span>
              </button>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                {totalCartItemsCount} item{totalCartItemsCount > 1 ? 's' : ''} in cart
              </span>
            </div>

            {/* Cart Header Bar */}
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Sale Cart</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearEntireCart}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                  title="Clear all items in cart"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Customer & Contacts Selection Bar - Streamlined */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 shrink-0 space-y-1 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Customer:</span>
                </div>
                {selectedPartyId ? (
                  <button
                    type="button"
                    onClick={handleClearPartySelection}
                    className="flex items-center gap-0.5 text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>Change</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    className="flex items-center gap-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    <UserCheck className="w-2.5 h-2.5" />
                    <span>Select ({parties.length})</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Contact Picker Dropdown */}
              {showPartyDropdown && (
                <div className="absolute top-full left-2 right-2 mt-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-1.5 max-h-48 overflow-y-auto space-y-1">
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-0.5">
                    Select Contact
                  </div>
                  {matchingParties.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectParty(p)}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-xs truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {p.phone || 'No phone'} {p.companyName ? `• ${p.companyName}` : ''}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded shrink-0">
                        Select
                      </span>
                    </button>
                  ))}
                  {matchingParties.length === 0 && (
                    <div className="p-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                      No matching contact
                    </div>
                  )}
                </div>
              )}

              {/* Selected Contact or Input Bar */}
              {selectedPartyId ? (
                <div className="px-2 py-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 text-xs truncate">{customerName}</span>
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono truncate">{customerPhone || 'Linked'}</span>
                  </div>
                  <span className="px-1.5 py-0.2 text-[8px] font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 rounded shrink-0">
                    CONTACT
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedPartyId(null);
                      }}
                      placeholder="Customer Name"
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setSelectedPartyId(null);
                      }}
                      placeholder="Phone (optional)"
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowExtraDetails(!showExtraDetails)}
                      className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 font-medium cursor-pointer"
                    >
                      {showExtraDetails ? '- Less' : '+ GSTIN / Email / Address'}
                    </button>
                    <label className="flex items-center gap-1 text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToContacts}
                        onChange={(e) => setSaveToContacts(e.target.checked)}
                        className="w-2.5 h-2.5 text-indigo-600 rounded border-slate-300"
                      />
                      <span>Save Contact</span>
                    </label>
                  </div>

                  {showExtraDetails && (
                    <div className="grid grid-cols-2 gap-1 pt-0.5 animate-in fade-in">
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email"
                        className="px-1.5 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value)}
                        placeholder="GSTIN"
                        className="px-1.5 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white uppercase font-mono"
                      />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Address"
                        className="col-span-2 px-1.5 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List - Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-2.5 space-y-1.5">
              {cart.map(item => {
                const isPriceEdited = item.originalPrice !== undefined && Math.abs(item.rate - item.originalPrice) > 0.01;
                return (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1 transition-all hover:border-indigo-300 dark:hover:border-indigo-500/60"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[170px]">{item.name}</span>
                          {item.isCustomItem && (
                            <span className="text-[8px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-1 py-0.2 rounded">
                              Custom
                            </span>
                          )}
                          {isPriceEdited && (
                            <span className="text-[8px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-1 py-0.2 rounded">
                              Rate Edit
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                            {formatCurrency(item.taxIncludedRate || Number((item.rate * (1 + (item.gstRate || 0) / 100)).toFixed(2)), business.currencySymbol)} (Incl.)
                          </span>
                          <span>•</span>
                          <span>GST {item.gstRate}%</span>
                        </div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{item.description}</span>
                          </div>
                        )}
                      </div>

                      {/* Total Amount */}
                      <div className="text-right shrink-0">
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-xs sm:text-sm">
                          {formatCurrency(item.totalAmount, business.currencySymbol)}
                        </div>
                      </div>
                    </div>

                    {/* Stepper & Action Controls in 1 compact row */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/60 gap-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 font-semibold rounded border border-slate-200 dark:border-slate-700 flex items-center gap-0.5 cursor-pointer text-[9px]"
                          title="Edit Rate / Amount"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                          <span>Rate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-semibold rounded border border-slate-200 dark:border-slate-700 flex items-center gap-0.5 cursor-pointer text-[9px]"
                          title="Edit Description"
                        >
                          <AlignLeft className="w-2.5 h-2.5 text-slate-500" />
                          <span>Desc</span>
                        </button>

                        {isPriceEdited && item.originalPrice !== undefined && (
                          <button
                            type="button"
                            onClick={() => handleResetItemPrice(item.id)}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="Reset to original price"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* Stepper + Remove */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-5 h-5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleDirectQtyChange(item.id, parseFloat(e.target.value))}
                          className="w-8 text-center font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded py-0.5 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-5 h-5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  Cart is empty. Tap products from catalog to add.
                </div>
              )}
            </div>

            {/* Pinned Checkout Drawer Footer - Always visible without scrolling */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/95 p-2 sm:p-2.5 space-y-1.5 backdrop-blur-xs">
              {/* Totals Summary */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Taxable: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(totals.subTotalTaxable, business.currencySymbol)}</strong></span>
                  <span>•</span>
                  <span>GST: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(totals.totalTax, business.currencySymbol)}</strong></span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-sm sm:text-base text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(totals.grandTotal, business.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Settlement Type & Quick Split */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Settlement</span>
                  <button
                    type="button"
                    onClick={() => setShowSettlementModal(true)}
                    className="text-indigo-600 dark:text-indigo-300 hover:underline font-bold cursor-pointer"
                  >
                    ⚡ Calculator
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('FULL');
                      setPartialAmount(totals.grandTotal);
                    }}
                    className={`py-1 px-1 rounded-md transition-all cursor-pointer ${
                      settlementType === 'FULL'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Full (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('PARTIAL');
                      if (partialAmount <= 0 || partialAmount >= totals.grandTotal) {
                        setPartialAmount(Math.round(totals.grandTotal / 2));
                      }
                    }}
                    className={`py-1 px-1 rounded-md transition-all cursor-pointer ${
                      settlementType === 'PARTIAL'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Partial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('CREDIT');
                      setPartialAmount(0);
                    }}
                    className={`py-1 px-1 rounded-md transition-all cursor-pointer ${
                      settlementType === 'CREDIT'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Credit (0%)
                  </button>
                </div>

                {/* Partial Settlement Inline Box */}
                {settlementType === 'PARTIAL' && (
                  <div className="p-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 text-[11px] flex items-center justify-between gap-1">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">Paid:</span>
                    <input
                      type="number"
                      min="0"
                      max={totals.grandTotal}
                      value={partialAmount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPartialAmount(Math.min(totals.grandTotal, Math.max(0, val)));
                      }}
                      className="w-20 px-1.5 py-0.5 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 rounded text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono font-bold">
                      Due: {formatCurrency(Math.max(0, totals.grandTotal - partialAmount), business.currencySymbol)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Method Pills */}
              <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                {(['CASH', 'UPI', 'CREDIT_CARD'] as PaymentMethod[]).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1 px-1.5 rounded-md transition-all cursor-pointer text-center ${
                      paymentMethod === method
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {method === 'CASH' ? '💵 Cash' : method === 'UPI' ? '⚡ UPI QR' : '💳 Card'}
                  </button>
                ))}
              </div>

              {/* Cash tender & change inline if Cash selected */}
              {paymentMethod === 'CASH' && settlementType !== 'CREDIT' && (
                <div className="flex items-center justify-between p-1 px-2 rounded-md bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 text-[11px]">
                  <span className="text-amber-900 dark:text-amber-200 font-medium">Tendered:</span>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                    placeholder={String(settlementType === 'PARTIAL' ? partialAmount : totals.grandTotal)}
                    className="w-18 px-1.5 py-0.5 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 rounded text-slate-900 dark:text-white text-xs"
                  />
                  {cashTendered > (settlementType === 'PARTIAL' ? partialAmount : totals.grandTotal) && (
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[10px]">
                      Change: {formatCurrency(cashTendered - (settlementType === 'PARTIAL' ? partialAmount : totals.grandTotal), business.currencySymbol)}
                    </span>
                  )}
                </div>
              )}

              {/* Checkout CTA Button */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0}
                className="w-full py-2 sm:py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {posSettings.autoPrintReceipt ? (
                  <Printer className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300" />
                )}
                <span className="truncate">
                  {posSettings.autoPrintReceipt ? 'Complete Sale & Print' : 'Complete Fast Sale'} (
                  {formatCurrency(
                    settlementType === 'FULL' ? totals.grandTotal : (settlementType === 'CREDIT' ? 0 : partialAmount),
                    business.currencySymbol
                  )}
                  )
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Cart Button for Mobile Phones (< md) */}
      {mobileTab === 'products' && totalCartItemsCount > 0 && (
        <div className="md:hidden fixed bottom-14 left-2.5 right-2.5 z-30 animate-in slide-in-from-bottom-2 duration-150">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full p-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl shadow-xl border border-emerald-400/40 flex items-center justify-between transition-all active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-bold truncate">
                  {totalCartItemsCount} Item{totalCartItemsCount > 1 ? 's' : ''} in Cart
                </div>
                <div className="text-[10px] text-emerald-100 font-mono">
                  Total: <span className="font-bold text-white text-xs">{formatCurrency(totals.grandTotal, business.currencySymbol)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white text-emerald-800 px-2.5 py-1.5 rounded-lg font-bold text-xs shadow-2xs shrink-0">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* CUSTOM SETTLEMENT MODAL POPUP */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] sm:max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto">
            <div className="p-3.5 sm:p-4 bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold shrink-0">
                  ⚡
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm truncate">POS Custom Settlement</h3>
                  <p className="text-[10px] sm:text-[11px] text-indigo-100 truncate">Pay partial, split amount, or book to customer ledger credit</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto modal-content-scroll flex-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Customer:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{customerName || 'Retail Customer'}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total Bill:</span>
                  <div className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-base">
                    {formatCurrency(totals.grandTotal, business.currencySymbol)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Settlement Mode:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('FULL');
                      setPartialAmount(totals.grandTotal);
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      settlementType === 'FULL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    100% Full Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('PARTIAL');
                      if (partialAmount <= 0 || partialAmount >= totals.grandTotal) {
                        setPartialAmount(Math.round(totals.grandTotal / 2));
                      }
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      settlementType === 'PARTIAL'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Custom Partial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('CREDIT');
                      setPartialAmount(0);
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      settlementType === 'CREDIT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    0% Credit Sale
                  </button>
                </div>
              </div>

              {settlementType === 'PARTIAL' && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
                  <div>
                    <label className="block font-bold text-amber-900 dark:text-amber-200 mb-1">Enter Custom Amount to Pay Now:</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        max={totals.grandTotal}
                        value={partialAmount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPartialAmount(Math.min(totals.grandTotal, Math.max(0, val)));
                        }}
                        className="w-full pl-7 pr-3 py-2 text-base font-mono font-bold bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {[0.25, 0.5, 0.75].map((ratio) => {
                      const amt = Math.round(totals.grandTotal * ratio);
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setPartialAmount(amt)}
                          className="flex-1 py-1.5 rounded-lg font-bold bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs cursor-pointer"
                        >
                          {ratio * 100}% ({business.currencySymbol}{amt})
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800/80 flex items-center justify-between font-bold">
                    <span className="text-slate-600 dark:text-slate-300">Pending Balance Added to Credit Ledger:</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(Math.max(0, totals.grandTotal - partialAmount), business.currencySymbol)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method for Settle Amount:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">⚡ UPI / QR Code</option>
                  <option value="CREDIT_CARD">💳 Credit / Debit Card</option>
                  <option value="BANK_TRANSFER">🏛️ Bank Transfer / NEFT</option>
                  <option value="CHEQUE">📝 Cheque</option>
                </select>
              </div>

              {/* Quick-Access Auto-Print Toggle inside Settlement Modal */}
              <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Printer className={`w-3.5 h-3.5 ${posSettings.autoPrintReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Auto-print receipt upon completion
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${posSettings.autoPrintReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {posSettings.autoPrintReceipt ? 'ON' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAutoPrint}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      posSettings.autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={posSettings.autoPrintReceipt}
                    title="Toggle automatic receipt printing"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        posSettings.autoPrintReceipt ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel / Return
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettlementModal(false);
                    handleCompleteSale();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {posSettings.autoPrintReceipt ? (
                    <>
                      <Printer className="w-3.5 h-3.5" />
                      <span>Confirm & Print</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Confirm Fast Sale</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOM SALE AMOUNT & PRICING MODAL */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] sm:max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto">
            <div className="p-3.5 sm:p-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm truncate">Custom Sale Amount & Pricing</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">Adjust selling rate, inclusive total, or item discount</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCartItem(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto modal-content-scroll flex-1">
              {/* Product Info Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{editingCartItem.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    HSN: {editingCartItem.hsnCode || 'N/A'} • Unit: {editingCartItem.unit}
                  </div>
                </div>
                {editingCartItem.originalPrice !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Catalog MRP:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {formatCurrency(editingCartItem.originalPrice, business.currencySymbol)}
                    </span>
                  </div>
                )}
              </div>

              {/* Price Entry Mode Toggle */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">How would you like to enter price?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPriceMode('EXCLUSIVE');
                    }}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      editPriceMode === 'EXCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Base Unit Rate</div>
                      <div className="text-[9px] opacity-75">Excl. of Tax</div>
                    </div>
                    {editPriceMode === 'EXCLUSIVE' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPriceMode('RATE_INCLUSIVE');
                      const rWithTax = calculateRateWithTax(editUnitRate, editGstRate, 0);
                      setEditRateWithTax(rWithTax);
                    }}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      editPriceMode === 'RATE_INCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Sale Rate (Incl. Tax)</div>
                      <div className="text-[9px] opacity-75">Unit Rate + GST</div>
                    </div>
                    {editPriceMode === 'RATE_INCLUSIVE' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPriceMode('INCLUSIVE');
                      const calcs = calculateItemGst(editUnitRate, editQuantity, editDiscountPercent, editGstRate, false);
                      setEditTotalAmount(calcs.totalAmount);
                    }}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      editPriceMode === 'INCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Total Amount</div>
                      <div className="text-[9px] opacity-75">All Taxes Included</div>
                    </div>
                    {editPriceMode === 'INCLUSIVE' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Amount and Quantity Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {editPriceMode === 'EXCLUSIVE' ? (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Unit Rate (₹ Excl.):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editUnitRate || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditUnitRate(val);
                          setEditRateWithTax(calculateRateWithTax(val, editGstRate, 0));
                        }}
                        className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Incl. Tax: {formatCurrency(calculateRateWithTax(editUnitRate, editGstRate, 0), business.currencySymbol)}
                    </div>
                  </div>
                ) : editPriceMode === 'RATE_INCLUSIVE' ? (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sale Rate (₹ Incl. Tax):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editRateWithTax || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditRateWithTax(val);
                          setEditUnitRate(calculateBaseRateFromRateWithTax(val, editGstRate, 0));
                        }}
                        className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 dark:text-indigo-400"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Base Rate: {formatCurrency(calculateBaseRateFromRateWithTax(editRateWithTax, editGstRate, 0), business.currencySymbol)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Final Line Total (₹ Incl.):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editTotalAmount || ''}
                        onChange={(e) => setEditTotalAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 dark:text-indigo-400"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity ({editingCartItem.unit}):</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editQuantity || ''}
                    onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Discount & GST Rate selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Item Discount (%):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editDiscountPercent || ''}
                      onChange={(e) => setEditDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                    <div className="flex gap-1">
                      {[5, 10].map(disc => (
                        <button
                          key={disc}
                          type="button"
                          onClick={() => setEditDiscountPercent(disc)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          {disc}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GST Tax Rate:</label>
                  <select
                    value={editGstRate}
                    onChange={(e) => setEditGstRate(Number(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
              </div>

              {/* 5-Line Item Description / Serial No. / Warranty Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Item Description (5 Lines):
                  </label>
                  <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {editDescription ? editDescription.split('\n').length : 0}/5 Lines
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={"Line 1: Item specifications / Model details\nLine 2: S/N: \nLine 3: Warranty: (e.g. 1 Year Standard Warranty)\nLine 4: Batch / IMEI / Color / Size\nLine 5: Special remarks or service instructions"}
                  className="w-full px-3 py-2 text-xs font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y min-h-[95px]"
                />

                {/* Quick Helper Tag Chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Quick insert:</span>
                  {[
                    { label: '+ S/N:', text: 'S/N: ' },
                    { label: '+ IMEI:', text: 'IMEI: ' },
                    { label: '+ 1 Yr Warranty', text: 'Warranty: 1 Year Limited' },
                    { label: '+ Free Service', text: 'Includes 1 Free Periodic Service' },
                    { label: '+ Tested OK', text: 'QC Tested & Verified OK' },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setEditDescription(prev => {
                          const trimmed = prev.trimEnd();
                          return trimmed ? `${trimmed}\n${chip.text}` : chip.text;
                        });
                      }}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md border border-slate-200 dark:border-slate-700 transition-colors font-medium cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Calculation Preview Box */}
              {(() => {
                let previewRate = editUnitRate;
                const qty = Math.max(0.01, editQuantity);
                const disc = Math.max(0, Math.min(100, editDiscountPercent));
                const gst = editGstRate;

                if (editPriceMode === 'RATE_INCLUSIVE') {
                  previewRate = calculateBaseRateFromRateWithTax(editRateWithTax, gst, 0);
                } else if (editPriceMode === 'INCLUSIVE') {
                  const discountFactor = (1 - disc / 100);
                  const taxFactor = (1 + gst / 100);
                  if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
                    previewRate = Number((editTotalAmount / (qty * discountFactor * taxFactor)).toFixed(2));
                  }
                }

                const preview = calculateItemGst(previewRate, qty, disc, gst, false);
                const itemTaxTotal = preview.cgstAmount + preview.sgstAmount + preview.igstAmount + (preview.cessAmount || 0);
                const unitRateWithTax = calculateRateWithTax(previewRate, gst, 0);

                return (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between pb-1 border-b border-indigo-200/60 dark:border-indigo-800/80">
                      <span>Calculated Line Item Breakdown</span>
                      <div className="text-right font-mono">
                        <span className="text-indigo-700 dark:text-indigo-400 font-bold">Sale Rate (Incl. Tax): {formatCurrency(unitRateWithTax, business.currencySymbol)}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">Base: {formatCurrency(previewRate, business.currencySymbol)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 pt-0.5">
                      <span>Taxable Value ({qty} {editingCartItem.unit}):</span>
                      <span className="font-mono font-semibold">{formatCurrency(preview.taxableAmount, business.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>GST ({gst}% Intra-state CGST+SGST):</span>
                      <span className="font-mono font-semibold">{formatCurrency(itemTaxTotal, business.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 dark:text-white font-extrabold pt-1 border-t border-indigo-200 dark:border-indigo-800/80 text-sm">
                      <span>Final Net Line Total:</span>
                      <span className="font-mono text-indigo-700 dark:text-indigo-400">{formatCurrency(preview.totalAmount, business.currencySymbol)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                {editingCartItem.originalPrice !== undefined ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditPriceMode('EXCLUSIVE');
                      setEditUnitRate(editingCartItem.originalPrice || 0);
                      setEditDiscountPercent(0);
                    }}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to MRP</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCartItem(null)}
                    className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItemEdit}
                    className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply Custom Amount</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD BRAND-NEW CUSTOM / OPEN SALE ITEM MODAL */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[96vw] sm:max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto">
            <div className="p-3.5 sm:p-4 bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm truncate">Add Custom Sale Item / Service</h3>
                  <p className="text-[10px] sm:text-[11px] text-indigo-100 truncate">Bill any ad-hoc product, labor, repair or custom charge</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomItemModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto modal-content-scroll flex-1">
              {/* Item Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Item / Service Name *</label>
                <input
                  type="text"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="e.g. Computer Repair Service, Custom Fitting, Delivery Fee"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Price Entry Mode */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Sale Amount Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomItemPriceMode('EXCLUSIVE')}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      customItemPriceMode === 'EXCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Base Rate</div>
                      <div className="text-[9px] opacity-75">Excl. of Tax</div>
                    </div>
                    {customItemPriceMode === 'EXCLUSIVE' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomItemPriceMode('RATE_INCLUSIVE')}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      customItemPriceMode === 'RATE_INCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Sale Rate (Incl. Tax)</div>
                      <div className="text-[9px] opacity-75">Unit Rate + GST</div>
                    </div>
                    {customItemPriceMode === 'RATE_INCLUSIVE' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomItemPriceMode('INCLUSIVE')}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      customItemPriceMode === 'INCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Flat Total</div>
                      <div className="text-[9px] opacity-75">All Taxes Included</div>
                    </div>
                    {customItemPriceMode === 'INCLUSIVE' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Price & Quantity & Unit */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {customItemPriceMode === 'EXCLUSIVE' ? 'Base Rate (₹):' : customItemPriceMode === 'RATE_INCLUSIVE' ? 'Rate (₹ Incl.):' : 'Total Price (₹):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={customItemPrice || ''}
                      onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-6 pr-2 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity:</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={customItemQty || ''}
                    onChange={(e) => setCustomItemQty(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit:</label>
                  <select
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    className="w-full px-2 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Nos">Nos</option>
                    <option value="Set">Set</option>
                    <option value="Kg">Kg</option>
                    <option value="Box">Box</option>
                    <option value="Mtr">Mtr</option>
                    <option value="Hr">Hr (Service)</option>
                  </select>
                </div>
              </div>

              {/* GST Rate & HSN Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GST Tax Rate:</label>
                  <select
                    value={customItemGstRate}
                    onChange={(e) => setCustomItemGstRate(Number(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">HSN / SAC Code:</label>
                  <input
                    type="text"
                    value={customItemHsn}
                    onChange={(e) => setCustomItemHsn(e.target.value)}
                    placeholder="9987"
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* 5-Line Custom Item Description / Scope of Work */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Item Description (5 Lines):
                  </label>
                  <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {customItemNotes ? customItemNotes.split('\n').length : 0}/5 Lines
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={customItemNotes}
                  onChange={(e) => setCustomItemNotes(e.target.value)}
                  placeholder={"Line 1: Service details / scope of work\nLine 2: Parts / materials used\nLine 3: Serial / Asset / Tracking ID\nLine 4: Warranty / service guarantee terms\nLine 5: Additional technician notes"}
                  className="w-full px-3 py-2 text-xs font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y min-h-[95px]"
                />

                {/* Quick Helper Tag Chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Quick insert:</span>
                  {[
                    { label: '+ Labor / Repair', text: 'Scope: Inspection, Service & Testing' },
                    { label: '+ 90-Day Guarantee', text: 'Service Warranty: 90 Days' },
                    { label: '+ S/N:', text: 'S/N: ' },
                    { label: '+ Included Parts', text: 'Parts: Standard replacement consumables' },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setCustomItemNotes(prev => {
                          const trimmed = prev.trimEnd();
                          return trimmed ? `${trimmed}\n${chip.text}` : chip.text;
                        });
                      }}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md border border-slate-200 dark:border-slate-700 transition-colors font-medium cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time preview */}
              {(() => {
                let previewRate = customItemPrice;
                const qty = Math.max(0.01, customItemQty);
                const disc = Math.max(0, Math.min(100, customItemDiscount));
                const gst = customItemGstRate;

                if (customItemPriceMode === 'INCLUSIVE') {
                  const discountFactor = (1 - disc / 100);
                  const taxFactor = (1 + gst / 100);
                  if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
                    previewRate = Number((customItemPrice / (qty * discountFactor * taxFactor)).toFixed(2));
                  }
                }

                const preview = calculateItemGst(previewRate, qty, disc, gst, false);
                const itemTaxTotal = preview.cgstAmount + preview.sgstAmount + preview.igstAmount + (preview.cessAmount || 0);

                return (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Taxable Value:</span>
                      <span className="font-mono font-semibold">{formatCurrency(preview.taxableAmount, business.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>GST ({gst}%):</span>
                      <span className="font-mono font-semibold">{formatCurrency(itemTaxTotal, business.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 dark:text-white font-extrabold pt-1 border-t border-indigo-200 dark:border-indigo-800/80 text-sm">
                      <span>Total Amount Added:</span>
                      <span className="font-mono text-indigo-700 dark:text-indigo-400">{formatCurrency(preview.totalAmount, business.currencySymbol)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomSaleItem}
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add to Sale Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK-ACCESS POS TERMINAL SETTINGS MODAL */}
      {showPosSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Printer className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">POS Terminal Settings</h3>
                  <p className="text-[11px] text-slate-300">Configure receipt printing and checkout workflow</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPosSettingsModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* FEATURE FOCUS: Automatic Receipt Printing Toggle */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                          Auto-Print Receipts on Sale Completion
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          posSettings.autoPrintReceipt 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {posSettings.autoPrintReceipt ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        When enabled, completing a sale automatically triggers the receipt print dialog. When disabled, sales finalize immediately without printer dialogs for maximum queue throughput.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoPrint}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      posSettings.autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={posSettings.autoPrintReceipt}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        posSettings.autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Current Mode:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {posSettings.autoPrintReceipt ? 'Standard Receipt Printing' : 'Express Rapid Checkout'}
                  </span>
                </div>
              </div>

              {/* Receipt Paper Size Selector */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Thermal Receipt Format:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '80mm', label: '80mm Thermal', desc: 'Standard POS' },
                    { id: '58mm', label: '58mm Mini', desc: 'Compact' },
                    { id: 'A4', label: 'A4 Standard', desc: 'Full Page' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => {
                        updateBusiness({
                          ...business,
                          posSettings: {
                            ...posSettings,
                            receiptPaperSize: size.id as '80mm' | '58mm' | 'A4'
                          }
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        posSettings.receiptPaperSize === size.id
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-bold">{size.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{size.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fast Checkout & Sound Toggles */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Express Checkout Bar</div>
                      <div className="text-[10px] text-slate-500">Show single-click settlement buttons on the billing screen</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateBusiness({
                        ...business,
                        posSettings: {
                          ...posSettings,
                          fastCheckoutMode: !posSettings.fastCheckoutMode
                        }
                      });
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      posSettings.fastCheckoutMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        posSettings.fastCheckoutMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {posSettings.soundEffects ? (
                      <Volume2 className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Terminal Sound Effects</div>
                      <div className="text-[10px] text-slate-500">Play confirmation tone when items or barcode scans are detected</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateBusiness({
                        ...business,
                        posSettings: {
                          ...posSettings,
                          soundEffects: !posSettings.soundEffects
                        }
                      });
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      posSettings.soundEffects ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        posSettings.soundEffects ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPosSettingsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAST SALE COMPLETED NOTIFICATION MODAL (When Auto-Print is Disabled) */}
      {showFastSaleCompletedModal && lastCompletedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in modal-overlay">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Sale Finalized!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invoice <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{lastCompletedInvoice.invoiceNumber}</span> recorded.
              </p>
              <div className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 pt-1">
                {formatCurrency(lastCompletedInvoice.amountPaid, business.currencySymbol)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              ⚡ Auto-print is disabled for fast queue flow. Click below if this customer requested a printed receipt.
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowFastSaleCompletedModal(false);
                  setSelectedInvoiceIdForPrint(lastCompletedInvoice.id);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt Now</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFastSaleCompletedModal(false)}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                Next Customer (Ready)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
