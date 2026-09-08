import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PaymentMethod, InvoiceItem, Party, InvoiceStatus, GstTaxRate } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateItemGst, recalculateInvoiceTotals } from '../../utils/gstCalculations';
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
  Package
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
    createInvoice, 
    createParty, 
    getNextSequentialInvoiceNumber,
    setSelectedInvoiceIdForPrint, 
    showToast 
  } = useApp();

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
  const [editPriceMode, setEditPriceMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [editUnitRate, setEditUnitRate] = useState<number>(0);
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
  const [customItemPriceMode, setCustomItemPriceMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
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
        const calcs = calculateItemGst(product.sellingPrice, 1, 0, product.gstRate, false);
        const newItem: CartItem = {
          id: 'pos-' + Date.now() + Math.random().toString(36).substring(2, 7),
          productId: product.id,
          name: product.name,
          hsnCode: product.hsnCode,
          unit: product.unit,
          maxStock: product.currentStock,
          originalPrice: product.sellingPrice,
          isCustomItem: false,
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

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId && i.productId !== itemId));
  };

  // Open Edit Item Sale Price Modal
  const handleOpenEditItem = (item: CartItem) => {
    setEditingCartItem(item);
    setEditPriceMode('EXCLUSIVE');
    setEditUnitRate(item.rate);
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

    if (editPriceMode === 'INCLUSIVE') {
      // Back calculate base unit rate from inclusive gross total
      // total = rate * qty * (1 - disc/100) * (1 + gst/100)
      const discountFactor = (1 - disc / 100);
      const taxFactor = (1 + gst / 100);
      if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
        computedRate = Number((editTotalAmount / (qty * discountFactor * taxFactor)).toFixed(2));
      }
    }

    const calcs = calculateItemGst(computedRate, qty, disc, gst, false);

    setCart(prev => prev.map(item => {
      if (item.id === editingCartItem.id) {
        return {
          ...item,
          rate: computedRate,
          gstRate: gst,
          discountPercent: disc,
          description: editDescription.trim() || undefined,
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

    if (customItemPriceMode === 'INCLUSIVE') {
      const discountFactor = (1 - disc / 100);
      const taxFactor = (1 + gst / 100);
      if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
        computedRate = Number((customItemPrice / (qty * discountFactor * taxFactor)).toFixed(2));
      }
    }

    const calcs = calculateItemGst(computedRate, qty, disc, gst, false);

    const customCartItem: CartItem = {
      id: 'custom-' + Date.now() + Math.random().toString(36).substring(2, 7),
      name: customItemName.trim(),
      hsnCode: customItemHsn.trim() || '9987',
      unit: customItemUnit.trim() || 'Pcs',
      maxStock: 99999,
      originalPrice: computedRate,
      isCustomItem: true,
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
    setSelectedInvoiceIdForPrint(invoice.id);
  };

  const currentNextInfo = getNextSequentialInvoiceNumber();
  const totalCartItemsCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>POS Counter Quick Billing</span>
            <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
              Live Terminal
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Fast barcode lookup, tap-to-add POS cart and thermal receipt printer</p>
        </div>

        {/* Unified Continuous Series Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-2 shadow-2xs">
            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase">
              Next Invoice No:
            </span>
            <span className="font-mono font-bold text-xs text-indigo-950 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-700/80">
              {currentNextInfo.invoiceNumber}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
              Unified Serial Rule
            </span>
          </div>
        </div>
      </div>

      {/* Switchable Segmented Button: Product vs Cart (Optimized for Mobile & Tablet Devices) */}
      <div className="lg:hidden sticky top-2 z-20 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-700/80 transition-all">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/90 rounded-xl">
          {/* Products Tab Button */}
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'products'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Products</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              mobileTab === 'products' ? 'bg-indigo-700/90 text-white' : 'bg-slate-700 text-slate-300'
            }`}>
              {filteredProducts.length}
            </span>
          </button>

          {/* Cart Tab Button */}
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              mobileTab === 'cart'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>Cart</span>
            {totalCartItemsCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                mobileTab === 'cart' ? 'bg-emerald-700 text-white' : 'bg-emerald-500 text-white animate-pulse'
              }`}>
                {totalCartItemsCount}
              </span>
            )}
            {totals.grandTotal > 0 && (
              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded ${
                mobileTab === 'cart' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-700 text-emerald-400'
              }`}>
                {formatCurrency(totals.grandTotal, business.currencySymbol)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Product Grid & Quick Search (7 cols on Desktop, Switchable on Mobile/Tablet) */}
        <div className={`lg:col-span-7 space-y-3.5 ${mobileTab === 'products' ? 'block' : 'hidden lg:block'}`}>
          {/* Search & Category Filter */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan barcode or type product name, SKU..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCustomItemModal(true)}
                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Add ad-hoc custom item / service with custom rate & GST"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>+ Custom Sale Item</span>
              </button>
            </div>

            {/* Category chips and View Mode switcher */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* View Switcher & Count */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {filteredProducts.length} items
                </span>
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setItemViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      itemViewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title="Grid View (Cards)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemViewMode('list')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      itemViewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    title="List View (Table / Rows)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Items: Grid or List View */}
          {itemViewMode === 'grid' ? (
            /* Product Cards Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredProducts.map(prod => {
                const inCart = cart.find(i => i.productId === prod.id);
                const isOutOfStock = isProductOutOfStock(prod);
                const isCritical = isProductCriticalStock(prod, stockSettings);
                const isLow = isProductLowStock(prod, stockSettings);
                const isDisabled = isOutOfStock && stockSettings.blockBillingOnOutOfStock;

                return (
                  <button
                    key={prod.id}
                    disabled={isDisabled}
                    onClick={() => handleAddToCart(prod)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer ${
                      isDisabled
                        ? 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                        : isOutOfStock
                        ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700'
                        : isLow
                        ? 'bg-amber-50/30 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md active:scale-95'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[80px]">
                          {prod.sku}
                        </span>
                        <div className="flex items-center gap-1">
                          {isOutOfStock && (
                            <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 px-1.5 py-0.5 rounded">
                              Out of Stock
                            </span>
                          )}
                          {isLow && !isOutOfStock && (
                            <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Low
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 px-1.5 py-0.5 rounded">
                            GST {prod.gstRate}%
                          </span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 leading-snug">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                          {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                        </div>
                        <div className={`text-[10px] font-medium ${
                          isOutOfStock ? 'text-rose-600 dark:text-rose-400 font-bold' : isLow ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {prod.isService ? 'Service' : `${prod.currentStock} in stock`}
                        </div>
                      </div>

                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                        inCart ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300'
                      }`}>
                        {inCart ? (
                          <span className="text-xs">{inCart.quantity}</span>
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                  No products found matching "{searchQuery}"
                </div>
              )}
            </div>
          ) : (
            /* Product Table / List View */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden max-h-[600px] flex flex-col">
              <div className="overflow-x-auto flex-1 no-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Product Name & Category</th>
                      <th className="py-2.5 px-2 text-center">SKU / HSN</th>
                      <th className="py-2.5 px-2 text-center">Stock</th>
                      <th className="py-2.5 px-2 text-right">Price & GST</th>
                      <th className="py-2.5 px-3 text-center w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProducts.map(prod => {
                      const inCart = cart.find(i => i.productId === prod.id);
                      const isOutOfStock = isProductOutOfStock(prod);
                      const isLow = isProductLowStock(prod, stockSettings);
                      const isDisabled = isOutOfStock && stockSettings.blockBillingOnOutOfStock;

                      return (
                        <tr
                          key={prod.id}
                          className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                            inCart ? 'bg-indigo-50/20 dark:bg-indigo-950/30' : ''
                          }`}
                        >
                          {/* Product Details */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {prod.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {prod.category}
                              </span>
                              {prod.unit && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  / {prod.unit}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* SKU & HSN */}
                          <td className="py-2.5 px-2 text-center font-mono">
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{prod.sku}</div>
                            {prod.hsnCode && (
                              <div className="text-[9px] text-slate-400 dark:text-slate-500">HSN: {prod.hsnCode}</div>
                            )}
                          </td>

                          {/* Stock Status */}
                          <td className="py-2.5 px-2 text-center">
                            {prod.isService ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                Service
                              </span>
                            ) : isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {prod.currentStock} left
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {prod.currentStock} in stock
                              </span>
                            )}
                          </td>

                          {/* Price & GST */}
                          <td className="py-2.5 px-2 text-right">
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                            </div>
                            <div className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
                              GST {prod.gstRate}%
                            </div>
                          </td>

                          {/* Action Button / In-Cart Stepper */}
                          <td className="py-2.5 px-3 text-center">
                            {inCart ? (
                              <div className="inline-flex items-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateQty(inCart.id, -1);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold transition-all cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center font-mono font-extrabold text-xs text-indigo-900 dark:text-indigo-200">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(prod);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold transition-all cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleAddToCart(prod)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                  isDisabled
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white dark:hover:text-white border border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 shadow-2xs'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                          No products found matching "{searchQuery}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Floating Sticky Quick Cart Switcher on Mobile & Tablet */}
          {totalCartItemsCount > 0 && (
            <div className="lg:hidden sticky bottom-3 z-30 pt-2 animate-in slide-in-from-bottom-3 duration-200">
              <button
                type="button"
                onClick={() => {
                  setMobileTab('cart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl shadow-xl border border-emerald-400/30 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm text-white">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>{totalCartItemsCount} Item{totalCartItemsCount > 1 ? 's' : ''} in Cart</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    </div>
                    <div className="text-[11px] text-emerald-100 font-mono">
                      Total: <span className="font-bold text-white text-xs">{formatCurrency(totals.grandTotal, business.currencySymbol)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white text-emerald-800 px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-sm">
                  <span>View Cart & Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Right: POS Cart & Checkout Drawer (5 cols on Desktop, Switchable on Mobile/Tablet) */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
          {/* Mobile & Tablet Back to Products Navigation */}
          <div className="lg:hidden flex items-center justify-between pb-0.5">
            <button
              type="button"
              onClick={() => {
                setMobileTab('products');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Back to Products Catalog</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
              {totalCartItemsCount} item{totalCartItemsCount > 1 ? 's' : ''} in cart
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">Current Sale Cart</h2>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                {cart.reduce((s, i) => s + i.quantity, 0)} Items
              </span>
            </div>

            {/* Customer & Contacts Selection Bar */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Customer / Contacts</span>
                </div>
                {selectedPartyId ? (
                  <button
                    type="button"
                    onClick={handleClearPartySelection}
                    className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Select Contact ({parties.length})</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Contact Picker Dropdown */}
              {showPartyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-2 max-h-56 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                    Select Existing Customer / Contact
                  </div>
                  {matchingParties.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectParty(p)}
                      className="w-full text-left p-2 rounded-lg hover:bg-indigo-50/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{p.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {p.phone || 'No phone'} {p.companyName ? `• ${p.companyName}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                        Select
                      </span>
                    </button>
                  ))}
                  {matchingParties.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
                      No matching contact found
                    </div>
                  )}
                </div>
              )}

              {/* Selected Contact Banner */}
              {selectedPartyId ? (
                <div className="p-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-indigo-950 dark:text-indigo-200">{customerName}</div>
                      <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono">{customerPhone || 'Linked from Contacts'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-full">
                    LINKED CONTACT
                  </span>
                </div>
              ) : (
                /* Customer Name & Phone Inputs */
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedPartyId(null);
                      }}
                      placeholder="Customer Name"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setSelectedPartyId(null);
                      }}
                      placeholder="Phone (e.g. 9876543210)"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Toggle Extra Fields */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowExtraDetails(!showExtraDetails)}
                      className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {showExtraDetails ? '- Hide details' : '+ Add Email / GSTIN / Address'}
                    </button>

                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToContacts}
                        onChange={(e) => setSaveToContacts(e.target.checked)}
                        className="w-3 h-3 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                      />
                      <span>Save to Contacts</span>
                    </label>
                  </div>

                  {showExtraDetails && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email Address"
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value)}
                        placeholder="Customer GSTIN"
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none uppercase font-mono"
                      />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Address / Locality"
                        className="col-span-2 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {cart.map(item => {
                const isPriceEdited = item.originalPrice !== undefined && Math.abs(item.rate - item.originalPrice) > 0.01;
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-xs space-y-1.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</span>
                          {item.isCustomItem && (
                            <span className="text-[9px] font-bold bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded">
                              Custom Item
                            </span>
                          )}
                          {isPriceEdited && (
                            <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" /> Custom Rate
                            </span>
                          )}
                          {item.discountPercent > 0 && (
                            <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                              {item.discountPercent}% Off
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>HSN: {item.hsnCode || 'N/A'}</span>
                          <span>•</span>
                          <span>GST {item.gstRate}%</span>
                          {isPriceEdited && item.originalPrice !== undefined && (
                            <>
                              <span>•</span>
                              <span className="line-through text-slate-400 dark:text-slate-500">
                                MRP {formatCurrency(item.originalPrice, business.currencySymbol)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* 5-Line Multi-line Item Description Preview in Cart */}
                        {item.description && (
                          <div className="mt-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-[10.5px] text-slate-700 dark:text-slate-300 font-sans whitespace-pre-line leading-relaxed flex items-start gap-1.5">
                            <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                            <span className="flex-1 line-clamp-5">{item.description}</span>
                          </div>
                        )}
                      </div>

                      {/* Line Item Total Amount */}
                      <div className="text-right shrink-0">
                        <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                          {formatCurrency(item.totalAmount, business.currencySymbol)}
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                          Taxable: {formatCurrency(item.taxableAmount, business.currencySymbol)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Controls Bar: Custom Sale Amount button + 5-Line Desc button + Qty direct input + Trash */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/80 gap-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white font-bold text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit Custom Sale Price / Total Amount / Discount"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>₹{item.rate}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className={`px-2 py-1 font-bold text-[10px] rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                            item.description
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                          title="Edit 5-Line Item Description / Serial Number / Remarks"
                        >
                          <AlignLeft className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>{item.description ? '5-Line Desc' : '+ Desc'}</span>
                        </button>

                        {isPriceEdited && item.originalPrice !== undefined && (
                          <button
                            type="button"
                            onClick={() => handleResetItemPrice(item.id)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Reset to original product price"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Direct Quantity Input & Minus/Plus */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleDirectQtyChange(item.id, parseFloat(e.target.value))}
                          className="w-10 text-center font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-md py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  Cart is empty. Tap products or click <strong>+ Custom Sale Item</strong> to add.
                </div>
              )}
            </div>

            {/* Payment & Tender Calculator */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Taxable:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(totals.subTotalTaxable, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>GST (CGST+SGST):</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(totals.totalTax, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Payable:</span>
                  <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(totals.grandTotal, business.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Settlement Mode Selector & Button */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Settlement Type
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSettlementModal(true)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer flex items-center gap-1"
                  >
                    <span>⚡ Settlement Calculator</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementType('FULL');
                      setPartialAmount(totals.grandTotal);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      settlementType === 'FULL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      settlementType === 'PARTIAL'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      settlementType === 'CREDIT'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Credit (0%)
                  </button>
                </div>

                {/* Partial Settlement Inline Box */}
                {settlementType === 'PARTIAL' && (
                  <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/80 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900 dark:text-amber-200 text-[11px]">Partial Amount:</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-xs">{business.currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          max={totals.grandTotal}
                          value={partialAmount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPartialAmount(Math.min(totals.grandTotal, Math.max(0, val)));
                          }}
                          placeholder="0.00"
                          className="w-24 pl-5 pr-2 py-1 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 justify-end">
                      {[0.25, 0.5, 0.75].map((ratio) => {
                        const amt = Math.round(totals.grandTotal * ratio);
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setPartialAmount(amt)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 cursor-pointer"
                          >
                            {ratio * 100}%
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between font-bold text-amber-900 dark:text-amber-200 text-[11px] pt-1 border-t border-amber-200 dark:border-amber-800/80">
                      <span>Pending Due:</span>
                      <span className="font-mono text-rose-700 dark:text-rose-400">
                        {formatCurrency(Math.max(0, totals.grandTotal - partialAmount), business.currencySymbol)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment methods selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Settlement Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CASH', 'UPI', 'CREDIT_CARD'] as PaymentMethod[]).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {method === 'CASH' ? '💵 Cash' : method === 'UPI' ? '⚡ UPI QR' : '💳 Card'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash tender calculator if CASH selected */}
              {paymentMethod === 'CASH' && settlementType !== 'CREDIT' && (
                <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">Cash Tendered:</span>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      placeholder={String(settlementType === 'PARTIAL' ? partialAmount : totals.grandTotal)}
                      className="w-24 px-2 py-1 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  {cashTendered > (settlementType === 'PARTIAL' ? partialAmount : totals.grandTotal) && (
                    <div className="flex justify-between font-bold text-emerald-800 dark:text-emerald-300 text-xs pt-1 border-t border-amber-200 dark:border-amber-800/80">
                      <span>Change Return:</span>
                      <span className="font-mono">
                        {formatCurrency(
                          cashTendered - (settlementType === 'PARTIAL' ? partialAmount : totals.grandTotal), 
                          business.currencySymbol
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout CTA */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  Complete Sale & Print Receipt (
                  {formatCurrency(
                    settlementType === 'FULL' ? totals.grandTotal : (settlementType === 'CREDIT' ? 0 : partialAmount),
                    business.currencySymbol
                  )}
                  {settlementType !== 'FULL' && ` / Due: ${formatCurrency(Math.max(0, totals.grandTotal - (settlementType === 'CREDIT' ? 0 : partialAmount)), business.currencySymbol)}`}
                  )
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Floating Cart Bar for Mobile & Tablet (Active when on Products view with items in cart) */}
      {mobileTab === 'products' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-30 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
                  <span>{totalCartItemsCount} item{totalCartItemsCount > 1 ? 's' : ''} in cart</span>
                  <span className="text-[10px] font-normal text-slate-400">({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                </div>
                <div className="text-sm font-extrabold font-mono text-emerald-400">
                  {formatCurrency(totals.grandTotal, business.currencySymbol)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileTab('cart');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              <span>View Cart & Pay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
                  <Printer className="w-3.5 h-3.5" />
                  <span>Confirm & Print</span>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPriceMode('EXCLUSIVE');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      editPriceMode === 'EXCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Base Unit Rate</div>
                      <div className="text-[10px] opacity-75">Exclusive of Tax</div>
                    </div>
                    {editPriceMode === 'EXCLUSIVE' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPriceMode('INCLUSIVE');
                      // compute default inclusive amount
                      const calcs = calculateItemGst(editUnitRate, editQuantity, editDiscountPercent, editGstRate, false);
                      setEditTotalAmount(calcs.totalAmount);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      editPriceMode === 'INCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Total Sale Amount</div>
                      <div className="text-[10px] opacity-75">Inclusive of All Taxes</div>
                    </div>
                    {editPriceMode === 'INCLUSIVE' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                </div>
              </div>

              {/* Amount and Quantity Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {editPriceMode === 'EXCLUSIVE' ? (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Unit Rate (₹):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editUnitRate || ''}
                        onChange={(e) => setEditUnitRate(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Final Line Total (₹):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editTotalAmount || ''}
                        onChange={(e) => setEditTotalAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 dark:text-indigo-400"
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

                if (editPriceMode === 'INCLUSIVE') {
                  const discountFactor = (1 - disc / 100);
                  const taxFactor = (1 + gst / 100);
                  if (discountFactor > 0 && taxFactor > 0 && qty > 0) {
                    previewRate = Number((editTotalAmount / (qty * discountFactor * taxFactor)).toFixed(2));
                  }
                }

                const preview = calculateItemGst(previewRate, qty, disc, gst, false);
                const itemTaxTotal = preview.cgstAmount + preview.sgstAmount + preview.igstAmount + (preview.cessAmount || 0);

                return (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between pb-1 border-b border-indigo-200/60 dark:border-indigo-800/80">
                      <span>Calculated Line Item Breakdown</span>
                      <span className="font-mono text-indigo-700 dark:text-indigo-400">Base Unit Rate: {formatCurrency(previewRate, business.currencySymbol)}</span>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomItemPriceMode('EXCLUSIVE')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      customItemPriceMode === 'EXCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Base Rate</div>
                      <div className="text-[10px] opacity-75">Tax gets added on top</div>
                    </div>
                    {customItemPriceMode === 'EXCLUSIVE' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomItemPriceMode('INCLUSIVE')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      customItemPriceMode === 'INCLUSIVE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Flat Inclusive Total</div>
                      <div className="text-[10px] opacity-75">Taxes included in price</div>
                    </div>
                    {customItemPriceMode === 'INCLUSIVE' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                </div>
              </div>

              {/* Price & Quantity & Unit */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {customItemPriceMode === 'EXCLUSIVE' ? 'Base Rate (₹):' : 'Total Price (₹):'}
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
    </div>
  );
};
