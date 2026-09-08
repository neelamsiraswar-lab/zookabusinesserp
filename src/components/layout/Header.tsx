import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserPersonaSwitcher } from '../auth/UserPersonaSwitcher';
import { CloudSyncStatusBadge } from '../common/CloudSyncStatusBadge';
import { 
  Building2, 
  Search, 
  Plus, 
  Bell, 
  ArrowUpRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  CreditCard,
  Receipt,
  Sun,
  Moon
} from 'lucide-react';
import { isProductLowStock, normalizeLowStockSettings } from '../../utils/stockUtils';
import { normalizeHeaderConfig } from '../../utils/headerDefaults';
import { getChequeReminderMetrics } from '../../utils/chequeReminders';
import { formatINR } from '../../utils/formatters';
import { HeaderDensity, HeaderStyle } from '../../types';
import { getAccentBg, getAccentText } from '../../utils/themeColors';
import { AppThemeDropdown } from '../common/AppThemeDropdown';

interface HeaderProps {
  onOpenNewInvoice: () => void;
  onOpenQuickSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewInvoice, onOpenQuickSearch }) => {
  const { 
    business, 
    currentCompany, 
    setActiveTab, 
    invoices, 
    products, 
    cheques,
    can,
    theme,
    resolvedTheme,
    toggleTheme,
    isSidebarCollapsed,
    toggleSidebarCollapse
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && !!document.fullscreenElement;
  });

  // Track browser full screen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request issue:', err);
    }
  };

  // Get active customized header configuration
  const config = normalizeHeaderConfig(business.headerConfig || currentCompany?.headerConfig);

  if (config.enabled === false) {
    return null;
  }

  // Compute live alerts (e.g. low stock, unpaid overdue invoices, cheque reminders)
  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);
  const lowStockItems = stockSettings.enabled && stockSettings.showLowStockBadge
    ? products.filter(p => isProductLowStock(p, stockSettings))
    : [];
  const overdueInvoices = invoices.filter(i => i.status === 'UNPAID' && new Date(i.dueDate) < new Date());
  
  const chequeMetrics = getChequeReminderMetrics(cheques || []);
  const totalChequeAlerts = chequeMetrics.dueToday.length + chequeMetrics.recentlyBounced.length;
  const totalAlertsCount = lowStockItems.length + overdueInvoices.length + totalChequeAlerts;


  // Density Height
  const getDensityClasses = (density: HeaderDensity) => {
    switch (density) {
      case 'COMPACT': return 'min-h-[52px] py-1 px-2.5 sm:px-4';
      case 'SPACIOUS': return 'min-h-[76px] py-3 px-4 sm:px-8';
      default: return 'min-h-[64px] py-2 px-3 sm:px-6'; // COMFORTABLE
    }
  };

  // Header Style Class
  const getHeaderStyleClasses = (style: HeaderStyle) => {
    switch (style) {
      case 'SOLID':
        return 'bg-white dark:bg-slate-900';
      case 'BORDERED':
        return 'bg-slate-50 dark:bg-slate-950 border-b-2 border-slate-300 dark:border-slate-700';
      case 'FLOATING':
        return 'bg-white/95 dark:bg-slate-900/95 mx-2 sm:mx-4 my-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md';
      case 'MINIMAL':
        return 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm';
      default: // GLASS
        return 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md';
    }
  };

  // Shadow Class
  const getShadowClass = (shadow: string) => {
    switch (shadow) {
      case 'xs': return 'shadow-xs';
      case 'sm': return 'shadow-sm';
      case 'md': return 'shadow-md';
      case 'lg': return 'shadow-lg';
      default: return '';
    }
  };

  // Branding dynamic values
  const activeCompName = config.customTitle || currentCompany?.tradeName || currentCompany?.name || business.tradeName || business.name;
  const activeLegalName = currentCompany?.name || business.name;
  const activeGstin = currentCompany?.gstin || business.gstin;
  const activeState = currentCompany?.state || business.state;
  const activeCity = currentCompany?.city || business.city;
  const activeFy = currentCompany?.financialYear || '2026-2027';

  return (
    <header className={`w-full ${config.sticky !== false ? 'sticky top-0' : 'relative'} z-30 flex items-center justify-between transition-all duration-200 ${
      getDensityClasses(config.density)
    } ${
      getHeaderStyleClasses(config.style)
    } ${
      config.showBorderBottom && config.style !== 'BORDERED' && config.style !== 'FLOATING'
        ? 'border-b border-slate-200 dark:border-slate-800'
        : ''
    } ${
      getShadowClass(config.shadow)
    }`}>
      {/* Left: Collapsible Sidebar Trigger & Company Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        {/* Desktop Collapsible Sidebar Icon Toggle */}
        {config.showSidebarToggle !== false && (
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title={isSidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            aria-label="Toggle Sidebar"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Company Logo / Icon */}
        {config.showLogo !== false && (
          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${
            config.logoShape === 'circle' ? 'rounded-full' : config.logoShape === 'square' ? 'rounded-md' : 'rounded-xl'
          } ${getAccentBg(config.customAccentColor)} flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 ring-1 ring-black/5 dark:ring-white/10`}>
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}

        {/* Branding & Subtitle Details */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {config.showTradeName !== false && (
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[190px] md:max-w-[260px]">
                {activeCompName}
              </h2>
            )}

            {config.showLegalName && activeLegalName && activeLegalName !== activeCompName && (
              <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate max-w-[140px]">
                ({activeLegalName})
              </span>
            )}

            {config.showStateBadge && (
              <span className="hidden sm:inline-flex text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                State: {activeGstin ? activeGstin.substring(0, 2) : '27'}
              </span>
            )}

            {config.showFinancialYear && (
              <span className="hidden md:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                FY {activeFy}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono truncate">
            {config.showGstin !== false && (
              <span className={`font-semibold truncate ${getAccentText(config.customAccentColor)}`}>
                GSTIN: {activeGstin}
              </span>
            )}
            {config.showGstin !== false && config.showLocation && (
              <span className="hidden md:inline opacity-40 text-slate-400">•</span>
            )}
            {config.showLocation && (
              <span className="hidden md:inline text-slate-500 dark:text-slate-400 truncate">
                {activeCity ? `${activeCity}, ` : ''}{activeState}
              </span>
            )}
            {config.customSubtitle && (
              <>
                <span className="hidden md:inline opacity-40 text-slate-400">•</span>
                <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 truncate">{config.customSubtitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Universal Quick Search (Responsive: Phone Search Button, Tablet/Desktop Search Bar) */}
      {config.showSearch !== false && (
        <div className={`mx-2 sm:mx-3 hidden md:block ${
          config.searchStyle === 'EXPANDED' ? 'flex-1 max-w-lg' :
          config.searchStyle === 'MINIMAL' ? 'w-48 sm:w-56' :
          'flex-1 max-w-md'
        }`}>
          <button
            onClick={onOpenQuickSearch}
            className={`w-full flex items-center justify-between px-3.5 py-1.5 sm:py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all shadow-inner cursor-pointer ${
              config.searchStyle === 'PILL' ? 'rounded-full' : 'rounded-xl'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">{config.searchPlaceholder || 'Search invoices, inventory, parties... (⌘K)'}</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 shadow-sm shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Right: Actions, Quick POS, Fullscreen Icon, Persona & Notifications */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
        {/* Mobile Search Icon Trigger when hidden on small screens */}
        {config.showSearch !== false && (
          <button
            onClick={onOpenQuickSearch}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 transition-colors cursor-pointer"
            title="Search (⌘K)"
            aria-label="Quick Search"
          >
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        )}

        {/* Cloud Sync Status Badge & Live Refresh Trigger */}
        {config.showCloudSyncBadge !== false && (
          <CloudSyncStatusBadge compact />
        )}

        {/* Quick POS Mobile / Counter Billing Button */}
        {config.showQuickPosBtn && (
          <button
            onClick={() => setActiveTab('pos_billing')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Open High Speed POS Counter Billing"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">{config.quickPosBtnText || 'Quick POS'}</span>
          </button>
        )}

        {/* Quick Receive Payment Shortcut */}
        {config.showQuickPaymentBtn && can('payments', 'create') && (
          <button
            onClick={() => setActiveTab('payments')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Receive Customer Payment"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Receive ₹</span>
          </button>
        )}

        {/* Quick Expense Shortcut */}
        {config.showQuickExpenseBtn && can('purchases', 'create') && (
          <button
            onClick={() => setActiveTab('purchases')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Record Business Purchase / Expense"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">Add Expense</span>
          </button>
        )}

        {/* Create GST Tax Invoice CTA */}
        {config.showNewInvoiceBtn !== false && can('invoices', 'create') && (
          <button
            onClick={onOpenNewInvoice}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 md:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all cursor-pointer ${getAccentBg(config.customAccentColor)}`}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{config.newInvoiceBtnText || 'New Invoice'}</span>
            <span className="sm:hidden">New</span>
          </button>
        )}

        {/* App Theme Dropdown in Header */}
        {config.showThemeToggle !== false && (
          <AppThemeDropdown compact align="right" />
        )}

        {/* Fullscreen App Icon in Header */}
        {config.showFullScreenBtn !== false && (
          <button
            onClick={toggleFullScreen}
            className={`flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              isFullscreen
                ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60'
            }`}
            title={isFullscreen ? 'Exit Full Screen mode (F11 / Esc)' : 'Enter Full Screen app mode (F11)'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        )}

        {/* User Role Persona Switcher */}
        {config.showUserPersona !== false && (
          <UserPersonaSwitcher />
        )}

        {/* Notifications Dropdown */}
        {config.showNotificationBell !== false && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              {totalAlertsCount > 0 && (
                <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Compliance & Business Alerts</h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                    {totalAlertsCount} pending
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {lowStockItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
                      <div className="font-semibold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1">
                        <span>⚠️ Low Stock Alert ({lowStockItems.length} items)</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-300">
                        {lowStockItems.map(i => `${i.name} (${i.currentStock} left)`).slice(0, 2).join(', ')}
                        {lowStockItems.length > 2 ? ` and ${lowStockItems.length - 2} more` : ''}
                      </p>
                      <button
                        onClick={() => { setActiveTab('inventory'); setShowNotifications(false); }}
                        className="mt-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center"
                      >
                        Restock items <ArrowUpRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  )}

                  {/* Cheques Due Today Alert */}
                  {chequeMetrics.dueToday.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs">
                      <div className="font-semibold text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-1">
                        <span>🏦 Cheques Due Today ({chequeMetrics.dueToday.length})</span>
                      </div>
                      <p className="text-blue-800 dark:text-blue-300">
                        {chequeMetrics.dueToday[0]?.payeeName} (#{chequeMetrics.dueToday[0]?.chequeNumber}) - {formatINR(chequeMetrics.dueToday[0]?.amount)}
                        {chequeMetrics.dueToday.length > 1 ? ` and ${chequeMetrics.dueToday.length - 1} other(s)` : ''}
                      </p>
                      <button
                        onClick={() => { setActiveTab('cheques' as any); setShowNotifications(false); }}
                        className="mt-1.5 text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center"
                      >
                        Process cheques <ArrowUpRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  )}

                  {/* Bounced Cheques Alert */}
                  {chequeMetrics.recentlyBounced.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs">
                      <div className="font-semibold text-rose-900 dark:text-rose-200 mb-1 flex items-center gap-1">
                        <span>🚨 Cheque Dishonoured / Bounced ({chequeMetrics.recentlyBounced.length})</span>
                      </div>
                      <p className="text-rose-800 dark:text-rose-300">
                        Cheque #{chequeMetrics.recentlyBounced[0]?.chequeNumber} for {chequeMetrics.recentlyBounced[0]?.payeeName} ({chequeMetrics.recentlyBounced[0]?.bouncedReason || 'Unpaid'})
                      </p>
                      <button
                        onClick={() => { setActiveTab('cheques' as any); setShowNotifications(false); }}
                        className="mt-1.5 text-rose-600 dark:text-rose-400 font-semibold hover:underline inline-flex items-center"
                      >
                        Review bounced cheques <ArrowUpRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  )}

                  {overdueInvoices.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs">
                      <div className="font-semibold text-rose-900 dark:text-rose-200 mb-1">
                        🚨 Overdue Receivables ({overdueInvoices.length})
                      </div>
                      <p className="text-rose-800 dark:text-rose-300">
                        Payment pending past due date for {overdueInvoices[0]?.customerName}
                      </p>
                      <button
                        onClick={() => { setActiveTab('invoices'); setShowNotifications(false); }}
                        className="mt-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center"
                      >
                        View invoices <ArrowUpRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  )}

                  {totalAlertsCount === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      🎉 All tax filings, stock thresholds & payments are in good shape!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
