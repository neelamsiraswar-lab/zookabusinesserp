import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ModalWrapper } from './Portal';
import { 
  Search, 
  X, 
  FileText, 
  Users, 
  Package, 
  Truck, 
  ArrowRight,
  TrendingUp,
  Tag,
  Landmark
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (id: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectInvoice
}) => {
  const { invoices, products, parties, purchaseBills, cheques, setActiveTab } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const filteredInvoices = cleanQuery
    ? invoices.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(cleanQuery) ||
          i.customerName.toLowerCase().includes(cleanQuery) ||
          (i.customerGstin && i.customerGstin.toLowerCase().includes(cleanQuery))
      ).slice(0, 5)
    : invoices.slice(0, 4);

  const filteredProducts = cleanQuery
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.sku.toLowerCase().includes(cleanQuery) ||
          p.hsnCode.includes(cleanQuery) ||
          p.category.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : products.slice(0, 3);

  const filteredParties = cleanQuery
    ? parties.filter(
        p =>
          p.name.toLowerCase().includes(cleanQuery) ||
          (p.gstin && p.gstin.toLowerCase().includes(cleanQuery)) ||
          p.phone.includes(cleanQuery) ||
          p.city.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : parties.slice(0, 3);

  const filteredCheques = cleanQuery
    ? cheques.filter(
        c =>
          c.chequeNumber.toLowerCase().includes(cleanQuery) ||
          c.payeeName.toLowerCase().includes(cleanQuery) ||
          c.bankName.toLowerCase().includes(cleanQuery)
      ).slice(0, 4)
    : cheques.slice(0, 2);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} zIndex={9999}>
      <div 
        className="w-full max-w-[96vw] sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[min(88vh,88dvh)] sm:max-h-[min(80vh,80dvh)] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 gap-2.5 sm:gap-3 bg-slate-50/50 dark:bg-slate-850 shrink-0">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search invoices by #, parties, products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto modal-content-scroll p-3.5 sm:p-4 space-y-4 sm:space-y-5 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Invoices Section */}
          {filteredInvoices.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 dark:text-slate-500 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Invoices & Sales
                </span>
                <span>{filteredInvoices.length} results</span>
              </div>
              <div className="space-y-1">
                {filteredInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      onSelectInvoice(inv.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] border border-indigo-200 dark:border-indigo-800">
                        INV
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{inv.invoiceNumber}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-normal">• {inv.customerName}</span>
                          {inv.isEinvoiceGenerated && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                              IRN Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{inv.invoiceDate}</span>
                          <span>•</span>
                          <span>POS: {inv.placeOfSupplyState}</span>
                          {inv.customerGstin && <span>• GSTIN: {inv.customerGstin}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">{formatINR(inv.grandTotal)}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        inv.status === 'PAID' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products & Inventory Section */}
          {filteredProducts.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 dark:text-slate-500 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Inventory & Products
                </span>
                <span>{filteredProducts.length} items</span>
              </div>
              <div className="space-y-1">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setActiveTab('inventory');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-blue-950/40 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px] border border-blue-200 dark:border-blue-800">
                        {prod.unit || 'PCS'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{prod.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">HSN: {prod.hsnCode}</span>
                          <span>•</span>
                          <span>Category: {prod.category}</span>
                          <span>•</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{prod.gstRate}% GST</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">{formatINR(prod.sellingPrice)}</div>
                      <div className={`text-[11px] font-semibold ${prod.currentStock <= prod.minStockAlert ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {prod.isService ? 'Service' : `${prod.currentStock} in Stock`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parties Section */}
          {filteredParties.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 dark:text-slate-500 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-500" />
                  Parties & Clients
                </span>
                <span>{filteredParties.length} found</span>
              </div>
              <div className="space-y-1">
                {filteredParties.map(party => (
                  <div
                    key={party.id}
                    onClick={() => {
                      setActiveTab('parties');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-cyan-950/40 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 font-bold flex items-center justify-center text-[10px] border border-cyan-200 dark:border-cyan-800">
                        {party.type === 'VENDOR' ? 'VEN' : 'CUST'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{party.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          {party.gstin ? (
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">GSTIN: {party.gstin}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Unregistered Consumer</span>
                          )}
                          <span>•</span>
                          <span>{party.city}, {party.state}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${party.currentBalance > 0 ? 'text-amber-700 dark:text-amber-400' : party.currentBalance < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {formatINR(Math.abs(party.currentBalance))}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {party.currentBalance > 0 ? 'Receivable' : party.currentBalance < 0 ? 'Payable' : 'Settled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cheques Section */}
          {filteredCheques.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 dark:text-slate-500 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  Cheques & Banking
                </span>
                <span>{filteredCheques.length} items</span>
              </div>
              <div className="space-y-1">
                {filteredCheques.map(chq => (
                  <div
                    key={chq.id}
                    onClick={() => {
                      setActiveTab('cheques');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-blue-950/40 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center text-[10px] border border-blue-200 dark:border-blue-800">
                        CHQ
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>#{chq.chequeNumber}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-normal">• {chq.payeeName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{chq.bankName}</span>
                          <span>•</span>
                          <span>{chq.chequeDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatINR(chq.amount)}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {chq.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredInvoices.length === 0 && filteredProducts.length === 0 && filteredParties.length === 0 && filteredCheques.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try searching with a GSTIN number, HSN code, or invoice number.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>Navigation: Click to view details</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <span>Press</span>
            <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-slate-600 dark:text-slate-300">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
