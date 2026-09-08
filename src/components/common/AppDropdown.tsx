import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getThemePalette } from '../../utils/themeColors';

export interface AppDropdownOption<T = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
  colorDot?: string;
  disabled?: boolean;
}

interface AppDropdownProps<T = string> {
  value: T;
  options: AppDropdownOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export function AppDropdown<T = string>({
  value,
  options,
  onChange,
  label,
  placeholder = 'Select option...',
  searchable = false,
  disabled = false,
  className = '',
  menuClassName = '',
  buttonClassName = '',
  align = 'left',
  size = 'md'
}: AppDropdownProps<T>) {
  const { currentCompany } = useApp();
  const palette = getThemePalette(currentCompany?.themeColor || 'indigo');
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchQuery.trim()
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs rounded-lg',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-xl',
    lg: 'px-4 py-2.5 text-sm font-semibold rounded-xl'
  };

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button styled with App Dropdown Theme */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          sizeClasses[size]
        } ${buttonClassName}`}
        style={isOpen ? { borderColor: palette.hex, boxShadow: `0 0 0 2px ${palette.ringHex}` } : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.colorDot && (
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
              style={{ backgroundColor: selectedOption.colorDot }}
            />
          )}
          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span 
              className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase"
              style={{ backgroundColor: palette.lightHex, color: palette.textHex }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown 
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
          }`} 
        />
      </button>

      {/* App Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`absolute mt-1.5 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
          style={{ boxShadow: `0 10px 25px -5px ${palette.ringHex}, 0 8px 10px -6px rgba(0,0,0,0.1)` }}
          role="listbox"
        >
          {/* Optional Search Bar inside App Dropdown */}
          {searchable && (
            <div className="p-1 mb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-xs text-center text-slate-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                const Icon = option.icon;

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs'
                        : option.disabled
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                    style={isSelected ? { 
                      backgroundColor: palette.lightHex, 
                      color: palette.textHex 
                    } : undefined}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.colorDot && (
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: option.colorDot }}
                        />
                      )}
                      {Icon && <Icon className="w-4 h-4 shrink-0 opacity-70" />}
                      <div className="truncate">
                        <div className="truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check 
                          className="w-4 h-4 stroke-[2.5]" 
                          style={{ color: palette.hex }}
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
