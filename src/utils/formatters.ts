import QRCode from 'qrcode';
import { INDIAN_STATES } from './constants';

export const formatCurrency = (amount: number | undefined | null, symbol: string = '₹'): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0.00`;
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format to 2 decimal places
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian currency numbering system (last 3 digits, then groups of 2)
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `${isNegative ? '-' : ''}${symbol}${integerPart}.${decimalPart}`;
};

export const formatINR = (amount: number | undefined | null): string => formatCurrency(amount, '₹');


export const formatDate = (dateString?: string, format: 'short' | 'long' | 'input' = 'short'): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  if (format === 'input') {
    return date.toISOString().split('T')[0];
  }

  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();

  if (format === 'long') {
    return `${day} ${monthName} ${year}`;
  }
  return `${day}/${monthNum}/${year}`;
};

export const validateGstin = (gstin: string): { isValid: boolean; stateCode?: string; stateName?: string; pan?: string; error?: string } => {
  if (!gstin) return { isValid: false, error: 'GSTIN is required' };
  const cleaned = gstin.trim().toUpperCase();
  
  // Standard 15-char GSTIN pattern
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (cleaned.length !== 15) {
    return { isValid: false, error: 'GSTIN must be exactly 15 characters' };
  }
  if (!gstRegex.test(cleaned)) {
    return { isValid: false, error: 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)' };
  }

  const stateCode = cleaned.substring(0, 2);
  const pan = cleaned.substring(2, 12);
  const matchedState = INDIAN_STATES.find(s => s.code === stateCode);

  return {
    isValid: true,
    stateCode,
    stateName: matchedState ? matchedState.name : 'Unknown State',
    pan
  };
};

export const getStateFromCode = (code: string): string => {
  const found = INDIAN_STATES.find(s => s.code === code);
  return found ? found.name : 'Unknown';
};

export const getCodeFromStateName = (name: string): string => {
  const found = INDIAN_STATES.find(s => s.name.toLowerCase() === name.toLowerCase());
  return found ? found.code : '07'; // Default Delhi
};

export const numberToIndianWords = (amount: number): string => {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigit = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    return tensMultiple[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + singleDigits[n % 10] : '');
  };

  const convertThreeDigit = (n: number): string => {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
    }
    const remainder = n % 100;
    if (remainder > 0) {
      if (str !== '') str += 'and ';
      str += convertTwoDigit(remainder);
    }
    return str.trim();
  };

  const absAmount = Math.abs(amount);
  const wholePart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - wholePart) * 100);

  let num = wholePart;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundredAndBelow = num;

  if (crore > 0) {
    words += convertTwoDigit(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigit(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigit(thousand) + ' Thousand ';
  }
  if (hundredAndBelow > 0) {
    words += convertThreeDigit(hundredAndBelow) + ' ';
  }

  words = 'INR ' + words.trim() + ' Rupees';

  if (decimalPart > 0) {
    words += ' and ' + convertTwoDigit(decimalPart) + ' Paise';
  }

  return words + ' Only';
};

export const formatAmountInWords = (amount: number): string => {
  return numberToIndianWords(amount);
};

// Generates an official-looking 64-char hex SHA256 simulation for IRN
export const generateIRN = (sellerGstin: string, docType: string, docNo: string, finYear: string): string => {
  const raw = `${sellerGstin}${docType}${docNo}${finYear}`;
  let hash = 0;
  let fullHex = '';
  
  for (let i = 0; i < 64; i++) {
    const charCode = raw.charCodeAt(i % raw.length) || (i * 37 + 13);
    hash = (hash * 31 + charCode) % 0xffffffff;
    const hexPart = Math.abs(hash ^ (i * 17)).toString(16).padStart(4, '0');
    fullHex += hexPart.substring(0, 2);
    if (fullHex.length >= 64) break;
  }
  
  return fullHex.substring(0, 64).toLowerCase();
};

export const generateAckNo = (): string => {
  const prefix = '1';
  const timestamp = Date.now().toString().slice(-9);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${timestamp}${random}`;
};

export const generateEwayBillNo = (): string => {
  const p1 = Math.floor(1000 + Math.random() * 9000);
  const p2 = Math.floor(1000 + Math.random() * 9000);
  const p3 = Math.floor(1000 + Math.random() * 9000);
  return `${p1}${p2}${p3}`;
};

// Build real, 100% standard ISO/IEC 18004 compliant QR Code 2D bit matrix
export const generateQrMatrix = (text: string, _legacySize?: number): boolean[][] => {
  if (!text || typeof text !== 'string') return [];
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.modules.get(r, c) === 1);
      }
      matrix.push(row);
    }
    return matrix;
  } catch (err) {
    console.error('Error generating genuine QR matrix:', err);
    return [];
  }
};

export const DEFAULT_SIGNATURE_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTAwIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCI+PHBhdGggZD0iTTIwLDY1IEM0NSwyNSA3MCwxNSA5MCw0MCBDMTEwLDY1IDEwNSw4MCAxMzAsNDUgQzE1NSwxMCAxNzAsNzUgMTkwLDUwIEMyMTAsMjUgMjMwLDYwIDI3MCwzNSBNNTAsNzUgQzEwMCw3NSAyMjAsNzAgMjgwLDY4IiBzdHJva2U9IiMxZTNhOGEiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';

export const DEFAULT_SIGNATURE_2_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTAwIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCI+PHBhdGggZD0iTTMwLDUwIFE2MCwxMCA5MCw1MCBUMTUwLDUwIFQyMTAsMzAgVDI3MCw2MCBNNzAsODAgTDI1MCw3MCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';

export const normalizeSignatureUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_SIGNATURE_DATA_URL;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }
  if (trimmed.startsWith('data:image/svg+xml;utf8,<svg')) {
    const svgPart = trimmed.substring('data:image/svg+xml;utf8,'.length);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgPart)}`;
  }
  return trimmed;
};
