import React from 'react';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Receipt,
  Building2,
  Calendar,
  Package,
  ChevronDown,
  Edit3,
  Printer,
  FileText,
  DollarSign,
  Send,
  Trash2,
  Boxes
} from 'lucide-react';

interface InvoiceCardGridProps {
  invoices: Invoice[];
  expandedInvoiceIds: Record<string, boolean>;
  toggleExpandInvoice: (id: string, e?: React.MouseEvent) => void;
  onSelectInvoiceForPrint: (id: string) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onOpenPayment: (invoice: Invoice) => void;
  onShareInvoice: (invoice: Invoice) => void;
  onOpenStatement: (partyId: string | null) => void;
  onDeleteInvoice: (id: string) => void;
  currencySymbol: string;
}

export const InvoiceCardGrid: React.FC<InvoiceCardGridProps> = ({
  invoices,
  expandedInvoiceIds,
  toggleExpandInvoice,
  onSelectInvoiceForPrint,
  onEditInvoice,
  onOpenPayment,
  onShareInvoice,
  onOpenStatement,
  onDeleteInvoice,
  currencySymbol
}) => {
  if (invoices.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
        No invoices match your search filter criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/30">
      {invoices.map((inv) => {
        const isPaid = inv.status === 'PAID';
        const hasPendingPayment = (inv.amountDue || 0) > 0;
        const totalItemsCount = inv.items?.length || 0;
        const totalUnitsCount = inv.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
        const isExpanded = !!expandedInvoiceIds[inv.id];

        return (
          <div
            key={inv.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all flex flex-col justify-between overflow-hidden group"
          >
            <div className="p-4 space-y-3.5">
              {/* Header: Invoice #, Type badge & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    onClick={() => onSelectInvoiceForPrint(inv.id)}
                    className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="truncate">{inv.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      {inv.invoiceType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(inv.invoiceDate)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      isPaid
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : inv.status === 'PARTIALLY_PAID'
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Due: {formatDate(inv.dueDate)}
                  </span>
                </div>
              </div>

              {/* Customer Box */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div className="font-semibold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{inv.customerName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap gap-1">
                  <span>{inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'Retail / Unregistered'}</span>
                  <span>POS: {inv.placeOfSupplyState || 'Local'} ({inv.placeOfSupplyStateCode})</span>
                </div>
              </div>

              {/* Items Snapshot */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-indigo-500" />
                    Items ({totalItemsCount})
                  </span>
                  <span>{totalUnitsCount} Units</span>
                </div>

                <div className="flex flex-col gap-1">
                  {inv.items && inv.items.slice(0, 2).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-100/70 dark:bg-slate-800/80 rounded-lg text-[11px] border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                        {item.quantity} {item.unit || 'PCS'}
                      </span>
                    </div>
                  ))}
                  {inv.items && inv.items.length > 2 && (
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold px-1 flex items-center gap-1">
                      <Boxes className="w-3 h-3" />
                      +{inv.items.length - 2} more products in invoice
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                <div className="text-xs space-y-0.5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Taxable: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(inv.subTotalTaxable, currencySymbol)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    GST: <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(inv.totalTax, currencySymbol)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                    Total
                  </span>
                  <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(inv.grandTotal, currencySymbol)}
                  </div>
                  {hasPendingPayment && (
                    <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      Due: {formatCurrency(inv.amountDue, currencySymbol)}
                    </div>
                  )}
                </div>
              </div>

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={(e) => toggleExpandInvoice(inv.id, e)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isExpanded
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50/50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{isExpanded ? 'Hide Tax Breakdown' : 'Tax & Statutory Breakdown'}</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60">
                  {isExpanded ? 'Collapse' : 'Breakdown'}
                </span>
              </button>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                      Line Items Detail
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {inv.items?.map((item, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5">
                          <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                            <span className="truncate">{item.name}</span>
                            <span className="font-mono">{formatCurrency(item.totalAmount, currencySymbol)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>HSN: {item.hsnCode || 'N/A'} • {item.quantity} {item.unit}</span>
                            <span>{item.gstRate}% GST ({formatCurrency((item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0), currencySymbol)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Place of Supply:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{inv.placeOfSupplyState} ({inv.placeOfSupplyStateCode})</span>
                    </div>
                    {!inv.isInterState ? (
                      <>
                        <div className="flex justify-between text-slate-500">
                          <span>CGST:</span>
                          <span>{formatCurrency(inv.totalCgst, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>SGST:</span>
                          <span>{formatCurrency(inv.totalSgst, currencySymbol)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-500">
                        <span>IGST:</span>
                        <span>{formatCurrency(inv.totalIgst, currencySymbol)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Total Tax:</span>
                      <span>{formatCurrency(inv.totalTax, currencySymbol)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card Action Footer Bar */}
            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectInvoiceForPrint(inv.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Print / View Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Print</span>
                </button>

                {onEditInvoice && (
                  <button
                    type="button"
                    onClick={() => onEditInvoice(inv)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                    title="Edit Invoice"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onShareInvoice(inv)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Share Invoice via WhatsApp / Email"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Dispatch</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                {hasPendingPayment && (
                  <button
                    type="button"
                    onClick={() => onOpenPayment(inv)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    title="Record Payment"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenStatement(inv.customerId || null)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Client Statement"
                >
                  <FileText className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteInvoice(inv.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Delete Invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
