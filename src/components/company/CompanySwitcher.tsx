import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Company } from '../../types';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Sparkles, 
  MapPin, 
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { CreateCompanyModal } from './CreateCompanyModal';
import { getThemeBg } from '../../utils/themeColors';

interface CompanySwitcherProps {
  compact?: boolean;
}

export const CompanySwitcher: React.FC<CompanySwitcherProps> = ({ compact = false }) => {
  const { 
    companies, 
    currentCompany, 
    switchCompany,
    setActiveTab,
    showToast 
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCompany = (company: Company) => {
    if (company.id !== currentCompany.id) {
      switchCompany(company.id);
    }
    setIsOpen(false);
  };



  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-left ${
          isOpen 
            ? 'bg-slate-800 border-indigo-500 text-white shadow-md' 
            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
        }`}
        title="Switch active company / business"
      >
        <div className={`w-7 h-7 rounded-lg ${getThemeBg(currentCompany.themeColor)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs`}>
          <Building2 className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 max-w-[140px] sm:max-w-[200px]">
          <div className="text-xs font-bold text-white truncate leading-tight">
            {currentCompany.tradeName || currentCompany.name}
          </div>
          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
            <span className="font-mono">{currentCompany.gstin.substring(0, 2)}</span>
            <span>•</span>
            <span>{currentCompany.state}</span>
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-auto mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-96 max-h-[85dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-slate-200 modal-content-scroll">
          
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Select Business / Entity</span>
            </div>
            <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
              {companies.length} Companies
            </span>
          </div>

          {/* Companies List */}
          <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
            {companies.map(comp => {
              const isCurrent = comp.id === currentCompany.id;

              return (
                <button
                  key={comp.id}
                  onClick={() => handleSelectCompany(comp)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${getThemeBg(comp.themeColor)} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                      <Building2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${isCurrent ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-900 dark:text-white'}`}>
                          {comp.tradeName || comp.name}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-indigo-600 text-white rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-600 dark:text-slate-400">{comp.gstin}</span>
                        <span>•</span>
                        <span className="truncate">{comp.state}</span>
                      </div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-indigo-600">
                      Switch
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 px-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="py-2 px-2 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-transparent dark:border-indigo-800/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Company</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setIsOpen(false);
              }}
              className="py-2 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-transparent dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Manage Entities</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};
