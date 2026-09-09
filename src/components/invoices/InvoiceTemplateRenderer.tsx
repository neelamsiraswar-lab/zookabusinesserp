import React from 'react';
import { Invoice, BusinessProfile, InvoiceTemplateConfig, InvoiceItem } from '../../types';
import { formatCurrency, formatDate, numberToIndianWords, normalizeSignatureUrl } from '../../utils/formatters';
import { buildUpiPaymentUri, cleanUpiId } from '../../utils/upi';
import { QrCodeSvg } from '../common/QrCodeSvg';
import { ShieldCheck, Sparkles, Building, Phone, Mail, MapPin, Globe } from 'lucide-react';

interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  business: BusinessProfile;
  template: InvoiceTemplateConfig;
  printCopyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';
  fitToOnePage?: boolean;
  isInteractivePreview?: boolean;
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({
  invoice,
  business,
  template,
  printCopyType = 'ORIGINAL',
  fitToOnePage = false,
  isInteractivePreview = false,
}) => {
  const activeSignatureUrl = normalizeSignatureUrl(business.signatureUrl);
  const showSig = template.showSignature && (business.showSignatureOnInvoice !== false);
  const effectiveUpiId = cleanUpiId(business.upiId) || 'bharattech@okhdfcbank';
  const upiPaymentUri = buildUpiPaymentUri({
    upiId: effectiveUpiId,
    payeeName: business.tradeName || business.name,
    amount: invoice.amountDue !== undefined && invoice.amountDue > 0 ? invoice.amountDue : invoice.grandTotal,
    invoiceNumber: invoice.invoiceNumber,
    note: `Invoice ${invoice.invoiceNumber}`,
  });

  const copyLabel = printCopyType === 'ORIGINAL' 
    ? 'ORIGINAL FOR RECIPIENT' 
    : printCopyType === 'DUPLICATE' 
      ? 'DUPLICATE FOR TRANSPORTER' 
      : 'TRIPLICATE FOR SUPPLIER';

  const fontClass = template.fontFamily === 'serif'
    ? 'font-serif'
    : template.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  // Customizable Theme and Text Colors with Intelligent Fallbacks
  const themeHex = template.themeColor || '#1e293b';
  const isTrade = template.headerStyle === 'TRADE_CLASSIC' || template.id === 'TRADE_CLASSIC_TM';
  const isThermal = template.headerStyle === 'THERMAL' || template.id === 'THERMAL_POS';
  
  const isLogoVisible = (template.showLogo !== false) && (business.showLogoOnInvoice !== false);
  const effectiveLogoShape: 'square' | 'circle' | 'rounded' = business.logoShape || template.logoShape || 'rounded';

  const getLogoShapeClasses = (shape: 'square' | 'circle' | 'rounded', extraClasses = '') => {
    switch (shape) {
      case 'circle':
        return `rounded-full aspect-square object-cover ${extraClasses}`;
      case 'square':
        return `rounded-none object-contain ${extraClasses}`;
      case 'rounded':
      default:
        return `rounded-xl object-contain ${extraClasses}`;
    }
  };

  // User Requirement: All invoice text color black heading subheading and paragraph text
  const bodyTextColor = '#000000';
  const headingTextColor = '#000000';
  const tableHeaderTextColor = '#000000';
  const accentTextColor = '#000000';
  const mutedTextColor = '#000000';

  // User Requirement: Payment mode and payment status data show in text no badge and ui
  const getPaymentModeText = (method?: string): string => {
    if (!method) return 'CASH / UPI / BANK';
    switch (method) {
      case 'CASH': return 'Cash';
      case 'UPI': return 'UPI / QR Code';
      case 'BANK_TRANSFER': return 'Bank Transfer (NEFT/RTGS/IMPS)';
      case 'CREDIT_CARD': return 'Credit / Debit Card';
      case 'CHEQUE': return 'Cheque';
      case 'OTHER': return 'Other Mode';
      default: return method.replace(/_/g, ' ');
    }
  };

  const getPaymentStatusText = (status?: string): string => {
    if (!status) return 'UNPAID';
    switch (status) {
      case 'PAID': return 'PAID';
      case 'PARTIALLY_PAID': return 'PARTIALLY PAID';
      case 'UNPAID': return 'UNPAID';
      case 'CANCELLED': return 'CANCELLED';
      default: return status.replace(/_/g, ' ');
    }
  };

  // Payment Method Info Helper
  const paymentInfo = (() => {
    switch (invoice.paymentMethod) {
      case 'CASH':
        return { 
          label: 'Cash Payment', 
          short: 'Cash', 
          code: 'CASH', 
        };
      case 'UPI':
        return { 
          label: 'UPI / QR Code', 
          short: 'UPI', 
          code: 'UPI', 
        };
      case 'BANK_TRANSFER':
        return { 
          label: 'Bank Transfer (NEFT/RTGS/IMPS)', 
          short: 'Bank Transfer', 
          code: 'BANK_TRANSFER', 
        };
      case 'CREDIT_CARD':
        return { 
          label: 'Credit / Debit Card', 
          short: 'Card', 
          code: 'CARD', 
        };
      case 'CHEQUE':
        return { 
          label: 'Cheque Payment', 
          short: 'Cheque', 
          code: 'CHEQUE', 
        };
      case 'OTHER':
        return { 
          label: 'Other Mode', 
          short: 'Other', 
          code: 'OTHER', 
        };
      default:
        return { 
          label: 'Cash / UPI / Bank Transfer', 
          short: 'Cash / UPI / Bank', 
          code: 'MULTI', 
        };
    }
  })();

  // Format HSN Summary Table
  const hsnSummaryMap = new Map<string, {
    hsnCode: string;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
  }>();

  invoice.items.forEach(item => {
    const key = `${item.hsnCode}_${item.gstRate}`;
    const existing = hsnSummaryMap.get(key);
    if (existing) {
      existing.taxableAmount += item.taxableAmount;
      existing.cgstAmount += item.cgstAmount;
      existing.sgstAmount += item.sgstAmount;
      existing.igstAmount += item.igstAmount;
      existing.totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount);
    } else {
      hsnSummaryMap.set(key, {
        hsnCode: item.hsnCode || 'N/A',
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalTax: (item.cgstAmount + item.sgstAmount + item.igstAmount),
      });
    }
  });

  const hsnSummaryList = Array.from(hsnSummaryMap.values());

  // THERMAL POS FORMAT
  if (template.headerStyle === 'THERMAL' || template.id === 'THERMAL_POS') {
    return (
      <div 
        className={`font-mono text-[11px] leading-tight space-y-2.5 text-black ${isInteractivePreview ? 'max-w-sm mx-auto' : ''}`}
        style={{ color: '#000000' }}
      >
        <div className="text-center pb-2 border-b border-dashed border-black">
          {isLogoVisible && (
            <div className="flex justify-center pb-1.5">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt="Company Logo"
                  className={`max-h-12 max-w-[120px] ${getLogoShapeClasses(effectiveLogoShape)} border border-black p-0.5 bg-white`}
                />
              ) : (
                <div className={`w-10 h-10 ${getLogoShapeClasses(effectiveLogoShape)} border-2 border-black bg-white flex items-center justify-center font-black text-xs text-black`}>
                  {(business.tradeName || business.name).slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <h2 className="font-bold text-sm uppercase tracking-wide text-black">{business.tradeName || business.name}</h2>
          <p className="text-[10px] text-black">{business.address}, {business.city} - {business.pincode}</p>
          <p className="text-[10px] font-bold text-black">GSTIN: {business.gstin}</p>
          <p className="text-[10px] text-black">Ph: {business.phone}</p>
        </div>

        <div className="py-1.5 border-b border-dashed border-black space-y-0.5 text-[10px] text-black">
          <div className="flex justify-between">
            <span className="font-bold text-black">Invoice No: {invoice.invoiceNumber}</span>
            <span className="text-black">{formatDate(invoice.invoiceDate)}</span>
          </div>
          <div>Customer: <span className="font-bold text-black">{invoice.customerName}</span></div>
          {invoice.customerGstin && <div>GST: <span className="font-mono text-black">{invoice.customerGstin}</span></div>}
          <div className="text-black">POS: {invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</div>
        </div>

        {/* Item Rows */}
        <div className="py-1.5 border-b border-dashed border-black">
          <div 
            className="flex justify-between font-bold pb-1 text-[10px] border-b border-black bg-transparent text-black"
            style={{ backgroundColor: 'transparent', color: '#000000' }}
          >
            <span>Particulars</span>
            <span>Qty x Rate</span>
            <span>Amt (₹)</span>
          </div>
          {invoice.items.map((item, idx) => (
            <div key={item.id || idx} className="py-1.5 border-b border-dotted border-black/30 last:border-0 text-black">
              <div className="flex justify-between text-[10px]">
                <div className="truncate max-w-[130px] font-semibold text-black">{item.name}</div>
                <div className="text-black">{item.quantity} {item.unit} x ₹{item.rate}</div>
                <div className="font-bold text-black">{formatCurrency(item.totalAmount, '')}</div>
              </div>
              <div className="text-[8.5px] mt-0.5 space-y-0.5 text-black">
                {item.hsnCode && <span>HSN: {item.hsnCode} • GST: {item.gstRate}%</span>}
                {template.showSerialNumber && item.serialNumber && (
                  <div className="text-black">Sr. No: {item.serialNumber}</div>
                )}
                {template.showWarranty && item.warranty && (
                  <div className="text-black">Warranty: {item.warranty}</div>
                )}
                {template.showDescription && item.description && (
                  <div className="italic whitespace-pre-line text-black">{item.description}</div>
                )}
                {template.showBatchNumber && item.batchNumber && (
                  <div className="text-black">Batch: {item.batchNumber}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Payment Details */}
        <div className="py-1.5 border-b border-dashed border-black space-y-1 text-[11px] text-black">
          <div className="flex justify-between">
            <span>Taxable Value:</span>
            <span>{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
          </div>
          {invoice.isInterState ? (
            <div className="flex justify-between text-[10px]">
              <span>IGST:</span>
              <span>{formatCurrency(invoice.totalIgst, business.currencySymbol)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-[10px]">
                <span>CGST:</span>
                <span>{formatCurrency(invoice.totalCgst, business.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>SGST:</span>
                <span>{formatCurrency(invoice.totalSgst, business.currencySymbol)}</span>
              </div>
            </>
          )}
          {invoice.roundOff !== 0 && (
            <div className="flex justify-between text-[10px] text-black">
              <span>Round Off:</span>
              <span>{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
            </div>
          )}
          <div 
            className="flex justify-between font-black text-xs pt-1 border-t border-black bg-transparent text-black"
            style={{ backgroundColor: 'transparent', color: '#000000' }}
          >
            <span>GRAND TOTAL:</span>
            <span>{formatCurrency(invoice.grandTotal, business.currencySymbol)}</span>
          </div>

          {/* Payment Details Section */}
          <div className="pt-1.5 border-t border-dotted border-black/40 space-y-1 text-[10px] text-black">
            <div className="flex justify-between text-[10px] text-black">
              <span>Mode of Payment:</span>
              <span className="font-bold uppercase text-black">{getPaymentModeText(invoice.paymentMethod)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-black">
              <span>Payment Status:</span>
              <span className="font-bold uppercase text-black">{getPaymentStatusText(invoice.status)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-black">
              <span>Amount Paid:</span>
              <span className="font-bold text-black">{formatCurrency(invoice.amountPaid || 0, business.currencySymbol)}</span>
            </div>
            {invoice.amountDue > 0 && (
              <div className="flex justify-between text-[10px] text-black font-bold">
                <span>Balance Due:</span>
                <span className="text-black">{formatCurrency(invoice.amountDue, business.currencySymbol)}</span>
              </div>
            )}
          </div>
        </div>

        {/* UPI QR */}
        {template.showUpiQr && (
          <div className="py-2 text-center flex flex-col items-center text-black">
            <QrCodeSvg value={upiPaymentUri} size={85} />
            <p className="text-[9px] mt-1 text-black">Scan & Pay via UPI: <strong className="font-mono text-black">{business.upiId}</strong></p>
          </div>
        )}

        <div className="text-center text-[9px] pt-1 border-t border-dotted border-black text-black">
          {template.footerDeclaration || 'Thank you for your business!'}
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTIC INDIAN TRADE / RETAIL GST FORMAT
  // (As shown in TM Electricals & Hardware Invoices)
  // ==========================================
  if (template.headerStyle === 'TRADE_CLASSIC' || template.id === 'TRADE_CLASSIC_TM') {
    const totalQuantity = invoice.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const dominantUnit = invoice.items[0]?.unit || 'Pcs.';
    const copyTypeText = printCopyType === 'ORIGINAL' 
      ? 'Original Copy' 
      : printCopyType === 'DUPLICATE' 
        ? 'Duplicate Copy' 
        : 'Triplicate Copy';

    // Tax Breakdown by GST Rate
    const taxRateBreakdown = Array.from(
      invoice.items.reduce((acc, item) => {
        const rate = item.gstRate || 0;
        const existing = acc.get(rate) || {
          rate,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
        };
        existing.taxable += item.taxableAmount;
        existing.cgst += item.cgstAmount;
        existing.sgst += item.sgstAmount;
        existing.igst += item.igstAmount;
        existing.totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount);
        acc.set(rate, existing);
        return acc;
      }, new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>())
    ).map(([_, val]) => val);

    const invoiceDateTimeStr = `${formatDate(invoice.invoiceDate)} ( ${
      invoice.createdAt
        ? new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '12:21 PM'
    } )`;

    return (
      <div 
        className="bg-white font-sans text-[11px] leading-tight border-2 border-black w-full min-h-[960px] flex flex-col justify-between select-text print:border-black"
        style={{ color: bodyTextColor }}
      >
        {/* Top Outer Container */}
        <div>
          {/* Header Copy Type Indicator */}
          <div className="flex justify-end px-3 pt-1">
            <span className="italic font-serif text-[11px] font-semibold tracking-wide" style={{ color: mutedTextColor }}>
              {copyTypeText}
            </span>
          </div>

        {/* Business Brand & Details Header - Centered */}
        <div className="px-4 pb-3 pt-2 text-center border-b border-black">
          {isLogoVisible && (
            <div className="flex justify-center mb-1.5">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt="Company Logo"
                  className={`max-h-16 max-w-[160px] ${getLogoShapeClasses(effectiveLogoShape)} border border-black p-0.5 bg-white`}
                />
              ) : (
                <div className={`w-12 h-12 ${getLogoShapeClasses(effectiveLogoShape)} border-2 border-black bg-white flex items-center justify-center text-black font-black text-lg tracking-tighter`}>
                  {(business.tradeName || business.name).slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className="font-bold text-xs uppercase tracking-widest text-black">
            TAX INVOICE
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-sans text-black">
            {business.tradeName || business.name}
          </h1>
          {template.headerTagline && (
            <p className="text-[11px] font-medium italic text-black">{template.headerTagline}</p>
          )}
          <p className="text-[10.5px] font-semibold uppercase max-w-xl mx-auto leading-tight text-black">
            {business.address}, {business.city}, {business.state} ({business.stateCode})
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 text-[10.5px] font-bold text-black pt-1">
            <span>GSTIN : <span className="font-mono text-black">{business.gstin}</span></span>
            <span>MOBILE : <span className="font-mono text-black">{business.phone}</span></span>
            {business.email && <span>EMAIL : <span className="text-black">{business.email}</span></span>}
          </div>
        </div>

        {/* Party Details & Invoice Information Split Box */}
        <div className="border-b border-black grid grid-cols-12 divide-x divide-black text-[11px] text-black">
          {/* Left Box: Party Details */}
          <div className="col-span-7 p-2.5 space-y-1 text-black">
            <div className="font-bold italic text-[11px] text-black">
              Party Details :
            </div>
            <div className="font-bold text-xs uppercase text-black">
              {invoice.customerName}
            </div>
            <div className="text-[10.5px] uppercase font-medium leading-tight whitespace-pre-line text-black">
              {invoice.customerAddress || `${invoice.customerCity || ''} ${invoice.customerState || ''}`.trim() || 'LOCAL'}
            </div>
            {invoice.customerState && invoice.customerState !== invoice.customerAddress && (
              <div className="text-[10.5px] uppercase font-medium text-black">
                {invoice.customerState}
              </div>
            )}

            <div className="pt-2 space-y-0.5 text-[10.5px] text-black">
              <div className="flex">
                <span className="w-32 font-medium text-black">Party Mobile No</span>
                <span className="mr-2">:</span>
                <strong className="font-mono text-black">{invoice.customerPhone || 'N/A'}</strong>
              </div>
              <div className="flex">
                <span className="w-32 font-medium text-black">GSTIN / UIN</span>
                <span className="mr-2">:</span>
                <strong className="font-mono text-black">{invoice.customerGstin || ''}</strong>
              </div>
            </div>
          </div>

          {/* Right Box: Invoice Metadata & Payment Details */}
          <div className="col-span-5 p-2.5 space-y-1 text-[10.5px] text-black">
            <div className="flex items-center">
              <span className="w-28 font-medium text-black">Invoice No.</span>
              <span className="mr-2">:</span>
              <strong className="font-mono font-bold text-xs text-black">{invoice.invoiceNumber}</strong>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-medium text-black">Invoice Date</span>
              <span className="mr-2">:</span>
              <strong className="text-black">{invoiceDateTimeStr}</strong>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-medium text-black">Place of Supply</span>
              <span className="mr-2">:</span>
              <strong className="text-black">
                {invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})
              </strong>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-medium text-black">Reverse Charge</span>
              <span className="mr-2">:</span>
              <strong className="text-black">{invoice.isReverseCharge ? 'Y' : 'N'}</strong>
            </div>
            <div className="flex items-center pt-1 border-t border-black/30">
              <span className="w-28 font-medium text-black">Payment Mode</span>
              <span className="mr-2">:</span>
              <strong className="text-black uppercase">{getPaymentModeText(invoice.paymentMethod)}</strong>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-medium text-black">Payment Status</span>
              <span className="mr-2">:</span>
              <strong className="text-black uppercase">{getPaymentStatusText(invoice.status)}</strong>
            </div>
          </div>
        </div>

        {/* Continuous Full-Height Grid Table */}
        <div className="w-full">
          <table className="w-full border-collapse text-[10.5px] bg-transparent text-black" style={{ backgroundColor: 'transparent', color: '#000000' }}>
            <thead>
              <tr 
                className="border-b border-black font-bold text-[10px] bg-transparent text-black" 
                style={{ backgroundColor: 'transparent', color: '#000000' }}
              >
                <th className="border-r border-black py-1.5 px-1 text-center w-8 bg-transparent text-black">S.N.</th>
                <th className="border-r border-black py-1.5 px-2 text-left bg-transparent text-black">Description of Goods</th>
                <th className="border-r border-black py-1.5 px-1 text-center w-16 bg-transparent text-black">HSN/SAC<br />Code</th>
                <th className="border-r border-black py-1.5 px-1 text-center w-14 bg-transparent text-black">Qty. Unit</th>
                <th className="border-r border-black py-1.5 px-1.5 text-right w-20 bg-transparent text-black">Price</th>
                {!invoice.isInterState ? (
                  <>
                    <th className="border-r border-black py-1.5 px-1 text-center w-12 bg-transparent text-black">CGST<br />Rate</th>
                    <th className="border-r border-black py-1.5 px-1 text-right w-16 bg-transparent text-black">CGST<br />Amount</th>
                    <th className="border-r border-black py-1.5 px-1 text-center w-12 bg-transparent text-black">SGST<br />Rate</th>
                    <th className="border-r border-black py-1.5 px-1 text-right w-16 bg-transparent text-black">SGST<br />Amount</th>
                  </>
                ) : (
                  <>
                    <th className="border-r border-black py-1.5 px-1 text-center w-14 bg-transparent text-black">IGST<br />Rate</th>
                    <th className="border-r border-black py-1.5 px-1.5 text-right w-24 bg-transparent text-black">IGST<br />Amount</th>
                  </>
                )}
                <th className="py-1.5 px-2 text-right w-24 bg-transparent text-black">Amount(₹)</th>
              </tr>
            </thead>
            <tbody className="text-black">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="align-top text-black">
                  <td className="border-r border-black py-1.5 px-1 text-center font-mono text-black">{idx + 1}.</td>
                  <td className="border-r border-black py-1.5 px-2 space-y-0.5 text-black">
                    <div className="font-bold uppercase text-[10.5px] text-black">{item.name}</div>
                    
                    {/* Sub-item Details (Model, Serial Numbers, Warranty) in authentic Trade style */}
                    {item.description && (
                      <div className="italic text-[9.5px] font-sans whitespace-pre-line text-black">{item.description}</div>
                    )}
                    {template.showSerialNumber && item.serialNumber && (
                      <div className="font-mono italic text-[9.5px] text-black">
                        {item.serialNumber}
                      </div>
                    )}
                    {template.showWarranty && item.warranty && (
                      <div className="italic uppercase text-[8.5px] font-semibold text-black">
                        {item.warranty}
                      </div>
                    )}
                    {template.showBatchNumber && item.batchNumber && (
                      <div className="italic text-[8.5px] font-mono text-black">
                        Batch: {item.batchNumber}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-black py-1.5 px-1 text-center font-mono text-black">{item.hsnCode || ''}</td>
                  <td className="border-r border-black py-1.5 px-1 text-center font-medium text-black">
                    {Number(item.quantity).toFixed(2)} {item.unit || 'Pcs.'}
                  </td>
                  <td className="border-r border-black py-1.5 px-1.5 text-right font-mono font-medium text-black">
                    {formatCurrency(item.rate, '')}
                  </td>
                  {!invoice.isInterState ? (
                    <>
                      <td className="border-r border-black py-1.5 px-1 text-center font-mono text-[10px] text-black">
                        {(item.gstRate / 2).toFixed(2)} %
                      </td>
                      <td className="border-r border-black py-1.5 px-1 text-right font-mono text-black">
                        {formatCurrency(item.cgstAmount, '')}
                      </td>
                      <td className="border-r border-black py-1.5 px-1 text-center font-mono text-[10px] text-black">
                        {(item.gstRate / 2).toFixed(2)} %
                      </td>
                      <td className="border-r border-black py-1.5 px-1 text-right font-mono text-black">
                        {formatCurrency(item.sgstAmount, '')}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border-r border-black py-1.5 px-1 text-center font-mono text-[10px] text-black">
                        {item.gstRate.toFixed(2)} %
                      </td>
                      <td className="border-r border-black py-1.5 px-1.5 text-right font-mono text-black">
                        {formatCurrency(item.igstAmount, '')}
                      </td>
                    </>
                  )}
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-black">
                    {formatCurrency(item.totalAmount, '')}
                  </td>
                </tr>
              ))}

              {/* Vertical Column Padding to Maintain Tall Column Lines */}
              {Array.from({ length: Math.max(0, 4 - invoice.items.length) }).map((_, emptyIdx) => (
                <tr key={`empty-${emptyIdx}`} className="h-6">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  {!invoice.isInterState ? (
                    <>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                    </>
                  ) : (
                    <>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                    </>
                  )}
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand Total Row */}
        <div className="border-t border-b border-black grid grid-cols-12 text-[11px] font-bold bg-transparent text-black">
          <div className="col-span-4 py-1 px-3 flex justify-end items-center pr-6 text-black">
            Grand Total
          </div>
          <div className="col-span-2 py-1 px-1 text-center font-mono text-black">
            {totalQuantity.toFixed(2)} {dominantUnit}
          </div>
          <div className="col-span-3"></div>
          <div className="col-span-3 border-l border-black py-1 px-3 flex justify-between items-center font-mono text-xs text-black">
            <span>₹</span>
            <span className="font-bold text-black">{formatCurrency(invoice.grandTotal, '')}</span>
          </div>
        </div>

        {/* Mini Tax Breakdown Matrix */}
        <div className="p-2 border-b border-black text-black">
          <div className="max-w-md">
            <table className="w-full text-[10px] border-collapse bg-transparent text-black" style={{ backgroundColor: 'transparent', color: '#000000' }}>
              <thead>
                <tr className="font-bold text-[9.5px] border-b border-black text-left bg-transparent text-black" style={{ backgroundColor: 'transparent', color: '#000000' }}>
                  <th className="py-0.5 px-1 bg-transparent text-black">Tax Rate</th>
                  <th className="py-0.5 px-1 text-right bg-transparent text-black">Taxable Amt.</th>
                  {!invoice.isInterState ? (
                    <>
                      <th className="py-0.5 px-1 text-right bg-transparent text-black">CGST</th>
                      <th className="py-0.5 px-1 text-right bg-transparent text-black">SGST</th>
                    </>
                  ) : (
                    <th className="py-0.5 px-1 text-right bg-transparent text-black">IGST</th>
                  )}
                  <th className="py-0.5 px-1 text-right font-bold bg-transparent text-black">Total Tax</th>
                </tr>
              </thead>
              <tbody className="font-mono text-black">
                {taxRateBreakdown.map((tb, tIdx) => (
                  <tr key={tIdx} className="border-b border-black/20 last:border-0 text-black">
                    <td className="py-0.5 px-1 font-sans text-black">{tb.rate}%</td>
                    <td className="py-0.5 px-1 text-right text-black">{formatCurrency(tb.taxable, '')}</td>
                    {!invoice.isInterState ? (
                      <>
                        <td className="py-0.5 px-1 text-right text-black">{formatCurrency(tb.cgst, '')}</td>
                        <td className="py-0.5 px-1 text-right text-black">{formatCurrency(tb.sgst, '')}</td>
                      </>
                    ) : (
                      <td className="py-0.5 px-1 text-right text-black">{formatCurrency(tb.igst, '')}</td>
                    )}
                    <td className="py-0.5 px-1 text-right font-bold text-black">{formatCurrency(tb.totalTax, '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank & Payment Details in Trade Classic */}
        {(template.showBankDetails || template.showUpiQr) && (
          <div className="border-b border-black p-2 flex items-center justify-between text-[10px] text-black">
            {template.showBankDetails && (
              <div className="space-y-0.5 text-black">
                <div className="font-bold uppercase text-[9.5px] text-black">Bank Remittance Details:</div>
                <div>Bank Name: <strong className="text-black">{business.bankName}</strong> | A/c No: <strong className="font-mono text-black">{business.accountNumber}</strong> | IFSC: <strong className="font-mono text-black">{business.ifscCode}</strong></div>
                {business.branchName && <div>Branch: <span className="text-black">{business.branchName}</span></div>}
              </div>
            )}
            {template.showUpiQr && (
              <div className="text-center shrink-0 flex flex-col items-center text-black">
                <QrCodeSvg value={upiPaymentUri} size={60} />
                <span className="text-[8px] font-bold text-black">UPI QR</span>
              </div>
            )}
          </div>
        )}

          {/* Amount in Words */}
          <div className="py-1 px-3 border-b border-black font-bold text-xs" style={{ color: headingTextColor }}>
            Rupees {numberToIndianWords(invoice.grandTotal)}
          </div>
        </div>

        {/* Bottom Dual-Box Footer: Terms on Left, Signatures on Right */}
        <div className="border-t border-black grid grid-cols-12 divide-x divide-black text-[10px]" style={{ color: bodyTextColor }}>
          {/* Left Column: Terms & Conditions */}
          <div className="col-span-6 p-2 space-y-1">
            <div className="font-bold underline text-[10.5px]" style={{ color: headingTextColor }}>Terms & Conditions</div>
            <div className="font-bold text-[10px]">E.& O.E.</div>
            <ol className="list-decimal pl-3.5 space-y-0.5 text-[9.5px] leading-tight" style={{ color: mutedTextColor }}>
              <li>Goods once sold will not be taken back.</li>
              <li>Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.</li>
              <li>Subject to '{business.state || 'Local'}' Jurisdiction only.</li>
            </ol>
          </div>

          {/* Right Column: Receiver's Signature & Authorized Signatory */}
          <div className="col-span-6 flex flex-col justify-between p-2 min-h-[120px]">
            <div className="font-bold text-[10.5px]" style={{ color: headingTextColor }}>
              Receiver's Signature :
            </div>

            {/* Signatory Box */}
            <div className="text-right space-y-1 pt-4">
              <div className="font-bold text-[10.5px]" style={{ color: headingTextColor }}>
                for <span className="uppercase font-black">{business.tradeName || business.name}</span>
              </div>
              
              {showSig && activeSignatureUrl && (
                <div className="flex justify-end py-0.5">
                  <img src={activeSignatureUrl} alt="Signature" className="max-h-12 max-w-[130px] object-contain" />
                </div>
              )}

              <div className="font-bold text-[10.5px] pt-1" style={{ color: headingTextColor }}>
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD A4 FORMATS
  return (
    <div 
      className={`relative flex flex-col justify-between h-full text-black ${fontClass} ${fitToOnePage ? 'space-y-2 text-[11px]' : 'space-y-3 text-xs'}`}
      style={{ color: '#000000' }}
    >
      {/* Watermark */}
      {template.watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none opacity-5">
          <div 
            className="text-8xl font-black uppercase transform -rotate-45 tracking-widest border-8 px-8 py-4 rounded-3xl text-black border-black"
          >
            {template.watermarkText}
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-3 text-black">
        {/* CENTERED COMPANY HEADER SECTION */}
        <div className="border border-black rounded-lg p-3 bg-transparent text-center space-y-1">
          {/* Top Row: Copy Type Indicator */}
          {template.showCopyTypeBadge && (
            <div className="flex justify-end -mt-0.5 -mr-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-black border border-black px-2 py-0.5 rounded">
                {copyLabel}
              </span>
            </div>
          )}

          {/* Logo (Centered if enabled) */}
          {isLogoVisible && (
            <div className="flex justify-center mb-1">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt="Company Logo"
                  className={`w-14 h-14 ${getLogoShapeClasses(effectiveLogoShape)} bg-transparent p-0.5 border border-black object-contain`}
                />
              ) : (
                <div className={`w-12 h-12 ${getLogoShapeClasses(effectiveLogoShape)} border-2 border-black bg-transparent flex items-center justify-center text-black font-black text-xl tracking-tight`}>
                  {(business.tradeName || business.name).slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className="text-[10px] font-extrabold uppercase tracking-widest text-black">
            TAX INVOICE - {invoice.invoiceType.replace(/_/g, ' ')}
          </div>

          <h1 className={`${fitToOnePage ? 'text-xl' : 'text-2xl'} font-black tracking-tight uppercase text-black`}>
            {business.tradeName || business.name}
          </h1>

          {template.headerTagline && (
            <p className="text-[10.5px] font-medium italic text-black">{template.headerTagline}</p>
          )}

          <p className="text-[11px] leading-tight max-w-xl mx-auto text-black">
            {business.address}, {business.city}, {business.state} - {business.pincode}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 text-[10.5px] text-black pt-0.5 font-semibold">
            <span>GSTIN: <strong className="font-mono text-black">{business.gstin}</strong></span>
            <span>State: <strong className="text-black">{business.state} (Code: {business.stateCode})</strong></span>
            <span>Phone: <strong className="font-mono text-black">{business.phone}</strong></span>
            {business.email && <span>Email: <strong className="text-black">{business.email}</strong></span>}
          </div>
        </div>

        {/* CUSTOMER BILL TO & METADATA CARDS */}
        <div className="grid grid-cols-2 gap-3 text-black">
          {/* Bill To */}
          <div className="border border-black rounded-lg p-3 bg-transparent text-black">
            <div className="text-[9.5px] font-bold uppercase tracking-wider mb-1 text-black">
              Billed To (Recipient):
            </div>
            <div className="font-bold text-xs text-black">{invoice.customerName}</div>
            <div className="text-[11px] leading-snug mt-0.5 text-black">{invoice.customerAddress}</div>
            <div className="mt-2 pt-1.5 border-t border-black/30 space-y-0.5 text-[10px] text-black">
              {invoice.customerGstin ? (
                <div>GSTIN / UIN: <strong className="font-mono text-black">{invoice.customerGstin}</strong></div>
              ) : (
                <div className="italic text-black">Unregistered Consumer</div>
              )}
              {invoice.customerPhone && <div>Phone: <strong className="font-mono text-black">{invoice.customerPhone}</strong></div>}
              <div>State: <strong className="text-black">{invoice.customerState} ({invoice.customerStateCode})</strong></div>
            </div>
          </div>

          {/* Invoice & Payment Details */}
          <div className="border border-black rounded-lg p-3 bg-transparent space-y-1 text-black">
            <div className="text-[9.5px] font-bold uppercase tracking-wider mb-1 flex justify-between text-black">
              <span>{invoice.hasDifferentShippingAddress ? 'Shipped To & Payment Details:' : 'Invoice & Payment Details:'}</span>
              <span className="text-[9px] font-semibold text-black">POS: {invoice.placeOfSupplyStateCode}</span>
            </div>
            {invoice.hasDifferentShippingAddress ? (
              <div className="space-y-0.5 text-[10.5px] text-black">
                <div className="font-bold text-xs text-black">{invoice.shippingName || invoice.customerName}</div>
                <div className="text-[10.5px] leading-snug text-black">{invoice.shippingAddress}</div>
                <div className="text-[10px] text-black">State: {invoice.shippingState} ({invoice.shippingStateCode})</div>
                <div className="pt-1 border-t border-black/30 space-y-0.5 text-[10px] text-black">
                  <div className="flex justify-between">
                    <span>Invoice No:</span>
                    <strong className="font-mono text-black">{invoice.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice Date:</span>
                    <strong className="text-black">{formatDate(invoice.invoiceDate)}</strong>
                  </div>
                  {invoice.dueDate && (
                    <div className="flex justify-between">
                      <span>Due Date:</span>
                      <strong className="text-black">{formatDate(invoice.dueDate)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Reverse Charge:</span>
                    <strong className="text-black">{invoice.isReverseCharge ? 'YES' : 'NO'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Mode of Payment:</span>
                    <strong className="text-black uppercase">{getPaymentModeText(invoice.paymentMethod)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <strong className="text-black uppercase">{getPaymentStatusText(invoice.status)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5 text-[10.5px] text-black">
                <div className="flex justify-between">
                  <span>Invoice No:</span>
                  <strong className="font-mono text-black">{invoice.invoiceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Invoice Date:</span>
                  <strong className="text-black">{formatDate(invoice.invoiceDate)}</strong>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <strong className="text-black">{formatDate(invoice.dueDate)}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Place of Supply:</span>
                  <strong className="text-black">{invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</strong>
                </div>
                <div className="flex justify-between">
                  <span>Supply Classification:</span>
                  <strong className="text-black">{invoice.isInterState ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST+SGST)'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Reverse Charge:</span>
                  <strong className="text-black">{invoice.isReverseCharge ? 'YES' : 'NO'}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Mode of Payment:</span>
                  <strong className="text-black uppercase">{getPaymentModeText(invoice.paymentMethod)}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Payment Status:</span>
                  <strong className="text-black uppercase">{getPaymentStatusText(invoice.status)}</strong>
                </div>
                {invoice.paymentReference && (
                  <div className="flex justify-between text-[10px] text-black">
                    <span>Payment Ref / UTR:</span>
                    <strong className="font-mono text-black">{invoice.paymentReference}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="overflow-hidden border border-black rounded-lg bg-transparent">
          <table className="w-full text-left text-[11px] border-collapse bg-transparent text-black" style={{ backgroundColor: 'transparent', color: '#000000' }}>
            <thead>
              <tr 
                className="font-bold text-[10px] uppercase tracking-wider border-b border-black bg-transparent text-black"
                style={{ backgroundColor: 'transparent', color: '#000000' }}
              >
                <th className="py-2 px-2 text-center w-8 bg-transparent text-black">#</th>
                <th className="py-2 px-3 bg-transparent text-black">Item Description & Particulars</th>
                <th className="py-2 px-2 text-center w-20 bg-transparent text-black">HSN/SAC</th>
                <th className="py-2 px-2 text-center w-14 bg-transparent text-black">Qty</th>
                <th className="py-2 px-2 text-right w-20 bg-transparent text-black">Rate (₹)</th>
                <th className="py-2 px-2 text-right w-20 bg-transparent text-black">Taxable</th>
                <th className="py-2 px-2 text-center w-16 bg-transparent text-black">GST %</th>
                <th className="py-2 px-3 text-right w-24 bg-transparent text-black">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/20 text-black">
              {invoice.items.map((item, idx) => (
                <tr 
                  key={item.id || idx}
                  className="bg-transparent text-black"
                >
                  <td className="py-2 px-2 text-center font-mono align-top text-black">{idx + 1}</td>
                  <td className="py-2 px-3 align-top space-y-0.5 text-black">
                    <div className="font-bold text-[11px] text-black">{item.name}</div>
                    
                    {/* Item Serial, Warranty, Batch, and Description Details */}
                    {(item.serialNumber || item.warranty || item.description || item.batchNumber) && (
                      <div className="text-[9.5px] space-y-0.5 pt-0.5 text-black">
                        {template.showSerialNumber && item.serialNumber && (
                          <div className="flex items-center gap-1 font-mono text-black">
                            <span className="font-bold">{business.itemLineSettings?.serialNumberLabel || 'Sr. No.'}:</span>
                            <span>{item.serialNumber}</span>
                          </div>
                        )}
                        {template.showWarranty && item.warranty && (
                          <div className="flex items-center gap-1 text-black">
                            <ShieldCheck className="w-3 h-3 text-black inline" />
                            <span className="font-semibold">{business.itemLineSettings?.warrantyLabel || 'Warranty'}: {item.warranty}</span>
                          </div>
                        )}
                        {template.showDescription && item.description && (
                          <div className="italic font-normal whitespace-pre-line text-black">{item.description}</div>
                        )}
                        {template.showBatchNumber && item.batchNumber && (
                          <div className="text-black">Batch: <strong className="font-mono text-black">{item.batchNumber}</strong></div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono align-top text-black">{item.hsnCode || '-'}</td>
                  <td className="py-2 px-2 text-center font-medium align-top text-black">
                    {item.quantity} <span className="text-[9px] text-black">{item.unit}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono align-top text-black">{formatCurrency(item.rate, '')}</td>
                  <td className="py-2 px-2 text-right font-mono align-top text-black">{formatCurrency(item.taxableAmount, '')}</td>
                  <td className="py-2 px-2 text-center align-top text-black">
                    <span className="font-bold text-[10px] text-black">{item.gstRate}%</span>
                    <div className="text-[8.5px] text-black">
                      {invoice.isInterState ? `IGST` : `CGST+SGST`}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold align-top text-black">
                    {formatCurrency(item.totalAmount, '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS & TAX BREAKDOWN */}
        <div className="grid grid-cols-12 gap-3 items-start text-black">
          {/* Left Column: Bank Details, UPI QR, Notes & Terms */}
          <div className="col-span-7 space-y-2 text-black">
            {/* Amount in Words */}
            {template.showAmountInWords && (
              <div className="p-2.5 bg-transparent rounded-lg border border-black text-[10.5px] text-black">
                <span className="font-bold uppercase text-[9px] block text-black">Invoice Amount in Words:</span>
                <span className="font-bold capitalize text-black">{numberToIndianWords(invoice.grandTotal)}</span>
              </div>
            )}

            {/* Bank Details & UPI QR */}
            {(template.showBankDetails || template.showUpiQr) && (
              <div className="p-2.5 bg-transparent rounded-lg border border-black flex items-center justify-between gap-3 text-black">
                {template.showBankDetails && (
                  <div className="space-y-0.5 text-[10px] text-black">
                    <div className="font-extrabold uppercase text-[9px] tracking-wider mb-1 text-black">
                      Bank Remittance Details:
                    </div>
                    <div className="text-black">Bank Name: <strong className="text-black">{business.bankName}</strong></div>
                    <div className="text-black">A/c No: <strong className="font-mono text-black">{business.accountNumber}</strong></div>
                    <div className="text-black">IFSC Code: <strong className="font-mono text-black">{business.ifscCode}</strong></div>
                    <div className="text-black">Branch: <span className="text-black">{business.branchName}</span></div>
                    {business.upiId && <div className="text-black">UPI ID: <strong className="font-mono text-black">{business.upiId}</strong></div>}
                  </div>
                )}

                {template.showUpiQr && (
                  <div className="text-center shrink-0 flex flex-col items-center text-black">
                    <QrCodeSvg value={upiPaymentUri} size={68} />
                    <span className="text-[8px] font-bold mt-0.5 text-black">Scan to Pay UPI</span>
                  </div>
                )}
              </div>
            )}

            {/* Terms & Conditions */}
            {template.showTerms && (business.defaultTerms || invoice.terms) && (
              <div className="text-[9.5px] space-y-0.5 text-black">
                <span className="font-bold uppercase tracking-wider text-[8.5px] text-black">Terms & Conditions:</span>
                <p className="whitespace-pre-line leading-relaxed text-black">
                  {invoice.terms || business.defaultTerms}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Financial Summary Table */}
          <div className="col-span-5 border border-black rounded-lg overflow-hidden bg-transparent text-black">
            <div className="p-2.5 space-y-1.5 text-[11px] divide-y divide-black/20 text-black">
              <div className="flex justify-between pt-0.5 text-black">
                <span>Total Taxable Amount:</span>
                <span className="font-mono font-semibold text-black">{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between pt-1 text-black">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono font-semibold text-black">{formatCurrency(invoice.totalIgst, business.currencySymbol)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between pt-1 text-black">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono font-semibold text-black">{formatCurrency(invoice.totalCgst, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-black">
                    <span>State GST (SGST):</span>
                    <span className="font-mono font-semibold text-black">{formatCurrency(invoice.totalSgst, business.currencySymbol)}</span>
                  </div>
                </>
              )}

              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-black pt-1">
                  <span>Total Discount:</span>
                  <span className="font-mono font-semibold text-black">-{formatCurrency(invoice.totalDiscount, business.currencySymbol)}</span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between pt-1 text-black">
                  <span>Round Off:</span>
                  <span className="font-mono text-black">{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div 
                className="flex justify-between items-center pt-2 pb-1.5 font-black text-sm border-t border-b border-black bg-transparent text-black"
                style={{ backgroundColor: 'transparent', color: '#000000' }}
              >
                <span>Grand Total (₹):</span>
                <span className="font-mono text-black">{formatCurrency(invoice.grandTotal, business.currencySymbol)}</span>
              </div>

              {/* Payment Summary */}
              <div className="pt-1.5 space-y-1 text-[10px] text-black">
                <div className="flex justify-between items-center text-black">
                  <span className="font-medium">Mode of Payment:</span>
                  <span className="font-bold uppercase text-black">{getPaymentModeText(invoice.paymentMethod)}</span>
                </div>
                <div className="flex justify-between items-center text-black">
                  <span className="font-medium">Payment Status:</span>
                  <span className="font-bold uppercase text-black">{getPaymentStatusText(invoice.status)}</span>
                </div>
                <div className="flex justify-between text-black font-medium">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold text-black">{formatCurrency(invoice.amountPaid || 0, business.currencySymbol)}</span>
                </div>
                {invoice.amountDue > 0 && (
                  <div className="flex justify-between text-black font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono text-black">{formatCurrency(invoice.amountDue || 0, business.currencySymbol)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HSN/SAC TAX SUMMARY SUB-TABLE (If enabled in template) */}
        {template.showHsnSummaryTable && hsnSummaryList.length > 0 && (
          <div className="border border-black rounded-lg overflow-hidden text-[10px] bg-transparent text-black">
            <div 
              className="px-2.5 py-1 font-bold uppercase text-[9px] tracking-wider bg-transparent border-b border-black text-black"
              style={{ backgroundColor: 'transparent', color: '#000000' }}
            >
              GST Tax Slab Summary (HSN/SAC Breakdown)
            </div>
            <table className="w-full text-left border-collapse bg-transparent text-black" style={{ backgroundColor: 'transparent', color: '#000000' }}>
              <thead>
                <tr className="bg-transparent border-b border-black text-black" style={{ backgroundColor: 'transparent', color: '#000000' }}>
                  <th className="py-1 px-2 font-semibold bg-transparent text-black">HSN / SAC</th>
                  <th className="py-1 px-2 text-right font-semibold bg-transparent text-black">Taxable Val (₹)</th>
                  <th className="py-1 px-2 text-center font-semibold bg-transparent text-black">Rate</th>
                  {invoice.isInterState ? (
                    <th className="py-1 px-2 text-right font-semibold bg-transparent text-black">IGST (₹)</th>
                  ) : (
                    <>
                      <th className="py-1 px-2 text-right font-semibold bg-transparent text-black">CGST (₹)</th>
                      <th className="py-1 px-2 text-right font-semibold bg-transparent text-black">SGST (₹)</th>
                    </>
                  )}
                  <th className="py-1 px-2 text-right font-semibold bg-transparent text-black">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20 font-mono text-[9.5px] text-black">
                {hsnSummaryList.map((hsn, idx) => (
                  <tr key={idx} className="bg-transparent text-black">
                    <td className="py-1 px-2 font-semibold text-black">{hsn.hsnCode}</td>
                    <td className="py-1 px-2 text-right text-black">{hsn.taxableAmount.toFixed(2)}</td>
                    <td className="py-1 px-2 text-center text-black">{hsn.gstRate}%</td>
                    {invoice.isInterState ? (
                      <td className="py-1 px-2 text-right text-black">{hsn.igstAmount.toFixed(2)}</td>
                    ) : (
                      <>
                        <td className="py-1 px-2 text-right text-black">{hsn.cgstAmount.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right text-black">{hsn.sgstAmount.toFixed(2)}</td>
                      </>
                    )}
                    <td className="py-1 px-2 text-right font-bold text-black">{hsn.totalTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER & AUTHORIZED SIGNATORY */}
      <div className="relative z-10 pt-3 border-t border-black mt-2 text-black">
        <div className="flex items-end justify-between gap-4 text-black">
          <div className="max-w-xs space-y-1 text-[9.5px] text-black">
            <p className="font-semibold text-black">Declaration & Undertaking:</p>
            <p className="leading-snug text-black">
              {template.footerDeclaration || 'Certified that the particulars given above are true and correct, and the amount indicated represents the price actually charged.'}
            </p>
          </div>

          {/* Authorized Signature Box */}
          {showSig && (
            <div className="text-right flex flex-col items-end min-w-[200px] text-black">
              <span className="text-[9px] font-bold uppercase text-black">
                For {business.tradeName || business.name}
              </span>
              <div className="h-14 flex items-center justify-end my-1">
                {activeSignatureUrl ? (
                  <img
                    src={activeSignatureUrl}
                    alt="Authorized Signature"
                    className="max-h-12 max-w-[170px] object-contain"
                  />
                ) : (
                  <div className="h-10 border-b border-dashed border-black w-36"></div>
                )}
              </div>
              <span className="font-bold text-[10px] text-black">
                {business.signatoryName || 'Authorized Signatory'}
              </span>
              <span className="text-[9px] text-black">
                {business.signatoryDesignation || 'Director / Signatory'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
