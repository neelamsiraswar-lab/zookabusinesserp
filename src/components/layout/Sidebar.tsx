import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { ROLE_DEFINITIONS } from '../../utils/rbacRules';
import { getThemePalette } from '../../utils/themeColors';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  BookOpenCheck, 
  Calculator, 
  Settings, 
  Receipt,
  Landmark,
  ShieldCheck, 
  Lock, 
  UserCheck, 
  LogOut, 
  Sun, 
  Moon, 
  Crown,
  Maximize,
  Minimize,
  ChevronRight,
  ChevronLeft,
  FileSignature
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';

interface SidebarItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  description: string;
}

interface NavigationSection {
  title?: string;
  items: SidebarItem[];
}

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    products, 
    business,
    currentCompany,
    currentUser, 
    can, 
    lockSession, 
    openAuthModal, 
    logout,
    theme,
    resolvedTheme,
    toggleTheme,
    isSidebarCollapsed,
    platformConfig
  } = useApp();

  const palette = getThemePalette(currentCompany?.themeColor || 'indigo');

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && !!document.fullscreenElement;
  });

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
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const stockSettings = business?.lowStockSettings;
  const isBadgeEnabled = stockSettings?.enabled !== false && stockSettings?.showLowStockBadge !== false;
  const defaultThresh = stockSettings?.defaultThreshold ?? 5;
  const lowStockCount = isBadgeEnabled
    ? products.filter(p => !p.isService && p.currentStock <= (p.minStockAlert > 0 ? p.minStockAlert : defaultThresh)).length
    : 0;

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // Grouped Navigation Sections for Optimal Spatial Rhythm & Categorical Clarity
  const navigationSections: NavigationSection[] = [
    {
      title: 'General',
      items: [
        ...(isSuperAdmin ? [{
          id: 'super_admin_dashboard' as ActiveTab,
          label: 'Super Admin Portal',
          icon: Crown,
          badge: 'Master',
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
          description: 'Master Platform Governance & Multi-Company Admin'
        }] : []),
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          description: 'Overview, KPIs & real-time financial metrics'
        }
      ]
    },
    {
      title: 'Sales & Billing',
      items: [
        {
          id: 'invoices',
          label: 'Invoices & Billing',
          icon: FileText,
          description: 'Tax Invoices, Estimates, Credit & Debit Notes'
        },
        {
          id: 'pos_billing',
          label: 'POS Counter Billing',
          icon: ShoppingCart,
          badge: 'Fast POS',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          description: 'Instant barcode counter retail billing'
        },
        {
          id: 'payments',
          label: 'Payments & Receipts',
          icon: Receipt,
          badge: 'In / Out',
          badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
          description: 'Customer receipts, vendor payments & contra'
        },
        {
          id: 'cheques',
          label: 'Cheque Printing',
          icon: Landmark,
          badge: 'CTS-2010',
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
          description: 'Cheque writing, bank layout config & register'
        },
        {
          id: 'letterhead',
          label: 'Letterhead & Docs',
          icon: FileSignature,
          badge: 'Editor',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          description: 'Custom letterheads, rich text editor & document generator'
        }
      ]
    },
    {
      title: 'Operations & Stock',
      items: [
        {
          id: 'inventory',
          label: 'Inventory & Stock',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          description: 'Product catalog, HSN codes, batches & stock levels'
        },
        {
          id: 'purchases',
          label: 'Purchases & Expenses',
          icon: Truck,
          description: 'Supplier purchase bills, inward ITC & expenses'
        },
        {
          id: 'parties',
          label: 'Customers & Vendors',
          icon: Users,
          description: 'Party ledgers, GSTIN records & balance tracking'
        }
      ]
    },
    {
      title: 'Finance & Compliance',
      items: [
        {
          id: 'accounting',
          label: 'Accounting & Reports',
          icon: BookOpenCheck,
          description: 'General Ledger, Trial Balance, P&L & Balance Sheet'
        },
        {
          id: 'gst_returns',
          label: 'GST & Tax Registers',
          icon: Calculator,
          badge: 'GSTR-1/3B',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          description: 'Sales, Purchase, HSN registers & tax reconciliation'
        }
      ]
    },
    {
      title: 'Administration',
      items: [
        {
          id: 'users',
          label: 'Users & Permissions',
          icon: ShieldCheck,
          badge: 'RBAC',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
          description: 'Role-based access control, users & audit logs'
        },
        {
          id: 'settings',
          label: 'Company & Settings',
          icon: Settings,
          description: 'Business profile, bank accounts & invoice templates'
        }
      ]
    }
  ];

  const currentRoleMeta = ROLE_DEFINITIONS[currentUser.role] || ROLE_DEFINITIONS.CUSTOM;

  return (
    <aside 
      className={`hidden lg:flex flex-col ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } bg-slate-900 text-slate-300 h-screen sticky top-0 border-r border-slate-800 select-none transition-all duration-300 ease-in-out z-20 shrink-0`}
    >
      {/* Brand Header */}
      <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center py-4 px-2' : 'justify-start px-4 py-4'} border-b border-slate-800/80 transition-all duration-200`}>
        {!isSidebarCollapsed ? (
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
            title={`${platformConfig?.appName || 'Zooka Business'} - Go to Dashboard`}
          >
            <AppLogo 
              config={platformConfig} 
              size="md" 
              className="group-hover:scale-105 transition-transform shrink-0" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                  {platformConfig?.appName || 'Zooka Business'}
                </span>
                {platformConfig?.brandBadgeText && (
                  <span className="text-[9px] uppercase font-extrabold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">
                    {platformConfig.brandBadgeText}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium truncate">
                {platformConfig?.appTagline || 'GST & E-Invoicing Suite'}
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center justify-center cursor-pointer group"
            title={`${platformConfig?.appName || 'Zooka Business'} - Dashboard`}
          >
            <AppLogo 
              config={platformConfig} 
              size="md" 
              className="group-hover:scale-105 transition-transform" 
            />
          </button>
        )}
      </div>

      {/* Navigation List with Uncluttered Categorical Groupings */}
      <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2 py-3 space-y-3' : 'px-3 py-3 space-y-4'} overflow-y-auto overflow-x-hidden scrollbar-none`}>
        {navigationSections.map((section, secIdx) => {
          if (!section.items || section.items.length === 0) return null;

          return (
            <div key={section.title || secIdx} className="space-y-1">
              {/* Section Header or Divider */}
              {!isSidebarCollapsed ? (
                <div className="px-3 pt-1 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </span>
                  {secIdx === 0 && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${currentRoleMeta.badgeBg} ${currentRoleMeta.badgeText}`}>
                      {currentUser.role}
                    </span>
                  )}
                </div>
              ) : secIdx > 0 ? (
                <div className="w-8 mx-auto border-t border-slate-800/80 my-2" />
              ) : null}

              {/* Section Nav Items */}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const hasAccess = item.id === 'super_admin_dashboard' ? true : item.id === 'users' ? true : can(item.id as any, 'view');
                  const isLowStockBadge = item.id === 'inventory' && lowStockCount > 0;

                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => {
                          setActiveTab(item.id);
                        }}
                        className={`relative w-full flex items-center transition-all cursor-pointer ${
                          isSidebarCollapsed 
                            ? 'justify-center p-2.5 rounded-xl h-10' 
                            : 'justify-between px-3 py-2 rounded-xl text-xs font-medium'
                        } ${
                          isActive
                            ? 'text-white'
                            : hasAccess
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 opacity-70'
                        }`}
                        aria-label={item.label}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeSidebarIndicator"
                            className={`absolute inset-0 ${palette.gradientClass} rounded-xl shadow-md z-0`}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}

                        <div className={`relative z-10 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                          <div className="relative shrink-0">
                            <Icon
                              className={`w-4 h-4 transition-colors ${
                                isActive ? 'text-white' : hasAccess ? 'text-slate-400 group-hover:text-cyan-400' : 'text-slate-600'
                              }`}
                            />
                            {isSidebarCollapsed && isLowStockBadge && (
                              <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-amber-500 text-slate-900 rounded-full font-bold text-[9px] flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                                !
                              </span>
                            )}
                            {isSidebarCollapsed && item.id === 'super_admin_dashboard' && (
                              <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-purple-400 rounded-full ring-1 ring-slate-900" />
                            )}
                          </div>

                          {!isSidebarCollapsed && (
                            <span className="font-medium text-left truncate tracking-tight">{item.label}</span>
                          )}
                        </div>

                        {!isSidebarCollapsed && (
                          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                            {!hasAccess && (
                              <span className="p-1 rounded bg-slate-800 text-slate-500 group-hover:text-amber-400" title="Restricted by role">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}

                            {item.badge && (
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                                  isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-700 text-slate-200'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Floating Tooltip in Collapsed Mode */}
                      {isSidebarCollapsed && (
                        <div className="fixed left-[76px] ml-2 px-3 py-2 bg-slate-900/98 backdrop-blur border border-slate-700/90 text-white rounded-xl shadow-2xl z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap min-w-[140px] text-xs">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${item.badgeColor || 'bg-indigo-500/30 text-indigo-300'}`}>
                                {item.badge}
                              </span>
                            )}
                            {!hasAccess && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {!hasAccess ? `Requires role permission` : item.description}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Current Active Persona & Bottom Utilities */}
      {!isSidebarCollapsed ? (
        <div className="p-3 m-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-xl ${currentUser.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                {currentUser.avatarText}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs truncate leading-none">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">
                  {currentRoleMeta.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleFullScreen()}
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Full Screen (F11)' : 'Enter Full Screen (F11)'}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Maximize className="w-3.5 h-3.5 text-slate-300" />
                )}
              </button>
              <button
                onClick={() => toggleTheme()}
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title={`Toggle Theme (Current: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-300" />
                )}
              </button>
              <button
                onClick={() => lockSession()}
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Lock Screen"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                title={currentUser.role === 'SUPER_ADMIN' ? 'Close Super Admin Session & Log Out' : 'Log Out to Login Screen'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => openAuthModal()}
              className="py-1 px-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Login or Switch User Account"
            >
              <UserCheck className="w-3 h-3 text-indigo-400" />
              <span>Switch Role</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className="py-1 px-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Manage Roles & Team"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Permissions</span>
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Profile Widget */
        <div className="p-2 mb-3 mx-2 flex flex-col items-center gap-2 border-t border-slate-800/80 pt-3 shrink-0">
          <div className="relative group">
            <button
              onClick={() => openAuthModal()}
              className={`w-9 h-9 rounded-xl ${currentUser.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer`}
              aria-label="User Profile"
            >
              {currentUser.avatarText}
            </button>
            <div className="fixed left-[76px] ml-2 px-3 py-2 bg-slate-900/95 backdrop-blur border border-slate-700/90 text-white rounded-xl shadow-2xl z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap min-w-[130px] text-xs">
              <div className="font-bold">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400">{currentRoleMeta.name}</div>
              <div className="text-[9px] text-indigo-400 mt-1 font-semibold">Click to switch persona</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => toggleFullScreen()}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen (F11)' : 'Enter Full Screen (F11)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-cyan-400" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => toggleTheme()}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
              title={`Toggle Theme (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => lockSession()}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Lock Screen"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
