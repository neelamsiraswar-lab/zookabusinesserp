import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sun, 
  Moon, 
  Check, 
  Palette, 
  Sparkles, 
  Sliders, 
  Zap,
  FileText,
  MousePointerClick,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  Plus,
  ChevronDown,
  Layers
} from 'lucide-react';
import { THEME_PALETTES, ThemePaletteDefinition, getThemePalette } from '../../utils/themeColors';
import { AppThemeDropdown } from '../common/AppThemeDropdown';
import { AppDropdown } from '../common/AppDropdown';

export const ThemeSettingsTab: React.FC = () => {
  const { 
    theme, 
    resolvedTheme, 
    setTheme, 
    toggleTheme, 
    currentCompany, 
    updateBusiness,
    showToast 
  } = useApp();

  const activeThemeColor = currentCompany?.themeColor || 'indigo';
  const currentPalette = getThemePalette(activeThemeColor);

  const themeOptions = [
    {
      id: 'light' as const,
      name: 'Light Mode',
      description: 'Clean, high-contrast crisp white interface. Ideal for bright daytime environments.',
      icon: Sun,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      badge: 'Daytime',
      preview: {
        bg: 'bg-slate-100 border-slate-300',
        card: 'bg-white border-slate-200 text-slate-800',
        subtext: 'text-slate-500'
      }
    },
    {
      id: 'dark' as const,
      name: 'Dark Mode',
      description: 'Deep midnight slate palette. Reduces eye strain in low-light and saves battery life.',
      icon: Moon,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800',
      badge: 'Night & Focus',
      preview: {
        bg: 'bg-slate-950 border-slate-800',
        card: 'bg-slate-900 border-slate-800 text-slate-100',
        subtext: 'text-slate-400'
      }
    }
  ];

  const handleSelectThemeMode = (selectedTheme: 'light' | 'dark') => {
    setTheme(selectedTheme);
    const label = selectedTheme === 'light' ? 'Light Mode' : 'Dark Mode';
    showToast('success', 'App Theme Mode Updated', `Interface appearance switched to ${label}.`);
  };

  const handleSelectThemeColor = (colorKey: string) => {
    const palette = THEME_PALETTES[colorKey] || THEME_PALETTES.indigo;
    updateBusiness({
      themeColor: colorKey
    });
    showToast('success', 'App Theme Color Matched', `All buttons, navigation accents, and badges auto-matched to ${palette.name}.`);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Live Theme Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div 
              className="p-2 rounded-xl text-white shadow-sm flex items-center justify-center"
              style={{ backgroundColor: currentPalette.hex }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Appearance & Theme Customization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-match all buttons, dropdowns, bottom navigation, active indicators, and modal accents across the entire ERP.
              </p>
            </div>
          </div>

          {/* Quick App Dropdown Theme Selector */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">App Dropdown Theme</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{currentPalette.name}</span>
            </div>
            <AppThemeDropdown />
          </div>
        </div>

        {/* Display Mode (Light & Dark Only - No System) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Base App Display Mode
            </h4>
            <span className="text-[11px] text-slate-400">
              Active: <strong className="text-slate-700 dark:text-slate-200">{resolvedTheme.toUpperCase()} MODE</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = resolvedTheme === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectThemeMode(opt.id)}
                  className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer group flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-600/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/70'
                  }`}
                  style={isSelected ? { borderColor: currentPalette.hex } : undefined}
                >
                  {/* Checkmark indicator */}
                  {isSelected && (
                    <div 
                      className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: currentPalette.hex }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`p-2 rounded-xl border ${opt.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {opt.name}
                        </h4>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {opt.badge}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>

                  {/* UI Mock Preview Box */}
                  <div className={`mt-auto rounded-xl p-3 border shadow-inner ${opt.preview.bg}`}>
                    <div className={`rounded-lg p-2.5 border shadow-sm ${opt.preview.card} flex items-center justify-between`}>
                      <div className="space-y-1">
                        <div className="w-16 h-2 bg-slate-400/40 rounded-full" />
                        <div className="w-10 h-1.5 bg-slate-400/25 rounded-full" />
                      </div>
                      <div 
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: currentPalette.hex }}
                      >
                        ₹ 24,500
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* App Accent Color & Auto-Match Buttons Palette */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>2. App & Button Theme Color (Auto-Match)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select your organization's primary signature brand tone. All buttons, active indicators, bottom bar styles, and badges synchronize automatically.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Instant Zero-Reload Sync</span>
          </div>
        </div>

        {/* Palettes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Object.values(THEME_PALETTES).map((pal) => {
            const isSelected = activeThemeColor === pal.id;

            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => handleSelectThemeColor(pal.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between group ${
                  isSelected
                    ? 'shadow-md ring-2 ring-offset-1 dark:ring-offset-slate-900 bg-white dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
                style={isSelected ? { borderColor: pal.hex, outlineColor: pal.hex } : undefined}
              >
                {isSelected && (
                  <span 
                    className="absolute top-3 right-3 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: pal.hex }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span 
                      className="w-5 h-5 rounded-full shadow-xs border-2 border-white dark:border-slate-800 shrink-0" 
                      style={{ backgroundColor: pal.hex }}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {pal.name}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {pal.tagline}
                  </p>
                </div>

                {/* Micro Button Swatches */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div 
                    className="h-5 flex-1 rounded-md text-[9px] font-bold text-white flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: pal.hex }}
                  >
                    Primary
                  </div>
                  <div 
                    className="h-5 flex-1 rounded-md text-[9px] font-semibold flex items-center justify-center border"
                    style={{ 
                      backgroundColor: resolvedTheme === 'dark' ? pal.darkLightHex : pal.lightHex,
                      color: resolvedTheme === 'dark' ? pal.textDarkHex : pal.textHex,
                      borderColor: pal.hex + '40'
                    }}
                  >
                    Subtle
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Auto-Matched Buttons Interactive Demonstration */}
        <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-indigo-600" />
              <span>Live Auto-Matched UI Buttons & Controls Demonstration</span>
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Reflects active color: <strong>{currentPalette.name}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Primary Button */}
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              style={{ backgroundColor: currentPalette.hex }}
              onClick={() => showToast('info', 'Theme Button Demo', `Primary button styled in ${currentPalette.name}.`)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Primary Button</span>
            </button>

            {/* Subtle Pill Button */}
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border"
              style={{ 
                backgroundColor: resolvedTheme === 'dark' ? currentPalette.darkLightHex : currentPalette.lightHex,
                color: resolvedTheme === 'dark' ? currentPalette.textDarkHex : currentPalette.textHex,
                borderColor: currentPalette.hex + '40'
              }}
              onClick={() => showToast('info', 'Subtle Pill Demo', `Subtle active button styled in ${currentPalette.name}.`)}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Subtle Active Pill</span>
            </button>

            {/* Floating Action Button (FAB) Demo */}
            <button
              type="button"
              className="p-2 rounded-full text-white shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95"
              style={{ backgroundColor: currentPalette.hex }}
              onClick={() => showToast('info', 'FAB Button Demo', `Quick action button in ${currentPalette.name}.`)}
              title="Quick Create FAB"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Active Status Badge */}
            <span 
              className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-xs"
              style={{ backgroundColor: currentPalette.hex }}
            >
              Live Badge
            </span>

            {/* Simulated Form Input with Theme Focus */}
            <div className="relative">
              <input
                type="text"
                readOnly
                value="Active Input Field"
                className="text-xs px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                style={{ borderColor: currentPalette.hex, boxShadow: `0 0 0 2px ${currentPalette.ringHex}` }}
              />
            </div>
          </div>

          {/* App Dropdown Theme Demo Section */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5" style={{ color: currentPalette.hex }} />
                <span>App Dropdown Theme Demo (No System Dropdown)</span>
              </div>
              <span className="text-[10px] text-slate-400">Custom theme-styled menu & active focus glow</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div>
                <AppDropdown
                  label="Quick Select Palette (App Dropdown)"
                  value={activeThemeColor}
                  options={Object.values(THEME_PALETTES).map(p => ({
                    value: p.id,
                    label: p.name,
                    description: p.tagline,
                    colorDot: p.hex
                  }))}
                  onChange={(val) => handleSelectThemeColor(val)}
                  size="sm"
                />
              </div>
              <div>
                <AppDropdown
                  label="Quick Select Display Mode (App Dropdown)"
                  value={resolvedTheme}
                  options={[
                    { value: 'light', label: 'Light Mode', description: 'Clean daytime white interface', icon: Sun },
                    { value: 'dark', label: 'Dark Mode', description: 'Midnight dark focus theme', icon: Moon }
                  ]}
                  onChange={(val) => handleSelectThemeMode(val as 'light' | 'dark')}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Display Features & Print Assurance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Theme Switcher Shortcut */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                One-Click Light / Dark Shortcut
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You can also instantly flip modes anytime using the header sun/moon icon.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              style={{ backgroundColor: currentPalette.hex }}
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span>Switch to Light Mode Now</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-200" />
                  <span>Switch to Dark Mode Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GST Printable Invoices Safety Notice */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <FileText className="w-4 h-4" />
            <span>Clean A4 Tax Invoice Printing Standard</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Regardless of your selected app theme mode (Light or Dark), official GST invoices and tax documents generated for PDF export or paper printing will always render in pristine, high-contrast white paper format to comply with statutory accounting requirements and preserve printer toner.
          </p>
        </div>
      </div>
    </div>
  );
};
