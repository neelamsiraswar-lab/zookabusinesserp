import { Invoice, InvoiceItem, PurchaseBill, Expense, GstTaxRate, BusinessProfile } from '../types';
import { generateIRN, generateAckNo } from './formatters';
import { INDIAN_STATES, COMMON_HSN_CODES } from './constants';

export interface GstTaxBreakdown {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface TaxSuggestionResult {
  isInterState: boolean;
  taxType: 'INTER_STATE_IGST' | 'INTRA_STATE_CGST_SGST';
  badgeTitle: string;
  businessStateName: string;
  businessStateCode: string;
  clientStateName: string;
  clientStateCode: string;
  placeOfSupplyName: string;
  placeOfSupplyCode: string;
  isSameState: boolean;
  isUtgst: boolean;
  explanation: string;
  shortRecommendation: string;
  applicableTaxes: string[];
}

export const UTGST_STATE_CODES = ['04', '26', '31', '35', '38', '97'];

export const getStateInfoByCode = (code: string) => {
  const normalized = code.padStart(2, '0');
  const found = INDIAN_STATES.find(s => s.code === normalized);
  return {
    code: normalized,
    name: found ? found.name : `State (${normalized})`,
    isUt: UTGST_STATE_CODES.includes(normalized)
  };
};

export const getStateInfoByName = (name: string) => {
  const found = INDIAN_STATES.find(s => s.name.toLowerCase() === name.toLowerCase().trim());
  return found || { code: '07', name: name || 'Delhi' };
};

export const getTaxRateSuggestion = (
  businessStateCode: string,
  clientStateCode: string,
  placeOfSupplyCode?: string
): TaxSuggestionResult => {
  const busInfo = getStateInfoByCode(businessStateCode || '07');
  const clientInfo = getStateInfoByCode(clientStateCode || businessStateCode || '07');
  const posCode = placeOfSupplyCode || clientInfo.code;
  const posInfo = getStateInfoByCode(posCode);

  // In Indian GST law, Inter vs Intra state depends on Seller State vs Place of Supply (POS)
  const isInterState = busInfo.code !== posInfo.code;
  const isSameStateAsClient = busInfo.code === clientInfo.code;
  const isUt = posInfo.isUt && !isInterState;

  if (isInterState) {
    return {
      isInterState: true,
      taxType: 'INTER_STATE_IGST',
      badgeTitle: 'Inter-State Supply (IGST)',
      businessStateName: busInfo.name,
      businessStateCode: busInfo.code,
      clientStateName: clientInfo.name,
      clientStateCode: clientInfo.code,
      placeOfSupplyName: posInfo.name,
      placeOfSupplyCode: posInfo.code,
      isSameState: isSameStateAsClient,
      isUtgst: false,
      explanation: `Place of Supply (${posInfo.name} - Code ${posInfo.code}) is different from Business location (${busInfo.name} - Code ${busInfo.code}). Integrated GST (IGST) is mandatory.`,
      shortRecommendation: `Apply 100% IGST (Single Tax Rate)`,
      applicableTaxes: ['IGST']
    };
  }

  const secondaryTax = isUt ? 'UTGST' : 'SGST';
  return {
    isInterState: false,
    taxType: 'INTRA_STATE_CGST_SGST',
    badgeTitle: `Intra-State Supply (CGST + ${secondaryTax})`,
    businessStateName: busInfo.name,
    businessStateCode: busInfo.code,
    clientStateName: clientInfo.name,
    clientStateCode: clientInfo.code,
    placeOfSupplyName: posInfo.name,
    placeOfSupplyCode: posInfo.code,
    isSameState: true,
    isUtgst: isUt,
    explanation: `Transaction is within ${busInfo.name} (Code ${busInfo.code}). Equal split between Central Tax (CGST) and State/UT Tax (${secondaryTax}) is required.`,
    shortRecommendation: `Apply equal 50% CGST + 50% ${secondaryTax}`,
    applicableTaxes: ['CGST', secondaryTax]
  };
};

export const suggestRateForHsn = (hsnCode: string): GstTaxRate | undefined => {
  if (!hsnCode) return undefined;
  const clean = hsnCode.trim();
  const match = COMMON_HSN_CODES.find(item => item.code === clean || item.code.startsWith(clean.slice(0, 4)));
  if (match && [0, 5, 12, 18, 28].includes(match.defaultGst)) {
    return match.defaultGst as GstTaxRate;
  }
  return undefined;
};

export const calculateBaseRateFromInclusive = (
  totalInclusiveAmount: number,
  quantity: number,
  discountPercent: number = 0,
  gstRate: number = 0,
  cessRate: number = 0
): number => {
  const qty = Math.max(0.0001, quantity);
  const discountFactor = Math.max(0.0001, 1 - (discountPercent / 100));
  const taxFactor = 1 + ((gstRate + cessRate) / 100);
  const baseRate = totalInclusiveAmount / (qty * discountFactor * taxFactor);
  return Number(baseRate.toFixed(2));
};

/**
 * Accurately calculate Taxable Base Rate from a GST-inclusive unit rate.
 * Formula: Exclude Rate = Include Rate / (1 + (GstRate + CessRate) / 100)
 */
export const calculateExcludeRateFromIncludeRate = (
  includeRate: number,
  gstRate: number = 0,
  cessRate: number = 0
): number => {
  if (!includeRate || includeRate <= 0) return 0;
  const taxFactor = 1 + ((gstRate + cessRate) / 100);
  const baseRate = includeRate / taxFactor;
  return Number(baseRate.toFixed(2));
};

/**
 * Accurately calculate GST-inclusive unit rate from a GST-exclusive base rate.
 * Formula: Include Rate = Exclude Rate * (1 + (GstRate + CessRate) / 100)
 */
export const calculateIncludeRateFromExcludeRate = (
  excludeRate: number,
  gstRate: number = 0,
  cessRate: number = 0
): number => {
  if (!excludeRate || excludeRate <= 0) return 0;
  const taxFactor = 1 + ((gstRate + cessRate) / 100);
  return Number((excludeRate * taxFactor).toFixed(2));
};

/**
 * Accurately calculate full GST line item breakdown from a total inclusive amount.
 * Guarantees zero-penny error: Taxable + CGST + SGST + IGST + Cess === Total Inclusive!
 */
export const calculateItemFromInclusiveTotal = (
  totalInclusive: number,
  quantity: number,
  discountPercent: number = 0,
  gstRate: GstTaxRate = 0,
  isInterState: boolean = false,
  cessRate: number = 0
): Omit<InvoiceItem, 'id' | 'name' | 'hsnCode' | 'unit'> => {
  const qty = Math.max(0.0001, quantity);
  const total = Math.max(0, Number(totalInclusive.toFixed(2)));
  const totalTaxFactor = 1 + ((gstRate + cessRate) / 100);

  // Exact taxable amount after discount
  const taxableAmount = Number((total / totalTaxFactor).toFixed(2));
  const totalTax = Number((total - taxableAmount).toFixed(2));

  // Cess amount if applicable
  let cessAmount = 0;
  if (cessRate > 0) {
    cessAmount = Number(((taxableAmount * cessRate) / 100).toFixed(2));
  }
  const gstTax = Math.max(0, Number((totalTax - cessAmount).toFixed(2)));

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = gstRate;
    igstAmount = gstTax;
  } else {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    // Split GST equally, guaranteeing cgst + sgst === gstTax exactly!
    cgstAmount = Number((gstTax / 2).toFixed(2));
    sgstAmount = Number((gstTax - cgstAmount).toFixed(2));
  }

  // Base rate before discount
  const discountFactor = Math.max(0.0001, 1 - (discountPercent / 100));
  const grossAmount = taxableAmount / discountFactor;
  const discountAmount = Number((grossAmount - taxableAmount).toFixed(2));
  const rate = Number((grossAmount / qty).toFixed(2));

  return {
    quantity,
    rate,
    discountPercent,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalAmount: total // Exactly matches inclusive input
  };
};

export const calculateItemGst = (
  rate: number,
  quantity: number,
  discountPercent: number,
  gstRate: GstTaxRate,
  isInterState: boolean,
  cessRate: number = 0
): Omit<InvoiceItem, 'id' | 'name' | 'hsnCode' | 'unit'> => {
  const grossAmount = rate * quantity;
  const discountAmount = Number(((grossAmount * discountPercent) / 100).toFixed(2));
  const taxableAmount = Number(Math.max(0, grossAmount - discountAmount).toFixed(2));

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = gstRate;
    igstAmount = Number(((taxableAmount * igstRate) / 100).toFixed(2));
  } else {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    // Calculate total GST first, then split to ensure equal sum without rounding 1-paisa errors
    const totalGst = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    cgstAmount = Number((totalGst / 2).toFixed(2));
    sgstAmount = Number((totalGst - cgstAmount).toFixed(2));
  }

  const cessAmount = cessRate > 0 ? Number(((taxableAmount * cessRate) / 100).toFixed(2)) : 0;
  const totalTax = Number((cgstAmount + sgstAmount + igstAmount + cessAmount).toFixed(2));
  const totalAmount = Number((taxableAmount + totalTax).toFixed(2));

  return {
    quantity,
    rate,
    discountPercent,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalAmount,
  };
};

export const recalculateInvoiceTotals = (
  items: InvoiceItem[],
  isInterState: boolean
): {
  subTotalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalDiscount: number;
  roundOff: number;
  grandTotal: number;
} => {
  let subTotalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;
  let totalDiscount = 0;

  items.forEach(item => {
    subTotalTaxable += item.taxableAmount || 0;
    totalDiscount += item.discountAmount || 0;
    totalCess += item.cessAmount || 0;

    if (isInterState) {
      totalIgst += (item.igstAmount !== undefined && item.igstAmount !== null)
        ? item.igstAmount
        : Number(((item.taxableAmount * item.gstRate) / 100).toFixed(2));
    } else {
      if (item.cgstAmount !== undefined && item.sgstAmount !== undefined) {
        totalCgst += item.cgstAmount;
        totalSgst += item.sgstAmount;
      } else {
        const itemGst = Number(((item.taxableAmount * item.gstRate) / 100).toFixed(2));
        const half = Number((itemGst / 2).toFixed(2));
        totalCgst += half;
        totalSgst += Number((itemGst - half).toFixed(2));
      }
    }
  });

  const rawTaxTotal = totalCgst + totalSgst + totalIgst + totalCess;
  const unroundedGrandTotal = subTotalTaxable + rawTaxTotal;
  const roundedGrandTotal = Math.round(unroundedGrandTotal);
  const roundOff = roundedGrandTotal - unroundedGrandTotal;

  return {
    subTotalTaxable: Number(subTotalTaxable.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    totalIgst: Number(totalIgst.toFixed(2)),
    totalCess: Number(totalCess.toFixed(2)),
    totalTax: Number(rawTaxTotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    roundOff: Number(roundOff.toFixed(2)),
    grandTotal: roundedGrandTotal,
  };
};

// Generate official NIC E-Invoice JSON Schema v1.03 for IRP portal
export const generateEInvoiceNICSchema = (invoice: Invoice, business: BusinessProfile) => {
  const currentYear = new Date(invoice.invoiceDate).getFullYear();
  const nextYear = String(currentYear + 1).slice(-2);
  const finYear = `${currentYear}-${nextYear}`;

  const docTypeMap: Record<string, string> = {
    TAX_INVOICE: 'INV',
    CREDIT_NOTE: 'CRN',
    DEBIT_NOTE: 'DBN',
    BILL_OF_SUPPLY: 'BOS',
    POS_SALE: 'INV',
    QUOTATION: 'INV'
  };

  const formattedItems = invoice.items.map((item, idx) => ({
    SlNo: String(idx + 1),
    PrdDesc: item.name,
    IsServc: 'N',
    HsnCd: item.hsnCode || '8471',
    Qty: item.quantity,
    Unit: item.unit || 'PCS',
    UnitPrice: item.rate,
    TotAmt: item.rate * item.quantity,
    Discount: item.discountAmount || 0,
    PreTaxVal: 0,
    AssAmt: item.taxableAmount,
    GstRt: item.gstRate,
    IgstAmt: invoice.isInterState ? item.igstAmount : 0,
    CgstAmt: !invoice.isInterState ? item.cgstAmount : 0,
    SgstAmt: !invoice.isInterState ? item.sgstAmount : 0,
    CesRt: item.cessRate || 0,
    CesAmt: item.cessAmount || 0,
    TotItemVal: item.totalAmount
  }));

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: invoice.customerGstin ? 'B2B' : 'B2C',
      RegRev: invoice.isReverseCharge ? 'Y' : 'N',
      EcmGstin: invoice.ecommerceGstin || null,
      IgstOnIntra: 'N'
    },
    DocDtls: {
      Typ: docTypeMap[invoice.invoiceType] || 'INV',
      No: invoice.invoiceNumber,
      Dt: invoice.invoiceDate.split('T')[0]
    },
    SellerDtls: {
      Gstin: business.gstin,
      LglNm: business.name,
      TrdNm: business.tradeName,
      Pos: business.stateCode,
      Addr1: business.address,
      Loc: business.city,
      Pin: Number(business.pincode) || 110001,
      Stcd: business.stateCode,
      Ph: business.phone,
      Em: business.email
    },
    BuyerDtls: {
      Gstin: invoice.customerGstin || 'URP',
      LglNm: invoice.customerName,
      TrdNm: invoice.customerName,
      Pos: invoice.placeOfSupplyStateCode || invoice.customerStateCode,
      Addr1: invoice.customerAddress,
      Loc: invoice.customerCity || 'City',
      Pin: Number(invoice.customerPincode) || 110001,
      Stcd: invoice.customerStateCode,
      Ph: invoice.customerPhone,
      Em: invoice.customerEmail
    },
    ValDtls: {
      AssVal: invoice.subTotalTaxable,
      CgstVal: invoice.totalCgst,
      SgstVal: invoice.totalSgst,
      IgstVal: invoice.totalIgst,
      CesVal: invoice.totalCess,
      Discount: invoice.totalDiscount,
      RndOffAmt: invoice.roundOff,
      TotInvVal: invoice.grandTotal
    },
    ItemList: formattedItems
  };
};

export const generateSimulatedEInvoice = (invoice: Invoice, business: BusinessProfile) => {
  const currentYear = new Date().getFullYear();
  const finYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
  const irn = generateIRN(business.gstin, 'INV', invoice.invoiceNumber, finYear);
  const ackNo = generateAckNo();
  const ackDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // NIC official QR string structure containing Buyer GSTIN, Doc No, Date, Totals and IRN signature
  const qrString = `GSTIN:${business.gstin}|DOC:${invoice.invoiceNumber}|DT:${invoice.invoiceDate.split('T')[0]}|IRN:${irn}|BUYER:${invoice.customerGstin || 'URP'}|VAL:${invoice.grandTotal}|ITEMS:${invoice.items.length}`;

  return {
    irn,
    ackNo,
    ackDate,
    signedQrCode: qrString,
    status: 'GENERATED' as const,
    generatedAt: new Date().toISOString(),
  };
};
