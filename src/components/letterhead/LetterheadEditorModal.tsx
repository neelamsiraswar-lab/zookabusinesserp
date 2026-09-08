import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LetterheadDocument, 
  LetterheadTemplate, 
  LetterCategory, 
  LetterStatus, 
  BusinessProfile 
} from '../../types';
import { 
  DEFAULT_LETTERHEAD_TEMPLATES, 
  LETTERHEAD_STARTER_PRESETS,
  interpolateLetterheadVariables,
  getNextLetterheadDocNumber,
  stripHtmlToPlainText
} from '../../utils/letterheadDefaults';
import { LetterheadPreviewCanvas } from './LetterheadPreviewCanvas';
import { 
  X, 
  Save, 
  Printer, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Minus, 
  Table as TableIcon, 
  FileText, 
  Eye, 
  Check, 
  ChevronDown, 
  Layers, 
  Settings2, 
  User, 
  Building2, 
  Calendar, 
  Tag, 
  Palette, 
  Undo, 
  Redo, 
  Type, 
  HelpCircle,
  RotateCcw,
  Plus
} from 'lucide-react';

interface LetterheadEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData?: Partial<LetterheadDocument>;
  templates: LetterheadTemplate[];
  existingDocuments: LetterheadDocument[];
  business: BusinessProfile;
  onSave: (doc: LetterheadDocument) => void;
  onPrintPreview: (doc: LetterheadDocument) => void;
  showToast: (msg: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

export const LetterheadEditorModal: React.FC<LetterheadEditorModalProps> = ({
  isOpen,
  onClose,
  documentData,
  templates = DEFAULT_LETTERHEAD_TEMPLATES,
  existingDocuments = [],
  business,
  onSave,
  onPrintPreview,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'meta'>('editor');
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isVariablesMenuOpen, setIsVariablesMenuOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(4);
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('#fef08a');

  const editorRef = useRef<HTMLDivElement>(null);

  // Form State
  const [id] = useState<string>(documentData?.id || `doc-${Date.now()}`);
  const [documentNumber, setDocumentNumber] = useState<string>(
    documentData?.documentNumber || getNextLetterheadDocNumber(existingDocuments, 'DOC')
  );
  const [referenceNumber, setReferenceNumber] = useState<string>(documentData?.referenceNumber || '');
  const [title, setTitle] = useState<string>(documentData?.title || 'Commercial Letter');
  const [category, setCategory] = useState<LetterCategory>(documentData?.category || 'OFFICIAL_LETTER');
  const [date, setDate] = useState<string>(
    documentData?.date || new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<LetterStatus>(documentData?.status || 'DRAFT');
  
  // Recipient details
  const [recipientName, setRecipientName] = useState<string>(documentData?.recipientName || '');
  const [recipientDesignation, setRecipientDesignation] = useState<string>(documentData?.recipientDesignation || '');
  const [recipientCompany, setRecipientCompany] = useState<string>(documentData?.recipientCompany || '');
  const [recipientAddress, setRecipientAddress] = useState<string>(documentData?.recipientAddress || '');
  const [recipientCity, setRecipientCity] = useState<string>(documentData?.recipientCity || '');
  const [recipientState, setRecipientState] = useState<string>(documentData?.recipientState || '');
  const [recipientPincode, setRecipientPincode] = useState<string>(documentData?.recipientPincode || '');
  const [recipientEmail, setRecipientEmail] = useState<string>(documentData?.recipientEmail || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(documentData?.recipientPhone || '');

  // Content
  const [subject, setSubject] = useState<string>(documentData?.subject || '');
  const [salutation, setSalutation] = useState<string>(documentData?.salutation || 'Dear Sir / Madam,');
  const [bodyHtml, setBodyHtml] = useState<string>(
    documentData?.bodyHtml || `<p>Please enter your customized letter body text here. You can write official communications, proposals, certificates, and authorizations directly on your company letterhead.</p><p>We remain committed to providing top-quality solutions and services.</p>`
  );

  // Template & Presentation
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    documentData?.templateId || templates.find(t => t.isDefault)?.id || templates[0]?.id || 'TPL_LH_MODERN_BLUE'
  );
  const [authorName, setAuthorName] = useState<string>(documentData?.authorName || 'Administrator');
  const [signatoryName, setSignatoryName] = useState<string>(
    documentData?.signatoryName || business.signatoryName || 'Authorised Signatory'
  );
  const [signatoryDesignation, setSignatoryDesignation] = useState<string>(
    documentData?.signatoryDesignation || business.signatoryDesignation || 'Authorized Representative'
  );
  const [includeSignature, setIncludeSignature] = useState<boolean>(
    documentData?.includeSignature !== false
  );
  const [includeStamp, setIncludeStamp] = useState<boolean>(
    documentData?.includeStamp !== false
  );
  const [includeLetterheadOnPrint, setIncludeLetterheadOnPrint] = useState<boolean>(
    documentData?.includeLetterheadOnPrint !== false
  );
  const [customTopMarginMm, setCustomTopMarginMm] = useState<number>(
    documentData?.customTopMarginMm || 45
  );
  const [customBottomMarginMm, setCustomBottomMarginMm] = useState<number>(
    documentData?.customBottomMarginMm || 35
  );

  // Sync editor initial HTML on mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml;
    }
  }, []);

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0] || DEFAULT_LETTERHEAD_TEMPLATES[0];

  // Exec editor commands
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const insertVariable = (varName: string) => {
    executeCommand('insertText', varName);
    setIsVariablesMenuOpen(false);
  };

  const insertTable = () => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 10.5pt;"><thead><tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">`;
    for (let c = 0; c < tableCols; c++) {
      tableHtml += `<th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Header ${c + 1}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < tableRows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Cell ${r + 1},${c + 1}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br/></p>`;
    
    executeCommand('insertHTML', tableHtml);
    setIsTableModalOpen(false);
  };

  const loadPreset = (preset: typeof LETTERHEAD_STARTER_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setSubject(preset.subject);
    setSalutation(preset.salutation);
    setBodyHtml(preset.bodyHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = preset.bodyHtml;
    }
    setIsPresetModalOpen(false);
    showToast({
      type: 'success',
      title: 'Template Loaded',
      message: `Loaded "${preset.title}" into the letterhead editor.`
    });
  };

  const currentDocPayload: LetterheadDocument = {
    id,
    documentNumber,
    referenceNumber: referenceNumber.trim() || undefined,
    title: title.trim() || 'Official Letter',
    category,
    date,
    recipientName: recipientName.trim(),
    recipientDesignation: recipientDesignation.trim() || undefined,
    recipientCompany: recipientCompany.trim() || undefined,
    recipientAddress: recipientAddress.trim() || undefined,
    recipientCity: recipientCity.trim() || undefined,
    recipientState: recipientState.trim() || undefined,
    recipientPincode: recipientPincode.trim() || undefined,
    recipientEmail: recipientEmail.trim() || undefined,
    recipientPhone: recipientPhone.trim() || undefined,
    subject: subject.trim(),
    salutation: salutation.trim(),
    bodyHtml,
    bodyPlainText: stripHtmlToPlainText(bodyHtml),
    templateId: selectedTemplateId,
    status,
    authorName: authorName.trim() || 'Staff',
    signatoryName: signatoryName.trim() || undefined,
    signatoryDesignation: signatoryDesignation.trim() || undefined,
    includeSignature,
    includeStamp,
    includeLetterheadOnPrint,
    customTopMarginMm,
    customBottomMarginMm,
    createdAt: documentData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSaveDocument = (newStatus?: LetterStatus) => {
    if (!title.trim()) {
      showToast({
        type: 'error',
        title: 'Title Required',
        message: 'Please provide a document title or subject for reference.'
      });
      return;
    }

    const payload: LetterheadDocument = {
      ...currentDocPayload,
      status: newStatus || status
    };

    onSave(payload);
    showToast({
      type: 'success',
      title: 'Document Saved',
      message: `Letter "${payload.title}" (${payload.documentNumber}) has been saved successfully.`
    });
    onClose();
  };

  const plainText = stripHtmlToPlainText(bodyHtml);
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        {/* --- MODAL HEADER --- */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document Title / Subject"
                  className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none font-bold text-lg text-white px-1 -ml-1 transition-colors max-w-md truncate"
                />
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {documentNumber}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  status === 'FINALIZED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  status === 'ISSUED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Write & format official correspondence directly on company letterhead
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs & Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'editor' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Text Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'preview' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Letterhead Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('meta')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'meta' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Document Details</span>
              </button>
            </div>

            {/* Starter Presets Button */}
            <button
              type="button"
              onClick={() => setIsPresetModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Load Template</span>
            </button>

            {/* Print Preview Button */}
            <button
              type="button"
              onClick={() => onPrintPreview(currentDocPayload)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            {/* Save Draft */}
            <button
              type="button"
              onClick={() => handleSaveDocument('DRAFT')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            {/* Finalize & Save */}
            <button
              type="button"
              onClick={() => handleSaveDocument('FINALIZED')}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Finalize & Save</span>
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

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: TEXT EDITOR ON LETTERHEAD CANVAS */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
              {/* Left Control Sidebar for Quick Metadata & Letterhead Selection */}
              <div className="w-full md:w-80 border-r border-slate-800 bg-slate-900/60 p-4 overflow-y-auto space-y-4 flex-shrink-0">
                {/* Active Letterhead Template */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Letterhead Design
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Print Stationery Mode Toggle */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Print Letterhead Background</p>
                      <p className="text-[10px] text-slate-400">Header, logo & footer on blank paper</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={includeLetterheadOnPrint} 
                      onChange={(e) => setIncludeLetterheadOnPrint(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                  </div>

                  {!includeLetterheadOnPrint && (
                    <div className="pt-2 border-t border-slate-700/60 text-[11px] text-amber-300">
                      <p className="font-semibold mb-1">Pre-printed Stationery Mode Active:</p>
                      <p className="text-slate-400 text-[10px] mb-2">Content will print with blank top/bottom margin for existing physical letterhead.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400">Top Space (mm)</label>
                          <input 
                            type="number" 
                            value={customTopMarginMm} 
                            onChange={(e) => setCustomTopMarginMm(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Bottom Space (mm)</label>
                          <input 
                            type="number" 
                            value={customBottomMarginMm} 
                            onChange={(e) => setCustomBottomMarginMm(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recipient Snapshot */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Recipient Information
                  </label>
                  <input 
                    type="text" 
                    placeholder="Recipient Name (e.g. Mr. Rahul Sharma)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="text" 
                    placeholder="Company / Org Name (e.g. Acme Corp)"
                    value={recipientCompany}
                    onChange={(e) => setRecipientCompany(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="text" 
                    placeholder="Subject (e.g. Quotation for Services)"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="text" 
                    placeholder="Salutation (e.g. Dear Mr. Sharma,)"
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Date & Reference */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date</label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Ref No. (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="REF/2026/01"
                      value={referenceNumber} 
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                {/* Signature & Seal Toggles */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Signature & Seal
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeSignature} 
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600"
                    />
                    <span>Attach Digital Signature Image</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeStamp} 
                      onChange={(e) => setIncludeStamp(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600"
                    />
                    <span>Include Official Stamp Placeholder</span>
                  </label>
                </div>

                {/* Word count stats */}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
                  <span>Words: <strong>{wordCount}</strong></span>
                  <span>Chars: <strong>{charCount}</strong></span>
                </div>
              </div>

              {/* Right Area: WYSIWYG Editor Toolbar + Embedded A4 Page */}
              <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
                {/* --- WYSIWYG TOOLBAR --- */}
                <div className="bg-slate-900 border-b border-slate-800 p-2 flex flex-wrap items-center gap-1.5 select-none z-20 flex-shrink-0">
                  {/* Text Formatting */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => executeCommand('bold')}
                      title="Bold (Ctrl+B)"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('italic')}
                      title="Italic (Ctrl+I)"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('underline')}
                      title="Underline (Ctrl+U)"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('strikeThrough')}
                      title="Strikethrough"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Headings */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => executeCommand('formatBlock', '<h1>')}
                      title="Heading 1"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors"
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('formatBlock', '<h2>')}
                      title="Heading 2"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('formatBlock', '<h3>')}
                      title="Heading 3"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors"
                    >
                      <Heading3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('formatBlock', '<p>')}
                      title="Normal Paragraph"
                      className="px-2 py-1 rounded hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    >
                      Body
                    </button>
                  </div>

                  {/* Alignment */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => executeCommand('justifyLeft')}
                      title="Align Left"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('justifyCenter')}
                      title="Align Center"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('justifyRight')}
                      title="Align Right"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('justifyFull')}
                      title="Justify Text"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Lists & Quotes */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => executeCommand('insertUnorderedList')}
                      title="Bulleted List"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('insertOrderedList')}
                      title="Numbered List"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('formatBlock', '<blockquote>')}
                      title="Callout Quote Block"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('insertHorizontalRule')}
                      title="Horizontal Divider"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Insert Table */}
                  <button
                    type="button"
                    onClick={() => setIsTableModalOpen(true)}
                    title="Insert Formatted Data Table"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1 text-xs transition-colors"
                  >
                    <TableIcon className="w-4 h-4 text-emerald-400" />
                    <span>Table</span>
                  </button>

                  {/* Insert Smart Merge Tag / Variable */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsVariablesMenuOpen(prev => !prev)}
                      title="Insert Smart Tag (Company Name, Date, GSTIN, Bank, etc.)"
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                      <span>&#123;&#123; Variable &#125;&#125;</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {isVariablesMenuOpen && (
                      <div className="absolute left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 text-xs space-y-0.5 max-h-80 overflow-y-auto">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Fields</div>
                        {[
                          { tag: '{{company_name}}', label: 'Company Trade Name' },
                          { tag: '{{company_gstin}}', label: 'GSTIN' },
                          { tag: '{{company_pan}}', label: 'PAN Number' },
                          { tag: '{{company_phone}}', label: 'Phone Number' },
                          { tag: '{{company_email}}', label: 'Email Address' },
                          { tag: '{{company_address}}', label: 'Registered Address' },
                          { tag: '{{company_bank}}', label: 'Bank Account Details' },
                          { tag: '{{company_upi}}', label: 'UPI ID' }
                        ].map(item => (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => insertVariable(item.tag)}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between items-center"
                          >
                            <span>{item.label}</span>
                            <span className="text-[10px] text-indigo-400 font-mono">{item.tag}</span>
                          </button>
                        ))}

                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">Recipient & Dates</div>
                        {[
                          { tag: '{{recipient_name}}', label: 'Recipient Name' },
                          { tag: '{{recipient_company}}', label: 'Recipient Company' },
                          { tag: '{{recipient_designation}}', label: 'Recipient Designation' },
                          { tag: '{{current_date}}', label: 'Current Date' },
                          { tag: '{{ref_no}}', label: 'Reference Number' },
                          { tag: '{{signatory_name}}', label: 'Authorized Signatory' }
                        ].map(item => (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => insertVariable(item.tag)}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between items-center"
                          >
                            <span>{item.label}</span>
                            <span className="text-[10px] text-indigo-400 font-mono">{item.tag}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Colors */}
                  <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-0.5 border border-slate-700">
                    <label className="text-[10px] text-slate-400">Color:</label>
                    <input 
                      type="color" 
                      value={textColor} 
                      onChange={(e) => {
                        setTextColor(e.target.value);
                        executeCommand('foreColor', e.target.value);
                      }}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  {/* Undo / Redo */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 ml-auto">
                    <button
                      type="button"
                      onClick={() => executeCommand('undo')}
                      title="Undo (Ctrl+Z)"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('redo')}
                      title="Redo (Ctrl+Y)"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* --- A4 LETTER CANVAS CONTAINER (SCROLLABLE) --- */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-950/80">
                  <div 
                    className="relative bg-white text-slate-900 shadow-2xl rounded-sm transition-all"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      padding: includeLetterheadOnPrint 
                        ? `${activeTemplate.marginTopMm || 18}mm ${activeTemplate.marginRightMm || 20}mm ${activeTemplate.marginBottomMm || 20}mm ${activeTemplate.marginLeftMm || 20}mm`
                        : `${customTopMarginMm || 45}mm ${activeTemplate.marginRightMm || 20}mm ${customBottomMarginMm || 35}mm ${activeTemplate.marginLeftMm || 20}mm`,
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Header visual in Editor */}
                    {includeLetterheadOnPrint ? (
                      <div className="pointer-events-none opacity-80 select-none mb-6">
                        <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: `${activeTemplate.accentColor}30` }}>
                          <div className="flex items-center gap-3">
                            {activeTemplate.showLogo && business.logoUrl && (
                              <img 
                                src={business.logoUrl} 
                                alt="Logo" 
                                style={{ maxHeight: `${activeTemplate.logoHeightPx || 55}px` }}
                                className="object-contain rounded"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <h1 className="text-xl font-bold tracking-tight" style={{ color: activeTemplate.accentColor }}>
                                {business.tradeName || business.name}
                              </h1>
                              <p className="text-[9pt] text-slate-600">
                                GSTIN: {business.gstin} {business.pan ? `| PAN: ${business.pan}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[8.5pt] text-slate-500 max-w-[240px]">
                            <p>{business.address}, {business.city} - {business.pincode}</p>
                            <p>{business.phone} | {business.email}</p>
                          </div>
                        </div>
                        <div 
                          className="h-1 w-full mt-2 rounded-full" 
                          style={{ background: `linear-gradient(90deg, ${activeTemplate.accentColor}, ${activeTemplate.secondaryColor || activeTemplate.accentColor})` }}
                        />
                      </div>
                    ) : (
                      <div className="mb-4 py-2 px-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs italic text-center select-none">
                        [Pre-printed Stationery Top Margin Offset: {customTopMarginMm}mm]
                      </div>
                    )}

                    {/* Metadata Header preview in Editor */}
                    <div className="flex justify-between text-[10pt] text-slate-700 mb-4 select-none">
                      <div>
                        {referenceNumber ? (
                          <span className="font-semibold text-slate-900">Ref: {referenceNumber}</span>
                        ) : (
                          <span className="text-slate-500 font-mono">Doc No: {documentNumber}</span>
                        )}
                      </div>
                      <div className="font-medium text-slate-800">
                        Date: {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Recipient Details display */}
                    {(recipientName || recipientCompany || recipientAddress) && (
                      <div className="mb-5 text-[10pt] select-none">
                        <div className="text-slate-500 text-xs font-semibold">To,</div>
                        {recipientName && <div className="font-bold text-slate-900">{recipientName}</div>}
                        {recipientCompany && <div className="font-semibold text-slate-800">{recipientCompany}</div>}
                        {recipientAddress && <div className="text-slate-700 whitespace-pre-line">{recipientAddress}</div>}
                        {(recipientCity || recipientState || recipientPincode) && (
                          <div className="text-slate-700">
                            {[recipientCity, recipientState, recipientPincode].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subject Line display */}
                    {subject && (
                      <div className="mb-4 font-bold text-[11pt] text-slate-900 border-b border-slate-900 pb-0.5 select-none inline-block">
                        Subject: {subject}
                      </div>
                    )}

                    {/* Salutation */}
                    {salutation && (
                      <div className="mb-3 font-semibold text-slate-900 text-[10.5pt] select-none">
                        {salutation}
                      </div>
                    )}

                    {/* --- THE CONTENT EDITABLE WYSIWYG BODY --- */}
                    <div 
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      className="letterhead-editable-canvas min-h-[350px] outline-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded p-1 text-slate-800 text-[11pt] leading-relaxed text-justify space-y-3"
                      style={{
                        fontSize: `${activeTemplate.bodyFontSizePt || 11}pt`,
                        lineHeight: activeTemplate.lineHeight || 1.6
                      }}
                      suppressContentEditableWarning
                    />

                    {/* Signatory Closing visual */}
                    {activeTemplate.showSignatory && (
                      <div className="mt-10 pt-4 flex justify-end select-none">
                        <div className="text-right min-w-[200px]">
                          <p className="text-[9.5pt] font-semibold text-slate-800 mb-1">
                            {activeTemplate.signatoryTitle || `For ${business.tradeName || business.name}`}
                          </p>
                          <div className="h-14 flex items-center justify-end gap-2 my-1">
                            {includeStamp && (
                              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[7pt] text-slate-400 uppercase font-bold rotate-[-10deg]">
                                Stamp
                              </div>
                            )}
                            {includeSignature && business.signatureUrl && (
                              <img 
                                src={business.signatureUrl} 
                                alt="Signature" 
                                className="max-h-12 max-w-[120px] object-contain"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                          <div className="border-t border-slate-300 pt-1 text-[9.5pt]">
                            <p className="font-bold text-slate-900">{signatoryName}</p>
                            <p className="text-slate-600 text-[8.5pt]">{signatoryDesignation}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Visual in Editor */}
                    {includeLetterheadOnPrint && (
                      <div className="mt-12 pt-3 border-t border-slate-200 text-[8pt] text-slate-500 flex justify-between select-none">
                        <div>
                          <p>{business.address}, {business.city}, {business.state} - {business.pincode}</p>
                        </div>
                        <div className="font-mono text-slate-400">
                          Page 1 of 1
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE LETTERHEAD PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto p-6 items-center">
              <div className="mb-4 flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300">
                <span>Template: <strong>{activeTemplate.name}</strong></span>
                <span>Mode: <strong>{includeLetterheadOnPrint ? 'Full Letterhead' : 'Pre-printed Stationery'}</strong></span>
                <span>Category: <strong>{category}</strong></span>
                <button
                  type="button"
                  onClick={() => onPrintPreview(currentDocPayload)}
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-500 ml-auto flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Print View</span>
                </button>
              </div>

              <LetterheadPreviewCanvas 
                document={currentDocPayload}
                template={activeTemplate}
                business={business}
                containerClassName="my-2"
              />
            </div>
          )}

          {/* TAB 3: FULL DOCUMENT DETAILS & RECIPIENT MASTER */}
          {activeTab === 'meta' && (
            <div className="flex-1 bg-slate-900 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-400" />
                  <span>Document Identification & Recipient Directory</span>
                </h3>
                <p className="text-xs text-slate-400">Configure complete dispatch credentials, document taxonomy, and signatory authority.</p>
              </div>

              {/* Document Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Document Number</label>
                  <input 
                    type="text" 
                    value={documentNumber} 
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Reference Number</label>
                  <input 
                    type="text" 
                    placeholder="REF: AZ/2026/089"
                    value={referenceNumber} 
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Document Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LetterCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="OFFICIAL_LETTER">Official Corporate Letter</option>
                    <option value="PROPOSAL_QUOTATION">Commercial Proposal / Quotation</option>
                    <option value="HR_EMPLOYMENT">HR & Employment (Offer/Relieving)</option>
                    <option value="AUTHORIZATION_RESOLUTION">Authorization / Board Resolution</option>
                    <option value="PAYMENT_REMINDER">Payment Reminder / Demand Notice</option>
                    <option value="WARRANTY_CERTIFICATE">Warranty & Guarantee Certificate</option>
                    <option value="NOC_DECLARATION">NOC / Undertaking Declaration</option>
                    <option value="CUSTOM">Custom General Document</option>
                  </select>
                </div>
              </div>

              {/* Recipient Full Address Form */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Recipient Particulars</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient / Attention Person</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mr. Rajesh Verma"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient Designation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Procurement Head / General Manager"
                      value={recipientDesignation}
                      onChange={(e) => setRecipientDesignation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Company / Organization Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tata Consultancy Services"
                      value={recipientCompany}
                      onChange={(e) => setRecipientCompany(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="+91 98765 43210"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="contact@client.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">City & State</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="City"
                        value={recipientCity}
                        onChange={(e) => setRecipientCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                      />
                      <input 
                        type="text" 
                        placeholder="State"
                        value={recipientState}
                        onChange={(e) => setRecipientState(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Street Address</label>
                  <textarea 
                    rows={2}
                    placeholder="Building, Street, Landmark"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Signatory Authority Customization */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Signing Authority Override
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Signatory Name</label>
                    <input 
                      type="text" 
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Designation</label>
                    <input 
                      type="text" 
                      value={signatoryDesignation}
                      onChange={(e) => setSignatoryDesignation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- INSERT TABLE MODAL --- */}
        {isTableModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-400" />
                <span>Insert Formatted Table</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Rows</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={20} 
                    value={tableRows} 
                    onChange={(e) => setTableRows(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Columns</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={tableCols} 
                    onChange={(e) => setTableCols(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={insertTable}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Insert Table
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- STARTER PRESETS MODAL --- */}
        {isPresetModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-3xl text-slate-100 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>Choose a Professional Business Template</span>
                  </h3>
                  <p className="text-xs text-slate-400">Select a pre-formatted letter template to quickly populate text and tables.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresetModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LETTERHEAD_STARTER_PRESETS.map(preset => (
                  <div 
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className="p-4 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {preset.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                      <span>Click to load</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
