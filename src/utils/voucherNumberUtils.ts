import { PaymentRecord, BusinessProfile, PaymentType } from '../types';

export interface VoucherSequenceAudit {
  type: PaymentType | 'ALL';
  totalVouchers: number;
  highestVoucherSeq: number;
  currentConfiguredSeq: number;
  suggestedNextNumber: number;
  prefix: string;
  duplicateNumbers: string[];
  mismatchedNumbers: string[];
}

/**
 * Extracts numeric sequence digits from the end of a voucher number string.
 * Example: "RCPT-001" -> { prefix: "RCPT-", sequence: 1, padLength: 3 }
 * Example: "PMT-2026-042" -> { prefix: "PMT-2026-", sequence: 42, padLength: 3 }
 * Example: "105" -> { prefix: "", sequence: 105, padLength: 3 }
 */
export const parseVoucherNumber = (
  voucherNo: string
): { prefix: string; sequence: number; padLength: number } | null => {
  if (!voucherNo || typeof voucherNo !== 'string') return null;
  const trimmed = voucherNo.trim();
  
  // Match trailing digits
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const digitsStr = match[2];
  const sequence = parseInt(digitsStr, 10);
  if (isNaN(sequence)) return null;

  return {
    prefix,
    sequence,
    padLength: Math.max(3, digitsStr.length)
  };
};

/**
 * Formats a voucher sequence number with optional prefix and 3-digit padding (or custom pad length).
 */
export const formatVoucherSequence = (
  prefix: string | undefined,
  seq: number,
  padLength: number = 3
): string => {
  const cleanPrefix = (prefix ?? '').trim();
  const safeSeq = Math.max(1, Math.floor(seq));
  const padded = String(safeSeq).padStart(padLength, '0');
  if (cleanPrefix) {
    return `${cleanPrefix}${padded}`;
  }
  return String(safeSeq);
};

/**
 * Finds the highest sequential voucher number present in the payment list matching the target prefix or payment type.
 */
export const getHighestVoucherSequence = (
  payments: PaymentRecord[],
  targetPrefix?: string,
  type?: PaymentType
): number => {
  if (!payments || payments.length === 0) return 0;

  let maxSeq = 0;
  for (const p of payments) {
    if (!p.voucherNumber) continue;
    if (type && p.type !== type) continue;

    const parsed = parseVoucherNumber(p.voucherNumber);
    if (!parsed) continue;

    if (!targetPrefix) {
      if (parsed.sequence > maxSeq) {
        maxSeq = parsed.sequence;
      }
    } else {
      const cleanTarget = targetPrefix.trim().toLowerCase();
      const cleanVoucherPrefix = parsed.prefix.trim().toLowerCase();
      if (
        cleanVoucherPrefix.includes(cleanTarget) ||
        cleanTarget.includes(cleanVoucherPrefix) ||
        cleanVoucherPrefix === cleanTarget
      ) {
        if (parsed.sequence > maxSeq) {
          maxSeq = parsed.sequence;
        }
      }
    }
  }
  return maxSeq;
};

export interface NextVoucherInfo {
  voucherNumber: string;
  nextNumber: number;
  prefix: string;
  mode: 'SEPARATE' | 'UNIFIED';
  configKey: 'nextPaymentReceiptNumber' | 'nextPaymentVoucherNumber' | 'nextContraVoucherNumber' | 'nextUnifiedVoucherNumber';
}

/**
 * Calculates the next available voucher number for a given PaymentType according to company settings.
 * Ensures strict continuous sequential ordering without duplicate collisions.
 */
export const getNextAvailableVoucherNumber = (
  payments: PaymentRecord[],
  business: BusinessProfile,
  type: PaymentType = 'PAYMENT_IN'
): NextVoucherInfo => {
  const isUnified = business?.voucherNumberingMode === 'UNIFIED';

  let prefix = '';
  let baseConfiguredNumber = 1;
  let configKey: NextVoucherInfo['configKey'] = 'nextPaymentReceiptNumber';

  if (isUnified) {
    prefix = (business?.voucherUnifiedPrefix ?? 'VCH-').trim();
    baseConfiguredNumber = Math.max(1, parseInt(String(business?.nextUnifiedVoucherNumber || 1), 10) || 1);
    configKey = 'nextUnifiedVoucherNumber';
  } else {
    if (type === 'PAYMENT_IN') {
      prefix = (business?.paymentReceiptPrefix ?? 'RCPT-').trim();
      baseConfiguredNumber = Math.max(1, parseInt(String(business?.nextPaymentReceiptNumber || 1), 10) || 1);
      configKey = 'nextPaymentReceiptNumber';
    } else if (type === 'PAYMENT_OUT') {
      prefix = (business?.paymentVoucherPrefix ?? 'PMT-').trim();
      baseConfiguredNumber = Math.max(1, parseInt(String(business?.nextPaymentVoucherNumber || 1), 10) || 1);
      configKey = 'nextPaymentVoucherNumber';
    } else {
      prefix = (business?.contraVoucherPrefix ?? 'CNTR-').trim();
      baseConfiguredNumber = Math.max(1, parseInt(String(business?.nextContraVoucherNumber || 1), 10) || 1);
      configKey = 'nextContraVoucherNumber';
    }
  }

  // Find highest existing sequence for this prefix/type
  const highestExisting = getHighestVoucherSequence(
    payments,
    prefix,
    isUnified ? undefined : type
  );

  let candidateSeq = Math.max(baseConfiguredNumber, highestExisting > 0 ? highestExisting + 1 : baseConfiguredNumber);

  // Set of all existing voucher numbers (lowercased for strict collision detection)
  const existingSet = new Set(
    (payments || []).map(p => (p.voucherNumber || '').trim().toLowerCase())
  );

  let candidateVoucherNumber = formatVoucherSequence(prefix, candidateSeq);

  while (existingSet.has(candidateVoucherNumber.trim().toLowerCase())) {
    candidateSeq = candidateSeq + 1;
    candidateVoucherNumber = formatVoucherSequence(prefix, candidateSeq);
  }

  return {
    voucherNumber: candidateVoucherNumber,
    nextNumber: candidateSeq + 1,
    prefix,
    mode: isUnified ? 'UNIFIED' : 'SEPARATE',
    configKey
  };
};

/**
 * Audits voucher sequence continuity, duplicates, and format mismatches.
 */
export const auditVoucherSequences = (
  payments: PaymentRecord[],
  business: BusinessProfile,
  type?: PaymentType
): VoucherSequenceAudit => {
  const isUnified = business?.voucherNumberingMode === 'UNIFIED';
  let prefix = '';
  let currentConfiguredSeq = 1;

  if (isUnified) {
    prefix = (business?.voucherUnifiedPrefix ?? 'VCH-').trim();
    currentConfiguredSeq = Math.max(1, parseInt(String(business?.nextUnifiedVoucherNumber || 1), 10) || 1);
  } else if (type === 'PAYMENT_IN') {
    prefix = (business?.paymentReceiptPrefix ?? 'RCPT-').trim();
    currentConfiguredSeq = Math.max(1, parseInt(String(business?.nextPaymentReceiptNumber || 1), 10) || 1);
  } else if (type === 'PAYMENT_OUT') {
    prefix = (business?.paymentVoucherPrefix ?? 'PMT-').trim();
    currentConfiguredSeq = Math.max(1, parseInt(String(business?.nextPaymentVoucherNumber || 1), 10) || 1);
  } else if (type === 'CONTRA_TRANSFER') {
    prefix = (business?.contraVoucherPrefix ?? 'CNTR-').trim();
    currentConfiguredSeq = Math.max(1, parseInt(String(business?.nextContraVoucherNumber || 1), 10) || 1);
  } else {
    prefix = (business?.paymentReceiptPrefix ?? 'RCPT-').trim();
    currentConfiguredSeq = Math.max(1, parseInt(String(business?.nextPaymentReceiptNumber || 1), 10) || 1);
  }

  const filtered = type && !isUnified ? (payments || []).filter(p => p.type === type) : (payments || []);
  const total = filtered.length;
  const highestSeq = getHighestVoucherSequence(payments, prefix, isUnified ? undefined : type);
  const suggestedNextNumber = Math.max(currentConfiguredSeq, highestSeq > 0 ? highestSeq + 1 : 1);

  const seenNumbers = new Map<string, number>();
  const duplicates: string[] = [];
  const mismatched: string[] = [];

  filtered.forEach(p => {
    const num = (p.voucherNumber || '').trim();
    if (!num) return;
    const lower = num.toLowerCase();
    const count = (seenNumbers.get(lower) || 0) + 1;
    seenNumbers.set(lower, count);
    if (count === 2) {
      duplicates.push(num);
    }
    if (prefix && !lower.startsWith(prefix.toLowerCase())) {
      mismatched.push(num);
    }
  });

  return {
    type: type || 'ALL',
    totalVouchers: total,
    highestVoucherSeq: highestSeq,
    currentConfiguredSeq,
    suggestedNextNumber,
    prefix,
    duplicateNumbers: duplicates,
    mismatchedNumbers: mismatched
  };
};
