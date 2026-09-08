import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  LetterheadTemplate, 
  LetterheadHeaderStyle, 
  LetterheadFooterStyle, 
  BusinessProfile 
} from '../../types';
import { LetterheadPreviewCanvas } from './LetterheadPreviewCanvas';
import { 
  X, 
  Save, 
  Palette, 
  Layout, 
  Type, 
  Sparkles, 
  FileText, 
  Building2, 
  Check, 
  Sliders, 
  Layers 
} from 'lucide-react';

interface LetterheadTemplateDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: LetterheadTemplate;
  business: BusinessProfile;
  onSaveTemplate: (template: LetterheadTemplate) => void;
  showToast: (msg: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

export const LetterheadTemplateDesignerModal: React.FC<LetterheadTemplateDesignerModalProps> = ({
  isOpen,
  onClose,
  template: initialTemplate,
  business,
  onSaveTemplate,
  showToast
}) => {
  const [designerTab, setDesignerTab] = useState<'layout' | 'branding' | 'watermark' | 'footer' | 'typography'>('layout');

  const [id] = useState<string>(initialTemplate?.id || `tpl-lh-${Date.now()}`);
  const [name, setName] = useState<string>(initialTemplate?.name || 'Custom Company Letterhead');
  const [description, setDescription] = useState<string>(initialTemplate?.description || 'Custom company letterhead layout');
  const [isDefault, setIsDefault] = useState<boolean>(initialTemplate?.isDefault || false);

  // Header options
  const [headerStyle, setHeaderStyle] = useState<LetterheadHeaderStyle>(
    initialTemplate?.headerStyle || 'MODERN_SPLIT'
  );
  const [showLogo, setShowLogo] = useState<boolean>(initialTemplate?.showLogo !== false);
  const [logoPosition, setLogoPosition] = useState<'LEFT' | 'CENTER' | 'RIGHT'>(
    initialTemplate?.logoPosition || 'LEFT'
  );
  const [logoHeightPx, setLogoHeightPx] = useState<number>(initialTemplate?.logoHeightPx || 64);
  const [showCompanyName, setShowCompanyName] = useState<boolean>(initialTemplate?.showCompanyName !== false);
  const [showTradeName, setShowTradeName] = useState<boolean>(initialTemplate?.showTradeName !== false);
  const [showTagline, setShowTagline] = useState<boolean>(initialTemplate?.showTagline !== false);
  const [customTagline, setCustomTagline] = useState<string>(initialTemplate?.customTagline || '');
  const [showGstin, setShowGstin] = useState<boolean>(initialTemplate?.showGstin !== false);
  const [showPan, setShowPan] = useState<boolean>(initialTemplate?.showPan !== false);
  const [showCin, setShowCin] = useState<boolean>(initialTemplate?.showCin || false);
  const [cinNumber, setCinNumber] = useState<string>(initialTemplate?.cinNumber || '');
  const [showAddress, setShowAddress] = useState<boolean>(initialTemplate?.showAddress !== false);
  const [showContact, setShowContact] = useState<boolean>(initialTemplate?.showContact !== false);

  // Watermark
  const [showWatermark, setShowWatermark] = useState<boolean>(initialTemplate?.showWatermark || false);
  const [watermarkType, setWatermarkType] = useState<'LOGO' | 'TEXT' | 'CUSTOM'>(
    initialTemplate?.watermarkType || 'TEXT'
  );
  const [watermarkText, setWatermarkText] = useState<string>(initialTemplate?.watermarkText || 'CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(
    initialTemplate?.watermarkOpacity || 0.04
  );

  // Footer & Signatory
  const [footerStyle, setFooterStyle] = useState<LetterheadFooterStyle>(
    initialTemplate?.footerStyle || 'CLASSIC_SIGNATORY'
  );
  const [showSignatory, setShowSignatory] = useState<boolean>(initialTemplate?.showSignatory !== false);
  const [signatoryPosition, setSignatoryPosition] = useState<'RIGHT' | 'LEFT' | 'BOTH'>(
    initialTemplate?.signatoryPosition || 'RIGHT'
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    initialTemplate?.signatoryTitle || `For ${business.tradeName || business.name}`
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    initialTemplate?.signatoryName || business.signatoryName || 'Authorised Signatory'
  );
  const [signatoryDesignation, setSignatoryDesignation] = useState<string>(
    initialTemplate?.signatoryDesignation || business.signatoryDesignation || 'Director / Authorized Representative'
  );
  const [showSignatureImage, setShowSignatureImage] = useState<boolean>(
    initialTemplate?.showSignatureImage !== false
  );
  const [showStampPlaceholder, setShowStampPlaceholder] = useState<boolean>(
    initialTemplate?.showStampPlaceholder !== false
  );
  const [showBankDetailsInFooter, setShowBankDetailsInFooter] = useState<boolean>(
    initialTemplate?.showBankDetailsInFooter !== false
  );
  const [showFooterAddress, setShowFooterAddress] = useState<boolean>(
    initialTemplate?.showFooterAddress !== false
  );
  const [showPageNumber, setShowPageNumber] = useState<boolean>(
    initialTemplate?.showPageNumber !== false
  );
  const [footerCustomNote, setFooterCustomNote] = useState<string>(
    initialTemplate?.footerCustomNote || ''
  );

  // Colors & Typography
  const [accentColor, setAccentColor] = useState<string>(initialTemplate?.accentColor || '#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState<string>(initialTemplate?.secondaryColor || '#0ea5e9');
  const [textColor, setTextColor] = useState<string>(initialTemplate?.textColor || '#1e293b');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(
    initialTemplate?.fontFamily || 'sans'
  );
  const [bodyFontSizePt, setBodyFontSizePt] = useState<number>(initialTemplate?.bodyFontSizePt || 11);
  const [lineHeight, setLineHeight] = useState<number>(initialTemplate?.lineHeight || 1.6);

  // Margins
  const [marginTopMm, setMarginTopMm] = useState<number>(initialTemplate?.marginTopMm || 18);
  const [marginBottomMm, setMarginBottomMm] = useState<number>(initialTemplate?.marginBottomMm || 20);
  const [marginLeftMm, setMarginLeftMm] = useState<number>(initialTemplate?.marginLeftMm || 20);
  const [marginRightMm, setMarginRightMm] = useState<number>(initialTemplate?.marginRightMm || 20);

  if (!isOpen) return null;

  const currentTemplateState: LetterheadTemplate = {
    id,
    name: name.trim() || 'Custom Letterhead',
    description: description.trim() || undefined,
    isDefault,
    headerStyle,
    showLogo,
    logoPosition,
    logoHeightPx,
    showCompanyName,
    showTradeName,
    showTagline,
    customTagline: customTagline.trim() || undefined,
    showGstin,
    showPan,
    showCin,
    cinNumber: cinNumber.trim() || undefined,
    showAddress,
    showContact,
    showWatermark,
    watermarkType,
    watermarkText: watermarkText.trim() || undefined,
    watermarkOpacity,
    footerStyle,
    showSignatory,
    signatoryPosition,
    signatoryTitle: signatoryTitle.trim() || undefined as any,
    signatoryName: signatoryName.trim() || undefined,
    signatoryDesignation: signatoryDesignation.trim() || undefined,
    showSignatureImage,
    showStampPlaceholder,
    showBankDetailsInFooter,
    showFooterAddress,
    showPageNumber,
    footerCustomNote: footerCustomNote.trim() || undefined,
    accentColor,
    secondaryColor,
    textColor,
    fontFamily,
    bodyFontSizePt,
    lineHeight,
    paperSize: 'A4',
    marginTopMm,
    marginBottomMm,
    marginLeftMm,
    marginRightMm,
    createdAt: initialTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Sample document to preview template
  const sampleDoc = {
    documentNumber: 'DOC/2026/001',
    referenceNumber: 'REF: MKT/2026/042',
    date: new Date().toISOString().split('T')[0],
    recipientName: 'Mr. Arvind Malhotra',
    recipientDesignation: 'Vice President - Operations',
    recipientCompany: 'Apex Enterprises Pvt Ltd',
    recipientAddress: 'Tower B, Cyber City, Phase II',
    recipientCity: 'Gurugram',
    recipientState: 'Haryana',
    recipientPincode: '122002',
    recipientEmail: 'arvind@apexcorp.in',
    recipientPhone: '+91 98111 22233',
    subject: 'Proposal for Supply & Annual Maintenance Agreement',
    salutation: 'Dear Mr. Malhotra,',
    bodyHtml: `<p>We are pleased to present our official proposal and commercial terms for the enterprise supply and technical infrastructure maintenance. Our team is dedicated to providing high-reliability engineering solutions aligned with your compliance requirements.</p><p>Please review the enclosed particulars and let us know if you require any specific adjustments.</p>`,
    authorName: 'Admin Team',
    signatoryName,
    signatoryDesignation,
    includeSignature: true,
    includeStamp: true,
    includeLetterheadOnPrint: true
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast({
        type: 'error',
        title: 'Name Required',
        message: 'Please enter a name for this letterhead template.'
      });
      return;
    }

    onSaveTemplate(currentTemplateState);
    showToast({
      type: 'success',
      title: 'Letterhead Saved',
      message: `Template "${currentTemplateState.name}" has been saved.`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Letterhead Design Studio</h3>
              <p className="text-xs text-slate-400">Customize header layout, typography, accent branding, watermark & signatory footer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Body: Left Settings Panel + Right Live Canvas */}
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left Controls */}
          <div className="w-full md:w-96 border-r border-slate-800 bg-slate-900/90 flex flex-col h-full overflow-hidden flex-shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 px-3 pt-2 gap-1 bg-slate-900/50 overflow-x-auto select-none">
              {[
                { id: 'layout', label: 'Header', icon: Layout },
                { id: 'branding', label: 'Identity', icon: Building2 },
                { id: 'watermark', label: 'Watermark', icon: Layers },
                { id: 'footer', label: 'Footer', icon: Sliders },
                { id: 'typography', label: 'Styling', icon: Type },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = designerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDesignerTab(tab.id as any)}
                    className={`px-3 py-2 rounded-t-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-slate-800 text-indigo-400 border-t-2 border-indigo-500' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Forms */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* General Template Meta */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Template Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input 
                    type="checkbox" 
                    checked={isDefault} 
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600"
                  />
                  <span>Set as Default Letterhead for Active Business</span>
                </label>
              </div>

              {/* TAB 1: HEADER LAYOUT */}
              {designerTab === 'layout' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Header Layout Style
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'MODERN_SPLIT', label: 'Modern Split (Left Brand + Right Address)', desc: 'Contemporary two-column header with logo & contact' },
                        { id: 'CENTERED_ELEGANT', label: 'Centered Luxury (Crest Logo + Centered Text)', desc: 'Refined serif corporate and board layout' },
                        { id: 'MINIMAL_ACCENT', label: 'Minimal Clean (Compact Horizontal Bar)', desc: 'Clean, space-efficient technical letterhead' },
                        { id: 'CLASSIC_OFFICIAL', label: 'Classic Official (Double Border Rule)', desc: 'Formal statutory & corporate registry layout' },
                        { id: 'BANNER_FULL', label: 'Full Brand Banner', desc: 'Prominent color banner with complete credentials' }
                      ].map(style => (
                        <div
                          key={style.id}
                          onClick={() => setHeaderStyle(style.id as LetterheadHeaderStyle)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            headerStyle === style.id 
                              ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                              : 'bg-slate-800/40 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="font-semibold">{style.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{style.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Logo Settings</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mb-2">
                      <input 
                        type="checkbox" 
                        checked={showLogo} 
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Display Company Logo</span>
                    </label>
                    {showLogo && (
                      <div className="space-y-2 pl-2 border-l border-slate-700">
                        <div>
                          <label className="text-[10px] text-slate-400">Logo Height (px): {logoHeightPx}</label>
                          <input 
                            type="range" 
                            min={40} 
                            max={100} 
                            value={logoHeightPx} 
                            onChange={(e) => setLogoHeightPx(Number(e.target.value))}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: BRANDING & CONTACT INFO */}
              {designerTab === 'branding' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Credentials to Display in Header
                  </label>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showTradeName} 
                        onChange={(e) => setShowTradeName(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Trade / Brand Name</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showCompanyName} 
                        onChange={(e) => setShowCompanyName(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Legal Registered Name</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showGstin} 
                        onChange={(e) => setShowGstin(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show GSTIN ({business.gstin || 'Not set'})</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showPan} 
                        onChange={(e) => setShowPan(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show PAN ({business.pan || 'Not set'})</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showAddress} 
                        onChange={(e) => setShowAddress(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Registered Office Address</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showContact} 
                        onChange={(e) => setShowContact(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Phone, Email & Website</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-2 text-slate-300 mb-2">
                      <input 
                        type="checkbox" 
                        checked={showTagline} 
                        onChange={(e) => setShowTagline(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Custom Tagline / Slogan</span>
                    </label>
                    {showTagline && (
                      <input 
                        type="text" 
                        placeholder="e.g. Excellence in Commerce & Innovation"
                        value={customTagline} 
                        onChange={(e) => setCustomTagline(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-2 text-slate-300 mb-2">
                      <input 
                        type="checkbox" 
                        checked={showCin} 
                        onChange={(e) => setShowCin(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Corporate Identification (CIN / Reg No)</span>
                    </label>
                    {showCin && (
                      <input 
                        type="text" 
                        placeholder="e.g. U72900DL2022PTC123456"
                        value={cinNumber} 
                        onChange={(e) => setCinNumber(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: WATERMARK */}
              {designerTab === 'watermark' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-slate-300 mb-2">
                    <input 
                      type="checkbox" 
                      checked={showWatermark} 
                      onChange={(e) => setShowWatermark(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600"
                    />
                    <span className="font-semibold">Enable Background Watermark</span>
                  </label>

                  {showWatermark && (
                    <div className="space-y-3 pl-2 border-l border-slate-700">
                      <div>
                        <label className="block text-slate-400 mb-1">Watermark Type</label>
                        <select
                          value={watermarkType}
                          onChange={(e) => setWatermarkType(e.target.value as any)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="TEXT">Custom Text (e.g. OFFICIAL / CONFIDENTIAL)</option>
                          <option value="LOGO">Company Logo (Grayscale Center)</option>
                        </select>
                      </div>

                      {watermarkType === 'TEXT' && (
                        <div>
                          <label className="block text-slate-400 mb-1">Watermark Text</label>
                          <input 
                            type="text" 
                            value={watermarkText} 
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="e.g. OFFICIAL, ORIGINAL, DRAFT"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-400 mb-1">
                          Watermark Opacity ({Math.round(watermarkOpacity * 100)}%)
                        </label>
                        <input 
                          type="range" 
                          min={0.02} 
                          max={0.15} 
                          step={0.01}
                          value={watermarkOpacity} 
                          onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FOOTER & SIGNATORY */}
              {designerTab === 'footer' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Signatory & Footer Configuration
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={showSignatory} 
                        onChange={(e) => setShowSignatory(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span>Show Authorized Signatory Section</span>
                    </label>

                    {showSignatory && (
                      <div className="pl-3 border-l border-slate-700 space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-400">Signatory Position</label>
                          <select
                            value={signatoryPosition}
                            onChange={(e) => setSignatoryPosition(e.target.value as any)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            <option value="RIGHT">Right Aligned (Standard)</option>
                            <option value="LEFT">Left Aligned</option>
                            <option value="BOTH">Dual Signatures (Prepared By + Authorized)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Signatory Title</label>
                          <input 
                            type="text" 
                            value={signatoryTitle} 
                            onChange={(e) => setSignatoryTitle(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-slate-300">
                          <input 
                            type="checkbox" 
                            checked={showSignatureImage} 
                            onChange={(e) => setShowSignatureImage(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600"
                          />
                          <span>Render Digital Signature Image</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-300">
                          <input 
                            type="checkbox" 
                            checked={showStampPlaceholder} 
                            onChange={(e) => setShowStampPlaceholder(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600"
                          />
                          <span>Render Official Stamp / Seal Placeholder</span>
                        </label>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={showBankDetailsInFooter} 
                          onChange={(e) => setShowBankDetailsInFooter(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600"
                        />
                        <span>Display Bank Remittance Bar in Footer</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={showFooterAddress} 
                          onChange={(e) => setShowFooterAddress(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600"
                        />
                        <span>Display Registered Office in Footer</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={showPageNumber} 
                          onChange={(e) => setShowPageNumber(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600"
                        />
                        <span>Show Page Numbering</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TYPOGRAPHY, COLORS & MARGINS */}
              {designerTab === 'typography' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Theme & Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                      />
                      <span className="font-mono text-xs">{accentColor}</span>
                      <div className="flex gap-1.5 ml-auto">
                        {['#4f46e5', '#0284c7', '#059669', '#d97706', '#e11d48', '#0f172a', '#7c3aed'].map(c => (
                          <div 
                            key={c}
                            onClick={() => setAccentColor(c)}
                            className="w-5 h-5 rounded-full cursor-pointer border border-white/20 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="sans">Clean Modern Sans-Serif (Inter / Plus Jakarta)</option>
                      <option value="serif">Prestigious Formal Serif (Playfair / Merriweather)</option>
                      <option value="mono">Technical Monospace</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Body Font Size ({bodyFontSizePt}pt)</label>
                      <input 
                        type="number" 
                        min={9} 
                        max={14} 
                        value={bodyFontSizePt} 
                        onChange={(e) => setBodyFontSizePt(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Line Spacing ({lineHeight})</label>
                      <input 
                        type="number" 
                        min={1.2} 
                        max={2.0} 
                        step={0.1}
                        value={lineHeight} 
                        onChange={(e) => setLineHeight(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Margins */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Page Margins (mm)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Top Margin</label>
                        <input 
                          type="number" 
                          value={marginTopMm} 
                          onChange={(e) => setMarginTopMm(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Bottom Margin</label>
                        <input 
                          type="number" 
                          value={marginBottomMm} 
                          onChange={(e) => setMarginBottomMm(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Left Margin</label>
                        <input 
                          type="number" 
                          value={marginLeftMm} 
                          onChange={(e) => setMarginLeftMm(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Right Margin</label>
                        <input 
                          type="number" 
                          value={marginRightMm} 
                          onChange={(e) => setMarginRightMm(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Live Preview Canvas */}
          <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col items-center">
            <div className="mb-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live A4 Letterhead Preview</span>
            </div>
            <LetterheadPreviewCanvas
              document={sampleDoc}
              template={currentTemplateState}
              business={business}
              zoomScale={0.88}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
