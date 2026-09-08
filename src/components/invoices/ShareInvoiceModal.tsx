import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Download, 
  Smartphone, 
  QrCode, 
  Settings2, 
  Sparkles,
  RefreshCw,
  Phone,
  Layers,
  Building2,
  DollarSign
} from 'lucide-react';
import { Invoice, BusinessProfile } from '../../types';
import { 
  DispatchSettings, 
  DispatchTemplate,
  normalizeDispatchSettings,
  interpolateDispatchMessage,
  buildWhatsAppShareUrl,
  buildMailtoUrl,
  sanitizeWhatsAppPhone
} from '../../utils/dispatchUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { buildUpiPaymentUri } from '../../utils/upi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface ShareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  business: BusinessProfile;
  onUpdateDispatchSettings?: (newSettings: DispatchSettings) => void;
  invoiceRenderRef?: React.RefObject<HTMLDivElement>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  business,
  onUpdateDispatchSettings,
  invoiceRenderRef,
  showToast
}) => {
  const dispatchSettings: DispatchSettings = normalizeDispatchSettings(business?.dispatchSettings);

  const [activeChannel, setActiveChannel] = useState<'WHATSAPP' | 'EMAIL'>(
    dispatchSettings.defaultChannel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP'
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    dispatchSettings.defaultTemplateId || dispatchSettings.templates[0]?.id || 'TPL_INVOICE_STANDARD'
  );

  const [customPhone, setCustomPhone] = useState<string>(invoice?.customerPhone || '');
  const [customEmail, setCustomEmail] = useState<string>(invoice?.customerEmail || '');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'CONFIG'>('DISPATCH');

  // Local settings editor for modal
  const [localSettings, setLocalSettings] = useState<DispatchSettings>(dispatchSettings);

  const currentTemplate = localSettings?.templates?.find(t => t.id === selectedTemplateId) || localSettings?.templates?.[0];

  // Re-generate interpolated text whenever template or settings change
  useEffect(() => {
    if (!invoice || !currentTemplate) return;
    const bodyText = interpolateDispatchMessage(currentTemplate.body, invoice, business, localSettings);
    const subjectText = interpolateDispatchMessage(currentTemplate.subject, invoice, business, localSettings);
    setCustomMessage(bodyText);
    setCustomSubject(subjectText);
  }, [invoice, selectedTemplateId, localSettings, business]);

  useEffect(() => {
    if (invoice) {
      setCustomPhone(invoice.customerPhone || '');
      setCustomEmail(invoice.customerEmail || '');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const upiIntentUri = buildUpiPaymentUri({
    upiId: business.upiId,
    payeeName: business.tradeName || business.name,
    amount: invoice.amountDue > 0 ? invoice.amountDue : invoice.grandTotal,
    invoiceNumber: invoice.invoiceNumber,
    note: `Invoice ${invoice.invoiceNumber}`
  });

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopiedText(true);
      showToast('success', 'Message Copied', 'Formatted invoice dispatch message copied to clipboard.');
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy message to clipboard.');
    }
  };

  const handleCopyPaymentLink = async () => {
    try {
      const linkToCopy = upiIntentUri || `UPI ID: ${business.upiId}`;
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedLink(true);
      showToast('success', 'Payment Link Copied', 'Direct UPI payment intent link copied.');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy payment link.');
    }
  };

  const handleSendWhatsApp = () => {
    const waUrl = buildWhatsAppShareUrl(customPhone, customMessage, localSettings.whatsappCountryCode);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('info', 'Opening WhatsApp', `Dispatching invoice ${invoice.invoiceNumber} to ${customPhone || 'customer'}...`);
  };

  const handleSendEmail = () => {
    const mailUrl = buildMailtoUrl(customEmail, customSubject, customMessage);
    window.location.href = mailUrl;
    showToast('info', 'Opening Mail App', `Composing tax invoice email to ${customEmail || 'customer'}...`);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    showToast('info', 'Generating PDF', 'Preparing high-resolution PDF for sharing...');

    try {
      const element = invoiceRenderRef?.current || document.getElementById('printable-invoice-container');
      if (!element) {
        // Fallback standard receipt export
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text(`TAX INVOICE - ${invoice.invoiceNumber}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Customer: ${invoice.customerName}`, 14, 28);
        doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 14, 34);
        doc.text(`Amount: ${formatCurrency(invoice.grandTotal, business.currencySymbol)}`, 14, 40);
        doc.text(`Due: ${formatCurrency(invoice.amountDue, business.currencySymbol)}`, 14, 46);
        doc.save(`Tax-Invoice-${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
        showToast('success', 'PDF Ready', 'Invoice PDF exported successfully.');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const printableWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      if (imgHeight <= pdfHeight - (margin * 2)) {
        pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;
        pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
        heightLeft -= (pdfHeight - (margin * 2));
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(`Tax-Invoice-${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
      showToast('success', 'PDF Downloaded', 'PDF invoice saved. You can attach it in WhatsApp or Email.');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('error', 'PDF Error', 'Failed to generate PDF snapshot.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveSettings = () => {
    if (onUpdateDispatchSettings) {
      onUpdateDispatchSettings(localSettings);
      showToast('success', 'Templates Saved', 'Dispatch message templates and defaults updated successfully.');
    }
    setActiveTab('DISPATCH');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dispatch Tax Invoice
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-mono">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-Click WhatsApp & Email share with payment links and customized templates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('DISPATCH')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'DISPATCH'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONFIG')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'CONFIG'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'DISPATCH' ? (
            <>
              {/* Channel Selector Cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveChannel('WHATSAPP')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    activeChannel === 'WHATSAPP'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChannel === 'WHATSAPP' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>WhatsApp Dispatch</span>
                      {activeChannel === 'WHATSAPP' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {customPhone || 'No mobile set'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannel('EMAIL')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    activeChannel === 'EMAIL'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChannel === 'EMAIL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Email Delivery</span>
                      {activeChannel === 'EMAIL' && <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {customEmail || 'No email set'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Recipient & Template Selector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                {activeChannel === 'WHATSAPP' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Recipient Mobile (WhatsApp)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="e.g. 9876543210 or +919876543210"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Recipient Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Message Template Preset
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {localSettings.templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeChannel === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              {/* Message Preview & Customization Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Message Body (Editable Preview)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      • You can tweak this text before sending
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTemplate) {
                        setCustomMessage(interpolateDispatchMessage(currentTemplate.body, invoice, business, localSettings));
                        setCustomSubject(interpolateDispatchMessage(currentTemplate.subject, invoice, business, localSettings));
                        showToast('info', 'Template Reset', 'Message refreshed from template definition.');
                      }
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset to Template</span>
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-none shadow-inner"
                />
              </div>

              {/* Payment Link Quick-Bar */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Payment Link & UPI Intent
                    </div>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300 truncate max-w-xs sm:max-w-md">
                      {upiIntentUri || `VPA: ${business.upiId || 'Not configured in Banking Settings'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy UPI Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isGeneratingPdf ? 'Generating...' : 'Save PDF'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* CONFIG TAB: Manage Template Presets and Toggles */
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                  <strong className="font-bold">Dynamic Placeholders:</strong> You can customize message content with variables like <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;customer_name&#125;&#125;</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;invoice_number&#125;&#125;</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;grand_total&#125;&#125;</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;amount_due&#125;&#125;</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;items_summary&#125;&#125;</code>, and <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">&#123;&#123;payment_details&#125;&#125;</code>.
                </div>
              </div>

              {/* Inclusion Checkbox Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.includePaymentLink}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, includePaymentLink: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Include UPI Payment Link</div>
                    <div className="text-[10px] text-slate-400">Appends instant scan & pay URI in text</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.includeBankDetails}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, includeBankDetails: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Include Bank Transfer Coordinates</div>
                    <div className="text-[10px] text-slate-400">Account number, IFSC, and Bank name</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.includeItemSummary}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, includeItemSummary: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Include Line Items Overview</div>
                    <div className="text-[10px] text-slate-400">Bullet list of first 4 billed products</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.includePdfAttachmentNote}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, includePdfAttachmentNote: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">PDF Attachment Note</div>
                    <div className="text-[10px] text-slate-400">Adds note reminding customer of attached PDF</div>
                  </div>
                </label>
              </div>

              {/* Template list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Configured Message Templates
                </h4>

                <div className="space-y-2.5">
                  {localSettings.templates.map((tpl, index) => (
                    <div 
                      key={tpl.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{tpl.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {tpl.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={tpl.body}
                        onChange={(e) => {
                          const updated = [...localSettings.templates];
                          updated[index] = { ...updated[index], body: e.target.value };
                          setLocalSettings(prev => ({ ...prev, templates: updated }));
                        }}
                        className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex items-center justify-between gap-3">
          {activeTab === 'DISPATCH' ? (
            <>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {activeChannel === 'WHATSAPP' ? (
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send on WhatsApp</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Compose Email</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setActiveTab('DISPATCH')}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Back to Dispatch
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Check className="w-4 h-4" />
                <span>Save Template Changes</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
