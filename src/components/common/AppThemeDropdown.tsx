import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sun, 
  Moon, 
  Palette, 
  Check, 
  ChevronDown, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { THEME_PALETTES, getThemePalette } from '../../utils/themeColors';

interface AppThemeDropdownProps {
  compact?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const AppThemeDropdown: React.FC<AppThemeDropdownProps> = ({ 
  compact = false, 
  align = 'right',
  className = ''
}) => {
  const { 
    resolvedTheme, 
    setTheme, 
    currentCompany, 
    updateBusiness, 
    showToast 
  } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeThemeColor = currentCompany?.themeColor || 'indigo';
  const currentPalette = getThemePalette(activeThemeColor);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = (mode: 'light' | 'dark') => {
    setTheme(mode);
    showToast('success', 'App Theme Mode', `Switched interface to ${mode === 'dark' ? 'Dark Mode' : 'Light Mode'}.`);
  };

  const handleSelectColor = (colorKey: string) => {
    const pal = THEME_PALETTES[colorKey] || THEME_PALETTES.indigo;
    updateBusiness({
      themeColor: colorKey
    });
    showToast('success', 'App Accent Color', `App theme color updated to ${pal.name}.`);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
          compact
            ? 'p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80'
            : 'px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700'
        }`}
        title={`Theme Menu: ${resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'} • ${currentPalette.name}`}
        aria-label="App Theme Dropdown"
        aria-expanded={isOpen}
      >
        {/* Swatch Dot */}
        <span 
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
          style={{ backgroundColor: currentPalette.hex }}
        />

        {/* Sun / Moon Icon */}
        {resolvedTheme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
        ) : (
          <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
        )}

        {!compact && (
          <>
            <span className="truncate">{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* App Dropdown Menu Popover */}
      {isOpen && (
        <div 
          className={`absolute mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-3.5 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ boxShadow: `0 10px 30px -5px ${currentPalette.ringHex}, 0 20px 25px -5px rgba(0,0,0,0.1)` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Palette className="w-4 h-4" style={{ color: currentPalette.hex }} />
              <span className="text-xs font-bold text-slate-900 dark:text-white">App Theme Dropdown</span>
            </div>
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: currentPalette.hex }}
            >
              {currentPalette.name}
            </span>
          </div>

          {/* Section 1: Display Mode (Light / Dark Only - No System) */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Interface Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectMode('light')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  resolvedTheme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
                {resolvedTheme === 'light' && <Check className="w-3 h-3 text-emerald-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('dark')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  resolvedTheme === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
                {resolvedTheme === 'dark' && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Section 2: App Accent Color Palette */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Brand Palette
              </label>
              <span className="text-[10px] text-slate-400">Auto-match UI</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {Object.values(THEME_PALETTES).map((pal) => {
                const isSelected = activeThemeColor === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => handleSelectColor(pal.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800 border-2 shadow-xs'
                        : 'bg-transparent border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    style={isSelected ? { borderColor: pal.hex } : undefined}
                    title={pal.name}
                  >
                    <span 
                      className="w-5 h-5 rounded-full shadow-2xs border border-white/40 flex items-center justify-center text-white"
                      style={{ backgroundColor: pal.hex }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                      {pal.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Zero-Reload Sync</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
