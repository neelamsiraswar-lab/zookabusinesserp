/**
 * NPCI UPI (Unified Payments Interface) Specification & URI Helper Utilities
 * Compatible with Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, Navi, Cred, and all Indian banking apps.
 */

export interface UpiUriOptions {
  upiId?: string;
  payeeName?: string;
  amount?: number;
  invoiceNumber?: string;
  note?: string;
  transactionRef?: string;
  merchantCode?: string;
}

/**
 * Validates whether a given string is a valid UPI ID / Virtual Payment Address (VPA).
 * Standard UPI ID format: username@bankhandle (e.g. store@okhdfcbank, 9876543210@paytm, abc.ent@icici)
 */
export const isValidUpiId = (upiId?: string): boolean => {
  if (!upiId || typeof upiId !== 'string') return false;
  const clean = upiId.trim().toLowerCase();
  // Standard VPA regex: allows alphanumeric, dots, underscores, hyphens before @ and alphabetic bank handle after @
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(clean);
};

/**
 * Cleans and normalizes a UPI ID.
 */
export const cleanUpiId = (upiId?: string): string => {
  if (!upiId || typeof upiId !== 'string') return '';
  return upiId.trim().replace(/^upi:\/\/pay\?pa=/i, '').split('&')[0].trim();
};

/**
 * Sanitizes payee name for UPI apps.
 * Strips special characters that break UPI intent URL parsing in PhonePe / Google Pay / BHIM.
 */
export const sanitizePayeeName = (name?: string): string => {
  if (!name || typeof name !== 'string') return 'Merchant';
  const clean = name.trim().replace(/[&?=#/\\%+$]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 50) || 'Merchant';
};

/**
 * Sanitizes transaction note.
 */
export const sanitizeTransactionNote = (note?: string): string => {
  if (!note || typeof note !== 'string') return '';
  const clean = note.trim().replace(/[&?=#/\\%+$]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 40);
};

/**
 * Builds a 100% NPCI-compliant UPI payment intent URI.
 * Example: upi://pay?pa=merchant@okhdfcbank&pn=Bharat%20Tech&am=1250.00&cu=INR&tn=Invoice%20INV-2026-0001
 */
export const buildUpiPaymentUri = (options: UpiUriOptions): string => {
  const rawUpiId = options.upiId || '';
  const pa = cleanUpiId(rawUpiId);

  // If no UPI ID provided, return empty string so UI can prompt user or show helpful state
  if (!pa) {
    return '';
  }

  const pn = sanitizePayeeName(options.payeeName);
  const params: string[] = [
    `pa=${encodeURIComponent(pa)}`,
    `pn=${encodeURIComponent(pn)}`,
  ];

  // If amount is provided and greater than 0, format with 2 decimal places
  if (typeof options.amount === 'number' && !isNaN(options.amount) && options.amount > 0) {
    params.push(`am=${options.amount.toFixed(2)}`);
  }

  // Currency code is always INR for UPI transactions
  params.push('cu=INR');

  // Transaction Note (shown to customer during scan & pay)
  const defaultNote = options.invoiceNumber ? `Invoice ${options.invoiceNumber}` : (options.note || 'Payment');
  const tn = sanitizeTransactionNote(options.note || defaultNote);
  if (tn) {
    params.push(`tn=${encodeURIComponent(tn)}`);
  }

  // Transaction Reference / Invoice ID
  if (options.transactionRef || options.invoiceNumber) {
    const rawRef = (options.transactionRef || options.invoiceNumber || '').replace(/[^a-zA-Z0-9]/g, '');
    if (rawRef) {
      params.push(`tr=${encodeURIComponent(rawRef.slice(0, 30))}`);
    }
  }

  // Optional Merchant Code
  if (options.merchantCode) {
    params.push(`mc=${encodeURIComponent(options.merchantCode.trim())}`);
  }

  return `upi://pay?${params.join('&')}`;
};
