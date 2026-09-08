import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Palette, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  RotateCcw, 
  Save, 
  Eye, 
  Tag, 
  Layers, 
  Receipt,
  Building2,
  Landmark,
  Zap,
  ShieldCheck,
  Briefcase,
  ShoppingBag,
  PieChart,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Info
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { LOGO_ICON_OPTIONS, LOGO_GRADIENT_PRESETS, DEFAULT_PLATFORM_CONFIG } from '../../utils/platformDefaults';
import { PlatformConfig } from '../../types';

export const PlatformBrandingView: React.FC = () => {
  const { platformConfig, updatePlatformConfig, resetPlatformConfig } = useApp();

  // Local editable form state
  const [appName, setAppName] = useState(platformConfig?.appName || DEFAULT_PLATFORM_CONFIG.appName);
  const [appTagline, setAppTagline] = useState(platformConfig?.appTagline || DEFAULT_PLATFORM_CONFIG.appTagline);
  const [appLogoType, setAppLogoType] = useState<'icon' | 'image'>(platformConfig?.appLogoType || 'icon');
  const [appLogoIcon, setAppLogoIcon] = useState(platformConfig?.appLogoIcon || 'Receipt');
  const [appLogoUrl, setAppLogoUrl] = useState(platformConfig?.appLogoUrl || '');
  const [appLogoGradient, setAppLogoGradient] = useState(platformConfig?.appLogoGradient || LOGO_GRADIENT_PRESETS[0].class);
  const [brandBadgeText, setBrandBadgeText] = useState(platformConfig?.brandBadgeText || 'PRO');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when platformConfig updates remotely
  useEffect(() => {
    if (platformConfig) {
      setAppName(platformConfig.appName);
      setAppTagline(platformConfig.appTagline);
      setAppLogoType(platformConfig.appLogoType);
      setAppLogoIcon(platformConfig.appLogoIcon);
      setAppLogoUrl(platformConfig.appLogoUrl || '');
      setAppLogoGradient(platformConfig.appLogoGradient);
      setBrandBadgeText(platformConfig.brandBadgeText);
    }
  }, [platformConfig]);

  // Construct draft config object for live preview
  const draftConfig: PlatformConfig = {
    appName: appName.trim() || 'Zooka Business',
    appTagline: appTagline.trim() || 'Smart Business, GST & E-Invoicing Suite',
    appLogoType,
    appLogoIcon,
    appLogoUrl: appLogoUrl.trim(),
    appLogoGradient,
    brandBadgeText: brandBadgeText.trim(),
    announcement: platformConfig.announcement,
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setAppLogoUrl(result);
        setAppLogoType('image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updatePlatformConfig({
        appName: appName.trim() || 'Zooka Business',
        appTagline: appTagline.trim() || 'Smart Business, GST & E-Invoicing Suite',
        appLogoType,
        appLogoIcon,
        appLogoUrl: appLogoUrl.trim(),
        appLogoGradient,
        brandBadgeText: brandBadgeText.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset platform identity and logo back to factory defaults (Zooka Business)?')) {
      await resetPlatformConfig();
      setAppName(DEFAULT_PLATFORM_CONFIG.appName);
      setAppTagline(DEFAULT_PLATFORM_CONFIG.appTagline);
      setAppLogoType(DEFAULT_PLATFORM_CONFIG.appLogoType);
      setAppLogoIcon(DEFAULT_PLATFORM_CONFIG.appLogoIcon);
      setAppLogoUrl('');
      setAppLogoGradient(DEFAULT_PLATFORM_CONFIG.appLogoGradient);
      setBrandBadgeText(DEFAULT_PLATFORM_CONFIG.brandBadgeText);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            <span>Platform Identity & Custom Branding</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalize the platform application name, logo, tagline, and brand badge broadcasted across all business workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Reset platform branding to default factory values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved & Live</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save & Broadcast</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Form & Live Visual Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
            
            {/* Section 1: Brand Text Attributes */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Tag className="w-4 h-4 text-purple-400" />
                <span>Platform Names & Tagline</span>
              </h2>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Application / Brand Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. Zooka Business, Enterprise ERP"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400">
                  Displayed on sidebar headers, login splash, PDF footers, and browser tab titles.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={appTagline}
                    onChange={(e) => setAppTagline(e.target.value)}
                    placeholder="e.g. Smart Business, GST & E-Invoicing Suite"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400">
                    Appears underneath the brand title in the main sidebar.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Brand Badge Text
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={brandBadgeText}
                    onChange={(e) => setBrandBadgeText(e.target.value.toUpperCase())}
                    placeholder="e.g. PRO, SUITE"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase font-mono font-bold focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400">
                    Badge pill next to name.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Logo Representation */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>Logo Type & Asset</span>
                </h2>

                {/* Switcher Pill */}
                <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAppLogoType('icon')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      appLogoType === 'icon' 
                        ? 'bg-purple-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Preset Vector Icon
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppLogoType('image')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      appLogoType === 'image' 
                        ? 'bg-purple-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom Image / URL
                  </button>
                </div>
              </div>

              {/* Vector Icon Options */}
              {appLogoType === 'icon' && (
                <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Select Vector Symbol
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {LOGO_ICON_OPTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAppLogoIcon(item.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                            appLogoIcon === item.id
                              ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/40'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <AppLogo 
                            config={{ appLogoType: 'icon', appLogoIcon: item.id, appLogoGradient }} 
                            size="sm" 
                          />
                          <span className="text-[10px] font-bold line-clamp-1">{item.label.split('&')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    <label className="block text-xs font-bold text-slate-300">
                      Icon Gradient Background Preset
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {LOGO_GRADIENT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAppLogoGradient(preset.class)}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            appLogoGradient === preset.class
                              ? 'border-purple-500 bg-purple-950/20 ring-1 ring-purple-500/30'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg ${preset.class} shrink-0 ring-1 ring-white/20`} />
                          <span className="text-xs font-bold text-slate-200 truncate">{preset.name}</span>
                          {appLogoGradient === preset.class && (
                            <Check className="w-3.5 h-3.5 text-purple-400 ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Image Upload & URL Options */}
              {appLogoType === 'image' && (
                <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      isDragOver
                        ? 'border-purple-500 bg-purple-950/30'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200">
                        Click to upload logo or drag and drop
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG, SVG, or WebP (Recommended: Square aspect ratio, transparent background)
                      </p>
                    </div>
                  </div>

                  {/* Or image URL input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Or Direct Image Web URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={appLogoUrl}
                        onChange={(e) => setAppLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      {appLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setAppLogoUrl('')}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                          title="Clear Image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {appLogoUrl && (
                    <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center shrink-0 border border-slate-700">
                        <img 
                          src={appLogoUrl} 
                          alt="Logo Preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">Active Custom Image</div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Image asset loaded ready for preview</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppLogoUrl('');
                          setAppLogoType('icon');
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Changes sync in real-time to all connected browser sessions via Firestore.</span>
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Syncing...' : 'Save & Sync Platform Identity'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Real-time Live Visual Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Live Visual Component Previews</span>
            </h2>

            {/* Preview 1: Sidebar Header (Expanded) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                1. Expanded Sidebar Header
              </span>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <AppLogo config={draftConfig} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white text-sm tracking-tight truncate">
                      {draftConfig.appName}
                    </span>
                    {draftConfig.brandBadgeText && (
                      <span className="text-[9px] uppercase font-extrabold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">
                        {draftConfig.brandBadgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-medium truncate">
                    {draftConfig.appTagline}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview 2: Sidebar (Collapsed) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Collapsed Sidebar Icon Mode
              </span>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center">
                  <AppLogo config={draftConfig} size="md" />
                </div>
                <div className="text-xs text-slate-400">
                  Compact 20-column view for maximum screen workspace when the sidebar is collapsed.
                </div>
              </div>
            </div>

            {/* Preview 3: Browser Window Tab & Title Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                3. Browser Tab Preview
              </span>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="ml-2 px-3 py-1 bg-slate-950 rounded-t-lg border-t border-x border-slate-800 flex items-center gap-2 text-[11px] text-slate-200 font-medium max-w-[200px] truncate">
                    <AppLogo config={draftConfig} size="xs" />
                    <span className="truncate">{draftConfig.appName}</span>
                  </div>
                </div>
                <div className="p-3 text-[11px] text-slate-400 font-mono">
                  &lt;title&gt;{draftConfig.appName} - {draftConfig.appTagline}&lt;/title&gt;
                </div>
              </div>
            </div>

            {/* Current Active Status Indicator */}
            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Cloud Firestore Synced:</span>
                <p className="text-purple-300/80 text-[11px] mt-0.5">
                  Any changes saved here apply immediately to all active companies, tenant switchers, and staff users without requiring code redeployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
