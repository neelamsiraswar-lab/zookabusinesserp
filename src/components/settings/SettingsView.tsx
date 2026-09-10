import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  CreditCard, 
  FileText, 
  QrCode, 
  Database, 
  Save, 
  RotateCcw, 
  Upload, 
  Download, 
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Lock,
  Globe,
  Phone,
  Mail,
  MapPin,
  PenTool,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Check,
  FileSignature,
  Layers,
  Tag,
  Plus,
  Package,
  Eye,
  Sliders,
  LayoutTemplate,
  Sun,
  Moon,
  Smartphone,
  Clock,
  Shield,
  Zap,
  ExternalLink,
  Fingerprint,
  Send,
  Hash
} from 'lucide-react';
import { QrCodeSvg } from '../common/QrCodeSvg';
import { AutoUpdateInvoiceNumbersModal } from '../invoices/AutoUpdateInvoiceNumbersModal';
import { isValidUpiId, buildUpiPaymentUri, cleanUpiId } from '../../utils/upi';
import { STATE_CODE_LIST } from '../../utils/constants';
import { DEFAULT_SIGNATURE_DATA_URL, DEFAULT_SIGNATURE_2_DATA_URL, normalizeSignatureUrl } from '../../utils/formatters';
import { InvoiceLineSettings } from '../../types';
import { normalizeBusinessProfile, cleanDefaultBusinessProfile } from '../../utils/cleanDefaults';
import { auditInvoiceSequences, formatInvoiceSequence } from '../../utils/invoiceNumberUtils';
import { InvoiceTemplateManager } from './InvoiceTemplateManager';
import { ThemeSettingsTab } from './ThemeSettingsTab';
import { BottomNavSettingsTab } from './BottomNavSettingsTab';
import { HeaderSettingsTab } from './HeaderSettingsTab';
import { FooterSettingsTab } from './FooterSettingsTab';
import { LowStockSettingsTab } from './LowStockSettingsTab';
import { SessionTimeoutSettingsTab } from './SessionTimeoutSettingsTab';
import { PwaSettingsTab } from './PwaSettingsTab';
import { BiometricSettingsTab } from './BiometricSettingsTab';
import { DispatchSettingsTab } from './DispatchSettingsTab';
import { SnapshotRestoreSettingsTab } from './SnapshotRestoreSettingsTab';
import { CloudSyncStatusBadge } from '../common/CloudSyncStatusBadge';
import { getThemePalette } from '../../utils/themeColors';

export const SettingsView: React.FC = () => {
  const { 
    business, 
    currentCompany,
    updateBusiness, 
    invoices,
    realignAndFixInvoiceSequences,
    resequenceAllInvoicesFromStartingNumber,
    showToast,
    setActiveTab: setGlobalActiveTab
  } = useApp();

  const palette = getThemePalette(currentCompany?.themeColor || 'indigo');

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'header' | 'footer' | 'bottom_nav' | 'signature' | 'banking' | 'invoicing' | 'templates' | 'dispatch' | 'item_lines' | 'low_stock' | 'security' | 'biometrics' | 'pwa' | 'backup'>('profile');
  const [formData, setFormData] = useState({ ...business });
  const [isFixingSequence, setIsFixingSequence] = useState(false);
  const [isAutoUpdateModalOpen, setIsAutoUpdateModalOpen] = useState(false);
  const [newWarrantyPreset, setNewWarrantyPreset] = useState('');

  // Keep formData in sync when business updates
  useEffect(() => {
    setFormData({ ...business });
  }, [business]);

  const sequenceAudit = auditInvoiceSequences(invoices, business);

  // Digital Signature Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a'>('#1e3a8a');
  const [signatureFileName, setSignatureFileName] = useState<string | null>(null);

  // Default Item Line Settings Fallback
  const defaultLineSettings: InvoiceLineSettings = {
    enableDescription: true,
    enableSerialNumber: true,
    enableWarranty: true,
    enableBatchNumber: true,
    enableExpiryDate: true,
    serialNumberLabel: 'Sr. No. / IMEI',
    warrantyLabel: 'Warranty',
    defaultWarranty: '1 Year Comprehensive',
    warrantyOptions: [
      'No Warranty',
      '6 Months Replacement',
      '1 Year Comprehensive',
      '2 Years Onsite',
      '3 Years Limited Warranty',
      '5 Years Manufacturer Warranty'
    ],
    descriptionPlaceholder: 'e.g. Model specs, accessories included, or warranty terms...',
    showOnPrint: {
      description: true,
      serialNumber: true,
      warranty: true,
      batchNumber: true,
    }
  };

  const currentItemSettings: InvoiceLineSettings = {
    ...defaultLineSettings,
    ...(formData.itemLineSettings || {}),
    showOnPrint: {
      ...defaultLineSettings.showOnPrint,
      ...(formData.itemLineSettings?.showOnPrint || {})
    }
  };

  // Synchronize when business changes
  useEffect(() => {
    setFormData(normalizeBusinessProfile(business));
  }, [business]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'nextInvoiceNumber' || name === 'nextPosInvoiceNumber' || type === 'number') {
      const parsed = parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: isNaN(parsed) ? 1 : Math.max(1, parsed) }));
    } else if (name === 'state') {
      const found = STATE_CODE_LIST.find(s => s.name === value);
      setFormData(prev => ({
        ...prev,
        state: value,
        stateCode: found ? found.code : prev.stateCode
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleItemLineSettingChange = (field: keyof InvoiceLineSettings, value: any) => {
    setFormData(prev => {
      const existing: InvoiceLineSettings = {
        ...defaultLineSettings,
        ...(prev.itemLineSettings || {}),
        showOnPrint: {
          ...defaultLineSettings.showOnPrint,
          ...(prev.itemLineSettings?.showOnPrint || {})
        }
      };
      return {
        ...prev,
        itemLineSettings: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  const handlePrintToggle = (key: keyof InvoiceLineSettings['showOnPrint'], val: boolean) => {
    setFormData(prev => {
      const existing: InvoiceLineSettings = {
        ...defaultLineSettings,
        ...(prev.itemLineSettings || {}),
        showOnPrint: {
          ...defaultLineSettings.showOnPrint,
          ...(prev.itemLineSettings?.showOnPrint || {})
        }
      };
      return {
        ...prev,
        itemLineSettings: {
          ...existing,
          showOnPrint: {
            ...existing.showOnPrint,
            [key]: val
          }
        }
      };
    });
  };

  const handleAddWarrantyPreset = () => {
    if (!newWarrantyPreset.trim()) return;
    const existing = currentItemSettings.warrantyOptions || [];
    if (existing.includes(newWarrantyPreset.trim())) {
      showToast('warning', 'Already Exists', 'This warranty option already exists in the list.');
      return;
    }
    const updated = [...existing, newWarrantyPreset.trim()];
    handleItemLineSettingChange('warrantyOptions', updated);
    setNewWarrantyPreset('');
    showToast('success', 'Preset Added', `Added "${newWarrantyPreset.trim()}" to warranty presets.`);
  };

  const handleRemoveWarrantyPreset = (preset: string) => {
    const existing = currentItemSettings.warrantyOptions || [];
    const updated = existing.filter(p => p !== preset);
    handleItemLineSettingChange('warrantyOptions', updated);
    if (currentItemSettings.defaultWarranty === preset && updated.length > 0) {
      handleItemLineSettingChange('defaultWarranty', updated[0]);
    }
    showToast('info', 'Preset Removed', `Removed "${preset}" from warranty presets.`);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateBusiness(formData);
  };

  // JPG / Image Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp|svg\+xml)/i)) {
        showToast('error', 'Invalid File Type', 'Please upload a PNG, JPG, WebP, or SVG logo image.');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showToast('warning', 'File Size Large', 'Logo image is recommended to be under 2MB.');
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          logoUrl: base64Data,
          showLogoOnInvoice: true
        }));
        updateBusiness({
          ...formData,
          logoUrl: base64Data,
          showLogoOnInvoice: true
        });
        showToast('success', 'Logo Uploaded & Saved', `Loaded "${file.name}" as company logo.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      logoUrl: ''
    }));
    updateBusiness({
      ...formData,
      logoUrl: ''
    });
    showToast('info', 'Logo Removed', 'Company logo has been removed.');
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)/i)) {
        showToast('error', 'Invalid File Type', 'Please upload a JPG, JPEG, or PNG signature image.');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showToast('warning', 'File Size Too Large', 'Signature image should be under 2MB for optimal performance.');
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          signatureUrl: base64Data,
          showSignatureOnInvoice: true
        }));
        setSignatureFileName(file.name);
        // Persist immediately to global business profile & localStorage
        updateBusiness({
          ...formData,
          signatureUrl: base64Data,
          showSignatureOnInvoice: true
        });
        showToast('success', 'Signature Uploaded & Saved', `Loaded and saved "${file.name}" as authorized signature.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    setFormData(prev => ({
      ...prev,
      signatureUrl: undefined
    }));
    setSignatureFileName(null);
    updateBusiness({
      ...formData,
      signatureUrl: undefined
    });
    showToast('info', 'Signature Removed', 'Authorized signature image has been removed.');
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      showToast('warning', 'Canvas Empty', 'Please draw a signature on the pad first.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setFormData(prev => ({
      ...prev,
      signatureUrl: dataUrl,
      showSignatureOnInvoice: true
    }));
    setSignatureFileName('Digital_Signature_Pad.png');
    updateBusiness({
      ...formData,
      signatureUrl: dataUrl,
      showSignatureOnInvoice: true
    });
    showToast('success', 'Signature Adopted & Saved', 'Drawn digital signature saved as authorized signature.');
  };

  // Sample Preset Signatures
  const applyPresetSignature = (type: 1 | 2) => {
    const chosenUrl = type === 1 ? DEFAULT_SIGNATURE_DATA_URL : DEFAULT_SIGNATURE_2_DATA_URL;
    
    setFormData(prev => ({
      ...prev,
      signatureUrl: chosenUrl,
      showSignatureOnInvoice: true
    }));
    setSignatureFileName(type === 1 ? 'Executive_Blue_Cursive.jpg' : 'Classic_Black_Script.jpg');
    updateBusiness({
      ...formData,
      signatureUrl: chosenUrl,
      showSignatureOnInvoice: true
    });
    showToast('success', 'Preset Signature Applied & Saved', `Loaded Sample Signature ${type}.`);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className={`w-6 h-6 ${palette.textClass}`} />
            Company Profile & System Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure GSTIN, Authorized Signatures (JPG/PNG), Banking, UPI QR Code, and backups.
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white ${palette.bgClass} ${palette.hoverBgClass} rounded-xl shadow-md transition-all cursor-pointer active:scale-95`}
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Business & GSTIN
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'appearance'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Appearance & Theme</span>
        </button>
        <button
          onClick={() => setActiveTab('header')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'header'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Top Header Bar</span>
        </button>
        <button
          onClick={() => setActiveTab('footer')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'footer'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Bottom Footer & Compliance</span>
        </button>
        <button
          onClick={() => setActiveTab('bottom_nav')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'bottom_nav'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Bottom Navigation (Mobile/Tablet)</span>
        </button>
        <button
          onClick={() => setActiveTab('signature')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'signature'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSignature className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Authorized Signature (JPG)</span>
        </button>
        <button
          onClick={() => setActiveTab('banking')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'banking'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Bank & UPI QR Code
        </button>
        <button
          onClick={() => setActiveTab('invoicing')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'invoicing'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Invoice Numbering & Terms
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutTemplate className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Invoice Templates (10+ Designs & Custom)</span>
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'dispatch'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>WhatsApp & Email Dispatch</span>
        </button>
        <button
          onClick={() => setActiveTab('item_lines')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'item_lines'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Product Line & Description Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('low_stock')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'low_stock'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4 text-amber-500" />
          <span>Low Stock Management & Alerts</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Session & Idle Timeout</span>
        </button>
        <button
          onClick={() => setActiveTab('biometrics')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'biometrics'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Biometrics & WebAuthn</span>
        </button>
        <button
          onClick={() => setActiveTab('pwa')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pwa'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>PWA & Offline App</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Snapshots & System Restore</span>
        </button>
        <button
          type="button"
          onClick={() => setGlobalActiveTab('users')}
          className="px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ml-auto bg-indigo-50/60 dark:bg-indigo-950/60 rounded-xl"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Users & Role Permissions (RBAC)</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Business Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Company Legal Entity Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Legal Company Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Trade Name (Brand / Doing Business As)</label>
                <input
                  type="text"
                  name="tradeName"
                  value={formData.tradeName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">GSTIN (15 Digits) *</label>
                <div className="relative">
                  <input
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 font-mono font-bold uppercase border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Permanent Account Number (PAN) *</label>
                <input
                  type="text"
                  name="pan"
                  maxLength={10}
                  value={formData.pan}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono uppercase border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone / Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Registered Business Address *</label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {STATE_CODE_LIST.map(st => (
                    <option key={st.code} value={st.name}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">PIN Code *</label>
                <input
                  type="text"
                  name="pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Website URL</label>
                <input
                  type="text"
                  name="website"
                  placeholder="https://example.com"
                  value={formData.website || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Business Tagline / Slogan (Printed on Invoices & Headers)
                </label>
                <input
                  type="text"
                  name="tagline"
                  placeholder="e.g. Authorized Wholesaler & Service Provider • Since 2012"
                  value={formData.tagline || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Company Brand Logo & Shape Selector */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Company Logo & Shape Styling
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload official company brand logo and choose its display shape on invoices and headers.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showLogoOnInvoice !== false}
                    onChange={(e) => {
                      const newStatus = e.target.checked;
                      setFormData(prev => ({ ...prev, showLogoOnInvoice: newStatus }));
                      updateBusiness({ ...formData, showLogoOnInvoice: newStatus });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Show Logo on Invoices
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Logo Upload & Preview Area */}
                <div className="md:col-span-6 space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Live Shape Preview */}
                    <div className="shrink-0">
                      {formData.logoUrl ? (
                        <div className={`w-20 h-20 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 shadow-sm p-1.5 flex items-center justify-center overflow-hidden ${
                          (formData.logoShape || 'rounded') === 'circle' 
                            ? 'rounded-full aspect-square' 
                            : (formData.logoShape || 'rounded') === 'square' 
                              ? 'rounded-none' 
                              : 'rounded-2xl'
                        }`}>
                          <img
                            src={formData.logoUrl}
                            alt="Logo preview"
                            className={`max-w-full max-h-full ${
                              (formData.logoShape || 'rounded') === 'circle' ? 'object-cover rounded-full' : 'object-contain'
                            }`}
                          />
                        </div>
                      ) : (
                        <div className={`w-20 h-20 bg-indigo-50 dark:bg-indigo-950/50 border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-black text-xl flex items-center justify-center tracking-tighter ${
                          (formData.logoShape || 'rounded') === 'circle' 
                            ? 'rounded-full aspect-square' 
                            : (formData.logoShape || 'rounded') === 'square' 
                              ? 'rounded-none' 
                              : 'rounded-2xl'
                        }`}>
                          {(formData.tradeName || formData.name || 'TM').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{formData.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>

                        {formData.logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Supports PNG, JPG, SVG, WebP up to 2MB. Transparent backgrounds work best.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shape Selection Selector */}
                <div className="md:col-span-6 space-y-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    Logo Display Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Rounded Rectangle */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, logoShape: 'rounded' }));
                        updateBusiness({ ...formData, logoShape: 'rounded' });
                        showToast('success', 'Logo Shape', 'Selected Rounded Rectangle shape.');
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        (formData.logoShape || 'rounded') === 'rounded'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/20 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-xs bg-indigo-600 dark:bg-indigo-400"></div>
                      </div>
                      <span className="text-xs font-bold">Rounded</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Modern soft edges</span>
                    </button>

                    {/* Circular Shape */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, logoShape: 'circle' }));
                        updateBusiness({ ...formData, logoShape: 'circle' });
                        showToast('success', 'Logo Shape', 'Selected Circle Avatar shape.');
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        (formData.logoShape || 'rounded') === 'circle'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                      </div>
                      <span className="text-xs font-bold">Circle</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Circular badge</span>
                    </button>

                    {/* Square Shape */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, logoShape: 'square' }));
                        updateBusiness({ ...formData, logoShape: 'square' });
                        showToast('success', 'Logo Shape', 'Selected Sharp Square shape.');
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        (formData.logoShape || 'rounded') === 'square'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-none bg-indigo-500/10 dark:bg-indigo-400/20 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-none bg-indigo-600 dark:bg-indigo-400"></div>
                      </div>
                      <span className="text-xs font-bold">Square</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Sharp corner box</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Appearance & Global Theme (Light / Dark / System) */}
        {activeTab === 'appearance' && (
          <ThemeSettingsTab />
        )}

        {/* TAB: Customizable Top Header Bar */}
        {activeTab === 'header' && (
          <HeaderSettingsTab />
        )}

        {/* TAB: Customizable Bottom Footer & Compliance */}
        {activeTab === 'footer' && (
          <FooterSettingsTab />
        )}

        {/* TAB: Customizable Bottom Navigation Bar */}
        {activeTab === 'bottom_nav' && (
          <BottomNavSettingsTab />
        )}

        {/* TAB 2: AUTHORIZED SIGNATURE (JPG / DRAW / PREVIEW) */}
        {activeTab === 'signature' && (
          <div className="space-y-6">
            {/* Top Info Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                <FileSignature className="w-5 h-5" />
              </div>
              <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                <p className="font-bold">
                  Authorized Signatory Image & Digital Stamp Setup
                </p>
                <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  Upload a scanned photo or JPG/PNG image of your authorized signature, or draw one digitally. This signature will automatically appear on all generated GST Tax Invoices, Quotations, and Client Account Statements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Upload & Signatory Config (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Upload Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Upload Signature Image (JPG / JPEG / PNG)
                    </span>
                    {formData.signatureUrl && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Signature Active
                      </span>
                    )}
                  </h3>

                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-800/40 group">
                    <input
                      type="file"
                      id="signature-file-upload"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="signature-file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to Browse or Drag & Drop JPG Signature Photo
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Supports standard JPG, JPEG, PNG or WebP images (Max 2MB)
                      </p>
                    </label>
                  </div>

                  {formData.signatureUrl && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {signatureFileName || 'Authorized_Signature.jpg'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Digital Drawing Canvas Pad */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Or Draw Signature Digitally
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Ink:</span>
                      <button
                        type="button"
                        onClick={() => setPenColor('#1e3a8a')}
                        className={`w-5 h-5 rounded-full bg-blue-900 transition-all ${penColor === '#1e3a8a' ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-60'}`}
                        title="Executive Blue Ink"
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#0f172a')}
                        className={`w-5 h-5 rounded-full bg-slate-900 transition-all ${penColor === '#0f172a' ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-60'}`}
                        title="Classic Black Ink"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 touch-none cursor-crosshair bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Clear Pad
                    </button>

                    <button
                      type="button"
                      onClick={saveDrawnSignature}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow transition-all cursor-pointer"
                    >
                      Adopt Drawn Signature
                    </button>
                  </div>
                </div>

                {/* Preset Sample Signatures */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 text-xs space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Quick Demo Signatures:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetSignature(1)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-left transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-indigo-900 dark:text-indigo-300">Sample 1 (Blue Cursive)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Executive Script</div>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPresetSignature(2)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-left transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">Sample 2 (Classic Black)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Director Signature</div>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Signatory Details & Live Invoice Footer Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Signatory Text Details */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 text-xs">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Signatory Name & Designation
                  </h3>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Authorised Signatory Name
                    </label>
                    <input
                      type="text"
                      name="signatoryName"
                      placeholder="e.g. Rajesh K. Sharma"
                      value={formData.signatoryName || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      name="signatoryDesignation"
                      placeholder="e.g. Director / Proprietor / Partner"
                      value={formData.signatoryDesignation || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showSignatureOnInvoice"
                        checked={formData.showSignatureOnInvoice !== false}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Print Signature Image on Invoices & Bills
                      </span>
                    </label>
                  </div>
                </div>

                {/* Live Invoice Preview Box */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Live Invoice Footer Preview
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                      Exact Print View
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-end text-right min-h-[160px] justify-between">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      For {formData.tradeName || formData.name}
                    </div>

                    <div className="my-2 py-1 flex items-center justify-center">
                      {formData.signatureUrl && formData.showSignatureOnInvoice !== false ? (
                        <img
                          src={formData.signatureUrl}
                          alt="Authorized Signature"
                          className="h-14 max-w-[170px] object-contain"
                        />
                      ) : (
                        <div className="h-12 w-36 border-b border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Signature space)
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-400 dark:border-slate-600 pt-1 text-center min-w-[150px]">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                        {formData.signatoryName || 'Authorized Signatory'}
                      </div>
                      {formData.signatoryDesignation && (
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                          {formData.signatoryDesignation}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    This authorized block will be rendered automatically on all generated GST Tax Invoices and receipts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Bank & UPI QR */}
        {activeTab === 'banking' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Settlement Bank Account & Dynamic UPI QR
            </h3>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
              💡 These bank details and UPI ID will be rendered directly onto all printed Tax Invoices and POS receipts with a dynamic scan-and-pay UPI QR code.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bank Name *</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Account Number *</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">IFSC Code *</label>
                <input
                  type="text"
                  name="ifscCode"
                  maxLength={11}
                  value={formData.ifscCode}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono uppercase font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Branch Name</label>
                <input
                  type="text"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2 space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>UPI ID / Virtual Payment Address (VPA) *</span>
                  </label>
                  {formData.upiId && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isValidUpiId(formData.upiId) 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}>
                      {isValidUpiId(formData.upiId) ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Valid NPCI UPI VPA</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Format: name@bankhandle</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    name="upiId"
                    placeholder="e.g. yourcompany@okhdfcbank or 9876543210@paytm"
                    value={formData.upiId}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                  />
                  <QrCode className="w-4 h-4 text-indigo-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Quick Handle Suffix Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="text-slate-400 font-semibold">Quick Bank Handles:</span>
                  {['@okhdfcbank', '@okaxis', '@okicici', '@oksbi', '@paytm', '@ybl', '@ibl', '@upi'].map(handle => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const current = (formData.upiId || '').split('@')[0].trim();
                        const base = current || (formData.phone ? formData.phone.replace(/[^0-9]/g, '').slice(-10) : 'mybusiness');
                        setFormData(prev => ({ ...prev, upiId: `${base}${handle}` }));
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                    >
                      {handle}
                    </button>
                  ))}
                </div>

                {/* Live UPI QR Scanner Verification Card */}
                {formData.upiId && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <QrCodeSvg 
                        value={buildUpiPaymentUri({
                          upiId: cleanUpiId(formData.upiId),
                          payeeName: formData.tradeName || formData.name,
                          amount: undefined, // Open amount for general testing
                          note: `Payment to ${formData.tradeName || formData.name}`,
                        })}
                        size={100}
                        showUpiBadge={true}
                      />
                      <span className="text-[9px] font-bold text-slate-800 mt-1 font-mono tracking-tight">100% Real NPCI QR</span>
                    </div>

                    <div className="space-y-1.5 text-xs flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          Live Scannable Test
                        </span>
                        <span className="text-slate-400 text-[11px]">Dynamic Vector QR</span>
                      </div>
                      <h4 className="font-bold text-sm text-white flex items-center justify-center sm:justify-start gap-1.5">
                        <span>Scan & Verify with any UPI App</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Point your camera or open <strong>Google Pay, PhonePe, Paytm, BHIM, Cred, or Amazon Pay</strong> to verify this QR resolves directly to <strong className="text-indigo-300 font-mono">{formData.upiId}</strong>.
                      </p>
                      <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-[10px] text-slate-400 font-mono">
                        <span>Payee: {formData.tradeName || formData.name || 'Merchant'}</span>
                        <span>•</span>
                        <span>Currency: INR</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Real-time Google Cloud Firestore synchronization active</span>
              </div>
              <button
                type="button"
                onClick={() => updateBusiness(formData)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer w-full sm:w-auto justify-center"
              >
                <Save className="w-4 h-4" />
                <span>Save & Cloud Sync Banking</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Invoice Preferences & Unified Series */}
        {activeTab === 'invoicing' && (
          <div className="space-y-6">
            {/* Live Sequence Integrity & Self-Healing Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Unified Tax & POS Invoice Serial Integrity</h3>
                    <p className="text-[11px] text-slate-400">Rule 46 CGST single continuous consecutive numbering monitor</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isFixingSequence}
                  onClick={async () => {
                    setIsFixingSequence(true);
                    try {
                      await realignAndFixInvoiceSequences(parseInt(String(formData.nextInvoiceNumber), 10) || undefined);
                    } finally {
                      setIsFixingSequence(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isFixingSequence ? 'animate-spin' : ''}`} />
                  <span>{isFixingSequence ? 'Aligning...' : 'Auto-Fix & Re-sync Sequences'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Total Invoices</span>
                  <span className="font-mono font-bold text-lg text-white">{sequenceAudit.totalInvoices}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Highest Serial Recorded</span>
                  <span className="font-mono font-bold text-lg text-indigo-300">
                    {sequenceAudit.highestInvoiceSeq > 0 ? (formData.invoicePrefix ? formatInvoiceSequence(formData.invoicePrefix, sequenceAudit.highestInvoiceSeq) : sequenceAudit.highestInvoiceSeq) : 'None'}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Next Active Serial</span>
                  <span className="font-mono font-bold text-lg text-emerald-400">
                    {formatInvoiceSequence(business.invoicePrefix, business.nextInvoiceNumber)}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Sequence Rule</span>
                  <span className="font-bold text-xs inline-flex items-center gap-1 text-emerald-400 mt-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Single Unified Rule</span>
                  </span>
                </div>
              </div>

              {sequenceAudit.duplicateNumbers.length > 0 && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Found potential duplicate entries: {sequenceAudit.duplicateNumbers.join(', ')}. Click &quot;Auto-Fix &amp; Re-sync Sequences&quot; to realign.</span>
                </div>
              )}
            </div>

            {/* Prefix & Numbering Series Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Invoice Numbering & Default Terms</span>
                </h3>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-100">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Unified Continuous Numbering Rule (GST Rule 46 Compliant)</span>
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Both Tax Invoices and POS Counter quick billing share this exact single sequential series. For instance, if you issue invoice <span className="font-mono font-bold">{formData.invoicePrefix ? `${formData.invoicePrefix}3406` : '3406'}</span>, the next POS bill or invoice will consecutively be <span className="font-mono font-bold">{formData.invoicePrefix ? `${formData.invoicePrefix}3407` : '3407'}</span>, then <span className="font-mono font-bold">{formData.invoicePrefix ? `${formData.invoicePrefix}3408` : '3408'}</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Invoice Prefix (Optional)</label>
                  <input
                    type="text"
                    name="invoicePrefix"
                    placeholder="Leave empty for plain numbers (e.g. 3406)"
                    value={formData.invoicePrefix}
                    onChange={handleChange}
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Optional. Leave empty for pure numbers (e.g. 3406, 3407) or specify custom prefix</p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Next Serial Number (Integer, e.g. 3406)</label>
                  <input
                    type="number"
                    name="nextInvoiceNumber"
                    value={formData.nextInvoiceNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Preview: {formatInvoiceSequence(formData.invoicePrefix, formData.nextInvoiceNumber || 1)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Default Terms & Conditions</label>
                  <textarea
                    name="defaultTerms"
                    rows={3}
                    value={formData.defaultTerms}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Default Footer Notes</label>
                  <textarea
                    name="defaultNotes"
                    rows={2}
                    value={formData.defaultNotes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Invoicing Action Tools Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Update starting serial or auto-resequence all invoices in the Tax Billing list</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsAutoUpdateModalOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    <Hash className="w-4 h-4" />
                    <span>Auto-Update Tax Billing List Invoices</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Invoice Templates (10+ GST Designs & Custom Designer) */}
        {activeTab === 'templates' && (
          <InvoiceTemplateManager />
        )}

        {/* TAB: WhatsApp & Email Dispatch Settings */}
        {activeTab === 'dispatch' && (
          <DispatchSettingsTab
            formData={formData}
            setFormData={setFormData}
            showToast={showToast}
          />
        )}

        {/* TAB 5: Product Line & Description Settings */}
        {activeTab === 'item_lines' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Product Line Description, Serial Number (Sr. No.) & Warranty Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Control which additional product tracking and description fields appear on invoices and printed bills.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                    Auto Applied in Tax Invoices
                  </span>
                </div>
              </div>

              {/* 3 Main Settings Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Serial Number (Sr. No.) Settings */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                          SN
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">Product Serial Number</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Track device IMEI / Serial No.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentItemSettings.enableSerialNumber}
                          onChange={(e) => handleItemLineSettingChange('enableSerialNumber', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="space-y-2 pt-2 text-xs">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Field Label</label>
                        <input
                          type="text"
                          value={currentItemSettings.serialNumberLabel}
                          onChange={(e) => handleItemLineSettingChange('serialNumberLabel', e.target.value)}
                          placeholder="e.g. Sr. No. / IMEI"
                          disabled={!currentItemSettings.enableSerialNumber}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={currentItemSettings.showOnPrint.serialNumber}
                          onChange={(e) => handlePrintToggle('serialNumber', e.target.checked)}
                          disabled={!currentItemSettings.enableSerialNumber}
                          className="rounded text-indigo-600 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Print Sr. No. on PDF & Invoice Bills
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    💡 Allows entering comma-separated serial numbers for multiple quantities (e.g. <span className="font-mono text-slate-700 dark:text-slate-300">SN-9011, SN-9012</span>).
                  </div>
                </div>

                {/* 2. Warranty Settings */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">Warranty Period</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Attach guarantee & coverage</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentItemSettings.enableWarranty}
                          onChange={(e) => handleItemLineSettingChange('enableWarranty', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="space-y-2 pt-2 text-xs">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Field Label</label>
                        <input
                          type="text"
                          value={currentItemSettings.warrantyLabel}
                          onChange={(e) => handleItemLineSettingChange('warrantyLabel', e.target.value)}
                          placeholder="e.g. Warranty"
                          disabled={!currentItemSettings.enableWarranty}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Default Selected Warranty</label>
                        <select
                          value={currentItemSettings.defaultWarranty}
                          onChange={(e) => handleItemLineSettingChange('defaultWarranty', e.target.value)}
                          disabled={!currentItemSettings.enableWarranty}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {(currentItemSettings.warrantyOptions || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={currentItemSettings.showOnPrint.warranty}
                          onChange={(e) => handlePrintToggle('warranty', e.target.checked)}
                          disabled={!currentItemSettings.enableWarranty}
                          className="rounded text-indigo-600 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Print Warranty badge on Invoices
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    🛡️ Printed as an official warranty clause tag on customer tax receipts.
                  </div>
                </div>

                {/* 3. Description Line Settings */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">Product Description Line</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Multi-line specs & notes</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentItemSettings.enableDescription}
                          onChange={(e) => handleItemLineSettingChange('enableDescription', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="space-y-2 pt-2 text-xs">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Input Placeholder</label>
                        <input
                          type="text"
                          value={currentItemSettings.descriptionPlaceholder}
                          onChange={(e) => handleItemLineSettingChange('descriptionPlaceholder', e.target.value)}
                          placeholder="Placeholder helper text..."
                          disabled={!currentItemSettings.enableDescription}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      <div className="pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentItemSettings.enableBatchNumber}
                            onChange={(e) => handleItemLineSettingChange('enableBatchNumber', e.target.checked)}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Enable Batch Number Tracking</span>
                        </label>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={currentItemSettings.showOnPrint.description}
                          onChange={(e) => handlePrintToggle('description', e.target.checked)}
                          disabled={!currentItemSettings.enableDescription}
                          className="rounded text-indigo-600 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Print Item Description on Invoices
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    📝 Allows extra item particulars, dimensions, or terms per line.
                  </div>
                </div>
              </div>

              {/* Manage Warranty Preset Options */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Manage Quick Warranty Presets
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      These presets appear as 1-click choices in invoice item lines and dropdowns.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newWarrantyPreset}
                      onChange={(e) => setNewWarrantyPreset(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddWarrantyPreset();
                        }
                      }}
                      placeholder="e.g. 3 Years Onsite Warranty"
                      className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddWarrantyPreset}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Preset</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(currentItemSettings.warrantyOptions || []).map((preset) => (
                    <div
                      key={preset}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 shadow-2xs group hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{preset}</span>
                      {currentItemSettings.defaultWarranty === preset && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded">
                          Default
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveWarrantyPreset(preset)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer ml-1"
                        title="Remove preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Visual Print Preview Box */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                      Live Sample Preview in GST Invoice Document
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Real-time visual output
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-800/60">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-2 text-center">HSN</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 px-3 text-slate-400 font-mono">1</td>
                        <td className="py-3 px-3 max-w-[340px]">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            Apple MacBook Pro 16" M3 Max
                          </div>

                          {/* Serial Number & Warranty Line */}
                          {(currentItemSettings.enableSerialNumber || currentItemSettings.enableWarranty) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {currentItemSettings.enableSerialNumber && currentItemSettings.showOnPrint.serialNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-semibold border border-blue-200 dark:border-blue-800">
                                  <span>{currentItemSettings.serialNumberLabel}:</span>
                                  <span>C02G80XZMD6T</span>
                                </span>
                              )}

                              {currentItemSettings.enableWarranty && currentItemSettings.showOnPrint.warranty && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{currentItemSettings.warrantyLabel}: {currentItemSettings.defaultWarranty}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Multi-line Description */}
                          {currentItemSettings.enableDescription && currentItemSettings.showOnPrint.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              36GB Unified Memory, 1TB SSD, Space Black color. Includes 140W USB-C Power Adapter and MagSafe 3 Cable.
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-400">84713010</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800 dark:text-slate-200">1 PCS</td>
                        <td className="py-3 px-2 text-right font-mono text-slate-700 dark:text-slate-300">₹3,49,900.00</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">₹4,12,882.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Low Stock & Inventory Controls */}
        {activeTab === 'low_stock' && (
          <LowStockSettingsTab
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
          />
        )}

        {/* TAB: Session & Idle Inactivity Timeout Policy */}
        {activeTab === 'security' && (
          <SessionTimeoutSettingsTab />
        )}

        {/* TAB: Biometric Authentication (FaceID / Fingerprint / WebAuthn) */}
        {activeTab === 'biometrics' && (
          <BiometricSettingsTab />
        )}

        {/* TAB: Progressive Web App & Offline Settings */}
        {activeTab === 'pwa' && (
          <PwaSettingsTab />
        )}

        {/* TAB 16: Automated Snapshots & System Restore (No Reset Button) */}
        {activeTab === 'backup' && (
          <SnapshotRestoreSettingsTab />
        )}

        {activeTab !== 'security' && activeTab !== 'biometrics' && activeTab !== 'low_stock' && activeTab !== 'pwa' && activeTab !== 'backup' && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        )}
      </form>

      {/* Auto-Update Invoice Numbers from Starting Sequence Modal */}
      <AutoUpdateInvoiceNumbersModal
        isOpen={isAutoUpdateModalOpen}
        onClose={() => setIsAutoUpdateModalOpen(false)}
      />
    </div>
  );
};
