import React from 'react';
import { LetterheadTemplate, LetterheadDocument, BusinessProfile } from '../../types';
import { interpolateLetterheadVariables } from '../../utils/letterheadDefaults';
import { Building2, Phone, Mail, Globe, MapPin, CheckCircle2 } from 'lucide-react';

interface LetterheadPreviewCanvasProps {
  document: Partial<LetterheadDocument>;
  template: LetterheadTemplate;
  business: BusinessProfile;
  isPrintMode?: boolean; // When printing
  forceWithLetterhead?: boolean; // Force showing letterhead regardless of document setting
  containerClassName?: string;
  zoomScale?: number; // 0.8, 1, etc.
}

export const LetterheadPreviewCanvas: React.FC<LetterheadPreviewCanvasProps> = ({
  document: doc,
  template,
  business,
  isPrintMode = false,
  forceWithLetterhead,
  containerClassName = '',
  zoomScale = 1
}) => {
  const showLetterhead = forceWithLetterhead !== undefined 
    ? forceWithLetterhead 
    : (doc.includeLetterheadOnPrint !== false);

  // Interpolate content
  const interpolatedBody = interpolateLetterheadVariables(doc.bodyHtml || '', business, doc);
  const formattedDate = doc.date
    ? new Date(doc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const companyName = template.showTradeName 
    ? (business.tradeName || business.name) 
    : (business.name || 'Company Name');

  const legalName = business.name || '';
  const tagline = template.customTagline || 'Enterprise Business & Commercial Solutions';
  const accentColor = template.accentColor || '#4f46e5';

  const fontClass = template.fontFamily === 'serif' 
    ? 'font-serif' 
    : template.fontFamily === 'mono' 
    ? 'font-mono' 
    : 'font-sans';

  return (
    <div 
      className={`letterhead-a4-page relative bg-white text-slate-800 shadow-xl transition-all duration-200 ${containerClassName} ${fontClass}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: showLetterhead 
          ? `${template.marginTopMm || 18}mm ${template.marginRightMm || 20}mm ${template.marginBottomMm || 20}mm ${template.marginLeftMm || 20}mm`
          : `${doc.customTopMarginMm || 45}mm ${template.marginRightMm || 20}mm ${doc.customBottomMarginMm || 35}mm ${template.marginLeftMm || 20}mm`,
        boxSizing: 'border-box',
        transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
        transformOrigin: 'top center',
        color: template.textColor || '#1e293b',
        fontSize: `${template.bodyFontSizePt || 11}pt`,
        lineHeight: template.lineHeight || 1.6
      }}
    >
      {/* Background Watermark */}
      {showLetterhead && template.showWatermark && (
        <div 
          className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
          style={{ opacity: template.watermarkOpacity || 0.04 }}
        >
          {template.watermarkType === 'LOGO' && business.logoUrl ? (
            <img 
              src={business.logoUrl} 
              alt="Watermark" 
              className="w-80 h-80 object-contain grayscale"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span 
              className="text-8xl font-black tracking-widest uppercase select-none transform -rotate-45"
              style={{ color: accentColor }}
            >
              {template.watermarkText || 'OFFICIAL'}
            </span>
          )}
        </div>
      )}

      {/* --- HEADER SECTION --- */}
      {showLetterhead && (
        <header className="relative z-10 mb-8 border-b pb-4" style={{ borderColor: `${accentColor}30` }}>
          {/* Header Style 1: Modern Split */}
          {template.headerStyle === 'MODERN_SPLIT' && (
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                {template.showLogo && business.logoUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={business.logoUrl} 
                      alt="Company Logo" 
                      style={{ maxHeight: `${template.logoHeightPx || 64}px` }}
                      className="object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: accentColor }}>
                    {companyName}
                  </h1>
                  {template.showCompanyName && legalName && legalName !== companyName && (
                    <p className="text-xs text-slate-500 font-medium">({legalName})</p>
                  )}
                  {template.showTagline && tagline && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5 tracking-wide italic">{tagline}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[9.5pt] text-slate-600">
                    {template.showGstin && business.gstin && (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <span className="text-[8pt] px-1 py-0.2 bg-slate-100 rounded text-slate-600 border border-slate-200">GSTIN</span> {business.gstin}
                      </span>
                    )}
                    {template.showPan && business.pan && (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <span className="text-[8pt] px-1 py-0.2 bg-slate-100 rounded text-slate-600 border border-slate-200">PAN</span> {business.pan}
                      </span>
                    )}
                    {template.showCin && template.cinNumber && (
                      <span className="inline-flex items-center gap-1 text-slate-500 text-[8.5pt]">
                        <span>CIN:</span> {template.cinNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Address & Contact Block */}
              <div className="text-right text-[9pt] text-slate-600 max-w-[240px] flex-shrink-0 flex flex-col items-end space-y-0.5">
                {template.showAddress && (
                  <p className="leading-tight text-slate-700">
                    {business.address}, {business.city}, {business.state} - {business.pincode}
                  </p>
                )}
                {template.showContact && (
                  <>
                    {business.phone && (
                      <p className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700">{business.phone}</span>
                      </p>
                    )}
                    {business.email && (
                      <p className="text-slate-600">{business.email}</p>
                    )}
                    {business.website && (
                      <p className="text-slate-500">{business.website}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Header Style 2: Centered Elegant */}
          {template.headerStyle === 'CENTERED_ELEGANT' && (
            <div className="text-center flex flex-col items-center">
              {template.showLogo && business.logoUrl && (
                <img 
                  src={business.logoUrl} 
                  alt="Company Logo" 
                  style={{ maxHeight: `${template.logoHeightPx || 70}px` }}
                  className="object-contain mb-2 rounded"
                  referrerPolicy="no-referrer"
                />
              )}
              <h1 className="text-2xl font-bold tracking-wide uppercase" style={{ color: accentColor }}>
                {companyName}
              </h1>
              {template.showTagline && tagline && (
                <p className="text-xs text-slate-600 font-serif italic mt-0.5">{tagline}</p>
              )}
              <div className="text-[9pt] text-slate-600 mt-1.5 flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                {template.showAddress && (
                  <span>{business.address}, {business.city} - {business.pincode} ({business.state})</span>
                )}
                {template.showContact && business.phone && (
                  <span>Tel: {business.phone}</span>
                )}
                {template.showContact && business.email && (
                  <span>Email: {business.email}</span>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-[8.5pt] text-slate-500">
                {template.showGstin && business.gstin && <span><strong>GSTIN:</strong> {business.gstin}</span>}
                {template.showPan && business.pan && <span><strong>PAN:</strong> {business.pan}</span>}
                {template.showCin && template.cinNumber && <span><strong>CIN:</strong> {template.cinNumber}</span>}
              </div>
            </div>
          )}

          {/* Header Style 3: Minimal Accent */}
          {template.headerStyle === 'MINIMAL_ACCENT' && (
            <div className="flex items-center justify-between pb-2 border-b-2" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-3">
                {template.showLogo && business.logoUrl && (
                  <img 
                    src={business.logoUrl} 
                    alt="Company Logo" 
                    style={{ maxHeight: `${template.logoHeightPx || 50}px` }}
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h1 className="text-lg font-bold" style={{ color: accentColor }}>{companyName}</h1>
                  {template.showGstin && business.gstin && (
                    <p className="text-[8.5pt] text-slate-500 font-mono">GSTIN: {business.gstin}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-[8.5pt] text-slate-600">
                {template.showContact && (
                  <p>{business.phone} | {business.email}</p>
                )}
                {template.showAddress && (
                  <p>{business.city}, {business.state}</p>
                )}
              </div>
            </div>
          )}

          {/* Header Style 4: Classic Official */}
          {template.headerStyle === 'CLASSIC_OFFICIAL' && (
            <div className="border-b-2 border-double pb-3" style={{ borderColor: accentColor }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {template.showLogo && business.logoUrl && (
                    <img 
                      src={business.logoUrl} 
                      alt="Logo" 
                      style={{ maxHeight: `${template.logoHeightPx || 60}px` }}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">{companyName}</h1>
                    <p className="text-[8.5pt] text-slate-600">Registered Commercial Enterprise</p>
                  </div>
                </div>
                <div className="text-right text-[8.5pt] text-slate-600 space-y-0.5">
                  {template.showGstin && <div><strong>GSTIN:</strong> {business.gstin}</div>}
                  {template.showPan && <div><strong>PAN:</strong> {business.pan}</div>}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[8pt] text-slate-500">
                <span>{business.address}, {business.city}, {business.state} - {business.pincode}</span>
                <span>{business.phone} &bull; {business.email}</span>
              </div>
            </div>
          )}

          {/* Header Style 5: Full Banner / Left Brand */}
          {(template.headerStyle === 'BANNER_FULL' || template.headerStyle === 'LEFT_BRAND') && (
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                {template.showLogo && business.logoUrl && (
                  <img 
                    src={business.logoUrl} 
                    alt="Logo" 
                    style={{ maxHeight: `${template.logoHeightPx || 60}px` }}
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h1 className="text-xl font-black tracking-tight" style={{ color: accentColor }}>{companyName}</h1>
                  {template.showTagline && <p className="text-xs text-slate-500 font-medium">{tagline}</p>}
                  <p className="text-[8.5pt] text-slate-600 mt-1 font-mono">
                    GSTIN: {business.gstin} {business.pan ? `| PAN: ${business.pan}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right text-[8.5pt] text-slate-600">
                <p>{business.address}</p>
                <p>{business.city}, {business.state} - {business.pincode}</p>
                <p>{business.phone} | {business.email}</p>
              </div>
            </div>
          )}

          {/* Decorative Colored Accent Bar */}
          <div 
            className="h-1 w-full mt-3 rounded-full" 
            style={{ 
              background: `linear-gradient(90deg, ${accentColor}, ${template.secondaryColor || accentColor})` 
            }}
          />
        </header>
      )}

      {/* --- DOCUMENT METADATA BAR (Date & Ref No) --- */}
      <div className="relative z-10 flex items-start justify-between mb-6 text-[10pt] text-slate-700">
        <div>
          {doc.referenceNumber ? (
            <div className="font-semibold text-slate-900">
              <span className="text-slate-500 font-normal">Ref No: </span>
              {doc.referenceNumber}
            </div>
          ) : doc.documentNumber ? (
            <div className="font-semibold text-slate-900">
              <span className="text-slate-500 font-normal">Doc No: </span>
              {doc.documentNumber}
            </div>
          ) : null}
        </div>
        <div className="text-right font-medium text-slate-800">
          <span className="text-slate-500 font-normal">Date: </span>
          {formattedDate}
        </div>
      </div>

      {/* --- RECIPIENT ADDRESS BLOCK --- */}
      {(doc.recipientName || doc.recipientCompany || doc.recipientAddress) && (
        <div className="relative z-10 mb-6 text-[10pt] leading-snug">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1 font-semibold">To,</div>
          {doc.recipientName && (
            <div className="font-bold text-slate-900 text-[10.5pt]">
              {doc.recipientName}
              {doc.recipientDesignation && (
                <span className="font-normal text-slate-600 text-[9.5pt]">, {doc.recipientDesignation}</span>
              )}
            </div>
          )}
          {doc.recipientCompany && (
            <div className="font-semibold text-slate-800">{doc.recipientCompany}</div>
          )}
          {doc.recipientAddress && (
            <div className="text-slate-700 whitespace-pre-line mt-0.5">{doc.recipientAddress}</div>
          )}
          {(doc.recipientCity || doc.recipientState || doc.recipientPincode) && (
            <div className="text-slate-700">
              {[doc.recipientCity, doc.recipientState, doc.recipientPincode].filter(Boolean).join(', ')}
            </div>
          )}
          {(doc.recipientPhone || doc.recipientEmail) && (
            <div className="text-slate-500 text-[9pt] mt-0.5">
              {[doc.recipientPhone ? `Ph: ${doc.recipientPhone}` : '', doc.recipientEmail ? `Email: ${doc.recipientEmail}` : ''].filter(Boolean).join(' | ')}
            </div>
          )}
        </div>
      )}

      {/* --- SUBJECT LINE --- */}
      {doc.subject && (
        <div className="relative z-10 mb-5 pb-1">
          <div className="inline-block font-bold text-[11pt] text-slate-900 border-b border-slate-900 pb-0.5">
            Subject: {doc.subject}
          </div>
        </div>
      )}

      {/* --- SALUTATION --- */}
      {doc.salutation && (
        <div className="relative z-10 mb-4 font-semibold text-slate-900 text-[10.5pt]">
          {interpolateLetterheadVariables(doc.salutation, business, doc)}
        </div>
      )}

      {/* --- MAIN LETTER CONTENT (WYSIWYG HTML) --- */}
      <div 
        className="relative z-10 letterhead-rich-content leading-relaxed text-slate-800 text-justify mb-8 space-y-3"
        dangerouslySetInnerHTML={{ __html: interpolatedBody }}
      />

      {/* --- SIGNATORY & CLOSING SECTION --- */}
      {template.showSignatory && (
        <div className="relative z-10 mt-10 pt-4 break-inside-avoid">
          <div className={`flex items-end ${
            template.signatoryPosition === 'LEFT' 
              ? 'justify-start' 
              : template.signatoryPosition === 'BOTH'
              ? 'justify-between'
              : 'justify-end'
          }`}>
            {/* Left Signatory (if BOTH) */}
            {template.signatoryPosition === 'BOTH' && (
              <div className="text-left max-w-[200px]">
                <p className="text-[9.5pt] font-semibold text-slate-700 mb-1">Prepared By:</p>
                <div className="h-14 flex items-center">
                  <span className="text-xs text-slate-400 italic">Signature</span>
                </div>
                <div className="border-t border-slate-300 pt-1 text-[9pt] text-slate-600">
                  <p className="font-semibold text-slate-800">{doc.authorName || 'Operations Team'}</p>
                  <p className="text-[8.5pt]">Commercial Executive</p>
                </div>
              </div>
            )}

            {/* Right / Primary Authorized Signatory */}
            <div className="text-right min-w-[220px]">
              <p className="text-[9.5pt] font-semibold text-slate-800 mb-1">
                {template.signatoryTitle || `For ${companyName}`}
              </p>
              
              {/* Signature Image & Stamp */}
              <div className="h-16 flex items-center justify-end gap-3 my-1">
                {doc.includeStamp !== false && template.showStampPlaceholder && (
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[7pt] text-slate-400 uppercase tracking-tighter text-center font-bold rotate-[-12deg] p-1">
                    Seal / Stamp
                  </div>
                )}
                {doc.includeSignature !== false && template.showSignatureImage && business.signatureUrl && (
                  <img 
                    src={business.signatureUrl} 
                    alt="Digital Signature" 
                    className="max-h-12 max-w-[140px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="border-t border-slate-300 pt-1.5 text-[9.5pt]">
                <p className="font-bold text-slate-900">
                  {doc.signatoryName || template.signatoryName || business.signatoryName || 'Authorised Signatory'}
                </p>
                <p className="text-slate-600 text-[8.5pt]">
                  {doc.signatoryDesignation || template.signatoryDesignation || business.signatoryDesignation || 'Authorized Representative'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FOOTER SECTION --- */}
      {showLetterhead && (
        <footer 
          className="mt-12 pt-4 border-t text-[8pt] text-slate-500 break-inside-avoid relative z-10" 
          style={{ borderColor: `${accentColor}30` }}
        >
          {template.showBankDetailsInFooter && business.bankName && (
            <div className="mb-2 px-3 py-1.5 bg-slate-50 rounded border border-slate-100 flex flex-wrap items-center justify-between text-[8pt] text-slate-600">
              <span className="font-semibold text-slate-700">Bank Details for Remittance:</span>
              <span><strong>Bank:</strong> {business.bankName}</span>
              <span><strong>A/C:</strong> {business.accountNumber}</span>
              <span><strong>IFSC:</strong> {business.ifscCode}</span>
              {business.upiId && <span><strong>UPI:</strong> {business.upiId}</span>}
            </div>
          )}

          <div className="flex items-center justify-between text-slate-500">
            <div>
              {template.showFooterAddress && (
                <p>{business.address}, {business.city}, {business.state} - {business.pincode}</p>
              )}
              {template.footerCustomNote && (
                <p className="text-slate-400 italic text-[7.5pt] mt-0.5">{template.footerCustomNote}</p>
              )}
            </div>
            {template.showPageNumber && (
              <div className="text-right font-mono text-[8pt] text-slate-400">
                Page 1 of 1
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
