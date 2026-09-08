import { InvoiceItem, InvoiceType, PaymentMethod } from '../types';

export interface InvoiceDraftPayload {
  companyId: string;
  targetInvoiceId?: string; // If editing an existing invoice
  invoiceType: InvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  selectedCustomerId?: string;
  customerName: string;
  customerGstin?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerStateCode?: string;
  customerPhone?: string;
  customerEmail?: string;
  placeOfSupplyState?: string;
  placeOfSupplyStateCode?: string;
  isReverseCharge?: boolean;
  priceEntryMode?: 'EXCLUSIVE' | 'INCLUSIVE';
  hasDifferentShipping?: boolean;
  shippingName?: string;
  shippingAddress?: string;
  shippingState?: string;
  shippingStateCode?: string;
  items: InvoiceItem[];
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';
  amountPaid: number;
  paymentMethod: PaymentMethod;
  notes: string;
  terms: string;
  grandTotal?: number;
  savedAt: string;
}

const DRAFT_PREFIX = 'zooka_erp_invoice_draft_';

/**
 * Generate a consistent localStorage storage key for drafts
 */
export function getDraftStorageKey(companyId: string, invoiceId?: string): string {
  const safeCompany = companyId || 'default';
  if (invoiceId) {
    return `${DRAFT_PREFIX}edit_${safeCompany}_${invoiceId}`;
  }
  return `${DRAFT_PREFIX}new_${safeCompany}`;
}

/**
 * Check if the current invoice state has meaningful changes worth auto-saving
 */
export function hasMeaningfulDraftData(
  draft: Partial<InvoiceDraftPayload>,
  defaultNotes: string = '',
  defaultTerms: string = ''
): boolean {
  if (!draft) return false;

  // Has customer name entered
  if (draft.customerName && draft.customerName.trim().length > 0) return true;
  // Has customer GSTIN or phone
  if (draft.customerGstin && draft.customerGstin.trim().length > 0) return true;
  if (draft.customerPhone && draft.customerPhone.trim().length > 0) return true;
  
  // Has at least one valid item with name or non-zero rate/amount
  if (draft.items && draft.items.length > 0) {
    const hasItemsWithData = draft.items.some(
      item => (item.name && item.name.trim().length > 0) || item.rate > 0 || (item.totalAmount && item.totalAmount > 0)
    );
    if (hasItemsWithData) return true;
    // More than 1 item added
    if (draft.items.length > 1) return true;
  }

  // Custom notes or terms modified from defaults
  if (draft.notes && draft.notes !== defaultNotes && draft.notes.trim().length > 0) return true;
  if (draft.terms && draft.terms !== defaultTerms && draft.terms.trim().length > 0) return true;

  // Custom shipping address
  if (draft.hasDifferentShipping && draft.shippingAddress && draft.shippingAddress.trim().length > 0) return true;

  return false;
}

/**
 * Persist invoice draft to localStorage
 */
export function saveInvoiceDraft(
  companyId: string,
  draft: Omit<InvoiceDraftPayload, 'savedAt' | 'companyId'> & { companyId?: string; targetInvoiceId?: string }
): { success: boolean; savedAt: string } {
  try {
    const storageKey = getDraftStorageKey(companyId, draft.targetInvoiceId);
    const savedAt = new Date().toISOString();
    
    const payload: InvoiceDraftPayload = {
      ...draft,
      companyId: companyId || 'default',
      savedAt
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
    return { success: true, savedAt };
  } catch (err) {
    console.warn('Failed to save invoice draft to localStorage:', err);
    return { success: false, savedAt: new Date().toISOString() };
  }
}

/**
 * Retrieve saved invoice draft from localStorage
 */
export function getInvoiceDraft(companyId: string, invoiceId?: string): InvoiceDraftPayload | null {
  try {
    const storageKey = getDraftStorageKey(companyId, invoiceId);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed: InvoiceDraftPayload = JSON.parse(stored);
    if (!parsed || !parsed.items || !Array.isArray(parsed.items)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('Failed to retrieve invoice draft from localStorage:', err);
    return null;
  }
}

/**
 * Delete invoice draft from localStorage
 */
export function clearInvoiceDraft(companyId: string, invoiceId?: string): void {
  try {
    const storageKey = getDraftStorageKey(companyId, invoiceId);
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.warn('Failed to clear invoice draft from localStorage:', err);
  }
}

/**
 * Format timestamp into a human-friendly relative or clock string
 */
export function formatDraftTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}
