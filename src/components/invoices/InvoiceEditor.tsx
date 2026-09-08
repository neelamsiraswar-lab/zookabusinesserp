import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Invoice, 
  InvoiceItem, 
  InvoiceType, 
  InvoiceStatus,
  GstTaxRate, 
  PaymentMethod,
  Product
} from '../../types';
import { INDIAN_STATES, COMMON_HSN_CODES, STANDARD_UNITS } from '../../utils/constants';
import { 
  calculateItemGst, 
  calculateBaseRateFromInclusive,
  recalculateInvoiceTotals, 
  suggestRateForHsn,
  getStateInfoByCode 
} from '../../utils/gstCalculations';
import { formatCurrency, validateGstin, normalizeSignatureUrl } from '../../utils/formatters';
import { cleanDefaultBusinessProfile } from '../../utils/cleanDefaults';
import { CustomHsnModal } from '../common/CustomHsnModal';
import { HsnLookupDialog } from '../common/HsnLookupDialog';
import { AppSelectDialog } from '../common/AppSelectDialog';
import { 
  saveInvoiceDraft, 
  getInvoiceDraft, 
  clearInvoiceDraft, 
  hasMeaningfulDraftData, 
  formatDraftTime, 
  InvoiceDraftPayload 
} from '../../utils/invoiceDraftManager';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  HelpCircle,
  FileCheck,
  FileSignature,
  Printer,
  ShieldCheck,
  Tag,
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Ban,
  Edit3,
  RotateCcw,
  Minus,
  Percent,
  SlidersHorizontal,
  Calculator,
  FileText,
  Cloud,
  HardDrive,
  History,
  X,
  Clock,
  Send
} from 'lucide-react';
import { ShareInvoiceModal } from './ShareInvoiceModal';
import { 
  normalizeLowStockSettings, 
  getProductStockThreshold, 
  isProductLowStock, 
  isProductOutOfStock,
  isProductCriticalStock 
} from '../../utils/stockUtils';

interface InvoiceEditorProps {
  onClose: () => void;
  initialData?: Partial<Invoice>;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ onClose, initialData }) => {
  const { 
    business, 
    updateBusiness,
    parties, 
    products, 
    invoices,
    customHsnCodes,
    createInvoice, 
    updateInvoice, 
    getNextSequentialInvoiceNumber, 
    setSelectedInvoiceIdForPrint, 
    showToast,
    currentCompanyId
  } = useApp();
  const isEditing = !!initialData?.id;
  const [isCustomHsnModalOpen, setIsCustomHsnModalOpen] = useState<boolean>(false);
  const [hsnLookupTargetIndex, setHsnLookupTargetIndex] = useState<number | null>(null);
  const [dispatchModalInvoice, setDispatchModalInvoice] = useState<Invoice | null>(null);

  // Auto-Save Draft & Persistence State
  const [availableDraft, setAvailableDraft] = useState<InvoiceDraftPayload | null>(null);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialData?.invoiceType || 'TAX_INVOICE');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    if (initialData?.invoiceNumber) return initialData.invoiceNumber;
    return getNextSequentialInvoiceNumber().invoiceNumber;
  });
  const [invoiceDate, setInvoiceDate] = useState<string>(
    initialData?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    initialData?.dueDate || new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );

  // Line Settings Config from Business Profile
  const baseLineSettings = cleanDefaultBusinessProfile.itemLineSettings!;
  const lineSettings = {
    ...baseLineSettings,
    ...(business.itemLineSettings || {}),
    showOnPrint: {
      ...baseLineSettings.showOnPrint,
      ...(business.itemLineSettings?.showOnPrint || {})
    }
  };

  // State for product search autocomplete dropdown
  const [activeSuggestIndex, setActiveSuggestIndex] = useState<number | null>(null);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialData?.customerId || '');
  const [customerName, setCustomerName] = useState<string>(initialData?.customerName || '');
  const [customerGstin, setCustomerGstin] = useState<string>(initialData?.customerGstin || '');
  const [customerAddress, setCustomerAddress] = useState<string>(initialData?.customerAddress || '');
  const [customerCity, setCustomerCity] = useState<string>(initialData?.customerCity || '');
  const [customerState, setCustomerState] = useState<string>(initialData?.customerState || business.state || 'Delhi');
  const [customerStateCode, setCustomerStateCode] = useState<string>(initialData?.customerStateCode || business.stateCode || '07');
  const [customerPhone, setCustomerPhone] = useState<string>(initialData?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(initialData?.customerEmail || '');

  // Place of Supply & Tax Rules
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState<string>(
    initialData?.placeOfSupplyState || customerState || business.state
  );
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState<string>(
    initialData?.placeOfSupplyStateCode || customerStateCode || business.stateCode
  );
  const [isReverseCharge, setIsReverseCharge] = useState<boolean>(initialData?.isReverseCharge || false);

  // Two Flexible Entry Modes: 'EXCLUSIVE' (Base Unit Rate) vs 'INCLUSIVE' (Total Line Sale Amount)
  const [priceEntryMode, setPriceEntryMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');

  // Dedicated Custom Item Sale Amount & Unit Rate Modal state
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editPriceMode, setEditPriceMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [editRate, setEditRate] = useState<number>(0);
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnit, setEditUnit] = useState<string>('PCS');
  const [editDiscountPercent, setEditDiscountPercent] = useState<number>(0);
  const [editGstRate, setEditGstRate] = useState<GstTaxRate>(18);
  const [editCessRate, setEditCessRate] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSerialNumber, setEditSerialNumber] = useState<string>('');
  const [editWarranty, setEditWarranty] = useState<string>('');
  const [editBatchNumber, setEditBatchNumber] = useState<string>('');

  // Inter-State vs Intra-State determination
  const isInterState = (placeOfSupplyStateCode || customerStateCode || business.stateCode) !== business.stateCode;

  // Check for duplicate invoice number in real-time
  const duplicateInvoice = invoiceNumber.trim() ? invoices.find(
    inv => (!isEditing || inv.id !== initialData?.id) && 
      (inv.invoiceNumber || '').trim().toLowerCase() === invoiceNumber.trim().toLowerCase()
  ) : null;
  const isDuplicateInvoiceNumber = !!duplicateInvoice;

  // Shipping details
  const [hasDifferentShipping, setHasDifferentShipping] = useState<boolean>(
    initialData?.hasDifferentShippingAddress || false
  );
  const [shippingName, setShippingName] = useState(initialData?.shippingName || '');
  const [shippingAddress, setShippingAddress] = useState(initialData?.shippingAddress || '');
  const [shippingState, setShippingState] = useState(initialData?.shippingState || '');
  const [shippingStateCode, setShippingStateCode] = useState(initialData?.shippingStateCode || '');

  // Items List
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items;
    }
    const initialIsInter = (initialData?.placeOfSupplyStateCode || business.stateCode) !== business.stateCode;
    const firstProd = products[0];
    const defaultRate = firstProd ? firstProd.sellingPrice : 0;
    const defaultGst = firstProd ? firstProd.gstRate : 18;
    const defaultHsn = firstProd ? firstProd.hsnCode : '';
    const calcs = calculateItemGst(defaultRate, 1, 0, defaultGst, initialIsInter);
    return [
      {
        id: 'item-' + Date.now(),
        productId: firstProd?.id || '',
        name: firstProd?.name || '',
        description: firstProd?.description || '',
        serialNumber: '',
        warranty: lineSettings.defaultWarranty || '1 Year Comprehensive',
        hsnCode: defaultHsn,
        quantity: 1,
        unit: firstProd?.unit || 'PCS',
        rate: defaultRate,
        discountPercent: 0,
        discountAmount: 0,
        ...calcs
      }
    ];
  });

  // Payment Status
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIALLY_PAID'>('UNPAID');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState<string>(business.defaultNotes);
  const [terms, setTerms] = useState<string>(business.defaultTerms);

  // Auto-fill customer details when selected from dropdown
  const handleCustomerSelect = (partyId: string) => {
    setSelectedCustomerId(partyId);
    const party = parties.find(p => p.id === partyId);
    if (party) {
      setCustomerName(party.name);
      setCustomerGstin(party.gstin || '');
      setCustomerAddress(party.billingAddress || '');
      setCustomerCity(party.city || '');
      
      const pStateCode = party.stateCode || '07';
      const pStateName = party.state || getStateInfoByCode(pStateCode).name;
      
      setCustomerState(pStateName);
      setCustomerStateCode(pStateCode);
      setPlaceOfSupplyState(pStateName);
      setPlaceOfSupplyStateCode(pStateCode);
      setCustomerPhone(party.phone || '');
      setCustomerEmail(party.email || '');

      const isInter = pStateCode !== business.stateCode;
      showToast(
        'info', 
        isInter ? 'Inter-State Invoice' : 'Intra-State Invoice',
        `Client in ${pStateName} (${pStateCode}).`
      );
    }
  };

  // When customer GSTIN changes, auto-detect state code from first 2 chars
  const handleGstinChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().trim();
    setCustomerGstin(uppercaseVal);

    const res = validateGstin(uppercaseVal);
    if (res.isValid && res.stateCode) {
      const stateObj = getStateInfoByCode(res.stateCode);
      setCustomerStateCode(stateObj.code);
      setCustomerState(stateObj.name);
      setPlaceOfSupplyStateCode(stateObj.code);
      setPlaceOfSupplyState(stateObj.name);
    }
  };

  // Recalculate item rates when inter/intra state changes
  useEffect(() => {
    setItems(prevItems =>
      prevItems.map(item => {
        const calcs = calculateItemGst(
          item.rate,
          item.quantity,
          item.discountPercent,
          item.gstRate,
          isInterState,
          item.cessRate || 0
        );
        return {
          ...item,
          ...calcs
        };
      })
    );
  }, [isInterState]);

  // Recalculate full totals
  const totals = recalculateInvoiceTotals(items, isInterState);

  // Check for existing saved draft in localStorage on initial mount
  useEffect(() => {
    const existingDraft = getInvoiceDraft(currentCompanyId, initialData?.id);
    if (existingDraft && hasMeaningfulDraftData(existingDraft, business.defaultNotes, business.defaultTerms)) {
      setAvailableDraft(existingDraft);
      setLastAutoSavedAt(existingDraft.savedAt);
    }
  }, [currentCompanyId, initialData?.id, business.defaultNotes, business.defaultTerms]);

  // Maintain live snapshot ref of entire invoice state for synchronized auto-saving
  const currentSnapshotRef = useRef<Omit<InvoiceDraftPayload, 'savedAt' | 'companyId'>>({
    targetInvoiceId: initialData?.id,
    invoiceType,
    invoiceNumber,
    invoiceDate,
    dueDate,
    selectedCustomerId,
    customerName,
    customerGstin,
    customerAddress,
    customerCity,
    customerState,
    customerStateCode,
    customerPhone,
    customerEmail,
    placeOfSupplyState,
    placeOfSupplyStateCode,
    isReverseCharge,
    priceEntryMode,
    hasDifferentShipping,
    shippingName,
    shippingAddress,
    shippingState,
    shippingStateCode,
    items,
    paymentStatus,
    amountPaid,
    paymentMethod,
    notes,
    terms,
    grandTotal: totals.grandTotal
  });

  // Keep snapshot ref updated synchronously with latest state
  useEffect(() => {
    currentSnapshotRef.current = {
      targetInvoiceId: initialData?.id,
      invoiceType,
      invoiceNumber,
      invoiceDate,
      dueDate,
      selectedCustomerId,
      customerName,
      customerGstin,
      customerAddress,
      customerCity,
      customerState,
      customerStateCode,
      customerPhone,
      customerEmail,
      placeOfSupplyState,
      placeOfSupplyStateCode,
      isReverseCharge,
      priceEntryMode,
      hasDifferentShipping,
      shippingName,
      shippingAddress,
      shippingState,
      shippingStateCode,
      items,
      paymentStatus,
      amountPaid,
      paymentMethod,
      notes,
      terms,
      grandTotal: totals.grandTotal
    };
  }, [
    initialData?.id,
    invoiceType,
    invoiceNumber,
    invoiceDate,
    dueDate,
    selectedCustomerId,
    customerName,
    customerGstin,
    customerAddress,
    customerCity,
    customerState,
    customerStateCode,
    customerPhone,
    customerEmail,
    placeOfSupplyState,
    placeOfSupplyStateCode,
    isReverseCharge,
    priceEntryMode,
    hasDifferentShipping,
    shippingName,
    shippingAddress,
    shippingState,
    shippingStateCode,
    items,
    paymentStatus,
    amountPaid,
    paymentMethod,
    notes,
    terms,
    totals.grandTotal
  ]);

  // Periodic Auto-Save Effect (Debounced + Interval)
  useEffect(() => {
    const performAutoSave = () => {
      const snap = currentSnapshotRef.current;
      if (hasMeaningfulDraftData(snap, business.defaultNotes, business.defaultTerms)) {
        setIsAutoSaving(true);
        const { success, savedAt } = saveInvoiceDraft(currentCompanyId, snap);
        if (success) {
          setLastAutoSavedAt(savedAt);
        }
        setTimeout(() => setIsAutoSaving(false), 600);
      }
    };

    // Debounce save 2.5 seconds after changes
    const debounceTimer = setTimeout(performAutoSave, 2500);

    // Periodic heartbeat interval every 5 seconds to ensure changes are synced
    const intervalTimer = setInterval(performAutoSave, 5000);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(intervalTimer);
    };
  }, [
    currentCompanyId,
    business.defaultNotes,
    business.defaultTerms,
    invoiceType,
    invoiceNumber,
    invoiceDate,
    dueDate,
    selectedCustomerId,
    customerName,
    customerGstin,
    customerAddress,
    customerCity,
    customerState,
    customerStateCode,
    customerPhone,
    customerEmail,
    placeOfSupplyState,
    placeOfSupplyStateCode,
    isReverseCharge,
    priceEntryMode,
    hasDifferentShipping,
    shippingName,
    shippingAddress,
    shippingState,
    shippingStateCode,
    items,
    paymentStatus,
    amountPaid,
    paymentMethod,
    notes,
    terms,
    totals.grandTotal
  ]);

  // Handle BeforeUnload: Instant synchronous save on accidental refresh or window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const snap = currentSnapshotRef.current;
      if (hasMeaningfulDraftData(snap, business.defaultNotes, business.defaultTerms)) {
        saveInvoiceDraft(currentCompanyId, snap);
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your invoice. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentCompanyId, business.defaultNotes, business.defaultTerms]);

  // Restore Draft to Editor State
  const handleRestoreDraft = (draft: InvoiceDraftPayload) => {
    try {
      if (draft.invoiceType) setInvoiceType(draft.invoiceType);
      if (draft.invoiceNumber) setInvoiceNumber(draft.invoiceNumber);
      if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate);
      if (draft.dueDate) setDueDate(draft.dueDate);
      if (draft.selectedCustomerId !== undefined) setSelectedCustomerId(draft.selectedCustomerId);
      if (draft.customerName !== undefined) setCustomerName(draft.customerName);
      if (draft.customerGstin !== undefined) setCustomerGstin(draft.customerGstin);
      if (draft.customerAddress !== undefined) setCustomerAddress(draft.customerAddress);
      if (draft.customerCity !== undefined) setCustomerCity(draft.customerCity);
      if (draft.customerState !== undefined) setCustomerState(draft.customerState);
      if (draft.customerStateCode !== undefined) setCustomerStateCode(draft.customerStateCode);
      if (draft.customerPhone !== undefined) setCustomerPhone(draft.customerPhone);
      if (draft.customerEmail !== undefined) setCustomerEmail(draft.customerEmail);
      if (draft.placeOfSupplyState !== undefined) setPlaceOfSupplyState(draft.placeOfSupplyState);
      if (draft.placeOfSupplyStateCode !== undefined) setPlaceOfSupplyStateCode(draft.placeOfSupplyStateCode);
      if (draft.isReverseCharge !== undefined) setIsReverseCharge(draft.isReverseCharge);
      if (draft.priceEntryMode !== undefined) setPriceEntryMode(draft.priceEntryMode);
      if (draft.hasDifferentShipping !== undefined) setHasDifferentShipping(draft.hasDifferentShipping);
      if (draft.shippingName !== undefined) setShippingName(draft.shippingName);
      if (draft.shippingAddress !== undefined) setShippingAddress(draft.shippingAddress);
      if (draft.shippingState !== undefined) setShippingState(draft.shippingState);
      if (draft.shippingStateCode !== undefined) setShippingStateCode(draft.shippingStateCode);
      if (draft.items && draft.items.length > 0) setItems(draft.items);
      if (draft.paymentStatus !== undefined) setPaymentStatus(draft.paymentStatus);
      if (draft.amountPaid !== undefined) setAmountPaid(draft.amountPaid);
      if (draft.paymentMethod !== undefined) setPaymentMethod(draft.paymentMethod);
      if (draft.notes !== undefined) setNotes(draft.notes);
      if (draft.terms !== undefined) setTerms(draft.terms);

      setLastAutoSavedAt(draft.savedAt);
      setAvailableDraft(null);
      showToast(
        'success', 
        'Draft Restored', 
        `Loaded uncommitted draft (${draft.items.length} line items, ₹${(draft.grandTotal || 0).toLocaleString('en-IN')}) from local storage.`
      );
    } catch (err) {
      console.warn('Failed to restore draft:', err);
      showToast('error', 'Restore Failed', 'Unable to restore draft from localStorage.');
    }
  };

  // Discard saved draft from localStorage
  const handleDiscardDraft = () => {
    clearInvoiceDraft(currentCompanyId, initialData?.id);
    setAvailableDraft(null);
    setLastAutoSavedAt(null);
    showToast('info', 'Draft Discarded', 'Unsaved draft removed from local storage.');
  };

  // Manual Trigger to Save Draft Now
  const handleManualSaveDraft = () => {
    const snap = currentSnapshotRef.current;
    if (!hasMeaningfulDraftData(snap, business.defaultNotes, business.defaultTerms)) {
      showToast('info', 'Nothing to Save', 'Please enter customer details or add items before saving draft.');
      return;
    }
    setIsAutoSaving(true);
    const { success, savedAt } = saveInvoiceDraft(currentCompanyId, snap);
    setIsAutoSaving(false);
    if (success) {
      setLastAutoSavedAt(savedAt);
      showToast(
        'success', 
        'Draft Saved Locally', 
        `Invoice draft saved to localStorage at ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`
      );
    }
  };

  // Attempt Safe Close / Navigation
  const handleAttemptClose = () => {
    const snap = currentSnapshotRef.current;
    const hasUnsaved = hasMeaningfulDraftData(snap, business.defaultNotes, business.defaultTerms);
    if (hasUnsaved) {
      setShowExitConfirmModal(true);
    } else {
      onClose();
    }
  };

  // Item row operations
  const handleAddItem = () => {
    const defaultRate = 0;
    const newGstRate = 18;
    const calcs = calculateItemGst(defaultRate, 1, 0, newGstRate, isInterState);

    const newItem: InvoiceItem = {
      id: 'item-' + Date.now(),
      name: '',
      description: '',
      serialNumber: '',
      warranty: lineSettings.defaultWarranty || '1 Year Comprehensive',
      hsnCode: '',
      unit: 'PCS',
      ...calcs
    };

    setItems(prev => {
      const nextList = [...prev, newItem];
      setActiveSuggestIndex(nextList.length - 1);
      return nextList;
    });
  };

  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);

  const handleSelectProductForIndex = (index: number, prod: Product) => {
    if (!prod.isService && prod.currentStock <= 0) {
      if (stockSettings.blockBillingOnOutOfStock) {
        showToast('error', 'Billing Blocked', `${prod.name} is out of stock (Stock: 0). Blocked by company low-stock policy.`);
        return;
      } else {
        showToast('warning', 'Out of Stock Warning', `${prod.name} is out of stock. Proceeding with negative inventory.`);
      }
    } else if (!prod.isService && isProductLowStock(prod, stockSettings) && stockSettings.warnOnLowStockBilling) {
      showToast('warning', 'Low Stock Warning', `${prod.name} has only ${prod.currentStock} ${prod.unit} left in stock.`);
    }

    setItems(prev => {
      const updated = [...prev];
      const calcs = calculateItemGst(
        prod.sellingPrice,
        updated[index]?.quantity || 1,
        updated[index]?.discountPercent || 0,
        prod.gstRate,
        isInterState
      );
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        originalPrice: prod.sellingPrice,
        name: prod.name,
        description: prod.description || updated[index]?.description || '',
        warranty: updated[index]?.warranty || lineSettings.defaultWarranty || '1 Year Comprehensive',
        hsnCode: prod.hsnCode,
        unit: prod.unit,
        batchNumber: prod.batches?.[0]?.batchNumber || updated[index]?.batchNumber,
        expiryDate: prod.batches?.[0]?.expiryDate || updated[index]?.expiryDate,
        ...calcs
      };
      return updated;
    });
    setActiveSuggestIndex(null);
  };

  // Custom Item Amount & Unit Rate Modal Handlers
  const handleOpenEditItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    setEditingItemIndex(index);
    setEditPriceMode(priceEntryMode);
    setEditRate(item.rate);
    setEditTotal(item.totalAmount);
    setEditQuantity(item.quantity || 1);
    setEditUnit(item.unit || 'PCS');
    setEditDiscountPercent(item.discountPercent || 0);
    setEditGstRate(item.gstRate ?? 18);
    setEditCessRate(item.cessRate || 0);
    setEditDescription(item.description || '');
    setEditSerialNumber(item.serialNumber || '');
    setEditWarranty(item.warranty || '');
    setEditBatchNumber(item.batchNumber || '');
  };

  const handleEditRateChange = (val: number) => {
    const r = Math.max(0, val);
    setEditRate(r);
    const calcs = calculateItemGst(r, editQuantity, editDiscountPercent, editGstRate, isInterState, editCessRate);
    setEditTotal(calcs.totalAmount);
  };

  const handleEditTotalChange = (val: number) => {
    const t = Math.max(0, val);
    setEditTotal(t);
    const calculatedRate = calculateBaseRateFromInclusive(t, Math.max(0.0001, editQuantity), editDiscountPercent, editGstRate, editCessRate);
    setEditRate(calculatedRate);
  };

  const handleEditQuantityChange = (qty: number) => {
    const q = Math.max(0.01, qty);
    setEditQuantity(q);
    if (editPriceMode === 'INCLUSIVE') {
      const calculatedRate = calculateBaseRateFromInclusive(editTotal, q, editDiscountPercent, editGstRate, editCessRate);
      setEditRate(calculatedRate);
    } else {
      const calcs = calculateItemGst(editRate, q, editDiscountPercent, editGstRate, isInterState, editCessRate);
      setEditTotal(calcs.totalAmount);
    }
  };

  const handleEditDiscountChange = (disc: number) => {
    const d = Math.max(0, Math.min(100, disc));
    setEditDiscountPercent(d);
    if (editPriceMode === 'INCLUSIVE') {
      const calculatedRate = calculateBaseRateFromInclusive(editTotal, Math.max(0.0001, editQuantity), d, editGstRate, editCessRate);
      setEditRate(calculatedRate);
    } else {
      const calcs = calculateItemGst(editRate, editQuantity, d, editGstRate, isInterState, editCessRate);
      setEditTotal(calcs.totalAmount);
    }
  };

  const handleEditGstChange = (gst: GstTaxRate) => {
    setEditGstRate(gst);
    if (editPriceMode === 'INCLUSIVE') {
      const calculatedRate = calculateBaseRateFromInclusive(editTotal, Math.max(0.0001, editQuantity), editDiscountPercent, gst, editCessRate);
      setEditRate(calculatedRate);
    } else {
      const calcs = calculateItemGst(editRate, editQuantity, editDiscountPercent, gst, isInterState, editCessRate);
      setEditTotal(calcs.totalAmount);
    }
  };

  const handleSaveEditedItem = () => {
    if (editingItemIndex === null) return;
    const target = items[editingItemIndex];
    if (!target) return;

    const finalRate = editPriceMode === 'INCLUSIVE'
      ? calculateBaseRateFromInclusive(editTotal, Math.max(0.0001, editQuantity), editDiscountPercent, editGstRate, editCessRate)
      : editRate;

    const calcs = calculateItemGst(finalRate, editQuantity, editDiscountPercent, editGstRate, isInterState, editCessRate);

    setItems(prev => {
      const next = [...prev];
      next[editingItemIndex] = {
        ...target,
        quantity: editQuantity,
        unit: editUnit,
        rate: finalRate,
        discountPercent: editDiscountPercent,
        gstRate: editGstRate,
        cessRate: editCessRate,
        description: editDescription,
        serialNumber: editSerialNumber,
        warranty: editWarranty,
        batchNumber: editBatchNumber,
        ...calcs,
        totalAmount: editPriceMode === 'INCLUSIVE' ? editTotal : calcs.totalAmount
      };
      return next;
    });

    setEditingItemIndex(null);
    showToast('success', 'Custom Rate Applied', `Applied custom rate of ₹${finalRate.toFixed(2)} to ${target.name || 'item'}.`);
  };

  const handleResetItemToMRP = (index: number) => {
    const target = items[index];
    if (!target) return;
    const prod = products.find(p => p.id === target.productId);
    const defaultRate = target.originalPrice ?? prod?.sellingPrice ?? target.rate;
    
    const calcs = calculateItemGst(defaultRate, target.quantity || 1, 0, prod?.gstRate ?? target.gstRate, isInterState, prod?.cessRate ?? target.cessRate);
    
    setItems(prev => {
      const next = [...prev];
      next[index] = {
        ...target,
        rate: defaultRate,
        discountPercent: 0,
        gstRate: prod?.gstRate ?? target.gstRate,
        cessRate: prod?.cessRate ?? target.cessRate,
        ...calcs
      };
      return next;
    });
    
    showToast('info', 'Reset to Standard Rate', `Reset "${target.name || 'item'}" to standard rate ₹${defaultRate.toLocaleString('en-IN')}`);
  };

  const handleItemQtyStep = (index: number, delta: number) => {
    setItems(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const newQty = Math.max(0.01, Math.round(((target.quantity || 1) + delta) * 100) / 100);
      const calcs = calculateItemGst(target.rate, newQty, target.discountPercent, target.gstRate, isInterState, target.cessRate);
      next[index] = {
        ...target,
        quantity: newQty,
        ...calcs
      };
      return next;
    });
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    handleSelectProductForIndex(index, prod);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems(prev => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: val };

      // Check if HSN code was changed, and if so, check if we can auto-suggest GST rate
      if (field === 'hsnCode') {
        const valStr = String(val).trim();
        const matchCustom = customHsnCodes.find(c => c.code.toLowerCase() === valStr.toLowerCase());
        if (matchCustom) {
          target.gstRate = matchCustom.gstRate;
          if (matchCustom.uqc && matchCustom.uqc !== 'OTH' && (!target.unit || target.unit === 'PCS')) {
            target.unit = matchCustom.uqc;
          }
        } else {
          const suggestedGst = suggestRateForHsn(valStr);
          if (suggestedGst !== undefined && target.gstRate !== suggestedGst) {
            target.gstRate = suggestedGst;
          }
        }
      }
      
      const calcs = calculateItemGst(
        field === 'rate' ? Number(val) : target.rate,
        field === 'quantity' ? Number(val) : target.quantity,
        field === 'discountPercent' ? Number(val) : target.discountPercent,
        field === 'gstRate' ? Number(val) as GstTaxRate : target.gstRate,
        isInterState,
        target.cessRate || 0
      );

      updated[index] = {
        ...target,
        ...calcs
      };
      return updated;
    });
  };

  // Direct Total Line Sale Amount (Tax Inclusive) Change Handler
  // Back-calculates Base Unit Rate, Taxable Value, and item-wise CGST/SGST/IGST breakdown
  const handleItemInclusiveTotalChange = (index: number, val: number) => {
    const totalInclusive = Math.max(0, val);
    setItems(prev => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) return prev;

      const qty = Math.max(0.0001, target.quantity || 1);
      const disc = Math.max(0, Math.min(100, target.discountPercent || 0));
      const gst = target.gstRate || 0;
      const cess = target.cessRate || 0;

      const calculatedRate = calculateBaseRateFromInclusive(totalInclusive, qty, disc, gst, cess);
      const calcs = calculateItemGst(calculatedRate, qty, disc, gst, isInterState, cess);

      updated[index] = {
        ...target,
        rate: calculatedRate,
        ...calcs,
        totalAmount: totalInclusive
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (activeSuggestIndex === index) {
      setActiveSuggestIndex(null);
    }
  };

  const applyGstRateToAllItems = (rate: GstTaxRate) => {
    setItems(prev =>
      prev.map(item => {
        const calcs = calculateItemGst(
          item.rate,
          item.quantity,
          item.discountPercent,
          rate,
          isInterState,
          item.cessRate || 0
        );
        return {
          ...item,
          ...calcs
        };
      })
    );
    showToast('info', 'Tax Rate Applied', `Applied ${rate}% GST (${isInterState ? 'IGST' : 'CGST+SGST'}) to all line items.`);
  };

  // Submit invoice
  const handleSaveInvoice = (action: 'close' | 'print' | 'dispatch' | boolean = 'close') => {
    const mode = typeof action === 'boolean' ? (action ? 'print' : 'close') : action;
    if (!customerName.trim()) {
      showToast('error', 'Missing Customer', 'Please enter customer or party name.');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'No Items', 'Please add at least one line item.');
      return;
    }

    const calculatedPaid = paymentStatus === 'PAID' ? totals.grandTotal : amountPaid;
    const calculatedDue = Math.max(0, totals.grandTotal - calculatedPaid);

    const invoicePayload = {
      invoiceNumber,
      invoiceType,
      invoiceDate,
      dueDate,
      status: (calculatedDue === 0 ? 'PAID' : (calculatedPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID')) as InvoiceStatus,
      sellerGstin: business.gstin,
      sellerStateCode: business.stateCode,
      sellerState: business.state,
      customerId: selectedCustomerId || 'party-retail',
      customerName,
      customerGstin: customerGstin ? customerGstin.toUpperCase().trim() : undefined,
      customerAddress,
      customerCity,
      customerState,
      customerStateCode,
      customerPhone,
      customerEmail,
      placeOfSupplyState,
      placeOfSupplyStateCode,
      isInterState,
      isReverseCharge,
      hasDifferentShippingAddress: hasDifferentShipping,
      shippingName: hasDifferentShipping ? shippingName : undefined,
      shippingAddress: hasDifferentShipping ? shippingAddress : undefined,
      shippingState: hasDifferentShipping ? shippingState : undefined,
      shippingStateCode: hasDifferentShipping ? shippingStateCode : undefined,
      items,
      subTotalTaxable: totals.subTotalTaxable,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      totalIgst: totals.totalIgst,
      totalCess: totals.totalCess,
      totalTax: totals.totalTax,
      totalDiscount: totals.totalDiscount,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      amountPaid: calculatedPaid,
      amountDue: calculatedDue,
      paymentMethod,
      notes,
      terms,
    };

    if (isEditing && isDuplicateInvoiceNumber) {
      showToast('error', 'Duplicate Invoice Number', `Invoice number "${invoiceNumber}" is already in use. Please enter a unique invoice number.`);
      return;
    }

    // Purge draft from localStorage upon confirmed save
    clearInvoiceDraft(currentCompanyId, initialData?.id);
    setAvailableDraft(null);
    setLastAutoSavedAt(null);

    let savedInv: Invoice;
    if (isEditing && initialData?.id) {
      const updated = updateInvoice(initialData.id, invoicePayload);
      if (!updated) {
        return;
      }
      savedInv = { ...invoicePayload, id: initialData.id, createdAt: initialData.createdAt || new Date().toISOString() } as Invoice;
      if (mode === 'print') {
        onClose();
        setSelectedInvoiceIdForPrint(initialData.id);
      } else if (mode === 'dispatch') {
        setDispatchModalInvoice(savedInv);
      } else {
        onClose();
      }
    } else {
      const created = createInvoice(invoicePayload);
      savedInv = (created || { ...invoicePayload, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }) as Invoice;
      if (mode === 'print') {
        onClose();
        if (created?.id) {
          setSelectedInvoiceIdForPrint(created.id);
        }
      } else if (mode === 'dispatch') {
        setDispatchModalInvoice(savedInv);
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAttemptClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Go back / Exit invoice"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isEditing ? `Edit Invoice ${invoiceNumber}` : 'Create GST Tax Invoice'}
              </h1>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                isInterState 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEditing 
                ? 'Modify particulars, serial numbers, tax rates, or recipient details for this invoice'
                : 'Generate GST compliant invoices with accurate tax calculations and e-invoice readiness'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Auto-Save Indicator Badge */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs shadow-xs select-none"
            title={lastAutoSavedAt ? `Auto-saved to localStorage at ${new Date(lastAutoSavedAt).toLocaleTimeString()}` : 'Auto-save is tracking changes in background'}
          >
            {isAutoSaving ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px]">Saving draft...</span>
              </>
            ) : lastAutoSavedAt ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  Draft saved <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{formatDraftTime(lastAutoSavedAt)}</strong>
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Auto-save active</span>
              </>
            )}

            <button
              type="button"
              onClick={handleManualSaveDraft}
              className="ml-1 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Save draft to localStorage now"
            >
              <HardDrive className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSaveInvoice('dispatch')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Save and dispatch via WhatsApp / Email"
          >
            <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Save & Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveInvoice(false)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{isEditing ? 'Update & Close' : 'Save & Close'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveInvoice(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isEditing ? 'Update & Print' : 'Save & Print Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Recovered Unsaved Draft Banner */}
      {availableDraft && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-indigo-500/10 border border-amber-500/30 dark:border-amber-500/20 text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Unsaved Draft Found
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Saved {formatDraftTime(availableDraft.savedAt)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Recovered draft for <strong className="font-semibold text-slate-900 dark:text-white">{availableDraft.customerName || 'Unnamed Party'}</strong> with <strong className="font-semibold">{availableDraft.items?.length || 0} items</strong> (Total: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">₹{(availableDraft.grandTotal || 0).toLocaleString('en-IN')}</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => handleRestoreDraft(availableDraft)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Draft</span>
            </button>

            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Discard saved draft and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={() => setAvailableDraft(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Dismiss banner (draft remains safely stored)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Left Column (Invoice Details & Items) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Meta Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Document Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Doc Type</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="TAX_INVOICE">Tax Invoice</option>
                  <option value="BILL_OF_SUPPLY">Bill of Supply</option>
                  <option value="QUOTATION">Quotation / Estimate</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Number</label>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        const seq = getNextSequentialInvoiceNumber();
                        setInvoiceNumber(seq.invoiceNumber);
                        showToast('info', 'Sequence Refreshed', `Assigned next consecutive serial ${seq.invoiceNumber}`);
                      }}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Fetch live consecutive invoice number"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Auto-Sync</span>
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800 border ${
                      isDuplicateInvoiceNumber 
                        ? 'border-rose-500 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/20' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20'
                    } rounded-xl focus:outline-none`}
                    required
                  />
                  {isDuplicateInvoiceNumber && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      Duplicate No.
                    </span>
                  )}
                </div>
                {isDuplicateInvoiceNumber && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-1 font-medium">
                    ⚠️ Another invoice already uses this number. Must be unique.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Customer / Buyer Information & Supply Details */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Customer Details & Location
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Saved Customer / Party
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Existing Contact --</option>
                  {parties.filter(p => p.type !== 'VENDOR').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.gstin ? `(${p.gstin})` : ''} - {p.state} ({p.stateCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Corp or Rajesh Kumar"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Customer GSTIN</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">State auto-syncs</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={customerGstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="27AABCU9603R1ZM"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl uppercase text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Registered State
                </label>
                <select
                  value={customerStateCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const st = INDIAN_STATES.find(s => s.code === code);
                    const name = st ? st.name : customerState;
                    setCustomerStateCode(code);
                    setCustomerState(name);
                    setPlaceOfSupplyStateCode(code);
                    setPlaceOfSupplyState(name);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Place of Supply (POS)
                </label>
                <select
                  value={placeOfSupplyStateCode}
                  onChange={(e) => {
                    const stCode = e.target.value;
                    const st = INDIAN_STATES.find(s => s.code === stCode);
                    setPlaceOfSupplyStateCode(stCode);
                    setPlaceOfSupplyState(st ? st.name : '');
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone / Mobile</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Full Street Address, City, Pincode"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Clean Supply Mode & Reverse Charge Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tax Type:</span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                  isInterState
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  POS: {placeOfSupplyState} ({placeOfSupplyStateCode})
                </span>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={isReverseCharge}
                  onChange={(e) => setIsReverseCharge(e.target.checked)}
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Reverse Charge (RCM)</span>
              </label>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Line Items & Products
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add products, services, custom selling rates, and item-wise GST tax rates
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Two Flexible Entry Modes Selector */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="px-2 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Entry Mode:</span>
                  <button
                    type="button"
                    onClick={() => setPriceEntryMode('EXCLUSIVE')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      priceEntryMode === 'EXCLUSIVE'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Enter custom selling rate directly before tax (Tax Exclusive)"
                  >
                    Rate (Excl. Tax)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceEntryMode('INCLUSIVE')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      priceEntryMode === 'INCLUSIVE'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Enter flat final customer amount inclusive of GST (Tax Inclusive)"
                  >
                    Line Total (Incl. Tax)
                  </button>
                </div>

                <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] border border-slate-200 dark:border-slate-700">
                  <span className="px-2 text-slate-500 dark:text-slate-400 font-medium">Quick Apply GST:</span>
                  {([0, 5, 12, 18, 28] as GstTaxRate[]).map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => applyGstRateToAllItems(rate)}
                      className="px-2 py-0.5 rounded-lg font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-600"
                    >
                      {rate}%
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item Row</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {items.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <h4 className="font-bold text-sm text-slate-800">No Line Items Added</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      You can add products, services, custom serial numbers, and warranty lines to this invoice.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Product Line</span>
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse min-w-[840px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold bg-slate-50/80 dark:bg-slate-800/80">
                      <th className="py-2.5 px-3">Item Particulars & Details</th>
                      <th className="py-2.5 px-2 w-32">
                        <div className="flex items-center justify-between">
                          <span>HSN/SAC</span>
                          <button
                            type="button"
                            onClick={() => setIsCustomHsnModalOpen(true)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                            title="Manage custom HSN/SAC codes"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </th>
                      <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                      <th className="py-2.5 px-2 w-20">Unit</th>
                      <th className={`py-2.5 px-2 w-28 ${priceEntryMode === 'EXCLUSIVE' ? 'bg-indigo-50/70 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-bold' : ''}`}>
                        <div className="flex items-center gap-1">
                          <span>Rate (₹ Excl.)</span>
                          {priceEntryMode === 'EXCLUSIVE' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>}
                        </div>
                      </th>
                      <th className="py-2.5 px-2 w-16 text-center">Disc %</th>
                      <th className="py-2.5 px-2 w-48">
                        Item GST ({isInterState ? 'IGST' : 'CGST+SGST'})
                      </th>
                      <th className={`py-2.5 px-3 text-right w-32 ${priceEntryMode === 'INCLUSIVE' ? 'bg-indigo-50/70 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-bold' : ''}`}>
                        <div className="flex items-center justify-end gap-1">
                          {priceEntryMode === 'INCLUSIVE' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>}
                          <span>Line Total (₹ Incl.)</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((item, idx) => {
                      const searchFilteredProducts = products.filter(p => {
                        if (!item.name || item.name.length < 1) return true;
                        const query = item.name.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(query) ||
                          p.sku.toLowerCase().includes(query) ||
                          p.hsnCode.includes(query) ||
                          (p.category && p.category.toLowerCase().includes(query))
                        );
                      });

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900">
                            <td className="py-2.5 px-3 align-top">
                              {/* Product Name with Autocomplete Input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    handleItemChange(idx, 'name', e.target.value);
                                    setActiveSuggestIndex(idx);
                                  }}
                                  onFocus={() => setActiveSuggestIndex(idx)}
                                  placeholder="Type to search product or enter custom name..."
                                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all"
                                  required
                                />

                                {/* Auto-Complete Dropdown */}
                                {activeSuggestIndex === idx && searchFilteredProducts.length > 0 && (
                                  <div className="absolute left-0 top-full mt-1 w-full sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                      <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                        Matching Inventory ({searchFilteredProducts.length})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveSuggestIndex(null);
                                        }}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1"
                                      >
                                        Close ✕
                                      </button>
                                    </div>
                                    {searchFilteredProducts.map((p) => {
                                      const isOutOfStock = isProductOutOfStock(p);
                                      const isLow = isProductLowStock(p, stockSettings);
                                      const effectiveThresh = getProductStockThreshold(p, stockSettings);

                                      return (
                                        <div
                                          key={p.id}
                                          onClick={() => handleSelectProductForIndex(idx, p)}
                                          className={`p-2.5 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                                            isOutOfStock && stockSettings.blockBillingOnOutOfStock
                                              ? 'hover:bg-rose-50/70 dark:hover:bg-rose-950/40 bg-rose-50/20 dark:bg-rose-950/20'
                                              : 'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40'
                                          }`}
                                        >
                                          <div className="space-y-0.5">
                                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                              <span>{p.name}</span>
                                              {p.id === item.productId && (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded">Selected</span>
                                              )}
                                              {isOutOfStock ? (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold rounded flex items-center gap-0.5">
                                                  <Ban className="w-2.5 h-2.5" /> Out of stock
                                                </span>
                                              ) : isLow ? (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold rounded flex items-center gap-0.5">
                                                  <AlertTriangle className="w-2.5 h-2.5" /> Low stock
                                                </span>
                                              ) : null}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                              <span className="font-mono">HSN: {p.hsnCode}</span>
                                              <span>•</span>
                                              <span>Stock: <strong className={isOutOfStock ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}>{p.currentStock} {p.unit}</strong></span>
                                              <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px]">(Min: {effectiveThresh})</span>
                                              {p.category && (
                                                <>
                                                  <span>•</span>
                                                  <span className="text-slate-400 dark:text-slate-500">{p.category}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right whitespace-nowrap">
                                            <div className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                                              ₹{p.sellingPrice.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                              +{p.gstRate}% GST
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Item Action & Custom Amount Toolbar */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(idx)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                  title="Open Custom Amount (₹Rate) & Flexible Entry Editor"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                  <span>Custom Amount (₹{item.rate.toLocaleString('en-IN')})</span>
                                </button>

                                {/* Visual Badges & Revert: Customized items display a Custom Rate badge with an instant ↺ Reset to MRP button */}
                                {((item.originalPrice !== undefined && item.rate !== item.originalPrice) || 
                                  (item.productId && products.find(p => p.id === item.productId)?.sellingPrice !== undefined && products.find(p => p.id === item.productId)!.sellingPrice !== item.rate)) && (
                                  <>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      <Tag className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                      Custom Rate
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleResetItemToMRP(idx)}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                      title="Reset to standard MRP rate"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                                      ↺ Reset to MRP (₹{(item.originalPrice ?? products.find(p => p.id === item.productId)?.sellingPrice)?.toLocaleString('en-IN')})
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-2 align-top">
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`inv-hsn-list-${idx}`}
                                  value={item.hsnCode}
                                  onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                                  placeholder="HSN / SAC"
                                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <datalist id={`inv-hsn-list-${idx}`}>
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
                                  className="mt-1 w-full text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/60 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/70 border border-indigo-200/60 dark:border-indigo-800 rounded-md py-0.5 px-1 flex items-center justify-center gap-1 transition-all cursor-pointer truncate shadow-2xs"
                                  title="Open App HSN / SAC Directory Dialog"
                                >
                                  <Search className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">Lookup Code...</span>
                                </button>
                              </div>
                            </td>

                            {/* Direct Quantity Input & Minus/Plus Stepper Buttons */}
                            <td className="py-2.5 px-2 align-top">
                              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyStep(idx, -1)}
                                  className="px-1.5 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer shrink-0"
                                  title="Decrease quantity by 1"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-12 py-1 bg-white dark:bg-slate-900 text-xs font-bold text-center text-slate-900 dark:text-white focus:outline-none"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyStep(idx, 1)}
                                  className="px-1.5 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer shrink-0"
                                  title="Increase quantity by 1"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-2 align-top">
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                className="w-full px-1 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                              >
                                {STANDARD_UNITS.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>

                            {/* Base Unit Rate (Tax Exclusive) Column */}
                            <td className="py-2.5 px-2 align-top">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.rate}
                                  onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                  className={`w-full px-2 py-1.5 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                    priceEntryMode === 'EXCLUSIVE'
                                      ? 'bg-white dark:bg-slate-900 border-2 border-indigo-400 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-2xs font-bold'
                                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                  }`}
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center justify-between">
                                <span>Base Excl.</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(idx)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[9px] cursor-pointer"
                                >
                                  Edit ₹
                                </button>
                              </div>
                            </td>

                            {/* Item-Level Discounts with Quick Presets */}
                            <td className="py-2.5 px-2 align-top">
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPercent || ''}
                                  onChange={(e) => handleItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-center text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="0"
                                />
                                <div className="flex justify-center gap-1">
                                  {[5, 10].map(disc => (
                                    <button
                                      key={disc}
                                      type="button"
                                      onClick={() => handleItemChange(idx, 'discountPercent', item.discountPercent === disc ? 0 : disc)}
                                      className={`px-1 py-0.2 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                        item.discountPercent === disc ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                      title={`Apply ${disc}% discount`}
                                    >
                                      {disc}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* ITEM-WISE GST RATE & BREAKDOWN */}
                            <td className="py-2.5 px-2 align-top">
                              <div className="space-y-1">
                                <select
                                  value={item.gstRate}
                                  onChange={(e) => handleItemChange(idx, 'gstRate', parseInt(e.target.value) as GstTaxRate)}
                                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                                >
                                  <option value="0">0% (Nil / Exempt)</option>
                                  <option value="5">5% (Essential Goods)</option>
                                  <option value="12">12% (Standard Slabs)</option>
                                  <option value="18">18% (Standard Goods/Services)</option>
                                  <option value="28">28% (Luxury / De-merit)</option>
                                </select>

                                {/* Dynamic Item-Wise Tax Split Tag */}
                                <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight ${
                                  isInterState ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                  {isInterState ? (
                                    <span>IGST {item.gstRate}% : ₹{item.igstAmount.toFixed(2)}</span>
                                  ) : (
                                    <span>CGST {item.cgstRate}% (₹{item.cgstAmount.toFixed(2)}) + SGST {item.sgstRate}% (₹{item.sgstAmount.toFixed(2)})</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Total Line Sale Amount (Tax Inclusive) Column */}
                            <td className="py-2.5 px-3 text-right font-mono align-top">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.totalAmount}
                                  onChange={(e) => handleItemInclusiveTotalChange(idx, parseFloat(e.target.value) || 0)}
                                  className={`w-full px-2 py-1.5 text-right rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                    priceEntryMode === 'INCLUSIVE'
                                      ? 'bg-white dark:bg-slate-900 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-2xs'
                                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold'
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                Taxable: {formatCurrency(item.taxableAmount, business.currencySymbol)}
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Secondary Description Line & Tracking Row (Sr. No., Warranty & Multi-line Description) */}
                          <tr className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                            <td colSpan={9} className="px-3 py-2">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                                {/* Serial Number (Sr. No. / IMEI) */}
                                {lineSettings.enableSerialNumber && (
                                  <div className="md:col-span-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/70 px-2 py-1 rounded-md whitespace-nowrap">
                                      {lineSettings.serialNumberLabel || 'Sr. No.'}:
                                    </span>
                                    <input
                                      type="text"
                                      value={item.serialNumber || ''}
                                      onChange={(e) => handleItemChange(idx, 'serialNumber', e.target.value)}
                                      placeholder="e.g. SN-882910, IMEI: 86492004..."
                                      className="w-full px-2.5 py-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                  </div>
                                )}

                                {/* Warranty Line & Quick Presets */}
                                {lineSettings.enableWarranty && (
                                  <div className="md:col-span-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                      {lineSettings.warrantyLabel || 'Warranty'}:
                                    </span>
                                    <input
                                      type="text"
                                      value={item.warranty || ''}
                                      onChange={(e) => handleItemChange(idx, 'warranty', e.target.value)}
                                      placeholder="e.g. 1 Year Comprehensive"
                                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                    {lineSettings.warrantyOptions && lineSettings.warrantyOptions.length > 0 && (
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleItemChange(idx, 'warranty', e.target.value);
                                          }
                                        }}
                                        className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 text-slate-600 dark:text-slate-300 cursor-pointer max-w-[90px]"
                                        title="Quick select warranty preset"
                                      >
                                        <option value="">Presets...</option>
                                        {lineSettings.warrantyOptions.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                )}

                                {/* Batch No. if enabled */}
                                {lineSettings.enableBatchNumber && (
                                  <div className="md:col-span-4 flex items-center gap-1.5">
                                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Batch:</span>
                                    <input
                                      type="text"
                                      value={item.batchNumber || ''}
                                      onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                                      placeholder="Batch No."
                                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                  </div>
                                )}

                                {/* Multi-line Description Line */}
                                {lineSettings.enableDescription && (
                                  <div className="md:col-span-12 flex items-center gap-2 pt-0.5">
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                      Description:
                                    </span>
                                    <input
                                      type="text"
                                      value={item.description || ''}
                                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                      placeholder={lineSettings.descriptionPlaceholder || 'Item specs, particulars or notes...'}
                                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 dark:placeholder-slate-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Invoice Calculation & Tax Summary Sidebar */}
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Invoice Calculation</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold ${
                isInterState ? 'bg-indigo-950 text-cyan-300 border border-cyan-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isInterState ? 'IGST Regime' : 'CGST + SGST Regime'}
              </span>
            </h3>

            {/* State Route summary pill */}
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span>Supply Route:</span>
                <span className="font-semibold text-slate-200">
                  {business.state} ({business.stateCode}) ➔ {placeOfSupplyState} ({placeOfSupplyStateCode})
                </span>
              </div>
              <div className="flex justify-between items-center text-cyan-400 font-medium">
                <span>Suggested Tax Type:</span>
                <span>{isInterState ? 'Integrated GST (IGST)' : 'Central + State GST'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-b border-slate-800 pb-3">
              <div className="flex justify-between text-slate-300">
                <span>Taxable Amount:</span>
                <span className="font-mono font-semibold">{formatCurrency(totals.subTotalTaxable, business.currencySymbol)}</span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Line Item Discounts:</span>
                  <span className="font-mono">- {formatCurrency(totals.totalDiscount, business.currencySymbol)}</span>
                </div>
              )}

              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <span>CGST (Central Tax):</span>
                    </span>
                    <span className="font-mono">{formatCurrency(totals.totalCgst, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <span>SGST / UTGST:</span>
                    </span>
                    <span className="font-mono">{formatCurrency(totals.totalSgst, business.currencySymbol)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-300">
                  <span>IGST (Integrated Tax):</span>
                  <span className="font-mono text-cyan-300">{formatCurrency(totals.totalIgst, business.currencySymbol)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                <span>Total Tax Amount:</span>
                <span className="font-mono text-slate-200 font-semibold">{formatCurrency(totals.totalTax, business.currencySymbol)}</span>
              </div>

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Round Off:</span>
                  <span className="font-mono">{totals.roundOff > 0 ? '+' : ''}{totals.roundOff}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-bold text-slate-200">Grand Total:</span>
              <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                {formatCurrency(totals.grandTotal, business.currencySymbol)}
              </span>
            </div>

            {/* Payment settlement options */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Payment Collection & Settlement
                </label>
                {paymentStatus === 'PARTIALLY_PAID' && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                    Partial Settlement
                  </span>
                )}
              </div>

              {/* 3-Way Settlement Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PAID');
                    setAmountPaid(totals.grandTotal);
                  }}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Fully Paid (100%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PARTIALLY_PAID');
                    if (amountPaid <= 0 || amountPaid >= totals.grandTotal) {
                      setAmountPaid(Math.round(totals.grandTotal / 2));
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Custom Settlement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('UNPAID');
                    setAmountPaid(0);
                  }}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    paymentStatus === 'UNPAID'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Credit / Unpaid
                </button>
              </div>

              {/* Custom Partial Settlement Controls */}
              {paymentStatus === 'PARTIALLY_PAID' && (
                <div className="p-3 rounded-xl bg-slate-800/90 border border-amber-500/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Partial Amount Paid:</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{business.currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        max={totals.grandTotal}
                        value={amountPaid || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setAmountPaid(Math.min(totals.grandTotal, Math.max(0, val)));
                        }}
                        className="w-32 pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-amber-400/60 rounded-lg text-white text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {[0.25, 0.5, 0.75].map((ratio) => {
                      const presetAmt = Math.round(totals.grandTotal * ratio);
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAmountPaid(presetAmt)}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-700 hover:bg-slate-600 text-amber-300 border border-slate-600 cursor-pointer"
                        >
                          {ratio * 100}% ({business.currencySymbol}{presetAmt})
                        </button>
                      );
                    })}
                  </div>

                  {/* Pending Balance Due calculation */}
                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Pending Balance Due:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {formatCurrency(Math.max(0, totals.grandTotal - amountPaid), business.currencySymbol)}
                    </span>
                  </div>
                </div>
              )}

              {(paymentStatus === 'PAID' || paymentStatus === 'PARTIALLY_PAID') && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Settlement Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none cursor-pointer"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSaveInvoice('dispatch')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Save & Dispatch (WhatsApp / Email)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveInvoice(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Save & Print Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveInvoice(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-600" />
                <span>Save & Close</span>
              </button>
            </div>
          </div>

          {/* Notes & Terms Box */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Authorized Signatory Preview */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileSignature className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Authorized Signatory
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Included on Invoice
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-[11px]">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{business.signatoryName || 'Authorized Signatory'}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">{business.signatoryDesignation || 'Authorised Person'}</div>
                </div>
                <img
                  src={normalizeSignatureUrl(business.signatureUrl)}
                  alt="Authorized Signature"
                  className="h-9 max-w-[100px] object-contain bg-white dark:bg-slate-700 p-1 rounded border border-slate-200 dark:border-slate-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Custom Item Sale Amount & Unit Rate Modal */}
      {editingItemIndex !== null && items[editingItemIndex] && (() => {
        const currentItem = items[editingItemIndex];
        const prod = products.find(p => p.id === currentItem.productId);
        const standardMrp = currentItem.originalPrice ?? prod?.sellingPrice ?? currentItem.rate;
        
        const effectiveBaseRate = editPriceMode === 'INCLUSIVE'
          ? calculateBaseRateFromInclusive(editTotal, Math.max(0.0001, editQuantity), editDiscountPercent, editGstRate, editCessRate)
          : editRate;

        const liveCalcs = calculateItemGst(
          effectiveBaseRate,
          editQuantity,
          editDiscountPercent,
          editGstRate,
          isInterState,
          editCessRate
        );

        const isCustomized = (currentItem.originalPrice !== undefined && effectiveBaseRate !== currentItem.originalPrice) ||
          (prod?.sellingPrice !== undefined && effectiveBaseRate !== prod.sellingPrice);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto modal-overlay">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-[96vw] sm:max-w-lg md:max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto">
              {/* Modal Header */}
              <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate">Custom Item Sale Amount & Rate Editor</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Configure custom selling prices, inclusive line totals, quantities & GST breakdown
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItemIndex(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto modal-content-scroll space-y-3.5 sm:space-y-4 flex-1">
                {/* Selected Item Summary Card with Visual Badges & Revert */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {currentItem.name || 'Untitled Item'}
                      </span>
                      {currentItem.hsnCode && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          HSN: {currentItem.hsnCode}
                        </span>
                      )}
                      {isCustomized ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Tag className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          Custom Rate Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Standard MRP
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Standard MRP / Rate: <strong className="text-slate-700 dark:text-slate-200 font-mono">₹{standardMrp.toLocaleString('en-IN')}</strong></span>
                      {prod && <span>• Stock: <strong className="text-slate-700 dark:text-slate-200">{prod.currentStock} {prod.unit}</strong></span>}
                    </div>
                  </div>

                  {/* Instant Reset to MRP Button */}
                  {isCustomized && (
                    <button
                      type="button"
                      onClick={() => {
                        handleEditRateChange(standardMrp);
                        setEditDiscountPercent(0);
                        showToast('info', 'Reset to Standard Rate', `Reset rate to MRP ₹${standardMrp.toLocaleString('en-IN')}`);
                      }}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs transition-colors cursor-pointer"
                      title="Reset to MRP / Default selling price"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>↺ Reset to MRP (₹{standardMrp.toLocaleString('en-IN')})</span>
                    </button>
                  )}
                </div>

                {/* Two Flexible Entry Modes Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Select Pricing Entry Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setEditPriceMode('EXCLUSIVE');
                        setEditRate(effectiveBaseRate);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
                        editPriceMode === 'EXCLUSIVE'
                          ? 'bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 shadow-sm border border-indigo-200 dark:border-indigo-800'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${editPriceMode === 'EXCLUSIVE' ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        <span>Base Unit Rate (Tax Exclusive)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-3.5">
                        Enter custom selling rate directly before tax
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditPriceMode('INCLUSIVE');
                        setEditTotal(liveCalcs.totalAmount);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
                        editPriceMode === 'INCLUSIVE'
                          ? 'bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 shadow-sm border border-indigo-200 dark:border-indigo-800'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${editPriceMode === 'INCLUSIVE' ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        <span>Total Line Sale (Tax Inclusive)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-3.5">
                        Enter flat final customer amount (e.g. ₹1,000 all incl.)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Mode-Specific Price Input */}
                {editPriceMode === 'EXCLUSIVE' ? (
                  <div className="space-y-2 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                    <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Custom Base Selling Rate (₹ Excl. Tax):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-600 dark:text-indigo-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editRate || ''}
                        onChange={(e) => handleEditRateChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 text-base font-bold font-mono bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-500 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        autoFocus
                      />
                    </div>

                    {/* Quick Rate Preset Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Quick Rates:</span>
                      <button
                        type="button"
                        onClick={() => handleEditRateChange(standardMrp)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                      >
                        Standard MRP (₹{standardMrp.toLocaleString('en-IN')})
                      </button>
                      {[5, 10, 15].map(pct => {
                        const discounted = Math.round(standardMrp * (1 - pct / 100));
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleEditRateChange(discounted)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                          >
                            {pct}% Off (₹{discounted.toLocaleString('en-IN')})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                    <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Flat Line Sale Amount (₹ Total Inclusive of GST):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-600 dark:text-indigo-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editTotal || ''}
                        onChange={(e) => handleEditTotalChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 text-base font-bold font-mono bg-white dark:bg-slate-800 border-2 border-indigo-500 rounded-xl text-indigo-950 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      System automatically computes base selling rate: <strong className="text-slate-800 dark:text-slate-200 font-mono">₹{effectiveBaseRate.toFixed(2)}</strong> and extracts exact GST amounts.
                    </p>

                    {/* Quick Inclusive Total Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Quick Totals:</span>
                      {[500, 1000, 2000, 5000, 10000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleEditTotalChange(amt)}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Input & Stepper + Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantity (Units):
                    </label>
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleEditQuantityChange(Math.max(0.01, editQuantity - 1))}
                        className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-bold transition-colors cursor-pointer"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={editQuantity}
                        onChange={(e) => handleEditQuantityChange(parseFloat(e.target.value) || 1)}
                        className="w-full py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold font-mono text-center focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleEditQuantityChange(editQuantity + 1)}
                        className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-bold transition-colors cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure:</label>
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {STANDARD_UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Item-Level Discounts & GST Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Item Discount (%):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editDiscountPercent || ''}
                        onChange={(e) => handleEditDiscountChange(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-1 shrink-0">
                        {[5, 10, 15, 20].map(disc => (
                          <button
                            key={disc}
                            type="button"
                            onClick={() => handleEditDiscountChange(disc)}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              editDiscountPercent === disc
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {disc}%
                          </button>
                        ))}
                      </div>
                    </div>
                    {liveCalcs.discountAmount > 0 && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        Discount Amount: -₹{liveCalcs.discountAmount.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GST Tax Rate:</label>
                    <select
                      value={editGstRate}
                      onChange={(e) => handleEditGstChange(Number(e.target.value) as GstTaxRate)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value={0}>0% (Tax Exempt / Nil)</option>
                      <option value={5}>5% (Essential Goods)</option>
                      <option value={12}>12% (Standard)</option>
                      <option value={18}>18% (Standard Goods & Services)</option>
                      <option value={28}>28% (Luxury / Higher Bracket)</option>
                    </select>
                  </div>
                </div>

                {/* Real-Time Tax Breakdown Box */}
                <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-white space-y-2.5 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                      Real-Time Tax Breakdown
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                      isInterState ? 'bg-indigo-950 text-cyan-300 border border-cyan-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isInterState ? 'IGST Regime' : 'CGST + SGST Regime'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-800/80 dark:bg-slate-900 p-2 rounded-lg border border-slate-700/50">
                      <div className="text-[10px] text-slate-400">Base Unit Rate</div>
                      <div className="font-bold text-slate-200">₹{effectiveBaseRate.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800/80 dark:bg-slate-900 p-2 rounded-lg border border-slate-700/50">
                      <div className="text-[10px] text-slate-400">Taxable Value</div>
                      <div className="font-bold text-slate-200">₹{liveCalcs.taxableAmount.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800/80 dark:bg-slate-900 p-2 rounded-lg border border-slate-700/50">
                      <div className="text-[10px] text-slate-400">Total GST ({editGstRate}%)</div>
                      <div className="font-bold text-cyan-300">
                        ₹{(isInterState ? liveCalcs.igstAmount : (liveCalcs.cgstAmount + liveCalcs.sgstAmount)).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-800/80 dark:bg-slate-900 p-2 rounded-lg border border-slate-700/50">
                      <div className="text-[10px] text-slate-400">Net Line Total</div>
                      <div className="font-extrabold text-emerald-400 text-sm">
                        ₹{liveCalcs.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                    {isInterState ? (
                      <span>Integrated GST (IGST {editGstRate}%): ₹{liveCalcs.igstAmount.toFixed(2)}</span>
                    ) : (
                      <span>Central GST (CGST {liveCalcs.cgstRate}%): ₹{liveCalcs.cgstAmount.toFixed(2)} + State GST (SGST {liveCalcs.sgstRate}%): ₹{liveCalcs.sgstAmount.toFixed(2)}</span>
                    )}
                    <span>Qty: {editQuantity} {editUnit}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItemIndex(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedItem}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply & Save Custom Rate</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HSN / SAC Code App Lookup Dialog */}
      <HsnLookupDialog
        isOpen={hsnLookupTargetIndex !== null}
        onClose={() => setHsnLookupTargetIndex(null)}
        currentCode={hsnLookupTargetIndex !== null && items[hsnLookupTargetIndex] ? items[hsnLookupTargetIndex].hsnCode : ''}
        onSelect={(item) => {
          if (hsnLookupTargetIndex !== null && items[hsnLookupTargetIndex]) {
            handleItemChange(hsnLookupTargetIndex, 'hsnCode', item.code);
            handleItemChange(hsnLookupTargetIndex, 'gstRate', item.gstRate as GstTaxRate);
            if (item.uqc && item.uqc !== 'OTH') {
              handleItemChange(hsnLookupTargetIndex, 'unit', item.uqc);
            }
            showToast('success', 'HSN Applied', `${item.code} (${item.gstRate}% GST) selected.`);
          }
        }}
        onOpenCustomManager={() => setIsCustomHsnModalOpen(true)}
      />

      {/* Custom HSN & SAC Management Modal */}
      <CustomHsnModal
        isOpen={isCustomHsnModalOpen}
        onClose={() => setIsCustomHsnModalOpen(false)}
        onSelectHsn={(item) => {
          // If editing an item or last added item, populate it
          if (items.length > 0) {
            const targetIdx = editingItemIndex !== null ? editingItemIndex : items.length - 1;
            handleItemChange(targetIdx, 'hsnCode', item.code);
            handleItemChange(targetIdx, 'gstRate', item.gstRate);
            if (item.uqc && item.uqc !== 'OTH') handleItemChange(targetIdx, 'unit', item.uqc);
          }
        }}
      />

      {/* Exit with Unsaved Changes Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Exit Invoice Editor?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  You have unsaved invoice details. Your draft has been auto-saved to localStorage. What would you like to do?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                <span className="font-bold">{customerName || 'None'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Line Items:</span>
                <span className="font-bold">{items.length} item{items.length === 1 ? '' : 's'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Total Value:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const snap = currentSnapshotRef.current;
                  saveInvoiceDraft(currentCompanyId, snap);
                  setShowExitConfirmModal(false);
                  onClose();
                  showToast('info', 'Draft Saved', 'Draft retained in localStorage. You can restore it next time.');
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Save Draft & Exit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearInvoiceDraft(currentCompanyId, initialData?.id);
                  setAvailableDraft(null);
                  setLastAutoSavedAt(null);
                  setShowExitConfirmModal(false);
                  onClose();
                  showToast('info', 'Draft Discarded', 'Draft cleared from local storage.');
                }}
                className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Discard Draft & Exit</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp & Email Dispatch Modal */}
      {dispatchModalInvoice && (
        <ShareInvoiceModal
          isOpen={!!dispatchModalInvoice}
          onClose={() => {
            setDispatchModalInvoice(null);
            onClose();
          }}
          invoice={dispatchModalInvoice}
          business={business}
          onUpdateDispatchSettings={(newSettings) => {
            updateBusiness({ dispatchSettings: newSettings }, true);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
