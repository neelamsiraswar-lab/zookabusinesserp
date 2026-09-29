import React, { useState } from 'react';
import { 
  Send, 
  MessageSquare, 
  Mail, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Phone, 
  Globe, 
  ShieldCheck, 
  RotateCcw,
  Sliders,
  Layers
} from 'lucide-react';
import { BusinessProfile } from '../../types';
import { 
  DispatchSettings, 
  DispatchTemplate, 
  DEFAULT_DISPATCH_SETTINGS, 
  DEFAULT_DISPATCH_TEMPLATES, 
  normalizeDispatchSettings 
} from '../../utils/dispatchUtils';

interface DispatchSettingsTabProps {
  formData: BusinessProfile;
  setFormData: React.Dispatch<React.SetStateAction<BusinessProfile>>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const DispatchSettingsTab: React.FC<DispatchSettingsTabProps> = ({
  formData,
  setFormData,
  showToast
}) => {
  const currentSettings: DispatchSettings = normalizeDispatchSettings(formData.dispatchSettings);

  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    currentSettings.defaultTemplateId || currentSettings.templates[0]?.id || 'TPL_INVOICE_STANDARD'
  );

  const updateDispatchSettings = (updater: (prev: DispatchSettings) => DispatchSettings) => {
    setFormData(prev => {
      const existing = normalizeDispatchSettings(prev.dispatchSettings);
      const updated = updater(existing);
      return {
        ...prev,
        dispatchSettings: updated
      };
    });
  };

  const handleToggleOption = (key: keyof DispatchSettings, value: any) => {
    updateDispatchSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUpdateTemplate = (id: string, field: keyof DispatchTemplate, value: any) => {
    updateDispatchSettings(prev => ({
      ...prev,
      templates: prev.templates.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleAddTemplate = () => {
    const newId = `TPL_CUSTOM_${Date.now()}`;
    const newTemplate: DispatchTemplate = {
      id: newId,
      name: 'Custom Template',
      category: 'INVOICE_SENT',
      subject: 'Tax Invoice {{invoice_number}} from {{business_name}}',
      body: `Hello {{customer_name}},\n\nYour invoice {{invoice_number}} for {{grand_total}} is ready.\n\n{{payment_details}}\n\nThank you,\n{{business_name}}`,
    };

    updateDispatchSettings(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
    setActiveTemplateId(newId);
    showToast('success', 'Template Created', 'New dispatch message template added.');
  };

  const handleDeleteTemplate = (id: string) => {
    if (currentSettings.templates.length <= 1) {
      showToast('error', 'Cannot Delete', 'At least one dispatch message template is required.');
      return;
    }

    updateDispatchSettings(prev => {
      const filtered = prev.templates.filter(t => t.id !== id);
      return {
        ...prev,
        templates: filtered,
        defaultTemplateId: prev.defaultTemplateId === id ? filtered[0].id : prev.defaultTemplateId
      };
    });

    const remaining = currentSettings.templates.filter(t => t.id !== id);
    if (remaining.length > 0) {
      setActiveTemplateId(remaining[0].id);
    }
    showToast('info', 'Template Removed', 'Dispatch message template deleted.');
  };

  const handleResetDefaults = () => {
    updateDispatchSettings(() => DEFAULT_DISPATCH_SETTINGS);
    setActiveTemplateId('TPL_INVOICE_STANDARD');
    showToast('info', 'Reset to Defaults', 'All dispatch templates and settings restored to factory defaults.');
  };

  const selectedTemplate = currentSettings.templates.find(t => t.id === activeTemplateId) || currentSettings.templates[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                WhatsApp & Email Dispatch Templates
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                1-Click Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Configure message templates, dynamic placeholders, automated payment links, and instant UPI intent triggers.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Global Channel & Inclusion Preferences */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Dispatch Channel & Dynamic Content Settings</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Share Channel
            </label>
            <select
              value={currentSettings.defaultChannel}
              onChange={(e) => handleToggleOption('defaultChannel', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="WHATSAPP">WhatsApp (Primary)</option>
              <option value="EMAIL">Email (Primary)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp Country Code
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={currentSettings.whatsappCountryCode}
                onChange={(e) => handleToggleOption('whatsappCountryCode', e.target.value)}
                placeholder="+91"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Template Preset
            </label>
            <select
              value={currentSettings.defaultTemplateId}
              onChange={(e) => handleToggleOption('defaultTemplateId', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {currentSettings.templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Inclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includePaymentLink}
              onChange={(e) => handleToggleOption('includePaymentLink', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">UPI Payment Link</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Direct intent URL in message</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includeBankDetails}
              onChange={(e) => handleToggleOption('includeBankDetails', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Bank Details</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">A/C No, IFSC, Branch</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includeItemSummary}
              onChange={(e) => handleToggleOption('includeItemSummary', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Billed Items</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Item names & quantities</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includePdfAttachmentNote}
              onChange={(e) => handleToggleOption('includePdfAttachmentNote', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">PDF Note</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Reminds customer of PDF</div>
            </div>
          </label>
        </div>
      </div>

      {/* Template Management & Customization */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Manage Message Templates ({currentSettings.templates.length})</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a template below to edit its text, subject, or variables
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddTemplate}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {currentSettings.templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setActiveTemplateId(tpl.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                tpl.id === activeTemplateId
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tpl.name}</span>
              {tpl.id === currentSettings.defaultTemplateId && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  tpl.id === activeTemplateId 
                    ? 'bg-white/20 text-white' 
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  Default
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Template Editor */}
        {selectedTemplate && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={selectedTemplate.name}
                  onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Category / Purpose
                </label>
                <select
                  value={selectedTemplate.category}
                  onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'category', e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="INVOICE_SENT">Invoice Delivery (General)</option>
                  <option value="PAYMENT_REMINDER">Gentle Payment Reminder</option>
                  <option value="PAYMENT_RECEIVED">Payment Settled / Thank You</option>
                  <option value="THANK_YOU">Customer Appreciation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Subject Line
              </label>
              <input
                type="text"
                value={selectedTemplate.subject}
                onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'subject', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Message Body & Placeholders
                </label>
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Use variables:</span>
                  <code className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-1 py-0.5 rounded font-mono text-[10px]">&#123;&#123;invoice_number&#125;&#125;</code>
                  <code className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-1 py-0.5 rounded font-mono text-[10px]">&#123;&#123;grand_total&#125;&#125;</code>
                  <code className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-1 py-0.5 rounded font-mono text-[10px]">&#123;&#123;payment_details&#125;&#125;</code>
                </div>
              </div>
              <textarea
                rows={9}
                value={selectedTemplate.body}
                onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'body', e.target.value)}
                className="w-full p-3 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => handleToggleOption('defaultTemplateId', selectedTemplate.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentSettings.defaultTemplateId === selectedTemplate.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{currentSettings.defaultTemplateId === selectedTemplate.id ? 'Is Primary Default' : 'Set as Default'}</span>
              </button>

              {currentSettings.templates.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Template</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
