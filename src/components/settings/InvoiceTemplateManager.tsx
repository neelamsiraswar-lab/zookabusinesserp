import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InvoiceTemplateConfig, Invoice } from '../../types';
import { 
  STANDARD_INVOICE_TEMPLATES, 
  COLOR_PALETTES, 
  createDefaultCustomTemplate, 
  getAllTemplates 
} from '../../utils/invoiceTemplates';
import { InvoiceTemplateRenderer } from '../invoices/InvoiceTemplateRenderer';
import { 
  Check, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Palette, 
  FileText, 
  Save, 
  Layout, 
  Sliders, 
  ShieldCheck, 
  QrCode, 
  CheckCircle,
  Copy,
  RotateCcw,
  Maximize2
} from 'lucide-react';

export const InvoiceTemplateManager: React.FC = () => {
  const { business, updateBusiness, invoices, showToast } = useApp();

  const customTemplates = business.customTemplates || [];
  const allTemplates = getAllTemplates(customTemplates);
  const activeTemplateId = business.defaultTemplateId || 'OFFICIAL_GST';

  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<InvoiceTemplateConfig>(
    allTemplates.find(t => t.id === activeTemplateId) || STANDARD_INVOICE_TEMPLATES[0]
  );
  
  // Custom Template Designer Modal / State
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplateConfig>(createDefaultCustomTemplate());
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'STANDARD' | 'CUSTOM' | 'POS'>('ALL');
  const [showFullModalPreview, setShowFullModalPreview] = useState(false);

  // Sample Invoice Data for Live Preview
  const sampleInvoice: Invoice = invoices[0] || {
    id: 'sample-inv-001',
    invoiceNumber: 'INV/2026-27/108',
    invoiceType: 'TAX_INVOICE',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: 'PAID',
    sellerGstin: business.gstin,
    sellerStateCode: business.stateCode,
    sellerState: business.state,
    customerId: 'sample-cust-1',
    customerName: 'Apex Infotech Solutions Pvt Ltd',
    customerGstin: '27AABCA1234F1Z8',
    customerPhone: '+91 98200 11223',
    customerEmail: 'billing@apexinfotech.com',
    customerAddress: 'Tower 4, Mindspace IT Park, Malad West',
    customerCity: 'Mumbai',
    customerState: 'Maharashtra',
    customerStateCode: '27',
    customerPincode: '400064',
    placeOfSupplyState: 'Maharashtra',
    placeOfSupplyStateCode: '27',
    isInterState: business.stateCode !== '27',
    isReverseCharge: false,
    items: [
      {
        id: 'item-1',
        name: 'Dell Latitude 5440 Core i7 16GB / 512GB SSD',
        hsnCode: '8471',
        serialNumber: 'SN-DELL-8994021',
        warranty: '3 Years ProSupport Onsite',
        description: 'Includes 65W Type-C Power Adapter and OEM Carrying Case',
        quantity: 2,
        unit: 'PCS',
        rate: 68500,
        discountPercent: 5,
        discountAmount: 6850,
        taxableAmount: 130150,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: 11713.5,
        sgstRate: 9,
        sgstAmount: 11713.5,
        igstRate: 18,
        igstAmount: 23427,
        totalAmount: 153577,
        batchNumber: 'BATCH-2026Q1',
      },
      {
        id: 'item-2',
        name: 'Samsung 27" 4K UHD IPS Professional Monitor',
        hsnCode: '8528',
        serialNumber: 'IMEI/SN-SAM-901844',
        warranty: '3 Years Comprehensive',
        description: 'Color calibrated with HDR400 and USB-C 90W charging',
        quantity: 2,
        unit: 'PCS',
        rate: 26000,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 52000,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: 4680,
        sgstRate: 9,
        sgstAmount: 4680,
        igstRate: 18,
        igstAmount: 9360,
        totalAmount: 61360,
      },
      {
        id: 'item-3',
        name: 'Logitech MX Master 3S Wireless Performance Mouse',
        hsnCode: '8471',
        serialNumber: 'SN-LOGI-338291',
        warranty: '1 Year Replacement',
        description: 'Quiet clicks with 8000 DPI MagSpeed scroll wheel',
        quantity: 2,
        unit: 'PCS',
        rate: 7500,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 15000,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: 1350,
        sgstRate: 9,
        sgstAmount: 1350,
        igstRate: 18,
        igstAmount: 2700,
        totalAmount: 17700,
      }
    ],
    subTotalTaxable: 197150,
    totalCgst: business.stateCode === '27' ? 17743.5 : 0,
    totalSgst: business.stateCode === '27' ? 17743.5 : 0,
    totalIgst: business.stateCode !== '27' ? 35487 : 0,
    totalCess: 0,
    totalTax: 35487,
    totalDiscount: 6850,
    roundOff: 0,
    grandTotal: 232637,
    amountPaid: 232637,
    amountDue: 0,
    paymentMethod: 'UPI',
    terms: business.defaultTerms,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSetActiveTemplate = (templateId: string) => {
    updateBusiness({ defaultTemplateId: templateId }, true);
    const match = allTemplates.find(t => t.id === templateId);
    if (match) setSelectedTemplateForPreview(match);
    showToast('success', 'Default Template Updated', `"${match?.name || templateId}" is now set as the active default invoice template.`);
  };

  const handleOpenCustomDesigner = (baseTemplate?: InvoiceTemplateConfig) => {
    if (baseTemplate) {
      setEditingTemplate({
        ...baseTemplate,
        id: `CUSTOM_${Date.now()}`,
        name: `${baseTemplate.name} (Custom)`,
        category: 'CUSTOM',
        badge: 'Custom',
        createdAt: new Date().toISOString(),
      });
    } else {
      setEditingTemplate(createDefaultCustomTemplate(`Custom Template #${customTemplates.length + 1}`));
    }
    setIsEditingCustom(true);
  };

  const handleSaveCustomTemplate = () => {
    if (!editingTemplate.name.trim()) {
      showToast('error', 'Validation Error', 'Please enter a name for your custom template.');
      return;
    }

    const existingIndex = customTemplates.findIndex(c => c.id === editingTemplate.id);
    let updatedList: InvoiceTemplateConfig[];

    if (existingIndex >= 0) {
      updatedList = customTemplates.map(c => c.id === editingTemplate.id ? editingTemplate : c);
    } else {
      updatedList = [...customTemplates, editingTemplate];
    }

    updateBusiness({
      customTemplates: updatedList,
      defaultTemplateId: editingTemplate.id,
    }, true);

    setSelectedTemplateForPreview(editingTemplate);
    setIsEditingCustom(false);
    showToast('success', 'Custom Template Saved', `"${editingTemplate.name}" has been saved and applied as default template.`);
  };

  const handleDeleteCustomTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom template?')) {
      const updatedList = customTemplates.filter(c => c.id !== templateId);
      const newDefault = activeTemplateId === templateId ? 'OFFICIAL_GST' : activeTemplateId;
      
      updateBusiness({
        customTemplates: updatedList,
        defaultTemplateId: newDefault,
      }, true);

      const fallback = allTemplates.find(t => t.id === newDefault) || STANDARD_INVOICE_TEMPLATES[0];
      setSelectedTemplateForPreview(fallback);
      showToast('info', 'Template Deleted', 'Custom template has been removed.');
    }
  };

  const filteredTemplates = allTemplates.filter(t => {
    if (activeTabFilter === 'ALL') return true;
    if (activeTabFilter === 'STANDARD') return t.category === 'STANDARD';
    if (activeTabFilter === 'CUSTOM') return t.category === 'CUSTOM';
    if (activeTabFilter === 'POS') return t.category === 'POS';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950 text-white p-6 rounded-2xl shadow-lg border border-indigo-700/50 dark:border-indigo-900/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/30 text-indigo-200 rounded-lg">
              <Layout className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black tracking-tight">GST Invoice Billing Templates</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              {allTemplates.length} Templates Available
            </span>
          </div>
          <p className="text-xs text-indigo-100/80 dark:text-slate-300 max-w-xl">
            Choose from 10+ standard Indian GST-compliant invoice billing designs or build custom branded templates with tailored colors, fonts, tables, and serial number badges.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenCustomDesigner()}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-indigo-600 hover:bg-slate-100 dark:hover:bg-indigo-500 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-200" />
            <span>Design Custom Template</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery & Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Template Catalog (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTabFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({allTemplates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('STANDARD')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabFilter === 'STANDARD'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Standard GST ({STANDARD_INVOICE_TEMPLATES.filter(t => t.category === 'STANDARD').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('CUSTOM')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabFilter === 'CUSTOM'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Custom Designed ({customTemplates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('POS')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTabFilter === 'POS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                POS Thermal (80mm)
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Active Default: <strong className="text-indigo-700 dark:text-indigo-400">{allTemplates.find(t => t.id === activeTemplateId)?.name}</strong>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredTemplates.map((template) => {
              const isActive = activeTemplateId === template.id;
              const isSelected = selectedTemplateForPreview.id === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplateForPreview(template)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 flex flex-col justify-between ${
                    isSelected 
                      ? 'ring-2 ring-indigo-600 dark:ring-indigo-500 border-indigo-600 dark:border-indigo-500 shadow-md' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3 h-3 rounded-full border shadow-2xs shrink-0"
                          style={{ backgroundColor: template.themeColor }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {template.headerStyle}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {template.badge && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                            {template.badge}
                          </span>
                        )}
                        {isActive && (
                          <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">
                            <Check className="w-3 h-3" />
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Desc */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                        <span>{template.name}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    </div>

                    {/* Features Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded border border-slate-100 dark:border-slate-700 font-mono">
                        Font: {template.fontFamily}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded border border-slate-100 dark:border-slate-700 font-mono">
                        Table: {template.tableStyle}
                      </span>
                      {template.showUpiQr && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-medium border border-blue-200 dark:border-blue-800/60">
                          UPI QR
                        </span>
                      )}
                      {template.showHsnSummaryTable && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded font-medium border border-indigo-200 dark:border-indigo-800/60">
                          HSN Table
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetActiveTemplate(template.id);
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active Default</span>
                        </>
                      ) : (
                        <span>Set as Default</span>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCustomDesigner(template);
                        }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Customize / Duplicate this template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {template.category === 'CUSTOM' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(template);
                              setIsEditingCustom(true);
                            }}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit this custom template"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomTemplate(template.id, e)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Delete custom template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Interactive A4 Preview Canvas (5 cols) */}
        <div className="xl:col-span-5 space-y-3 sticky top-6">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Live Document Preview
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedTemplateForPreview.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetActiveTemplate(selectedTemplateForPreview.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                    activeTemplateId === selectedTemplateForPreview.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {activeTemplateId === selectedTemplateForPreview.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved as Default</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Apply Default</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullModalPreview(true)}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Full screen preview"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scaled Preview Canvas */}
            <div className="bg-slate-100/80 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex justify-center">
              <div className="transform scale-[0.65] origin-top sm:scale-[0.7] md:scale-[0.75] xl:scale-[0.6] w-[794px] min-h-[950px] bg-white border border-slate-300 dark:border-slate-700 rounded-lg shadow-md p-6 pointer-events-none select-none">
                <InvoiceTemplateRenderer
                  invoice={sampleInvoice}
                  business={business}
                  template={selectedTemplateForPreview}
                  isInteractivePreview={true}
                />
              </div>
            </div>

            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
              <span className="text-indigo-900 dark:text-indigo-200 font-medium">
                Want to tweak this design for your business?
              </span>
              <button
                type="button"
                onClick={() => handleOpenCustomDesigner(selectedTemplateForPreview)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Customize Layout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM TEMPLATE DESIGNER MODAL */}
      {isEditingCustom && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[98vw] md:max-w-4xl lg:max-w-5xl max-h-[96dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 bg-indigo-500/30 rounded-xl shrink-0">
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base tracking-tight truncate">Custom GST Invoice Template Designer</h3>
                  <p className="text-[11px] sm:text-xs text-indigo-200/80 truncate">
                    Customize branding colors, header typography, table borders, serial number display & print sections
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingCustom(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomTemplate}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Split Controls & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              {/* Left Column: Form Controls (6 cols) */}
              <div className="lg:col-span-6 p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                {/* Template Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. My Premium Corporate Invoice"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                    required
                  />
                </div>

                {/* Color Palette & Custom Hex */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Branding Accent Color
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {COLOR_PALETTES.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setEditingTemplate(prev => ({ ...prev, themeColor: color.hex, headerColor: color.lightHex }))}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          editingTemplate.themeColor === color.hex 
                            ? 'ring-2 ring-indigo-600 dark:ring-indigo-500 border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/60' 
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full shadow-2xs" style={{ backgroundColor: color.hex }} />
                        <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[50px]">{color.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Custom Hex:</span>
                    <input
                      type="color"
                      value={editingTemplate.themeColor}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, themeColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={editingTemplate.themeColor}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, themeColor: e.target.value }))}
                      className="w-24 px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                {/* Header Style */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Header Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'TRADE_CLASSIC', label: 'Classic Trade / Retail (TM Style)', desc: 'Indian hardware, electrical & consumer trade format' },
                      { id: 'BANNER', label: 'Solid Banner', desc: 'Colored full-width top banner' },
                      { id: 'MODERN_SPLIT', label: 'Modern Split Bar', desc: 'Two-column clean top bar' },
                      { id: 'MINIMAL_BORDERED', label: 'Bordered Box', desc: 'Standard boxed accounting header' },
                      { id: 'THERMAL', label: '80mm POS Slip', desc: 'Thermal receipt layout' },
                    ].map((hdr) => (
                      <button
                        key={hdr.id}
                        type="button"
                        onClick={() => setEditingTemplate(prev => ({ ...prev, headerStyle: hdr.id as any }))}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                          editingTemplate.headerStyle === hdr.id
                            ? 'ring-2 ring-indigo-600 dark:ring-indigo-500 border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/60'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{hdr.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{hdr.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography & Table Style */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Font Family</label>
                    <select
                      value={editingTemplate.fontFamily}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, fontFamily: e.target.value as any }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none cursor-pointer"
                    >
                      <option value="sans">Inter / Modern Sans</option>
                      <option value="serif">Georgia / Classic Serif</option>
                      <option value="mono">Monospace / Tech Accounting</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Table Styling</label>
                    <select
                      value={editingTemplate.tableStyle}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, tableStyle: e.target.value as any }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none cursor-pointer"
                    >
                      <option value="BORDERED">Bordered Grid (Official)</option>
                      <option value="STRIPED">Zebra Striped Rows</option>
                      <option value="MINIMAL">Clean Minimalist Lines</option>
                      <option value="BOXED">Boxed Card Container</option>
                    </select>
                  </div>
                </div>

                {/* Section Visibility Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Section Visibility & Print Controls</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showPaymentMode !== false}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showPaymentMode: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Mode of Payment (Cash/UPI/Bank)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showUpiQr}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showUpiQr: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>UPI Payment QR</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showBankDetails}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showBankDetails: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Bank Account Info</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showHsnSummaryTable}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showHsnSummaryTable: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>HSN Tax Summary Table</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showSerialNumber}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showSerialNumber: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Sr. No. / IMEI Badges</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showWarranty}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showWarranty: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Warranty Line</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showDescription}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showDescription: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Item Description</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showAmountInWords}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showAmountInWords: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Amount in Words</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.showSignature}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, showSignature: e.target.checked }))}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Authorized Signature</span>
                    </label>
                  </div>
                </div>

                {/* Custom Watermark & Tagline */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Watermark Text (Optional)</label>
                    <input
                      type="text"
                      value={editingTemplate.watermarkText || ''}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, watermarkText: e.target.value }))}
                      placeholder="e.g. PAID, ORIGINAL, or leave blank"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Header Subtitle / Tagline (Optional)</label>
                    <input
                      type="text"
                      value={editingTemplate.headerTagline || ''}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, headerTagline: e.target.value }))}
                      placeholder="e.g. Authorized Electronics & IT Solutions"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Real-Time Updating Canvas (6 cols) */}
              <div className="lg:col-span-6 p-6 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-start overflow-y-auto max-h-[75vh]">
                <div className="text-center pb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Real-time Live Render Preview
                  </span>
                </div>
                <div className="transform scale-[0.62] origin-top w-[794px] min-h-[980px] bg-white border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-6 select-none pointer-events-none">
                  <InvoiceTemplateRenderer
                    invoice={sampleInvoice}
                    business={business}
                    template={editingTemplate}
                    isInteractivePreview={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PREVIEW MODAL */}
      {showFullModalPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-[98vw] md:max-w-4xl w-full max-h-[96dvh] sm:max-h-[92dvh] flex flex-col overflow-hidden my-auto">
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-xs sm:text-sm truncate">Preview: {selectedTemplateForPreview.name}</h3>
              <button
                type="button"
                onClick={() => setShowFullModalPreview(false)}
                className="px-3 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer shrink-0"
              >
                Close ✕
              </button>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto modal-content-scroll bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div className="w-full max-w-[794px] bg-white border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3 sm:p-8 overflow-x-auto">
                <InvoiceTemplateRenderer
                  invoice={sampleInvoice}
                  business={business}
                  template={selectedTemplateForPreview}
                  isInteractivePreview={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
