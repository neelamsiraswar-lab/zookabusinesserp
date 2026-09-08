import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, GstTaxRate } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { COMMON_HSN_CODES, STANDARD_UNITS } from '../../utils/constants';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BarcodeLabelPrintModal } from './BarcodeLabelPrintModal';
import { BulkProductUploadModal } from './BulkProductUploadModal';
import { CustomHsnModal } from '../common/CustomHsnModal';
import { HsnLookupDialog } from '../common/HsnLookupDialog';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Tag, 
  Layers, 
  TrendingUp, 
  Calendar,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PackagePlus,
  Scan,
  Printer,
  Sparkles,
  Zap,
  FileText,
  Upload,
  FileSpreadsheet,
  Ban,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Percent,
  Receipt,
  DollarSign,
  Boxes,
  Eye
} from 'lucide-react';

type ProductSortField = 'name' | 'sku' | 'hsnCode' | 'purchasePrice' | 'sellingPrice' | 'gstRate' | 'currentStock';
type SortDirection = 'asc' | 'desc';
import { 
  normalizeLowStockSettings, 
  getProductStockThreshold, 
  isProductLowStock, 
  isProductCriticalStock, 
  isProductOutOfStock,
  computeInventoryHealth
} from '../../utils/stockUtils';

interface InventoryViewProps {
  onOpenNewInvoiceWithItem?: (product: Product) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenNewInvoiceWithItem }) => {
  const { 
    products, 
    business, 
    customHsnCodes,
    createProduct, 
    bulkCreateProducts, 
    updateProduct, 
    deleteProduct, 
    adjustStock, 
    setActiveTab, 
    showToast,
    can 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [itemTypeFilter, setItemTypeFilter] = useState<'ALL' | 'GOODS' | 'SERVICES'>('ALL');

  // Expandable row state for Inventory
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Sorting state for Inventory
  const [sortField, setSortField] = useState<ProductSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // For prices and stock numbers, default to descending on first click
      if (['purchasePrice', 'sellingPrice', 'currentStock', 'gstRate'].includes(field)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const toggleExpandProduct = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedProductIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleExpandAll = () => {
    const allExpanded = sortedProducts.length > 0 && sortedProducts.every(p => expandedProductIds[p.id]);
    const newMap: Record<string, boolean> = {};
    if (!allExpanded) {
      sortedProducts.forEach(p => {
        newMap[p.id] = true;
      });
    }
    setExpandedProductIds(newMap);
  };

  // Barcode Scanner, Label Print, Bulk CSV Upload & Custom HSN Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCustomHsnModalOpen, setIsCustomHsnModalOpen] = useState(false);
  const [isHsnLookupOpen, setIsHsnLookupOpen] = useState(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<Product | null>(null);

  // Add / Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Physical audit verification');

  // Form fields for product modal
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [hsnCode, setHsnCode] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [gstRate, setGstRate] = useState<GstTaxRate>(18);
  const [currentStock, setCurrentStock] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [isService, setIsService] = useState(false);

  // Batch fields
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];
  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);
  const health = computeInventoryHealth(products, stockSettings);

  const filteredProducts = products.filter(prod => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      prod.name.toLowerCase().includes(q) ||
      prod.sku.toLowerCase().includes(q) ||
      (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
      prod.hsnCode.includes(q);
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || isProductLowStock(prod, stockSettings);
    const matchesItemType = itemTypeFilter === 'ALL' || (itemTypeFilter === 'GOODS' ? !prod.isService : prod.isService);

    return matchesSearch && matchesCategory && matchesLowStock && matchesItemType;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let compareResult = 0;
    switch (sortField) {
      case 'name':
        compareResult = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        break;
      case 'sku':
        compareResult = a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' });
        break;
      case 'hsnCode':
        compareResult = (a.hsnCode || '').localeCompare(b.hsnCode || '', undefined, { numeric: true, sensitivity: 'base' });
        break;
      case 'purchasePrice':
        compareResult = (a.purchasePrice || 0) - (b.purchasePrice || 0);
        break;
      case 'sellingPrice':
        compareResult = (a.sellingPrice || 0) - (b.sellingPrice || 0);
        break;
      case 'gstRate':
        compareResult = (a.gstRate || 0) - (b.gstRate || 0);
        break;
      case 'currentStock': {
        const aStock = a.isService ? -1 : (a.currentStock || 0);
        const bStock = b.isService ? -1 : (b.currentStock || 0);
        compareResult = aStock - bStock;
        break;
      }
      default:
        compareResult = 0;
    }
    return sortDirection === 'asc' ? compareResult : -compareResult;
  });

  const totalInventoryValuation = health.totalValuation;
  const lowStockCount = health.lowStockItems;

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-5)}`);
    setBarcode(`890123${Date.now().toString().slice(-7)}`);
    setDescription('');
    setCategory('General');
    setHsnCode('');
    setUnit('PCS');
    setPurchasePrice(0);
    setSellingPrice(0);
    setGstRate(18);
    setCurrentStock(10);
    setMinStockAlert(stockSettings.defaultThreshold || 5);
    setIsService(false);
    setBatchNo('');
    setExpiryDate('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setDescription(p.description || '');
    setCategory(p.category);
    setHsnCode(p.hsnCode);
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setGstRate(p.gstRate);
    setCurrentStock(p.currentStock);
    setMinStockAlert(p.minStockAlert);
    setIsService(p.isService || false);
    setIsCreateModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Missing Name', 'Product name is required.');
      return;
    }

    const batches = batchNo ? [{
      batchNumber: batchNo,
      mfgDate: new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '2029-12-31',
      stock: currentStock,
      mrp: sellingPrice * 1.15
    }] : undefined;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        sku,
        barcode,
        description,
        category,
        hsnCode,
        unit,
        purchasePrice,
        sellingPrice,
        gstRate,
        currentStock,
        minStockAlert,
        isService,
        batches
      });
    } else {
      createProduct({
        name,
        sku,
        barcode,
        description,
        category,
        hsnCode,
        unit,
        purchasePrice,
        sellingPrice,
        gstRate,
        currentStock,
        minStockAlert,
        isService,
        batches
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleConfirmStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    adjustStock(adjustingProduct.id, newStockQty, adjustReason);
    setAdjustingProduct(null);
  };

  // Handler for adding a scanned item to invoice
  const handleAddToInvoice = (product: Product) => {
    if (onOpenNewInvoiceWithItem) {
      onOpenNewInvoiceWithItem(product);
    } else {
      setActiveTab('invoices');
    }
  };

  const handleOpenPosSale = (product: Product) => {
    setActiveTab('pos_billing');
  };

  const handlePrintLabel = (product: Product) => {
    setSelectedProductForLabel(product);
    setIsLabelPrintOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Catalog, HSN directory, barcode scanner lookup, batch tracking & stock valuation
          </p>
        </div>

        {/* Action Buttons: Responsive Chip Buttons on Mobile, Toolbar on Desktop */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible shrink-0">
          {can('inventory', 'createProduct') && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full sm:rounded-xl shadow-sm shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add Item</span>
            </button>
          )}

          {/* Barcode Scanner Primary Chip */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-indigo-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-full sm:rounded-xl shadow-sm shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Scan barcodes to locate stock, view inventory or add directly to invoice"
          >
            <Scan className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
            <span>Scan Barcode</span>
          </button>

          {can('purchases', 'view') && (
            <button
              onClick={() => setActiveTab('purchases')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 rounded-full sm:rounded-xl transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-95"
              title="Log a supplier purchase bill to automatically add stock"
            >
              <PackagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Purchase Bill</span>
            </button>
          )}

          {/* Custom HSN Directory Chip */}
          <button
            onClick={() => setIsCustomHsnModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-full sm:rounded-xl shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            title="Manage Custom HSN and SAC codes directory"
          >
            <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
            <span>HSN Directory {customHsnCodes.length > 0 && `(${customHsnCodes.length})`}</span>
          </button>

          {/* Bulk Import CSV Action Chip */}
          {can('inventory', 'createProduct') && (
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-full sm:rounded-xl shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              title="Bulk upload items from CSV file or Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Items in Catalog</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{products.length}</div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {products.filter(p => !p.isService).length} Goods • {products.filter(p => p.isService).length} Services
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Stock Valuation (At Cost)</span>
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300 mt-1">
              {formatCurrency(totalInventoryValuation, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Asset value on balance sheet</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Low Stock Warnings</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{lowStockCount}</div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Below threshold alerts</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, HSN, or scan barcode..."
              className="w-full pl-9 pr-24 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => setIsScannerOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded-lg transition-colors cursor-pointer"
              title="Open Barcode Scanner"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none flex-1 sm:flex-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
              ))}
            </select>

            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                showLowStockOnly
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              ⚠️ Low Stock ({lowStockCount})
            </button>
          </div>
        </div>

        {/* Responsive Quick Filter Chips Row (Scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 -mx-1 px-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap mr-1 hidden sm:inline">Filter:</span>
          {/* All Items Chip */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setShowLowStockOnly(false);
              setItemTypeFilter('ALL');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'ALL' && !showLowStockOnly && itemTypeFilter === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Items</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategory === 'ALL' && !showLowStockOnly && itemTypeFilter === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {products.length}
            </span>
          </button>

          {/* Low Stock Warning Chip */}
          <button
            type="button"
            onClick={() => setShowLowStockOnly(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border transition-all shrink-0 cursor-pointer ${
              showLowStockOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Low Stock</span>
            {lowStockCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                showLowStockOnly ? 'bg-white/20 text-white' : 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
              }`}>
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Goods Only Chip */}
          <button
            type="button"
            onClick={() => setItemTypeFilter(prev => prev === 'GOODS' ? 'ALL' : 'GOODS')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all shrink-0 cursor-pointer ${
              itemTypeFilter === 'GOODS'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Boxes className="w-3 h-3 text-indigo-500" />
            <span>Goods</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              itemTypeFilter === 'GOODS'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {products.filter(p => !p.isService).length}
            </span>
          </button>

          {/* Services Only Chip */}
          <button
            type="button"
            onClick={() => setItemTypeFilter(prev => prev === 'SERVICES' ? 'ALL' : 'SERVICES')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all shrink-0 cursor-pointer ${
              itemTypeFilter === 'SERVICES'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span>Services</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              itemTypeFilter === 'SERVICES'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {products.filter(p => p.isService).length}
            </span>
          </button>

          {/* Individual Category Chips */}
          {categories.filter(c => c !== 'ALL').map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(prev => prev === cat ? 'ALL' : cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Container (Desktop Table + Mobile Expandable Cards) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Mobile Expansion & Sort Controls Bar */}
        <div className="flex sm:hidden items-center justify-between gap-2 px-3 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {sortedProducts.length} {sortedProducts.length === 1 ? 'Item' : 'Items'}
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as ProductSortField)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="name">Name</option>
                <option value="currentStock">Stock Qty</option>
                <option value="sellingPrice">Price</option>
                {can('inventory', 'viewPurchaseCost') && <option value="purchasePrice">Cost</option>}
                <option value="hsnCode">HSN</option>
                <option value="gstRate">GST</option>
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
          {sortedProducts.length > 0 && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg border border-indigo-200/70 dark:border-indigo-800 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              {sortedProducts.length > 0 && sortedProducts.every(p => expandedProductIds[p.id]) ? (
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

        {/* 1. Mobile Card List (Hidden on md+ screens) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {sortedProducts.map(prod => {
            const effectiveThreshold = getProductStockThreshold(prod, stockSettings);
            const isOutOfStock = isProductOutOfStock(prod);
            const isCritical = isProductCriticalStock(prod, stockSettings);
            const isLow = isProductLowStock(prod, stockSettings);
            const isExpanded = !!expandedProductIds[prod.id];
            const marginPercent = prod.purchasePrice > 0 
              ? (((prod.sellingPrice - prod.purchasePrice) / prod.purchasePrice) * 100).toFixed(0)
              : 0;

            const baseTaxableSelling = prod.sellingPrice / (1 + prod.gstRate / 100);
            const unitTaxAmount = prod.sellingPrice - baseTaxableSelling;

            return (
              <div key={prod.id} className="p-3.5 space-y-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                {/* Mobile Product Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {prod.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans">
                        {prod.category}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        SKU: {prod.sku}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                      {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                    </div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {prod.gstRate}% GST
                    </span>
                  </div>
                </div>

                {/* Stock Level & Barcode Info Row */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                      HSN: <strong className="font-bold text-indigo-700 dark:text-indigo-300">{prod.hsnCode || 'N/A'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {prod.isService ? (
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Service</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          isOutOfStock
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            : isCritical
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
                            : isLow
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {isOutOfStock && <Ban className="w-3 h-3" />}
                        {isCritical && !isOutOfStock && <ShieldAlert className="w-3 h-3" />}
                        {isLow && !isCritical && !isOutOfStock && <AlertTriangle className="w-3 h-3" />}
                        <span>{prod.currentStock} {prod.unit}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand / Collapse In-line Secondary Details Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => toggleExpandProduct(prod.id, e)}
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
                    <span>{isExpanded ? 'Hide HSN & Tax Breakdown' : 'Show HSN Code, Tax & Cost Details'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60">
                    {isExpanded ? 'Collapse' : 'HSN / Tax'}
                  </span>
                </button>

                {/* Expanded Secondary Data Box (HSN Code, GST Tax Breakdown, Profit Margins, Stock Valuation) */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50/90 dark:bg-slate-800/40 rounded-xl border border-slate-200/90 dark:border-slate-700 space-y-3 animate-in fade-in-50 duration-150">
                    {/* 1. HSN & GST Tax Breakdown */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          HSN & GST Tax Breakdown
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold font-mono text-[10px] border border-indigo-200/70 dark:border-indigo-800">
                          HSN: {prod.hsnCode || 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Selling Price (MRP)</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">GST Tax Rate</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            {prod.gstRate}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Taxable Base / Unit</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {formatCurrency(baseTaxableSelling, business.currencySymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">GST Tax / Unit</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-300">
                            {formatCurrency(unitTaxAmount, business.currencySymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Intra-State Split</span>
                          <span className="text-slate-600 dark:text-slate-400 text-[10px]">
                            CGST ({prod.gstRate / 2}%): {formatCurrency(unitTaxAmount / 2, business.currencySymbol)}<br />
                            SGST ({prod.gstRate / 2}%): {formatCurrency(unitTaxAmount / 2, business.currencySymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Inter-State IGST</span>
                          <span className="text-slate-600 dark:text-slate-400 text-[10px]">
                            IGST ({prod.gstRate}%): {formatCurrency(unitTaxAmount, business.currencySymbol)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Purchase Cost & Valuation (RBAC Protected) */}
                    {can('inventory', 'viewPurchaseCost') && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            Cost & Profit Margins
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                            +{marginPercent}% margin
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Purchase Cost</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(prod.purchasePrice, business.currencySymbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Gross Profit / Unit</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(prod.sellingPrice - prod.purchasePrice, business.currencySymbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Stock Valuation (Cost)</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {formatCurrency(prod.currentStock * prod.purchasePrice, business.currencySymbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Stock Valuation (Selling)</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(prod.currentStock * prod.sellingPrice, business.currencySymbol)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Barcode & Batch Meta */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        <span>Barcode / EAN: <strong>{prod.barcode || prod.sku}</strong></span>
                        <span>Min Threshold: <strong>{effectiveThreshold} {prod.unit}</strong></span>
                      </div>
                      {prod.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobile Actions Toolbar - Responsive Chip Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {can('invoices', 'create') && (
                    <button
                      type="button"
                      onClick={() => handleAddToInvoice(prod)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-full border border-emerald-200/80 dark:border-emerald-800 transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                      title="Create Invoice with this item"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Invoice</span>
                    </button>
                  )}

                  {can('inventory', 'adjustStock') && !prod.isService && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustingProduct(prod);
                        setNewStockQty(prod.currentStock);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-full border border-indigo-200/80 dark:border-indigo-800 transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                      title="Adjust Stock"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Stock</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePrintLabel(prod)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full border border-slate-200/70 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
                    title="Print Barcode Label"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {can('inventory', 'editProduct') && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(prod)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full border border-slate-200/70 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {can('inventory', 'deleteProduct') && (
                    <button
                      type="button"
                      onClick={() => deleteProduct(prod.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-full border border-slate-200/70 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No products found in catalog.
            </div>
          )}
        </div>

        {/* 2. Desktop Table View (Visible on md+ screens with in-table expandable rows) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold select-none">
                <th className="py-3 px-3 w-10 text-center"></th>
                
                <th 
                  onClick={() => handleSort('name')}
                  className={`py-3 px-4 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'name' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Item Name & SKU"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item & SKU</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'name' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('hsnCode')}
                  className={`py-3 px-4 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'hsnCode' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Barcode & HSN Code"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Barcode & HSN</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'hsnCode' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'hsnCode' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                {can('inventory', 'viewPurchaseCost') && (
                  <th 
                    onClick={() => handleSort('purchasePrice')}
                    className={`py-3 px-4 text-right cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                      sortField === 'purchasePrice' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                    }`}
                    title="Click to sort by Purchase Cost (₹)"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Purchase (₹)</span>
                      <span className={`p-0.5 rounded transition-all ${sortField === 'purchasePrice' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                        {sortField === 'purchasePrice' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                  </th>
                )}

                <th 
                  onClick={() => handleSort('sellingPrice')}
                  className={`py-3 px-4 text-right cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'sellingPrice' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Selling Price / Value (₹)"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Selling (₹)</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'sellingPrice' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'sellingPrice' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('gstRate')}
                  className={`py-3 px-4 text-center cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'gstRate' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by GST Rate %"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>GST Rate</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'gstRate' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'gstRate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('currentStock')}
                  className={`py-3 px-4 text-center cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60 group/th ${
                    sortField === 'currentStock' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                  title="Click to sort by Stock Quantity Level"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Stock Level</span>
                    <span className={`p-0.5 rounded transition-all ${sortField === 'currentStock' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60' : 'text-slate-400 opacity-0 group-hover/th:opacity-100'}`}>
                      {sortField === 'currentStock' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </th>

                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedProducts.map(prod => {
                const effectiveThreshold = getProductStockThreshold(prod, stockSettings);
                const isOutOfStock = isProductOutOfStock(prod);
                const isCritical = isProductCriticalStock(prod, stockSettings);
                const isLow = isProductLowStock(prod, stockSettings);
                const isExpanded = !!expandedProductIds[prod.id];
                const marginPercent = prod.purchasePrice > 0 
                  ? (((prod.sellingPrice - prod.purchasePrice) / prod.purchasePrice) * 100).toFixed(0)
                  : 0;

                const baseTaxableSelling = prod.sellingPrice / (1 + prod.gstRate / 100);
                const unitTaxAmount = prod.sellingPrice - baseTaxableSelling;

                return (
                  <React.Fragment key={prod.id}>
                    <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-slate-800/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleExpandProduct(prod.id, e)}
                          className="p-1 rounded-lg hover:bg-indigo-100/70 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse Product Details' : 'Expand HSN, Tax & Cost Details'}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{prod.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>SKU: {prod.sku}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{prod.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                            {prod.barcode || prod.sku}
                          </div>
                          <button
                            onClick={() => handlePrintLabel(prod)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Print Barcode Stickers"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">HSN: {prod.hsnCode}</div>
                      </td>
                      {can('inventory', 'viewPurchaseCost') && (
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatCurrency(prod.purchasePrice, business.currencySymbol)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                        </div>
                        {can('inventory', 'viewPurchaseCost') && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            +{marginPercent}% margin
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                          {prod.gstRate}% GST
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {prod.isService ? (
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Service</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span
                              title={`Current: ${prod.currentStock} ${prod.unit} • Threshold: ${effectiveThreshold}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                isOutOfStock
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                  : isCritical
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
                                  : isLow
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {isOutOfStock && <Ban className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                              {isCritical && !isOutOfStock && <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                              {isLow && !isCritical && !isOutOfStock && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                              <span>{prod.currentStock} {prod.unit}</span>
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                              Min: {effectiveThreshold}
                            </span>
                            {can('inventory', 'adjustStock') && (
                              <button
                                onClick={() => {
                                  setAdjustingProduct(prod);
                                  setNewStockQty(prod.currentStock);
                                }}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-0.5 cursor-pointer"
                              >
                                Adjust Stock
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {can('invoices', 'create') && (
                            <button
                              onClick={() => handleAddToInvoice(prod)}
                              title="Create Invoice with this item"
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintLabel(prod)}
                            title="Print Barcode Labels"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {can('inventory', 'editProduct') && (
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              title="Edit Product"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {can('inventory', 'deleteProduct') && (
                            <button
                              onClick={() => deleteProduct(prod.id)}
                              title="Delete Product"
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable In-Table Sub-Row (Desktop) */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30 dark:bg-slate-800/50 border-y border-indigo-100 dark:border-slate-800">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-750 shadow-xs">
                            {/* HSN & Tax Breakdown Box */}
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <Receipt className="w-4 h-4 text-indigo-600" />
                                  Tax & Statutory Breakdown
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold font-mono text-[10px] border border-indigo-100 dark:border-indigo-900/60">
                                  HSN: {prod.hsnCode || 'N/A'}
                                </span>
                              </div>

                              <div className="space-y-1.5 text-[11px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">GST Tax Rate:</span>
                                  <span className="font-bold text-indigo-700 dark:text-indigo-300">{prod.gstRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">Taxable Base / Unit:</span>
                                  <span>{formatCurrency(baseTaxableSelling, business.currencySymbol)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">GST Amount / Unit:</span>
                                  <span className="font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(unitTaxAmount, business.currencySymbol)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60 pt-1">
                                  <span className="font-sans">Intra-State Tax:</span>
                                  <span>CGST {prod.gstRate/2}% + SGST {prod.gstRate/2}%</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                  <span className="font-sans">Inter-State Tax:</span>
                                  <span>IGST {prod.gstRate}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Cost & Profit Margins (if permitted) */}
                            {can('inventory', 'viewPurchaseCost') ? (
                              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-1.5">
                                  <span className="flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    Cost, Margins & Valuation
                                  </span>
                                  <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                    +{marginPercent}% margin
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-[11px] font-mono">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Purchase Cost:</span>
                                    <span>{formatCurrency(prod.purchasePrice, business.currencySymbol)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Gross Profit / Unit:</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(prod.sellingPrice - prod.purchasePrice, business.currencySymbol)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Stock Value (Cost):</span>
                                    <span>{formatCurrency(prod.currentStock * prod.purchasePrice, business.currencySymbol)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <span className="font-sans">Stock Value (Selling):</span>
                                    <span>{formatCurrency(prod.currentStock * prod.sellingPrice, business.currencySymbol)}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs flex items-center justify-center text-slate-400">
                                Purchase cost details restricted by RBAC rules
                              </div>
                            )}

                            {/* Inventory & Batch Meta */}
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <Boxes className="w-4 h-4 text-indigo-600" />
                                  Item Specifications
                                </span>
                                <span className="text-[10px] text-slate-500">{prod.unit}</span>
                              </div>

                              <div className="space-y-1.5 text-[11px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">Barcode / EAN:</span>
                                  <span>{prod.barcode || prod.sku}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">Min Stock Threshold:</span>
                                  <span>{effectiveThreshold} {prod.unit}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-sans">Item Category:</span>
                                  <span className="font-sans font-medium text-slate-700 dark:text-slate-300">{prod.category}</span>
                                </div>
                                {prod.description && (
                                  <div className="text-[10px] text-slate-500 font-sans italic border-t border-slate-200/60 dark:border-slate-700/60 pt-1 line-clamp-2">
                                    {prod.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No items found in catalog</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Quickly seed your inventory using CSV bulk upload or add individual items.</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setIsBulkUploadOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Bulk Import CSV</span>
                        </button>
                        <button
                          onClick={handleOpenCreate}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Item</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-lg md:max-w-xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Catalog Item' : 'Add New Item / Service'}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Item / Service Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dell 27-inch 4K Monitor"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Barcode / EAN (Scan to fill)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="890123456789"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Hardware, Electronics, Service..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">HSN / SAC Code</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsHsnLookupOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800"
                        title="Lookup HSN in App Dialog Format"
                      >
                        <Search className="w-3 h-3" />
                        <span>App Directory</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCustomHsnModalOpen(true)}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        <span>Custom</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="inventory-hsn-suggestions"
                      value={hsnCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHsnCode(val);
                        // Auto-match rate from custom codes or standard tariff if exact match
                        const matchCustom = customHsnCodes.find(c => c.code.toLowerCase() === val.trim().toLowerCase());
                        if (matchCustom) {
                          setGstRate(matchCustom.gstRate);
                          if (matchCustom.uqc && matchCustom.uqc !== 'OTH') setUnit(matchCustom.uqc);
                          if (matchCustom.type === 'SAC') setIsService(true);
                        } else {
                          const matchStandard = COMMON_HSN_CODES.find(c => c.code === val.trim());
                          if (matchStandard) {
                            setGstRate(matchStandard.defaultGst as GstTaxRate);
                            if (matchStandard.code.startsWith('99')) setIsService(true);
                          }
                        }
                      }}
                      placeholder="e.g. 8471, 9983, 1006 or custom..."
                      className="w-full px-3 py-2 font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
                    />
                    {hsnCode && (
                      <button
                        type="button"
                        onClick={() => setHsnCode('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
                        title="Clear HSN"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <datalist id="inventory-hsn-suggestions">
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseInt(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Essentials)</option>
                    <option value="12">12% (Standard Slabs)</option>
                    <option value="18">18% (General Goods/Services)</option>
                    <option value="28">28% (Luxury / De-merit)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    disabled={isService}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Min. Alert Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    disabled={isService}
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Service toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Is this an intangible Service?</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Services do not maintain physical stock inventory</span>
                </div>
                <input
                  type="checkbox"
                  checked={isService}
                  onChange={(e) => setIsService(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Batch info */}
              {!isService && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">Batch & Expiry (Optional)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400">Initial Batch #</label>
                      <input
                        type="text"
                        value={batchNo}
                        onChange={(e) => setBatchNo(e.target.value)}
                        placeholder="BATCH-001"
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400">Expiry Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editingProduct ? 'Update Item' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Adjust Physical Stock Count
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Item: <strong className="text-slate-800 dark:text-slate-200">{adjustingProduct.name}</strong> (Current: {adjustingProduct.currentStock} {adjustingProduct.unit})
            </p>

            <form onSubmit={handleConfirmStockAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">New Verified Physical Count</label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                >
                  <option value="Physical audit verification">Physical audit verification</option>
                  <option value="Damaged / Expired goods write-off">Damaged / Expired goods write-off</option>
                  <option value="Stock received without invoice">Stock received without invoice</option>
                  <option value="Correction of clerical counting error">Correction of clerical counting error</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Apply Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        currencySymbol={business.currencySymbol}
        onAddToInvoice={handleAddToInvoice}
        onOpenPosSale={handleOpenPosSale}
        onAdjustStock={adjustStock}
        onPrintLabel={handlePrintLabel}
      />

      {/* Barcode Label Print Modal */}
      <BarcodeLabelPrintModal
        isOpen={isLabelPrintOpen}
        onClose={() => setIsLabelPrintOpen(false)}
        product={selectedProductForLabel}
        business={business}
      />

      {/* Bulk CSV Product Upload Modal */}
      <BulkProductUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onImport={(items, updateExisting) => {
          bulkCreateProducts(items, updateExisting);
        }}
        currencySymbol={business.currencySymbol}
      />

      {/* HSN / SAC Code App Lookup Dialog */}
      <HsnLookupDialog
        isOpen={isHsnLookupOpen}
        onClose={() => setIsHsnLookupOpen(false)}
        currentCode={hsnCode}
        onSelect={(item) => {
          setHsnCode(item.code);
          setGstRate(item.gstRate);
          if (item.uqc && item.uqc !== 'OTH') setUnit(item.uqc);
          if (item.type === 'SAC') setIsService(true);
          showToast('success', 'HSN Code Selected', `${item.code} (${item.gstRate}% GST) applied.`);
        }}
        onOpenCustomManager={() => setIsCustomHsnModalOpen(true)}
      />

      {/* Custom HSN & SAC Management Modal */}
      <CustomHsnModal
        isOpen={isCustomHsnModalOpen}
        onClose={() => setIsCustomHsnModalOpen(false)}
        onSelectHsn={(item) => {
          setHsnCode(item.code);
          setGstRate(item.gstRate);
          if (item.uqc && item.uqc !== 'OTH') setUnit(item.uqc);
          if (item.type === 'SAC') setIsService(true);
        }}
      />
    </div>
  );
};
