import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Check, 
  ChevronRight, 
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getThemePalette } from '../../utils/themeColors';

export interface AppDialogOption<T = string | number> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
  colorDot?: string;
  group?: string;
  disabled?: boolean;
}

interface AppSelectDialogProps<T = string | number> {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: T, option?: AppDialogOption<T>) => void;
  title: string;
  subtitle?: string;
  options: AppDialogOption<T>[];
  selectedValue?: T;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function AppSelectDialog<T = string | number>({
  isOpen,
  onClose,
  onSelect,
  title,
  subtitle,
  options,
  selectedValue,
  searchPlaceholder = 'Search options...',
  showSearch = true
}: AppSelectDialogProps<T>) {
  const { currentCompany } = useApp();
  const palette = getThemePalette(currentCompany?.themeColor || 'indigo');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSelectedGroup('ALL');
    }
  }, [isOpen]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    options.forEach(opt => {
      if (opt.group) set.add(opt.group);
    });
    return Array.from(set);
  }, [options]);

  const filteredOptions = useMemo(() => {
    let list = options;

    if (selectedGroup !== 'ALL') {
      list = list.filter(opt => opt.group === selectedGroup);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(opt => 
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
      );
    }

    return list;
  }, [options, selectedGroup, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        style={{ boxShadow: `0 20px 40px -15px ${palette.ringHex}, 0 10px 20px -10px rgba(0,0,0,0.15)` }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <span 
                className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-2xs"
                style={{ backgroundColor: palette.hex }}
              >
                App Format
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        {(showSearch || groups.length > 0) && (
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            {showSearch && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {groups.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedGroup('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedGroup === 'ALL'
                      ? 'text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                  style={selectedGroup === 'ALL' ? { backgroundColor: palette.hex } : undefined}
                >
                  All ({options.length})
                </button>
                {groups.map(grp => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setSelectedGroup(grp)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      selectedGroup === grp
                        ? 'text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    style={selectedGroup === grp ? { backgroundColor: palette.hex } : undefined}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Options List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[50vh] bg-slate-50/50 dark:bg-slate-950/40">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching options found
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedValue === option.value;
              const Icon = option.icon;

              return (
                <div
                  key={String(option.value)}
                  onClick={() => {
                    if (!option.disabled) {
                      onSelect(option.value, option);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
                      : option.disabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                  style={isSelected ? { borderColor: palette.hex } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {option.colorDot && (
                      <span 
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: option.colorDot }}
                      />
                    )}
                    {Icon && (
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {option.label}
                        </span>
                        {option.badge && (
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                            style={{ backgroundColor: palette.lightHex, color: palette.textHex }}
                          >
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5 truncate">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected ? (
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: palette.hex }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {filteredOptions.length} available
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
