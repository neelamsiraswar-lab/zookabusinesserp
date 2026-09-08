import { Invoice, BusinessProfile } from '../types';

export interface InvoiceSequenceAudit {
  totalInvoices: number;
  highestInvoiceSeq: number;
  currentConfiguredSeq: number;
  suggestedNextNumber: number;
  duplicateNumbers: string[];
  mismatchedNumbers: string[];
}

/**
 * Extracts numeric sequence digits from the end of an invoice string.
 * Example: "INV/2026-27/105" -> { prefix: "INV/2026-27/", sequence: 105, padLength: 3 }
 * Example: "INV-3406" -> { prefix: "INV-", sequence: 3406, padLength: 4 }
 */
export const parseInvoiceNumber = (
  invoiceNo: string
): { prefix: string; sequence: number; padLength: number } | null => {
  if (!invoiceNo || typeof invoiceNo !== 'string') return null;
  const trimmed = invoiceNo.trim();
  
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
 * Finds the highest sequential invoice number present in existing invoice list for a prefix.
 * Avoids picking up spurious numbers from string concatenation glitches (e.g. 34061 when invoices are in 3400s).
 */
export const getHighestInvoiceSequence = (
  invoices: Invoice[],
  targetPrefix?: string
): number => {
  if (!invoices || invoices.length === 0) return 0;

  let maxSeq = 0;
  for (const inv of invoices) {
    if (!inv.invoiceNumber) continue;
    const parsed = parseInvoiceNumber(inv.invoiceNumber);
    if (!parsed) continue;

    if (!targetPrefix) {
      if (parsed.sequence > maxSeq) {
        maxSeq = parsed.sequence;
      }
    } else {
      const cleanTarget = targetPrefix.trim().toLowerCase();
      const cleanInvPrefix = parsed.prefix.trim().toLowerCase();
      if (cleanInvPrefix.includes(cleanTarget) || cleanTarget.includes(cleanInvPrefix) || cleanInvPrefix === cleanTarget) {
        if (parsed.sequence > maxSeq) {
          maxSeq = parsed.sequence;
        }
      }
    }
  }
  return maxSeq;
};

export const formatInvoiceSequence = (prefix: string | undefined, seq: number): string => {
  const cleanPrefix = (prefix ?? '').trim();
  if (cleanPrefix) {
    return `${cleanPrefix}${String(seq).padStart(3, '0')}`;
  }
  return String(seq);
};

/**
 * Single Unified Numbering Rule for both Tax Invoices and POS Billing:
 * Strictly sequential integers: 3406 -> 3407 -> 3408 (never string concatenated 34061).
 * Supports empty prefix for plain numeric sequences (e.g. 3406) or custom prefixes.
 */
export const getNextAvailableInvoiceNumber = (
  invoices: Invoice[],
  business: BusinessProfile
): { invoiceNumber: string; nextNumber: number; prefix: string } => {
  const prefix = (business.invoicePrefix ?? '').trim();
  
  // Strictly enforce integer conversion
  const rawBaseNumber = business.nextInvoiceNumber;
  const baseConfiguredNumber = Math.max(1, parseInt(String(rawBaseNumber || 1), 10) || 1);

  // Scan all existing invoices for highest sequence under current prefix
  const highestExisting = getHighestInvoiceSequence(invoices, prefix);
  
  let candidateSeq = Math.max(baseConfiguredNumber, highestExisting > 0 ? highestExisting + 1 : baseConfiguredNumber);

  // Ensure candidate does not collide with ANY existing invoice in the list
  const existingSet = new Set(
    (invoices || []).map(i => (i.invoiceNumber || '').trim().toLowerCase())
  );

  let candidateInvoiceNumber = formatInvoiceSequence(prefix, candidateSeq);
  
  while (existingSet.has(candidateInvoiceNumber.trim().toLowerCase())) {
    candidateSeq = candidateSeq + 1;
    candidateInvoiceNumber = formatInvoiceSequence(prefix, candidateSeq);
  }

  return {
    invoiceNumber: candidateInvoiceNumber,
    nextNumber: candidateSeq + 1,
    prefix
  };
};

/**
 * Full audit of invoice sequence integrity under the single unified numbering rule.
 */
export const auditInvoiceSequences = (
  invoices: Invoice[],
  business: BusinessProfile
): InvoiceSequenceAudit => {
  const total = invoices ? invoices.length : 0;
  const prefix = (business.invoicePrefix ?? '').trim();
  const currentConfiguredSeq = Math.max(1, parseInt(String(business.nextInvoiceNumber || 1), 10) || 1);

  const highestSeq = getHighestInvoiceSequence(invoices, prefix);
  const suggestedNext = Math.max(currentConfiguredSeq, highestSeq > 0 ? highestSeq + 1 : 1);

  // Find duplicates and mismatched formats
  const seenNumbers = new Map<string, number>();
  const duplicates: string[] = [];
  const mismatched: string[] = [];

  (invoices || []).forEach(inv => {
    const num = (inv.invoiceNumber || '').trim();
    if (!num) return;
    const count = (seenNumbers.get(num.toLowerCase()) || 0) + 1;
    seenNumbers.set(num.toLowerCase(), count);
    if (count === 2) {
      duplicates.push(num);
    }

    if (prefix && !num.toLowerCase().startsWith(prefix.toLowerCase())) {
      mismatched.push(num);
    }
  });

  return {
    totalInvoices: total,
    highestInvoiceSeq: highestSeq,
    currentConfiguredSeq,
    suggestedNextNumber: suggestedNext,
    duplicateNumbers: duplicates,
    mismatchedNumbers: mismatched
  };
};
