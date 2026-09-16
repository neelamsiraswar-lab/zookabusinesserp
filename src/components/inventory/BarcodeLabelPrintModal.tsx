import React, { useState, useRef } from 'react';
import { Product, BusinessProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { DesktopModal } from '../common/DesktopModal';
import { Printer, Tag } from 'lucide-react';

interface BarcodeLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  business: BusinessProfile;
}

export const BarcodeLabelPrintModal: React.FC<BarcodeLabelPrintModalProps> = ({
  isOpen,
  onClose,
  product,
  business,
}) => {
  const [labelCopies, setLabelCopies] = useState<number>(12);
  const [includeBusinessName, setIncludeBusinessName] = useState<boolean>(true);
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [includeHsn, setIncludeHsn] = useState<boolean>(true);
  const [labelFormat, setLabelFormat] = useState<'A4_24' | 'A4_40' | 'THERMAL_SINGLE'>('A4_24');

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeValue = product.barcode || product.sku;

  return (
    <DesktopModal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      allowMaximize={true}
      title="Print Product Barcode Labels"
      subtitle={`${product.name} (${barcodeValue})`}
      icon={<Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      iconBgColor="bg-indigo-50 dark:bg-indigo-950/70"
      bodyClassName="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50 dark:bg-slate-900/50"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print {labelCopies} Barcode Labels</span>
          </button>
        </div>
      }
    >
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sheet Format</label>
              <select
                value={labelFormat}
                onChange={(e) => setLabelFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
              >
                <option value="A4_24">A4 Sheet - 24 Labels (3 x 8)</option>
                <option value="A4_40">A4 Sheet - 40 Labels (4 x 10)</option>
                <option value="THERMAL_SINGLE">Single Label (50 x 25 mm Thermal)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Number of Copies</label>
              <input
                type="number"
                min="1"
                max="100"
                value={labelCopies}
                onChange={(e) => setLabelCopies(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Label Content</label>
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={includeBusinessName}
                    onChange={(e) => setIncludeBusinessName(e.target.checked)}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>Business Brand Name</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={includePrice}
                    onChange={(e) => setIncludePrice(e.target.checked)}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>Selling Price (MRP)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Printable Sheet Preview */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span>Print Preview</span>
              <span className="text-[11px] text-indigo-600 font-normal">{labelCopies} labels generated</span>
            </div>

            <div 
              ref={printAreaRef}
              className="p-4 bg-white rounded-2xl border border-slate-300 shadow-sm max-h-96 overflow-y-auto"
            >
              <div className={`grid gap-2 ${
                labelFormat === 'THERMAL_SINGLE' 
                  ? 'grid-cols-1 max-w-[240px] mx-auto' 
                  : labelFormat === 'A4_40' 
                  ? 'grid-cols-2 sm:grid-cols-4' 
                  : 'grid-cols-1 sm:grid-cols-3'
              }`}>
                {Array.from({ length: labelCopies }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-slate-300 rounded-lg bg-white flex flex-col items-center justify-center text-center shadow-2xs"
                  >
                    {includeBusinessName && (
                      <span className="text-[9px] font-bold uppercase text-slate-700 truncate max-w-full">
                        {business.tradeName || business.name}
                      </span>
                    )}

                    <div className="text-[10px] font-bold text-slate-900 truncate max-w-full my-0.5">
                      {product.name}
                    </div>

                    <div className="my-1">
                      <BarcodeSvg value={barcodeValue} height={28} showText={true} />
                    </div>

                    <div className="flex items-center justify-between w-full text-[9px] font-semibold text-slate-700 border-t border-slate-200 pt-0.5 mt-0.5">
                      {includeHsn && <span>HSN: {product.hsnCode}</span>}
                      {includePrice && (
                        <span className="font-bold text-slate-900">
                          MRP: {formatCurrency(product.sellingPrice, business.currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
    </DesktopModal>
  );
};
