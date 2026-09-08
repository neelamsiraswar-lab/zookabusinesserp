import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
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
  stripHtmlToPlainText
} from '../../utils/letterheadDefaults';
import { LetterheadEditorModal } from './LetterheadEditorModal';
import { LetterheadPrintModal } from './LetterheadPrintModal';
import { LetterheadTemplateDesignerModal } from './LetterheadTemplateDesignerModal';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Copy, 
  Trash2, 
  Palette, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Send, 
  Share2, 
  MoreVertical, 
  Layers, 
  Layout, 
  Sliders, 
  ExternalLink,
  Tag,
  Building2,
  Calendar,
  Check
} from 'lucide-react';

interface LetterheadManagerViewProps {
  documents?: LetterheadDocument[];
  templates?: LetterheadTemplate[];
  business?: BusinessProfile;
  onSaveDocument?: (doc: LetterheadDocument) => void;
  onDeleteDocument?: (id: string) => void;
  onSaveTemplate?: (tpl: LetterheadTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  onSetDefaultTemplate?: (id: string) => void;
  showToast?: (msg: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

export const LetterheadManagerView: React.FC<LetterheadManagerViewProps> = (props) => {
  const appCtx = useApp();

  const documents: LetterheadDocument[] = props.documents ?? appCtx.letterheadDocuments ?? [];
  const templates: LetterheadTemplate[] = props.templates ?? (appCtx.letterheadTemplates && appCtx.letterheadTemplates.length > 0 ? appCtx.letterheadTemplates : DEFAULT_LETTERHEAD_TEMPLATES);
  const business: BusinessProfile = props.business ?? appCtx.business;
  const onSaveDocument = props.onSaveDocument ?? appCtx.saveLetterheadDocument;
  const onDeleteDocument = props.onDeleteDocument ?? appCtx.deleteLetterheadDocument;
  const onSaveTemplate = props.onSaveTemplate ?? appCtx.saveLetterheadTemplate;
  const onDeleteTemplate = props.onDeleteTemplate ?? appCtx.deleteLetterheadTemplate;
  const onSetDefaultTemplate = props.onSetDefaultTemplate ?? appCtx.setDefaultLetterheadTemplate;
  const showToast = props.showToast ?? (({ type, title, message }: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => {
    appCtx.showToast(type, title, message);
  });

  // Navigation tabs inside Letterhead view
  const [activeTab, setActiveTab] = useState<'documents' | 'templates' | 'presets'>('documents');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  
  const [editingDoc, setEditingDoc] = useState<Partial<LetterheadDocument> | undefined>(undefined);
  const [printingDoc, setPrintingDoc] = useState<LetterheadDocument | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<LetterheadTemplate | undefined>(undefined);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = 
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.referenceNumber && doc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.recipientName && doc.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.recipientCompany && doc.recipientCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.subject && doc.subject.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || doc.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    }).sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }, [documents, searchQuery, selectedCategory, selectedStatus]);

  // Document metrics
  const stats = useMemo(() => {
    const total = documents.length;
    const finalized = documents.filter(d => d.status === 'FINALIZED' || d.status === 'ISSUED').length;
    const drafts = documents.filter(d => d.status === 'DRAFT').length;
    const activeTemplatesCount = templates.length;
    return { total, finalized, drafts, activeTemplatesCount };
  }, [documents, templates]);

  // Handlers
  const handleOpenNewDocument = (preset?: typeof LETTERHEAD_STARTER_PRESETS[0]) => {
    if (preset) {
      setEditingDoc({
        title: preset.title,
        category: preset.category,
        subject: preset.subject,
        salutation: preset.salutation,
        bodyHtml: preset.bodyHtml,
        status: 'DRAFT',
      });
    } else {
      setEditingDoc(undefined);
    }
    setIsEditorOpen(true);
  };

  const handleEditDocument = (doc: LetterheadDocument) => {
    setEditingDoc(doc);
    setIsEditorOpen(true);
  };

  const handlePrintDocument = (doc: LetterheadDocument) => {
    setPrintingDoc(doc);
    setIsPrintModalOpen(true);
  };

  const handleDuplicateDocument = (doc: LetterheadDocument) => {
    const duplicate: LetterheadDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      documentNumber: `${doc.documentNumber}-COPY`,
      referenceNumber: doc.referenceNumber ? `${doc.referenceNumber}-COPY` : undefined,
      title: `${doc.title} (Copy)`,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSaveDocument(duplicate);
    showToast({
      type: 'success',
      title: 'Duplicated',
      message: `Created duplicate copy of "${doc.title}".`
    });
  };

  const handleOpenDesigner = (tpl?: LetterheadTemplate) => {
    setEditingTemplate(tpl);
    setIsDesignerOpen(true);
  };

  // Find active template for printing
  const getTemplateForDoc = (doc: LetterheadDocument | null): LetterheadTemplate => {
    if (!doc) return templates[0] || DEFAULT_LETTERHEAD_TEMPLATES[0];
    return templates.find(t => t.id === doc.templateId) || 
           templates.find(t => t.isDefault) || 
           templates[0] || 
           DEFAULT_LETTERHEAD_TEMPLATES[0];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                Corporate Communications
              </span>
              <span className="text-xs text-slate-500 font-mono">WYSIWYG Letterhead</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Letterhead Management & Text Editor
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Create, format, and dispatch official company correspondence, commercial price quotations, authorization letters, and employee certificates directly on your branded letterhead.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenDesigner()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Design Letterhead</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenNewDocument()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Write on Letterhead</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
            <div className="text-slate-400 text-xs">Total Documents</div>
            <div className="text-xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
            <div className="text-slate-400 text-xs">Finalized & Issued</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats.finalized}</div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
            <div className="text-slate-400 text-xs">Draft Letters</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{stats.drafts}</div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
            <div className="text-slate-400 text-xs">Letterhead Styles</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">{stats.activeTemplatesCount}</div>
          </div>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'documents'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Letters & Documents ({documents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Letterhead Layouts ({templates.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Starter Presets ({LETTERHEAD_STARTER_PRESETS.length})</span>
          </button>
        </div>

        {activeTab === 'documents' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search letters, recipient, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-56 sm:w-64"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="OFFICIAL_LETTER">Official Letters</option>
              <option value="PROPOSAL_QUOTATION">Commercial Quotations</option>
              <option value="HR_EMPLOYMENT">HR & Employment</option>
              <option value="AUTHORIZATION_RESOLUTION">Authorizations</option>
              <option value="PAYMENT_REMINDER">Payment Notices</option>
              <option value="WARRANTY_CERTIFICATE">Warranty & Guarantee</option>
              <option value="NOC_DECLARATION">NOC & Declarations</option>
              <option value="CUSTOM">Custom</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="FINALIZED">Finalized</option>
              <option value="ISSUED">Issued</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        )}
      </div>

      {/* --- TAB 1: DOCUMENTS TABLE & GRID --- */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {filteredDocs.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No letters found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL'
                  ? 'No documents match your filter criteria. Try clearing search filters.'
                  : 'Start writing official correspondence and proposals directly on your company letterhead.'}
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenNewDocument()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write New Letter</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Doc Details</th>
                      <th className="px-4 py-3">Recipient & Subject</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Letterhead Style</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDocs.map(doc => {
                      const tpl = templates.find(t => t.id === doc.templateId) || templates[0];
                      const plainExcerpt = stripHtmlToPlainText(doc.bodyHtml);

                      return (
                        <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Document Number & Date */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white text-sm">{doc.title}</div>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-400">
                              <span>{doc.documentNumber}</span>
                              {doc.referenceNumber && (
                                <span className="text-slate-500">({doc.referenceNumber})</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(doc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>

                          {/* Recipient & Subject Excerpt */}
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="font-semibold text-slate-200">
                              {doc.recipientName || 'Unspecified Recipient'}
                              {doc.recipientCompany && (
                                <span className="text-slate-400 font-normal"> &bull; {doc.recipientCompany}</span>
                              )}
                            </div>
                            {doc.subject && (
                              <div className="text-slate-400 truncate mt-0.5 font-medium">
                                Sub: {doc.subject}
                              </div>
                            )}
                            <div className="text-slate-500 text-[10px] truncate mt-0.5">
                              {plainExcerpt.substring(0, 70)}...
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                              {doc.category.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Template Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: tpl?.accentColor || '#4f46e5' }} 
                              />
                              <span className="text-slate-300 text-xs">{tpl?.name || 'Standard'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {doc.includeLetterheadOnPrint !== false ? 'Full Letterhead' : 'Stationery Mode'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              doc.status === 'FINALIZED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              doc.status === 'ISSUED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {doc.status}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Print / Preview Button */}
                              <button
                                type="button"
                                onClick={() => handlePrintDocument(doc)}
                                title="Print / PDF View"
                                className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-500/30"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit in Rich WYSIWYG Editor */}
                              <button
                                type="button"
                                onClick={() => handleEditDocument(doc)}
                                title="Edit in WYSIWYG Editor"
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Duplicate */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateDocument(doc)}
                                title="Duplicate Document"
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                    onDeleteDocument(doc.id);
                                    showToast({
                                      type: 'info',
                                      title: 'Deleted',
                                      message: `Document "${doc.title}" was removed.`
                                    });
                                  }
                                }}
                                title="Delete Document"
                                className="p-1.5 rounded-lg bg-slate-800 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-slate-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: LETTERHEAD TEMPLATES GALLERY --- */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Company Letterhead Layouts</h3>
              <p className="text-xs text-slate-400">Manage header styling, logo placements, fonts, borders, and footer signatory layouts.</p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDesigner()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Layout</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map(tpl => (
              <div 
                key={tpl.id}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all ${
                  tpl.isDefault ? 'border-indigo-500/80 ring-1 ring-indigo-500/50' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tpl.accentColor || '#4f46e5' }} 
                        />
                        <h4 className="font-bold text-white text-sm">{tpl.name}</h4>
                      </div>
                      {tpl.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 mt-1">
                          <Check className="w-3 h-3" /> Default Letterhead
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                      {tpl.headerStyle}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {tpl.description || 'Custom corporate letterhead layout.'}
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 mb-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      Font: {tpl.fontFamily}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      Size: {tpl.bodyFontSizePt || 11}pt
                    </span>
                    {tpl.showWatermark && (
                      <span className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-700/50">
                        Watermark: {tpl.watermarkText || 'Logo'}
                      </span>
                    )}
                    {tpl.showSignatory && (
                      <span className="px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-700/50">
                        Signatory: {tpl.signatoryPosition}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  {!tpl.isDefault ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSetDefaultTemplate(tpl.id);
                        showToast({
                          type: 'success',
                          title: 'Default Updated',
                          message: `"${tpl.name}" is now the default letterhead.`
                        });
                      }}
                      className="text-xs text-slate-400 hover:text-indigo-400 font-medium"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Primary
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenDesigner(tpl)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors"
                    >
                      Edit Design
                    </button>
                    {templates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete letterhead template "${tpl.name}"?`)) {
                            onDeleteTemplate(tpl.id);
                            showToast({
                              type: 'info',
                              title: 'Template Deleted',
                              message: `Letterhead template "${tpl.name}" was removed.`
                            });
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 3: STARTER PRESETS GALLERY --- */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Pre-written Professional Letter Templates</h3>
            <p className="text-xs text-slate-400">Ready-to-use business letters with tables, statutory terms, formatting, and smart variable placeholders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {LETTERHEAD_STARTER_PRESETS.map(preset => (
              <div
                key={preset.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl hover:border-indigo-500/60 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                      {preset.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium whitespace-nowrap">
                      {preset.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {preset.description}
                  </p>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="truncate"><strong className="text-slate-300">Sub:</strong> {preset.subject}</div>
                    <div className="truncate"><strong className="text-slate-300">Salutation:</strong> {preset.salutation}</div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Click to write</span>
                  <button
                    type="button"
                    onClick={() => handleOpenNewDocument(preset)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition-all"
                  >
                    <span>Use Template</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {/* 1. Letterhead Editor Modal */}
      {isEditorOpen && (
        <LetterheadEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingDoc(undefined);
          }}
          documentData={editingDoc}
          templates={templates}
          existingDocuments={documents}
          business={business}
          onSave={onSaveDocument}
          onPrintPreview={(doc) => {
            setPrintingDoc(doc);
            setIsPrintModalOpen(true);
          }}
          showToast={showToast}
        />
      )}

      {/* 2. Letterhead Print & Dispatch Modal */}
      {isPrintModalOpen && (
        <LetterheadPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintingDoc(null);
          }}
          document={printingDoc}
          template={getTemplateForDoc(printingDoc)}
          business={business}
          onEdit={(doc) => {
            setEditingDoc(doc);
            setIsEditorOpen(true);
          }}
          showToast={showToast}
        />
      )}

      {/* 3. Letterhead Template Designer Modal */}
      {isDesignerOpen && (
        <LetterheadTemplateDesignerModal
          isOpen={isDesignerOpen}
          onClose={() => {
            setIsDesignerOpen(false);
            setEditingTemplate(undefined);
          }}
          template={editingTemplate}
          business={business}
          onSaveTemplate={onSaveTemplate}
          showToast={showToast}
        />
      )}
    </div>
  );
};
