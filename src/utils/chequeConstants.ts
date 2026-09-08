import { ChequeTemplateConfig } from '../types';
import { formatAmountInWords } from './formatters';

export const DEFAULT_CTS2010_TEMPLATE: ChequeTemplateConfig = {
  id: 'template-cts2010-universal',
  name: 'Standard CTS-2010 (Universal Indian Banks)',
  bankPreset: 'UNIVERSAL_CTS2010',
  widthMm: 203,
  heightMm: 93,
  datePositions: {
    mode: 'BOXES',
    xMm: 153,
    yMm: 9,
    boxSpacingMm: 5.2,
    fontSizePt: 12,
    letterSpacingMm: 2.2
  },
  payeePositions: {
    xMm: 28,
    yMm: 25,
    maxWidthMm: 135,
    fontSizePt: 11,
    prefixStars: true
  },
  amountInWordsPositions: {
    line1: { xMm: 38, yMm: 36, maxWidthMm: 125 },
    line2: { xMm: 20, yMm: 45, maxWidthMm: 140 },
    fontSizePt: 10,
    lineHeightMm: 8.5,
    prefixRupees: true,
    suffixOnly: true
  },
  amountInFiguresPositions: {
    xMm: 154,
    yMm: 41,
    fontSizePt: 12,
    prefixStars: true,
    suffixSlash: true
  },
  accountPayeePositions: {
    xMm: 12,
    yMm: 12,
    rotationDeg: -45,
    text: 'A/C PAYEE ONLY'
  },
  bearerPositions: {
    xMm: 182,
    yMm: 26,
    strikeOut: true
  },
  signatoryPositions: {
    xMm: 145,
    yMm: 72,
    showCompanyName: true,
    fontSizePt: 9.5
  },
  printerOffset: {
    topOffsetMm: 0,
    leftOffsetMm: 0
  },
  isDefault: true
};

export const BANK_CHEQUE_PRESETS: ChequeTemplateConfig[] = [
  DEFAULT_CTS2010_TEMPLATE,
  {
    id: 'template-hdfc',
    name: 'HDFC Bank Ltd (CTS-2010)',
    bankPreset: 'HDFC',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 154,
      yMm: 8.5,
      boxSpacingMm: 5.25,
      fontSizePt: 12,
      letterSpacingMm: 2.3
    },
    payeePositions: {
      xMm: 28,
      yMm: 24.5,
      maxWidthMm: 134,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 38, yMm: 35.5, maxWidthMm: 125 },
      line2: { xMm: 18, yMm: 44.5, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 155,
      yMm: 41,
      fontSizePt: 12.5,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 14,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 184,
      yMm: 25.5,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 145,
      yMm: 71,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-sbi',
    name: 'State Bank of India (SBI)',
    bankPreset: 'SBI',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 152,
      yMm: 9.2,
      boxSpacingMm: 5.1,
      fontSizePt: 12,
      letterSpacingMm: 2.1
    },
    payeePositions: {
      xMm: 26,
      yMm: 25,
      maxWidthMm: 136,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 36, yMm: 36, maxWidthMm: 126 },
      line2: { xMm: 18, yMm: 45, maxWidthMm: 144 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 153,
      yMm: 41.5,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 12,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 183,
      yMm: 26,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 142,
      yMm: 73,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-icici',
    name: 'ICICI Bank Ltd',
    bankPreset: 'ICICI',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 154.5,
      yMm: 8.8,
      boxSpacingMm: 5.2,
      fontSizePt: 12,
      letterSpacingMm: 2.2
    },
    payeePositions: {
      xMm: 28,
      yMm: 24.8,
      maxWidthMm: 135,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 38, yMm: 35.8, maxWidthMm: 126 },
      line2: { xMm: 18, yMm: 44.8, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 154,
      yMm: 40.8,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 13,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 183,
      yMm: 25.5,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 144,
      yMm: 72,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-axis',
    name: 'Axis Bank Ltd',
    bankPreset: 'AXIS',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 153,
      yMm: 9.0,
      boxSpacingMm: 5.2,
      fontSizePt: 12,
      letterSpacingMm: 2.2
    },
    payeePositions: {
      xMm: 27,
      yMm: 25,
      maxWidthMm: 135,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 37, yMm: 36, maxWidthMm: 125 },
      line2: { xMm: 18, yMm: 45, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 153.5,
      yMm: 41,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 12,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 182,
      yMm: 26,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 144,
      yMm: 72,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-kotak',
    name: 'Kotak Mahindra Bank',
    bankPreset: 'KOTAK',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 154,
      yMm: 9.0,
      boxSpacingMm: 5.2,
      fontSizePt: 12,
      letterSpacingMm: 2.2
    },
    payeePositions: {
      xMm: 28,
      yMm: 25,
      maxWidthMm: 135,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 38, yMm: 36, maxWidthMm: 125 },
      line2: { xMm: 18, yMm: 45, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 154,
      yMm: 41,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 13,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 184,
      yMm: 26,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 145,
      yMm: 72,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-pnb',
    name: 'Punjab National Bank (PNB)',
    bankPreset: 'PNB',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 152,
      yMm: 9.5,
      boxSpacingMm: 5.15,
      fontSizePt: 12,
      letterSpacingMm: 2.1
    },
    payeePositions: {
      xMm: 26,
      yMm: 25.5,
      maxWidthMm: 135,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 36, yMm: 36.5, maxWidthMm: 125 },
      line2: { xMm: 18, yMm: 45.5, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 153,
      yMm: 41.5,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 12,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 182,
      yMm: 26.5,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 142,
      yMm: 73,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-bob',
    name: 'Bank of Baroda (BOB)',
    bankPreset: 'BOB',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 153,
      yMm: 9.2,
      boxSpacingMm: 5.2,
      fontSizePt: 12,
      letterSpacingMm: 2.2
    },
    payeePositions: {
      xMm: 27,
      yMm: 25,
      maxWidthMm: 135,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 37, yMm: 36, maxWidthMm: 125 },
      line2: { xMm: 18, yMm: 45, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 153.5,
      yMm: 41,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 12,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 183,
      yMm: 26,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 144,
      yMm: 72,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  },
  {
    id: 'template-canara',
    name: 'Canara Bank',
    bankPreset: 'CANARA',
    widthMm: 203,
    heightMm: 93,
    datePositions: {
      mode: 'BOXES',
      xMm: 153,
      yMm: 9.0,
      boxSpacingMm: 5.2,
      fontSizePt: 12,
      letterSpacingMm: 2.2
    },
    payeePositions: {
      xMm: 27,
      yMm: 25,
      maxWidthMm: 135,
      fontSizePt: 11,
      prefixStars: true
    },
    amountInWordsPositions: {
      line1: { xMm: 37, yMm: 36, maxWidthMm: 125 },
      line2: { xMm: 18, yMm: 45, maxWidthMm: 142 },
      fontSizePt: 10,
      lineHeightMm: 8.5,
      prefixRupees: true,
      suffixOnly: true
    },
    amountInFiguresPositions: {
      xMm: 153,
      yMm: 41,
      fontSizePt: 12,
      prefixStars: true,
      suffixSlash: true
    },
    accountPayeePositions: {
      xMm: 12,
      yMm: 12,
      rotationDeg: -45,
      text: 'A/C PAYEE ONLY'
    },
    bearerPositions: {
      xMm: 182,
      yMm: 26,
      strikeOut: true
    },
    signatoryPositions: {
      xMm: 144,
      yMm: 72,
      showCompanyName: true,
      fontSizePt: 9.5
    },
    printerOffset: { topOffsetMm: 0, leftOffsetMm: 0 }
  }
];

/**
 * Format clean Indian English wording for cheques
 * E.g. "Rupees Forty-Five Thousand Eight Hundred and Fifty Only"
 */
export function formatChequeAmountWords(amount: number, prefix = 'Rupees ', suffix = ' Only'): string {
  if (amount <= 0 || isNaN(amount)) return `${prefix}Zero${suffix}`;
  
  // Clean format from formatters (strip any pre-existing INR)
  let raw = formatAmountInWords(amount);
  raw = raw.replace(/^INR\s+/i, '').replace(/\s+Rupees/i, '').replace(/\s+Only$/i, '').trim();
  
  return `*** ${prefix}${raw}${suffix} ***`;
}

/**
 * Splits a full amount in words string into 2 balanced lines suitable for Cheque leaf lines
 */
export function splitAmountInWordsToLines(fullWords: string, maxLine1Chars = 45): { line1: string; line2: string } {
  if (!fullWords) return { line1: '', line2: '' };
  
  const clean = fullWords.trim();
  if (clean.length <= maxLine1Chars) {
    return { line1: clean, line2: '' };
  }

  // Find last space before maxLine1Chars
  const words = clean.split(' ');
  let line1 = '';
  let line2 = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = line1 ? `${line1} ${word}` : word;
    if (candidate.length <= maxLine1Chars) {
      line1 = candidate;
    } else {
      line2 = words.slice(i).join(' ');
      break;
    }
  }

  return { line1, line2 };
}

/**
 * Extracts 8 digits [D, D, M, M, Y, Y, Y, Y] from a date string (YYYY-MM-DD or DD-MM-YYYY)
 */
export function extractDateDigits(dateStr: string): string[] {
  if (!dateStr) return ['', '', '', '', '', '', '', ''];
  
  try {
    let d = '';
    let m = '';
    let y = '';

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        y = parts[0];
        m = parts[1].padStart(2, '0');
        d = parts[2].padStart(2, '0');
      } else {
        // DD-MM-YYYY
        d = parts[0].padStart(2, '0');
        m = parts[1].padStart(2, '0');
        y = parts[2];
      }
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts[2]?.length === 4) {
        d = parts[0].padStart(2, '0');
        m = parts[1].padStart(2, '0');
        y = parts[2];
      }
    }

    if (d && m && y && y.length === 4) {
      const full = `${d}${m}${y}`;
      return full.split('').slice(0, 8);
    }
  } catch (e) {
    console.warn('Error parsing date digits:', e);
  }

  return ['', '', '', '', '', '', '', ''];
}

/**
 * Formats a cheque number with leading zeros (e.g. 101 -> "000101")
 */
export function formatChequeNumber(num: number | string, digits = 6): string {
  const clean = String(num).replace(/[^0-9]/g, '');
  if (!clean) return '000001';
  return clean.padStart(digits, '0');
}

/**
 * Calculates next sequential cheque number
 */
export function getNextChequeNumber(current: string, digits = 6): string {
  const parsed = parseInt(current, 10);
  if (isNaN(parsed)) return '000001';
  return formatChequeNumber(parsed + 1, digits);
}
