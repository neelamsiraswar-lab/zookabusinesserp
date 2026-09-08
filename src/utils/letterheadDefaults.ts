import { LetterheadTemplate, LetterheadDocument, LetterheadStarterPreset, BusinessProfile } from '../types';

export const DEFAULT_LETTERHEAD_TEMPLATES: LetterheadTemplate[] = [
  {
    id: 'TPL_LH_MODERN_BLUE',
    name: 'Modern Corporate Indigo',
    description: 'Crisp, contemporary two-tone header with elegant typography, accent badge, and streamlined footer.',
    isDefault: true,
    headerStyle: 'MODERN_SPLIT',
    showLogo: true,
    logoPosition: 'LEFT',
    logoHeightPx: 64,
    showCompanyName: true,
    showTradeName: true,
    showTagline: true,
    customTagline: 'Excellence in Enterprise Solutions & Commerce',
    showGstin: true,
    showPan: true,
    showCin: true,
    cinNumber: 'U72900DL2022PTC123456',
    showAddress: true,
    showContact: true,
    
    showWatermark: true,
    watermarkType: 'TEXT',
    watermarkText: 'OFFICIAL',
    watermarkOpacity: 0.04,
    
    footerStyle: 'CLASSIC_SIGNATORY',
    showSignatory: true,
    signatoryPosition: 'RIGHT',
    signatoryTitle: 'For My Business Enterprises',
    signatoryName: 'Authorised Signatory',
    signatoryDesignation: 'Director / Signatory',
    showSignatureImage: true,
    showStampPlaceholder: true,
    showBankDetailsInFooter: true,
    showFooterAddress: true,
    showPageNumber: true,
    footerCustomNote: 'This is a computer-generated official document.',
    
    accentColor: '#4f46e5',
    secondaryColor: '#0ea5e9',
    textColor: '#1e293b',
    fontFamily: 'sans',
    bodyFontSizePt: 11,
    lineHeight: 1.6,
    
    paperSize: 'A4',
    marginTopMm: 18,
    marginBottomMm: 20,
    marginLeftMm: 20,
    marginRightMm: 20,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'TPL_LH_CLASSIC_GOLD',
    name: 'Executive Classic Gold & Charcoal',
    description: 'Prestigious serif typography with refined amber-gold border rule, centered crest logo, and formal legal layout.',
    isDefault: false,
    headerStyle: 'CENTERED_ELEGANT',
    showLogo: true,
    logoPosition: 'CENTER',
    logoHeightPx: 70,
    showCompanyName: true,
    showTradeName: true,
    showTagline: true,
    customTagline: 'Committed to Trust, Integrity & Quality',
    showGstin: true,
    showPan: true,
    showCin: true,
    showAddress: true,
    showContact: true,
    
    showWatermark: true,
    watermarkType: 'TEXT',
    watermarkText: 'ORIGINAL',
    watermarkOpacity: 0.04,
    
    footerStyle: 'MODERN_SPLIT',
    showSignatory: true,
    signatoryPosition: 'RIGHT',
    signatoryTitle: 'Authorized Representative',
    signatoryName: 'Managing Director',
    signatoryDesignation: 'Executive Board',
    showSignatureImage: true,
    showStampPlaceholder: true,
    showBankDetailsInFooter: true,
    showFooterAddress: true,
    showPageNumber: true,
    footerCustomNote: 'Confidential & Proprietary Communication',
    
    accentColor: '#d97706',
    secondaryColor: '#b45309',
    textColor: '#0f172a',
    fontFamily: 'serif',
    bodyFontSizePt: 11,
    lineHeight: 1.6,
    
    paperSize: 'A4',
    marginTopMm: 20,
    marginBottomMm: 22,
    marginLeftMm: 22,
    marginRightMm: 22,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'TPL_LH_MINIMAL_ACCENT',
    name: 'Minimal Clean Bordered',
    description: 'Subtle slate gray accent divider, compact left branding, and spacious body canvas for crisp technical writing.',
    isDefault: false,
    headerStyle: 'MINIMAL_ACCENT',
    showLogo: true,
    logoPosition: 'LEFT',
    logoHeightPx: 56,
    showCompanyName: true,
    showTradeName: true,
    showTagline: false,
    showGstin: true,
    showPan: true,
    showCin: false,
    showAddress: true,
    showContact: true,
    
    showWatermark: false,
    watermarkType: 'TEXT',
    watermarkText: '',
    watermarkOpacity: 0.03,
    
    footerStyle: 'MINIMAL_LEGAL',
    showSignatory: true,
    signatoryPosition: 'RIGHT',
    signatoryTitle: 'For the Company',
    signatoryName: 'Authorised Signatory',
    signatoryDesignation: 'Partner / Officer',
    showSignatureImage: true,
    showStampPlaceholder: false,
    showBankDetailsInFooter: false,
    showFooterAddress: true,
    showPageNumber: true,
    
    accentColor: '#0284c7',
    secondaryColor: '#64748b',
    textColor: '#334155',
    fontFamily: 'sans',
    bodyFontSizePt: 11,
    lineHeight: 1.5,
    
    paperSize: 'A4',
    marginTopMm: 16,
    marginBottomMm: 18,
    marginLeftMm: 18,
    marginRightMm: 18,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'TPL_LH_EMERALD_HEALTH',
    name: 'Emerald Corporate & Tech',
    description: 'Refreshing emerald green branding with bilateral contact header, verified tax credentials, and structured footer.',
    isDefault: false,
    headerStyle: 'BANNER_FULL',
    showLogo: true,
    logoPosition: 'LEFT',
    logoHeightPx: 60,
    showCompanyName: true,
    showTradeName: true,
    showTagline: true,
    customTagline: 'Sustainable Innovation & Professional Services',
    showGstin: true,
    showPan: true,
    showCin: true,
    showAddress: true,
    showContact: true,
    
    showWatermark: true,
    watermarkType: 'TEXT',
    watermarkText: 'CONFIDENTIAL',
    watermarkOpacity: 0.035,
    
    footerStyle: 'CLASSIC_SIGNATORY',
    showSignatory: true,
    signatoryPosition: 'RIGHT',
    signatoryTitle: 'Authorised Signatory',
    signatoryName: 'Director',
    signatoryDesignation: 'Operations Lead',
    showSignatureImage: true,
    showStampPlaceholder: true,
    showBankDetailsInFooter: true,
    showFooterAddress: true,
    showPageNumber: true,
    
    accentColor: '#059669',
    secondaryColor: '#10b981',
    textColor: '#1e293b',
    fontFamily: 'sans',
    bodyFontSizePt: 11,
    lineHeight: 1.6,
    
    paperSize: 'A4',
    marginTopMm: 18,
    marginBottomMm: 20,
    marginLeftMm: 20,
    marginRightMm: 20,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'TPL_LH_CRIMSON_LEGAL',
    name: 'Royal Crimson & Ruby Official',
    description: 'Formal regulatory and legal look with strong header grounding, bilingual/official font scaling, and double signature zones.',
    isDefault: false,
    headerStyle: 'CLASSIC_OFFICIAL',
    showLogo: true,
    logoPosition: 'LEFT',
    logoHeightPx: 65,
    showCompanyName: true,
    showTradeName: true,
    showTagline: true,
    customTagline: 'Incorporated under Companies Act, 2013',
    showGstin: true,
    showPan: true,
    showCin: true,
    showAddress: true,
    showContact: true,
    
    showWatermark: true,
    watermarkType: 'TEXT',
    watermarkText: 'LEGAL COPY',
    watermarkOpacity: 0.04,
    
    footerStyle: 'CLASSIC_SIGNATORY',
    showSignatory: true,
    signatoryPosition: 'BOTH',
    signatoryTitle: 'Authorized Signatory',
    signatoryName: 'Head of Legal & Finance',
    signatoryDesignation: 'Company Secretary',
    showSignatureImage: true,
    showStampPlaceholder: true,
    showBankDetailsInFooter: true,
    showFooterAddress: true,
    showPageNumber: true,
    
    accentColor: '#e11d48',
    secondaryColor: '#be123c',
    textColor: '#18181b',
    fontFamily: 'serif',
    bodyFontSizePt: 11,
    lineHeight: 1.6,
    
    paperSize: 'A4',
    marginTopMm: 20,
    marginBottomMm: 22,
    marginLeftMm: 22,
    marginRightMm: 22,
    createdAt: '2026-01-01T00:00:00Z',
  }
];

export const LETTERHEAD_STARTER_PRESETS: LetterheadStarterPreset[] = [
  {
    id: 'PRESET_PRICE_QUOTATION',
    title: 'Commercial Price Quotation & Proposal',
    category: 'PROPOSAL_QUOTATION',
    subject: 'Commercial Quotation for Products & Enterprise Services',
    salutation: 'Dear {{recipient_name}},',
    description: 'Formal commercial proposal with structured item breakdown table, GST rates, delivery schedule, and payment terms.',
    badge: 'Sales & Billing',
    bodyHtml: `
<p>Thank you for your valued enquiry regarding our commercial products and technical support services. In response to your requirement specifications, we are pleased to submit our best competitive quotation as detailed below:</p>

<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10.5pt;">
  <thead>
    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Sr.</th>
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Item Description & Specifications</th>
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">HSN Code</th>
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">Qty</th>
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">Unit Rate (₹)</th>
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">GST %</th>
      <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">Total (₹)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">1</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;"><strong>Industrial Automation Unit Model X-200</strong><br/><span style="color: #64748b; font-size: 9.5pt;">Includes 1 Year Comprehensive Onsite Warranty</span></td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">8471</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">2 Nos</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">45,000.00</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">18%</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">1,06,200.00</td>
    </tr>
    <tr>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">2</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;"><strong>Implementation, Installation & Training Package</strong><br/><span style="color: #64748b; font-size: 9.5pt;">Dedicated engineering deployment at customer site</span></td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">9983</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">1 Lot</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">15,000.00</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">18%</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">17,700.00</td>
    </tr>
  </tbody>
  <tfoot>
    <tr style="background-color: #f8fafc; font-weight: bold;">
      <td colspan="6" style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">Grand Total (Inclusive of 18% GST):</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">₹ 1,23,900.00</td>
    </tr>
  </tfoot>
</table>

<h3 style="font-size: 11pt; margin-top: 18px; margin-bottom: 8px; color: #1e293b;">Commercial Terms & Conditions:</h3>
<ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
  <li><strong>Validity:</strong> This quotation is valid for 30 days from the date of issuance ({{current_date}}).</li>
  <li><strong>Payment Terms:</strong> 50% advance along with confirmed Purchase Order, balance 50% upon delivery & installation.</li>
  <li><strong>Delivery:</strong> Within 7 to 10 working days from receipt of advance and confirmed specifications.</li>
  <li><strong>Warranty:</strong> 12 months from delivery covering manufacturing defects and component failures.</li>
  <li><strong>Banking Details:</strong> Payment can be directly remitted to our corporate bank account: {{company_bank}}.</li>
</ol>

<p style="margin-top: 16px;">Should you require any clarifications or adjustments to the proposed scope, please feel free to reach out to us directly.</p>

<p>Assuring you of our best quality and attentive service at all times.</p>
`
  },
  {
    id: 'PRESET_PAYMENT_REMINDER',
    title: 'Payment Reminder & Overdue Balance Notice',
    category: 'PAYMENT_REMINDER',
    subject: 'Urgent: Payment Follow-up for Outstanding Invoice Balances',
    salutation: 'Dear Accounts Team / {{recipient_name}},',
    description: 'Polite yet firm payment reminder letter with pending invoice ledger reference, total due balance, and bank transfer credentials.',
    badge: 'Finance & Recovery',
    bodyHtml: `
<p>We hope this letter finds you well.</p>

<p>We are writing to draw your kind attention towards the pending settlement of our recent tax invoices for goods/services delivered to <strong>{{recipient_company}}</strong>. As per our books of accounts, the following invoice balance remains outstanding for payment:</p>

<div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0 0 6px 0;"><strong>Invoice Reference:</strong> INV-2026-089 dated 15th January 2026</p>
  <p style="margin: 0 0 6px 0;"><strong>Total Invoiced Amount:</strong> ₹ 88,500.00 (Rupees Eighty-Eight Thousand Five Hundred Only)</p>
  <p style="margin: 0 0 6px 0;"><strong>Agreed Credit Period:</strong> 30 Days (Due Date: 14th February 2026)</p>
  <p style="margin: 0; color: #b45309;"><strong>Total Overdue Balance:</strong> <strong>₹ 88,500.00</strong> (Overdue by 18 days)</p>
</div>

<p>We request you to kindly arrange for the expedited electronic wire transfer of the overdue amount to our official bank account:</p>

<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; max-width: 500px;">
  <tr>
    <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600; width: 40%; background-color: #f1f5f9;">Beneficiary Name:</td>
    <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">{{company_name}}</td>
  </tr>
  <tr>
    <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f1f5f9;">Bank & Branch:</td>
    <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">{{company_bank}}</td>
  </tr>
  <tr>
    <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f1f5f9;">UPI Virtual Address:</td>
    <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">{{company_upi}}</td>
  </tr>
</table>

<p>Kindly share the UTR / transaction acknowledgement reference with our accounts department at <strong>{{company_email}}</strong> once processed so we can reconcile the ledger and issue your formal receipt voucher.</p>

<p>If the payment has already been initiated in the interim, please accept our thanks and disregard this reminder.</p>
`
  },
  {
    id: 'PRESET_AUTHORIZATION_LETTER',
    title: 'Formal Authorization / Board Undertaking',
    category: 'AUTHORIZATION_RESOLUTION',
    subject: 'Authorization Letter for Representation & Statutory Compliance',
    salutation: 'To Whom It May Concern,',
    description: 'Statutory authorization certificate empowering an authorized representative for GST, Banking, Customs, or Corporate tenders.',
    badge: 'Legal & Compliance',
    bodyHtml: `
<p>We, <strong>{{company_name}}</strong>, a registered commercial entity having our principal place of business at <em>{{company_address}}</em>, bearing GSTIN <strong>{{company_gstin}}</strong> and PAN <strong>{{company_pan}}</strong>, do hereby authorize and nominate:</p>

<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 18px; margin: 16px 0; border-radius: 6px;">
  <p style="margin: 0 0 6px 0;"><strong>Name of Authorized Person:</strong> {{recipient_name}}</p>
  <p style="margin: 0 0 6px 0;"><strong>Designation:</strong> Senior Commercial Manager / Representative</p>
  <p style="margin: 0 0 6px 0;"><strong>Identification / Aadhaar No.:</strong> XXXX-XXXX-1234</p>
  <p style="margin: 0;"><strong>Contact No. & Email:</strong> {{recipient_phone}} | {{recipient_email}}</p>
</div>

<p>The aforementioned person is hereby authorized to represent our organization for the following official purposes:</p>
<ul style="margin: 0; padding-left: 20px; line-height: 1.7;">
  <li>To submit, sign, execute, and deliver all requisite documents, bids, and contracts on our behalf.</li>
  <li>To represent before Government departments, GST Authorities, Banking institutions, and Port authorities.</li>
  <li>To collect, receive, and acknowledge deliveries, official correspondence, and security gate passes.</li>
</ul>

<p>The specimen signature of the authorized representative is attested hereunder:</p>

<div style="display: flex; gap: 24px; margin: 20px 0; align-items: flex-end;">
  <div style="flex: 1; border: 1px dashed #94a3b8; border-radius: 4px; padding: 24px 12px; text-align: center; background-color: #fafafa;">
    <p style="margin: 0; color: #64748b; font-size: 9.5pt;">(Specimen Signature of {{recipient_name}})</p>
  </div>
  <div style="flex: 1; border: 1px dashed #94a3b8; border-radius: 4px; padding: 24px 12px; text-align: center; background-color: #fafafa;">
    <p style="margin: 0; color: #64748b; font-size: 9.5pt;">(Attested with Official Seal)</p>
  </div>
</div>

<p>This authorization shall remain in full force and effect until revoked in writing by the undersigned management.</p>
`
  },
  {
    id: 'PRESET_OFFER_LETTER',
    title: 'Job Offer & Employment Appointment Letter',
    category: 'HR_EMPLOYMENT',
    subject: 'Offer of Employment: {{recipient_designation}}',
    salutation: 'Dear {{recipient_name}},',
    description: 'Professional HR appointment letter detailing designation, compensation structure, date of joining, probation, and reporting hierarchy.',
    badge: 'HR & Personnel',
    bodyHtml: `
<p>On behalf of <strong>{{company_name}}</strong>, we are delighted to offer you the position of <strong>{{recipient_designation}}</strong> in our organization. Following our recent interactions, we were thoroughly impressed by your credentials, domain expertise, and enthusiasm.</p>

<h3 style="font-size: 11pt; margin-top: 16px; margin-bottom: 8px; color: #1e293b;">Key Employment Terms & Particulars:</h3>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10.5pt;">
  <tr>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 600; width: 35%; background-color: #f8fafc;">Position / Role:</td>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0;">{{recipient_designation}}</td>
  </tr>
  <tr>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Department & Location:</td>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0;">Operations & Technology | {{company_city}}</td>
  </tr>
  <tr>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Date of Joining:</td>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0;">1st April 2026 (or earlier mutually agreed)</td>
  </tr>
  <tr>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Annual Compensation (CTC):</td>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0;"><strong>₹ 7,50,000/- per annum</strong> (subject to statutory deductions)</td>
  </tr>
  <tr>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Probation Period:</td>
    <td style="padding: 7px 10px; border: 1px solid #e2e8f0;">3 Months from date of joining</td>
  </tr>
</table>

<p>A detailed compensation breakup annexure and employment handbook will be furnished upon your joining. Please confirm your formal acceptance of this offer by signing and returning a duplicate copy of this letter within 5 working days.</p>

<p>We look forward to welcoming you to the team and wishing you a rewarding journey with us!</p>
`
  },
  {
    id: 'PRESET_EXPERIENCE_CERTIFICATE',
    title: 'Experience & Relieving Certificate',
    category: 'HR_EMPLOYMENT',
    subject: 'Experience & Relieving Certificate for {{recipient_name}}',
    salutation: 'To Whom It May Concern,',
    description: 'Formal employee relieving and service experience certificate with conduct appraisal and tenure confirmation.',
    badge: 'HR & Personnel',
    bodyHtml: `
<p>This is to certify that <strong>{{recipient_name}}</strong> was gainfully employed with <strong>{{company_name}}</strong> from <strong>15th July 2023</strong> to <strong>28th February 2026</strong>. At the time of relieving, they were serving in the capacity of <strong>{{recipient_designation}}</strong>.</p>

<p>During their tenure with our organization, {{recipient_name}} demonstrated exceptional dedication, technical acumen, and strong interpersonal teamwork. They were actively involved in core deliverables, client relationship management, and operational execution.</p>

<div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 10px 14px; margin: 16px 0;">
  <p style="margin: 0; font-style: italic; color: #334155;">"All company assets, equipment, access tokens, and administrative handovers have been successfully received and settled. There are no outstanding financial or operational dues against them."</p>
</div>

<p>{{recipient_name}} was formally relieved from all duties and employment contracts at the close of business hours on 28th February 2026 upon their voluntary resignation.</p>

<p>We place on record our appreciation for their valuable contributions and wish them the very best in all their future career endeavours.</p>
`
  },
  {
    id: 'PRESET_WARRANTY_CERTIFICATE',
    title: 'Product Warranty & Quality Guarantee',
    category: 'WARRANTY_CERTIFICATE',
    subject: 'Official Warranty & Performance Guarantee Certificate',
    salutation: 'To Valued Customer / {{recipient_name}},',
    description: 'Certificate of quality guarantee and technical warranty coverage for equipment, assemblies, or manufactured products.',
    badge: 'Quality & Service',
    bodyHtml: `
<p>This Certificate certifies that the equipment/goods supplied under Invoice No. <strong>{{ref_no}}</strong> have been manufactured, inspected, and tested in accordance with rigorous quality standards.</p>

<div style="border: 2px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fafafa;">
  <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 11pt;">Warranty Particulars:</h4>
  <p style="margin: 0 0 6px 0;"><strong>Product / Equipment Name:</strong> Commercial Electronic Processing System</p>
  <p style="margin: 0 0 6px 0;"><strong>Serial Number / IMEI:</strong> SN-2026-IND-994182</p>
  <p style="margin: 0 0 6px 0;"><strong>Warranty Period:</strong> 12 Months Comprehensive Onsite Warranty</p>
  <p style="margin: 0 0 6px 0;"><strong>Coverage Effective Date:</strong> {{current_date}}</p>
  <p style="margin: 0;"><strong>Customer / Project Name:</strong> {{recipient_name}} ({{recipient_company}})</p>
</div>

<h4 style="margin: 14px 0 6px 0; font-size: 10.5pt; color: #334155;">Coverage Terms:</h4>
<p style="line-height: 1.6; margin: 0 0 10px 0;">This warranty covers repair or replacement of any defective parts arising due to manufacturing or material flaws without charge for parts or labor. Service calls are logged via our priority helpline at <strong>{{company_phone}}</strong> or email at <strong>{{company_email}}</strong>.</p>
`
  },
  {
    id: 'PRESET_NOC_DECLARATION',
    title: 'No Objection Certificate (NOC) / KYC Undertaking',
    category: 'NOC_DECLARATION',
    subject: 'No Objection Certificate (NOC) for Commercial Account Operations',
    salutation: 'To Whom It May Concern,',
    description: 'Formal NOC and declaration certificate for banks, utility connections, statutory registrations, or vendor onboarding.',
    badge: 'Legal & Banking',
    bodyHtml: `
<p>We, <strong>{{company_name}}</strong>, having our principal corporate office at <em>{{company_address}}</em>, do hereby state and declare that we have <strong>NO OBJECTION</strong> whatsoever towards:</p>

<div style="background-color: #f1f5f9; padding: 14px; border-radius: 4px; margin: 14px 0; border: 1px solid #cbd5e1;">
  <p style="margin: 0; line-height: 1.6;">The commercial registration, vendor listing, and operational facility setup requested by <strong>{{recipient_name}}</strong> / <strong>{{recipient_company}}</strong> in relation to our ongoing joint projects and service agreements.</p>
</div>

<p>We further confirm that all existing business relations with the aforementioned party are in good standing with zero litigation or dispute pending.</p>

<p>This certificate is issued at the specific request of the applicant for submission to relevant authorities without any financial liability on our part.</p>
`
  },
  {
    id: 'PRESET_BLANK_LETTERHEAD',
    title: 'Blank Official Company Letterhead',
    category: 'CUSTOM',
    subject: 'Official Communication',
    salutation: 'Dear Sir / Madam,',
    description: 'Clean blank canvas with pre-formatted typography, date alignment, and sign-off placeholders for writing any custom message.',
    badge: 'Standard Blank',
    bodyHtml: `
<p>Please enter your customized letter body text here. You can format text with bold, italics, headings, bullet lists, custom tables, quotes, and smart merge fields.</p>

<p>Our organization is dedicated to providing high quality solutions and standard-compliant operations.</p>

<p>Sincerely,</p>
`
  }
];

/**
 * Interpolates variables like {{company_name}}, {{current_date}}, etc. into HTML strings
 */
export function interpolateLetterheadVariables(
  html: string,
  business: BusinessProfile,
  doc?: Partial<LetterheadDocument>
): string {
  if (!html) return '';

  const now = new Date();
  const formattedDate = doc?.date 
    ? new Date(doc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const bankSummary = business.bankName 
    ? `${business.bankName}, A/C: ${business.accountNumber || 'N/A'}, IFSC: ${business.ifscCode || 'N/A'}, Branch: ${business.branchName || 'Main'}`
    : 'Bank details available on request';

  const replacements: Record<string, string> = {
    '{{company_name}}': business.tradeName || business.name || 'Company Name',
    '{{company_legal_name}}': business.name || 'Company Name',
    '{{company_trade_name}}': business.tradeName || business.name || 'Company Name',
    '{{company_gstin}}': business.gstin || '',
    '{{company_pan}}': business.pan || '',
    '{{company_phone}}': business.phone || '',
    '{{company_email}}': business.email || '',
    '{{company_address}}': `${business.address || ''}, ${business.city || ''}, ${business.state || ''} - ${business.pincode || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ','),
    '{{company_city}}': business.city || '',
    '{{company_state}}': business.state || '',
    '{{company_bank}}': bankSummary,
    '{{company_upi}}': business.upiId || '',
    '{{current_date}}': formattedDate,
    '{{recipient_name}}': doc?.recipientName || 'Valued Recipient',
    '{{recipient_company}}': doc?.recipientCompany || 'Company / Organization',
    '{{recipient_designation}}': doc?.recipientDesignation || 'Designation / Title',
    '{{recipient_address}}': doc?.recipientAddress || '',
    '{{recipient_phone}}': doc?.recipientPhone || '',
    '{{recipient_email}}': doc?.recipientEmail || '',
    '{{ref_no}}': doc?.referenceNumber || doc?.documentNumber || 'REF-001',
    '{{document_no}}': doc?.documentNumber || 'DOC-001',
    '{{signatory_name}}': doc?.signatoryName || business.signatoryName || 'Authorised Signatory',
    '{{signatory_designation}}': doc?.signatoryDesignation || business.signatoryDesignation || 'Director / Authorized Signatory'
  };

  let output = html;
  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[{}]/g, '\\$&');
    output = output.replace(new RegExp(escapedKey, 'g'), value);
  }

  return output;
}

/**
 * Generates next sequential document number e.g. "DOC/2026/001"
 */
export function getNextLetterheadDocNumber(existingDocs: LetterheadDocument[] = [], prefix: string = 'DOC'): string {
  const currentYear = new Date().getFullYear();
  const yearStr = currentYear.toString();
  
  const regex = new RegExp(`^${prefix}/${yearStr}/(\\d+)`, 'i');
  let maxSeq = 0;

  const docs = Array.isArray(existingDocs) ? existingDocs : [];
  for (const doc of docs) {
    if (doc?.documentNumber) {
      const match = doc.documentNumber.match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = nextSeq.toString().padStart(3, '0');
  return `${prefix}/${yearStr}/${paddedSeq}`;
}

/**
 * Strips HTML tags for plaintext search index
 */
export function stripHtmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
