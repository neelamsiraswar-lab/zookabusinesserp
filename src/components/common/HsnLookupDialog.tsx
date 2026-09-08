import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Sparkles, 
  FolderPlus, 
  Check, 
  Layers, 
  FileText, 
  Building2, 
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { COMMON_HSN_CODES } from '../../utils/constants';
import { CustomHsnCode } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemePalette } from '../../utils/themeColors';

export interface HsnLookupItem {
  id?: string;
  code: string;
  description: string;
  gstRate: number;
  isCustom?: boolean;
  category?: string;
  uqc?: string;
}

interface HsnLookupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HsnLookupItem) => void;
  onOpenCustomManager?: () => void;
  currentCode?: string;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Codes' },
  { id: 'CUSTOM', label: '⭐ Custom Codes' },
  { id: 'TECH', label: 'Tech & Electronics (84-85)' },
  { id: 'SERVICES', label: 'Services SAC (99)' },
  { id: 'PHARMA', label: 'Pharma & Chemicals (28-40)' },
  { id: 'TEXTILES', label: 'Textiles & Apparel (50-64)' },
  { id: 'FOOD', label: 'Food & FMCG (01-24)' },
  { id: 'METALS', label: 'Metals & Construction (72-94)' },
  { id: 'PAPER', label: 'Paper & Stationery (48)' },
];

export const HsnLookupDialog: React.FC<HsnLookupDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  onOpenCustomManager,
  currentCode = ''
}) => {
  const { customHsnCodes, currentCompany } = useApp();
  const palette = getThemePalette(currentCompany?.themeColor || 'indigo');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSelectedCategory('ALL');
    }
  }, [isOpen]);

  // Combine custom and standard HSN master lists
  const allHsnEntries: HsnLookupItem[] = useMemo(() => {
    const customList: HsnLookupItem[] = (customHsnCodes || []).map(h => ({
      id: h.id,
      code: h.code,
      description: h.description,
      gstRate: h.gstRate,
      isCustom: true,
      category: 'CUSTOM',
      uqc: h.uqc
    }));

    const standardList: HsnLookupItem[] = COMMON_HSN_CODES.map(h => {
      let cat = 'TECH';
      const num = parseInt(h.code, 10);
      if (h.code.startsWith('99')) cat = 'SERVICES';
      else if (num >= 8400 && num <= 8599) cat = 'TECH';
      else if (num >= 2800 && num <= 4099) cat = 'PHARMA';
      else if (num >= 5000 && num <= 6499) cat = 'TEXTILES';
      else if (num >= 100 && num <= 2499) cat = 'FOOD';
      else if (num >= 7200 && num <= 9499) cat = 'METALS';
      else if (num >= 4800 && num <= 4899) cat = 'PAPER';

      return {
        code: h.code,
        description: h.description,
        gstRate: h.defaultGst,
        isCustom: false,
        category: cat
      };
    });

    return [...customList, ...standardList];
  }, [customHsnCodes]);

  const filteredEntries = useMemo(() => {
    let list = allHsnEntries;

    // Filter by Category
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'CUSTOM') {
        list = list.filter(item => item.isCustom);
      } else {
        list = list.filter(item => item.category === selectedCategory);
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        String(item.gstRate).includes(q)
      );
    }

    return list;
  }, [allHsnEntries, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const getGstBadgeStyle = (rate: number) => {
    switch (rate) {
      case 0:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 5:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 12:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 18:
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 28:
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        style={{ boxShadow: `0 20px 40px -15px ${palette.ringHex}, 0 10px 20px -10px rgba(0,0,0,0.15)` }}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: palette.lightHex, color: palette.textHex }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  HSN / SAC Code Directory
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: palette.hex }}
                >
                  App Dialog Format
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse official GST tariff codes with full descriptions & applicable tax slabs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by HSN code (e.g. 8471), keyword (e.g. software, laptop, tea), or tax rate..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  style={isSelected ? { backgroundColor: palette.hex } : undefined}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List of HSN / SAC Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh] bg-slate-50/50 dark:bg-slate-950/40">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matching HSN or SAC codes found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try a different keyword or create a custom code in your business directory.
              </p>
              {onOpenCustomManager && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomManager();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white shadow-xs cursor-pointer"
                  style={{ backgroundColor: palette.hex }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Add Custom HSN Code</span>
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((item) => {
              const isCurrent = currentCode.trim() === item.code.trim();

              return (
                <div
                  key={`${item.isCustom ? 'custom' : 'std'}-${item.code}-${item.id || ''}`}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                    isCurrent
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                  style={isCurrent ? { borderColor: palette.hex } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {item.code}
                      </span>

                      {item.isCustom ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Sparkles className="w-3 h-3" />
                          Custom Code
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {item.code.startsWith('99') ? 'SAC Service' : 'HSN Goods'}
                        </span>
                      )}

                      {item.uqc && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.uqc}
                        </span>
                      )}

                      {isCurrent && (
                        <span 
                          className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: palette.lightHex, color: palette.textHex }}
                        >
                          <Check className="w-3 h-3" />
                          Selected
                        </span>
                      )}
                    </div>

                    {/* Full Description with zero truncation */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* GST Tax Slabs & Select Action */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getGstBadgeStyle(item.gstRate)}`}>
                      {item.gstRate}% GST
                    </span>

                    <button
                      type="button"
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-0.5"
                    >
                      <span>Choose</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Directory Management & Status */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredEntries.length}</strong> of {allHsnEntries.length} codes
          </div>

          <div className="flex items-center gap-2">
            {onOpenCustomManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomManager();
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Manage Custom Codes</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
