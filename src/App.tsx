import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AnnouncementBanner } from './components/layout/AnnouncementBanner';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/common/ToastContainer';
import { QuickSearchModal } from './components/common/QuickSearchModal';

// Main Views
import { DashboardView } from './components/dashboard/DashboardView';
import { InvoiceListView } from './components/invoices/InvoiceListView';
import { InvoiceEditor } from './components/invoices/InvoiceEditor';
import { InvoicePrintView } from './components/invoices/InvoicePrintView';
import { PosBillingView } from './components/invoices/PosBillingView';
import { InventoryView } from './components/inventory/InventoryView';
import { PartiesView } from './components/parties/PartiesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { PaymentsView } from './components/payments/PaymentsView';
import { ChequePrintingView } from './components/cheques/ChequePrintingView';
import { LetterheadManagerView } from './components/letterhead/LetterheadManagerView';
import { AccountingView } from './components/accounting/AccountingView';
import { GstReturnsView } from './components/reports/GstReturnsView';
import { SettingsView } from './components/settings/SettingsView';
import { UsersAndRolesView } from './components/auth/UsersAndRolesView';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { SuperAdminPortal } from './components/admin/SuperAdminPortal';
import { AccessRestricted } from './components/auth/AccessRestricted';
import { UserAuthModal } from './components/auth/UserAuthModal';
import { LockScreenOverlay } from './components/auth/LockScreenOverlay';
import { LoginScreen } from './components/auth/LoginScreen';
import { SessionInactivityManager } from './components/auth/SessionInactivityManager';
import { JwtSessionModal } from './components/auth/JwtSessionModal';
import { Invoice, Product } from './types';
import { calculateItemGst } from './utils/gstCalculations';
import { OfflineIndicatorBanner } from './components/pwa/OfflineIndicatorBanner';
import { PwaUpdateToast } from './components/pwa/PwaUpdateToast';
import { Crown } from 'lucide-react';
import { ViewSkeleton } from './components/common/Skeleton';

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(2px)' },
  animate: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { 
      duration: 0.24, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    filter: 'blur(2px)',
    transition: { 
      duration: 0.16, 
      ease: [0.32, 0, 0.67, 0] 
    } 
  }
};

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    currentCompany,
    selectedInvoiceIdForPrint, 
    setSelectedInvoiceIdForPrint,
    can,
    currentUser,
    isAuthenticated,
    toggleSidebarCollapse,
    isJwtModalOpen,
    setIsJwtModalOpen,
    platformConfig
  } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState<Partial<Invoice> | undefined>(undefined);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isTabTransitioning, setIsTabTransitioning] = useState<boolean>(false);

  // Content Skeleton Shimmer on tab or company transition
  useEffect(() => {
    setIsTabTransitioning(true);
    const timer = setTimeout(() => {
      setIsTabTransitioning(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [activeTab, currentCompany?.id]);

  // Handle PWA Manifest Shortcuts & URL Actions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const tab = params.get('tab');

      if (action === 'new_invoice') {
        setIsEditorOpen(true);
      }
      if (tab) {
        // Clean URL after consuming
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K => Quick Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
      // Cmd/Ctrl + B => Toggle Collapsible Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleSidebarCollapse();
      }
      // Escape => close editor or modal
      if (e.key === 'Escape') {
        if (selectedInvoiceIdForPrint) {
          setSelectedInvoiceIdForPrint(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInvoiceIdForPrint, setSelectedInvoiceIdForPrint, toggleSidebarCollapse]);

  // Mandate Login Screen when user is not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  // Dedicated Separate Super Admin Dashboard
  if (currentUser.role === 'SUPER_ADMIN' && activeTab === 'super_admin_dashboard') {
    return (
      <>
        <SuperAdminPortal />
        <ToastContainer />
        <UserAuthModal />
        <JwtSessionModal 
          isOpen={isJwtModalOpen} 
          onClose={() => setIsJwtModalOpen(false)} 
        />
      </>
    );
  }

  const handleOpenNewInvoice = () => {
    setEditingInvoiceData(undefined);
    setIsEditorOpen(true);
  };

  const handleOpenNewInvoiceWithItem = (product: Product) => {
    const isInter = false;
    const calcs = calculateItemGst(product.sellingPrice, 1, 0, product.gstRate, isInter);
    setEditingInvoiceData({
      items: [
        {
          id: 'item-' + Date.now(),
          productId: product.id,
          name: product.name,
          hsnCode: product.hsnCode,
          quantity: 1,
          unit: product.unit,
          ...calcs
        }
      ]
    });
    setIsEditorOpen(true);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceData(inv);
    setIsEditorOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-6">
        {currentUser.role === 'SUPER_ADMIN' && (
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-purple-800/40 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-extrabold uppercase tracking-wider text-[10px]">
                Super Admin Inspection Mode
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                Active Workspace: <strong className="text-white">{currentCompany?.tradeName || currentCompany?.name}</strong>
              </span>
            </div>
            <button
              onClick={() => setActiveTab('super_admin_dashboard')}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Return to Super Admin Dashboard</span>
            </button>
          </div>
        )}
        <Header 
          onOpenNewInvoice={handleOpenNewInvoice}
          onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        />

        {/* Broadcast Announcement Banner under Header across all businesses */}
        <AnnouncementBanner
          announcement={platformConfig?.announcement}
          currentUser={currentUser}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          onOpenSuperAdminPortal={() => setActiveTab('super_admin_dashboard')}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            {/* If Print view is active, show the printable document overlay */}
            {selectedInvoiceIdForPrint ? (
              <motion.div
                key="print-view"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <InvoicePrintView
                  invoiceId={selectedInvoiceIdForPrint}
                  onBack={() => setSelectedInvoiceIdForPrint(null)}
                />
              </motion.div>
            ) : isEditorOpen ? (
              /* If creating / editing invoice */
              <motion.div
                key="editor-view"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <InvoiceEditor
                  initialData={editingInvoiceData}
                  onClose={() => setIsEditorOpen(false)}
                />
              </motion.div>
            ) : isTabTransitioning ? (
              /* High-Fidelity Content Skeleton Shimmer on Tab Transition */
              <motion.div
                key={`skeleton-${activeTab}`}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                <ViewSkeleton tab={activeTab} />
              </motion.div>
            ) : (
              /* Render Current View Tab with RBAC Protection */
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                {activeTab === 'dashboard' && (
                  <DashboardView 
                    onOpenNewInvoice={handleOpenNewInvoice}
                    onEditInvoice={handleEditInvoice}
                  />
                )}
                {activeTab === 'invoices' && (
                  can('invoices', 'view') ? (
                    <InvoiceListView
                      onOpenNewInvoice={handleOpenNewInvoice}
                      onEditInvoice={handleEditInvoice}
                    />
                  ) : (
                    <AccessRestricted moduleName="Invoices & Billing" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'payments' && (
                  can('payments', 'view') ? (
                    <PaymentsView />
                  ) : (
                    <AccessRestricted moduleName="Payments & Receipts" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'cheques' && (
                  can('payments', 'view') ? (
                    <ChequePrintingView />
                  ) : (
                    <AccessRestricted moduleName="Cheque Printing & Management" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'pos_billing' && (
                  can('pos_billing', 'view') ? (
                    <PosBillingView />
                  ) : (
                    <AccessRestricted moduleName="POS Counter Billing" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'inventory' && (
                  can('inventory', 'view') ? (
                    <InventoryView onOpenNewInvoiceWithItem={handleOpenNewInvoiceWithItem} />
                  ) : (
                    <AccessRestricted moduleName="Inventory & Stock" allowedRoles={['ADMIN', 'ACCOUNTANT', 'INVENTORY_MANAGER']} />
                  )
                )}
                {activeTab === 'parties' && (
                  (can('parties', 'viewCustomers') || can('parties', 'viewVendors')) ? (
                    <PartiesView />
                  ) : (
                    <AccessRestricted moduleName="Customers & Vendors Directory" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'INVENTORY_MANAGER']} />
                  )
                )}
                {activeTab === 'purchases' && (
                  can('purchases', 'view') ? (
                    <PurchasesView />
                  ) : (
                    <AccessRestricted moduleName="Purchases & Vendor Bills" allowedRoles={['ADMIN', 'ACCOUNTANT', 'INVENTORY_MANAGER']} />
                  )
                )}
                {activeTab === 'accounting' && (
                  can('accounting', 'viewJournals') ? (
                    <AccountingView />
                  ) : (
                    <AccessRestricted moduleName="Accounting & Financial Statements" allowedRoles={['ADMIN', 'ACCOUNTANT', 'AUDITOR']} />
                  )
                )}
                {activeTab === 'gst_returns' && (
                  can('gst_returns', 'view') ? (
                    <GstReturnsView />
                  ) : (
                    <AccessRestricted moduleName="GST Returns & Tax Registers" allowedRoles={['ADMIN', 'ACCOUNTANT', 'AUDITOR']} />
                  )
                )}
                {activeTab === 'letterhead' && (
                  can('invoices', 'view') ? (
                    <LetterheadManagerView />
                  ) : (
                    <AccessRestricted moduleName="Letterhead & Official Documents" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'users' && <UsersAndRolesView />}
                {activeTab === 'super_admin_dashboard' && (
                  currentUser.role === 'SUPER_ADMIN' ? (
                    <SuperAdminDashboard />
                  ) : (
                    <AccessRestricted moduleName="Super Admin Master Governance" allowedRoles={['SUPER_ADMIN']} />
                  )
                )}
                {activeTab === 'settings' && (
                  can('settings', 'view') ? (
                    <SettingsView />
                  ) : (
                    <AccessRestricted moduleName="Settings & Company Profile" allowedRoles={['ADMIN']} />
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Business & Platform Footer */}
        <Footer />
      </div>

      {/* Mobile Floating Bottom Bar */}
      <MobileNav />

      {/* Universal Quick Search Modal */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        onSelectInvoice={(id) => setSelectedInvoiceIdForPrint(id)}
      />

      {/* User Role Authentication / Login Modal */}
      <UserAuthModal />

      {/* Cryptographic JWT Session Modal & Claims Inspector */}
      <JwtSessionModal 
        isOpen={isJwtModalOpen} 
        onClose={() => setIsJwtModalOpen(false)} 
      />

      {/* Screen Lock Overlay */}
      <LockScreenOverlay />

      {/* Global Inactivity Idle Timeout Manager */}
      <SessionInactivityManager />

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* PWA Offline Mode & Update Notifications */}
      <OfflineIndicatorBanner />
      <PwaUpdateToast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
