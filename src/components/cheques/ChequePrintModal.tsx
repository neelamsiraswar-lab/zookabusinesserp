import React, { useState, useRef } from 'react';
import { ChequeRecord, ChequeTemplateConfig } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { 
  DEFAULT_CTS2010_TEMPLATE, 
  BANK_CHEQUE_PRESETS,
  splitAmountInWordsToLines, 
  extractDateDigits,
  formatChequeAmountWords
} from '../../utils/chequeConstants';
import { 
  Printer, 
  Download, 
  X, 
  Sliders, 
  Check, 
  Eye, 
  FileText, 
  RotateCcw,
  Sparkles,
  Maximize2
} from 'lucide-react';
import jsPDF from 'jspdf';

interface ChequePrintModalProps {
  isOpen: boolean;
  cheque: ChequeRecord | null;
  onClose: () => void;
  onMarkPrinted?: (id: string) => void;
  onOpenCalibration?: (cheque: ChequeRecord) => void;
}

export const ChequePrintModal: React.FC<ChequePrintModalProps> = ({
  isOpen,
  cheque,
  onClose,
  onMarkPrinted,
  onOpenCalibration
}) => {
  const { business, chequeTemplates, markChequeAsPrinted, showToast } = useApp();

  // Selected template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return cheque?.templateConfigId || DEFAULT_CTS2010_TEMPLATE.id;
  });

  // Printer fine-tuning offsets
  const [showOffsetControls, setShowOffsetControls] = useState<boolean>(false);
  const [leftOffsetMm, setLeftOffsetMm] = useState<number>(0);
  const [topOffsetMm, setTopOffsetMm] = useState<number>(0);
  const [showChequeBackground, setShowChequeBackground] = useState<boolean>(true); // Visual alignment guide
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [paperFeedMode, setPaperFeedMode] = useState<'CHEQUE_LEAF' | 'A4_TOP' | 'A4_CENTER'>('CHEQUE_LEAF');

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !cheque) return null;

  // Resolve template
  const allTemplates = [...BANK_CHEQUE_PRESETS, ...chequeTemplates.filter(t => !BANK_CHEQUE_PRESETS.some(bp => bp.id === t.id))];
  const activeTemplate = allTemplates.find(t => t.id === selectedTemplateId) || 
    allTemplates.find(t => t.bankPreset.toLowerCase() === (cheque.bankName || '').toLowerCase()) ||
    DEFAULT_CTS2010_TEMPLATE;

  // Formatting values
  const dateDigits = extractDateDigits(cheque.chequeDate);
  const formattedWords = cheque.amountInWords || formatChequeAmountWords(cheque.amount);
  const { line1, line2 } = splitAmountInWordsToLines(formattedWords, 48);
  const formattedFigures = `** ${formatINR(cheque.amount).replace('₹', '').trim()} /-`;
  const companyName = business.tradeName || business.name || 'Authorised Signatory';

  // Direct Browser Print
  const handleDirectPrint = () => {
    if (onMarkPrinted) {
      onMarkPrinted(cheque.id);
    } else {
      markChequeAsPrinted(cheque.id);
    }

    const printContent = printAreaRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    // Build print HTML document with exact mm scaling
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cheque Print - #${cheque.chequeNumber}</title>
          <style>
            @page {
              size: ${paperFeedMode === 'CHEQUE_LEAF' ? '203mm 93mm' : 'A4 portrait'};
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .cheque-container {
              position: relative;
              width: 203mm;
              height: 93mm;
              margin: ${paperFeedMode === 'A4_TOP' ? '15mm auto' : paperFeedMode === 'A4_CENTER' ? '90mm auto' : '0 auto'};
              box-sizing: border-box;
              overflow: hidden;
              page-break-inside: avoid;
            }
            /* Elements positioning in mm */
            .field-date {
              position: absolute;
              left: ${activeTemplate.datePositions.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.datePositions.yMm + topOffsetMm}mm;
              font-family: monospace, Courier, monospace;
              font-weight: 700;
              font-size: ${activeTemplate.datePositions.fontSizePt}pt;
              display: flex;
            }
            .date-digit {
              display: inline-block;
              width: ${activeTemplate.datePositions.boxSpacingMm}mm;
              text-align: center;
              letter-spacing: 0;
            }
            .field-payee {
              position: absolute;
              left: ${activeTemplate.payeePositions.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.payeePositions.yMm + topOffsetMm}mm;
              width: ${activeTemplate.payeePositions.maxWidthMm}mm;
              font-weight: 700;
              font-size: ${activeTemplate.payeePositions.fontSizePt}pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .field-words-1 {
              position: absolute;
              left: ${activeTemplate.amountInWordsPositions.line1.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.amountInWordsPositions.line1.yMm + topOffsetMm}mm;
              width: ${activeTemplate.amountInWordsPositions.line1.maxWidthMm}mm;
              font-weight: 600;
              font-size: ${activeTemplate.amountInWordsPositions.fontSizePt}pt;
              text-transform: capitalize;
              line-height: 1.2;
            }
            .field-words-2 {
              position: absolute;
              left: ${activeTemplate.amountInWordsPositions.line2.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.amountInWordsPositions.line2.yMm + topOffsetMm}mm;
              width: ${activeTemplate.amountInWordsPositions.line2.maxWidthMm}mm;
              font-weight: 600;
              font-size: ${activeTemplate.amountInWordsPositions.fontSizePt}pt;
              text-transform: capitalize;
              line-height: 1.2;
            }
            .field-figures {
              position: absolute;
              left: ${activeTemplate.amountInFiguresPositions.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.amountInFiguresPositions.yMm + topOffsetMm}mm;
              font-weight: 800;
              font-size: ${activeTemplate.amountInFiguresPositions.fontSizePt}pt;
              font-family: monospace, Courier, monospace;
            }
            .field-crossing {
              position: absolute;
              left: ${activeTemplate.accountPayeePositions.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.accountPayeePositions.yMm + topOffsetMm}mm;
              transform: rotate(${activeTemplate.accountPayeePositions.rotationDeg}deg);
              transform-origin: top left;
              border-top: 1.5px solid #000;
              border-bottom: 1.5px solid #000;
              padding: 1.5px 6px;
              font-size: 8pt;
              font-weight: 800;
              letter-spacing: 0.8px;
              text-align: center;
              white-space: nowrap;
            }
            .field-bearer-strike {
              position: absolute;
              left: ${activeTemplate.bearerPositions.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.bearerPositions.yMm + topOffsetMm}mm;
              width: 14mm;
              height: 2px;
              background-color: #000;
            }
            .field-signatory {
              position: absolute;
              left: ${activeTemplate.signatoryPositions.xMm + leftOffsetMm}mm;
              top: ${activeTemplate.signatoryPositions.yMm + topOffsetMm}mm;
              font-size: ${activeTemplate.signatoryPositions.fontSizePt}pt;
              font-weight: 600;
              text-align: right;
              width: 52mm;
            }
          </style>
        </head>
        <body>
          <div class="cheque-container">
            ${cheque.isAccountPayeeOnly ? `
              <div class="field-crossing">
                ${activeTemplate.accountPayeePositions.text}
              </div>
            ` : ''}

            <div class="field-date">
              ${dateDigits.map(d => `<span class="date-digit">${d || '&nbsp;'}</span>`).join('')}
            </div>

            <div class="field-payee">
              *** ${cheque.payeeName} ***
            </div>

            <div class="field-words-1">
              ${line1}
            </div>
            ${line2 ? `
              <div class="field-words-2">
                ${line2}
              </div>
            ` : ''}

            <div class="field-figures">
              ${formattedFigures}
            </div>

            ${cheque.strikeBearer ? `
              <div class="field-bearer-strike"></div>
            ` : ''}

            <div class="field-signatory">
              <div>For ${companyName}</div>
              <div style="margin-top: 10mm; font-size: 8pt; font-weight: normal; color: #444;">Authorised Signatory</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // PDF Export
  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [203, 93]
      });

      // Background watermark guide if enabled
      if (showChequeBackground) {
        doc.setDrawColor(200, 210, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(2, 2, 199, 89, 2, 2, 'FD');
        doc.setFontSize(14);
        doc.setTextColor(180, 190, 210);
        doc.text(cheque.bankName.toUpperCase(), 15, 15);
      }

      doc.setTextColor(0, 0, 0);

      // 1. Account Payee Crossing
      if (cheque.isAccountPayeeOnly) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(activeTemplate.accountPayeePositions.text, activeTemplate.accountPayeePositions.xMm + leftOffsetMm, activeTemplate.accountPayeePositions.yMm + topOffsetMm, {
          angle: 45
        });
      }

      // 2. Date Digits
      doc.setFont('courier', 'bold');
      doc.setFontSize(activeTemplate.datePositions.fontSizePt);
      dateDigits.forEach((digit, idx) => {
        if (digit) {
          const posX = (activeTemplate.datePositions.xMm + leftOffsetMm) + (idx * activeTemplate.datePositions.boxSpacingMm);
          doc.text(digit, posX, activeTemplate.datePositions.yMm + topOffsetMm);
        }
      });

      // 3. Payee Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(activeTemplate.payeePositions.fontSizePt);
      doc.text(`*** ${cheque.payeeName.toUpperCase()} ***`, activeTemplate.payeePositions.xMm + leftOffsetMm, activeTemplate.payeePositions.yMm + topOffsetMm);

      // 4. Amount in Words
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(activeTemplate.amountInWordsPositions.fontSizePt);
      doc.text(line1, activeTemplate.amountInWordsPositions.line1.xMm + leftOffsetMm, activeTemplate.amountInWordsPositions.line1.yMm + topOffsetMm);
      if (line2) {
        doc.text(line2, activeTemplate.amountInWordsPositions.line2.xMm + leftOffsetMm, activeTemplate.amountInWordsPositions.line2.yMm + topOffsetMm);
      }

      // 5. Amount in Figures
      doc.setFont('courier', 'bold');
      doc.setFontSize(activeTemplate.amountInFiguresPositions.fontSizePt);
      doc.text(formattedFigures, activeTemplate.amountInFiguresPositions.xMm + leftOffsetMm, activeTemplate.amountInFiguresPositions.yMm + topOffsetMm);

      // 6. Signatory
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(activeTemplate.signatoryPositions.fontSizePt);
      doc.text(`For ${companyName}`, activeTemplate.signatoryPositions.xMm + leftOffsetMm, activeTemplate.signatoryPositions.yMm + topOffsetMm, { align: 'right' });

      doc.save(`Cheque_${cheque.chequeNumber}_${cheque.payeeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      showToast('success', 'Cheque PDF Generated', `Cheque #${cheque.chequeNumber} exported successfully.`);
      if (onMarkPrinted) onMarkPrinted(cheque.id);
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('error', 'Export Failed', 'Failed to generate cheque PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                  Print Cheque #{cheque.chequeNumber}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {cheque.bankName}
                </span>
                {cheque.status === 'PRINTED' && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    ✓ Printed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                CTS-2010 Indian Banking Standard Cheque Printing & Alignment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Bank Layout:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {allTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Paper / Feeder Mode */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Paper Feeder:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPaperFeedMode('CHEQUE_LEAF')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  paperFeedMode === 'CHEQUE_LEAF'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Cheque Leaf (Direct)
              </button>
              <button
                type="button"
                onClick={() => setPaperFeedMode('A4_TOP')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  paperFeedMode === 'A4_TOP'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                A4 Top Feed
              </button>
              <button
                type="button"
                onClick={() => setPaperFeedMode('A4_CENTER')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  paperFeedMode === 'A4_CENTER'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                A4 Center Feed
              </button>
            </div>
          </div>

          {/* Guide Watermark & Offset Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showChequeBackground}
                onChange={(e) => setShowChequeBackground(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Preview Background Guide</span>
            </label>

            <button
              type="button"
              onClick={() => setShowOffsetControls(!showOffsetControls)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                showOffsetControls 
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Printer Offset (mm)</span>
            </button>

            {onOpenCalibration && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCalibration(cheque);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5 hover:bg-purple-100 transition"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                <span>Layout Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Fine-Tuning Calibration Drawer */}
        {showOffsetControls && (
          <div className="px-6 py-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Left Offset (X):</span>
                <input
                  type="number"
                  step="0.5"
                  value={leftOffsetMm}
                  onChange={(e) => setLeftOffsetMm(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center font-mono font-bold"
                />
                <span className="text-slate-400">mm</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Top Offset (Y):</span>
                <input
                  type="number"
                  step="0.5"
                  value={topOffsetMm}
                  onChange={(e) => setTopOffsetMm(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center font-mono font-bold"
                />
                <span className="text-slate-400">mm</span>
              </div>

              <button
                type="button"
                onClick={() => { setLeftOffsetMm(0); setTopOffsetMm(0); }}
                className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset (0,0)
              </button>
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              💡 Tip: Print on blank paper first and hold it over your blank cheque against light to check alignment.
            </p>
          </div>
        )}

        {/* Live Visual Preview Container */}
        <div className="flex-1 p-6 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center overflow-auto">
          
          <div className="text-xs text-slate-400 mb-2 font-mono flex items-center gap-3">
            <span>Dimensions: 203mm × 93mm (CTS-2010 Standard)</span>
            <span>•</span>
            <span>Scaling: 1:1 Actual Ratio</span>
          </div>

          {/* CHEQUE LEAF CANVAS (Exact 203mm x 93mm scaled to CSS) */}
          <div
            ref={printAreaRef}
            style={{
              width: '768px', // approx 203mm on screen
              height: '352px', // approx 93mm on screen
            }}
            className={`relative rounded-xl border transition-all select-none shadow-xl ${
              showChequeBackground
                ? 'bg-gradient-to-br from-emerald-50/50 via-teal-50/40 to-slate-50 border-teal-300 text-slate-900 dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 dark:border-teal-800 dark:text-slate-100'
                : 'bg-white border-dashed border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
            }`}
          >
            {/* Background Bank Watermarks & Cheque Leaf Guide Lines */}
            {showChequeBackground && (
              <div className="absolute inset-0 p-4 pointer-events-none opacity-40">
                {/* Bank Header Title */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-sm tracking-wider uppercase text-slate-700 dark:text-slate-300">
                      {cheque.bankName}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {business.branchName || 'Main Business Branch'} • IFSC: {business.ifscCode || 'HDFC0000000'}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    CTS-2010
                  </div>
                </div>

                {/* Pre-printed field lines guide */}
                <div className="absolute left-6 right-6 top-[95px] border-b border-slate-300/80 dark:border-slate-700 flex justify-between text-[8px] text-slate-400 pb-0.5">
                  <span>PAY</span>
                  <span>OR BEARER</span>
                </div>
                <div className="absolute left-6 right-6 top-[138px] border-b border-slate-300/80 dark:border-slate-700 text-[8px] text-slate-400 pb-0.5">
                  <span>RUPEES</span>
                </div>
                <div className="absolute left-6 right-6 top-[174px] border-b border-slate-300/80 dark:border-slate-700"></div>

                {/* Pre-printed Amount Box Guide */}
                <div className="absolute right-7 top-[152px] w-36 h-9 border border-slate-400/80 dark:border-slate-600 rounded bg-white/40 dark:bg-slate-800/40 flex items-center px-2 text-xs font-bold text-slate-400">
                  <span>₹</span>
                </div>

                {/* Date Boxes Guide (8 boxes) */}
                <div className="absolute right-7 top-[34px] flex gap-1">
                  {['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'].map((l, i) => (
                    <div key={i} className="w-5 h-6 border border-slate-400/80 dark:border-slate-600 rounded-sm flex items-center justify-center text-[8px] font-bold text-slate-400">
                      {l}
                    </div>
                  ))}
                </div>

                {/* Bottom MICR Band Guide */}
                <div className="absolute bottom-2 left-10 right-10 text-center font-mono text-[10px] tracking-widest text-slate-400">
                  ⑈ {cheque.chequeNumber} ⑈ 110229045 ⑆ 000124 ⑈ 10
                </div>
              </div>
            )}

            {/* 1. "A/C PAYEE ONLY" Crossing */}
            {cheque.isAccountPayeeOnly && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${(activeTemplate.accountPayeePositions.xMm + leftOffsetMm) * 3.78}px`,
                  top: `${(activeTemplate.accountPayeePositions.yMm + topOffsetMm) * 3.78}px`,
                  transform: `rotate(${activeTemplate.accountPayeePositions.rotationDeg}deg)`,
                  transformOrigin: 'top left'
                }}
                className="border-t-2 border-b-2 border-slate-900 dark:border-white px-2 py-0.5 text-[10px] font-black tracking-widest whitespace-nowrap"
              >
                {activeTemplate.accountPayeePositions.text}
              </div>
            )}

            {/* 2. Date Digits (DD MM YYYY) */}
            <div
              style={{
                position: 'absolute',
                left: `${(activeTemplate.datePositions.xMm + leftOffsetMm) * 3.78}px`,
                top: `${(activeTemplate.datePositions.yMm + topOffsetMm) * 3.78}px`,
              }}
              className="flex font-mono font-extrabold text-slate-900 dark:text-white"
            >
              {dateDigits.map((digit, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${activeTemplate.datePositions.boxSpacingMm * 3.78}px`,
                    fontSize: `${activeTemplate.datePositions.fontSizePt * 1.33}px`,
                    textAlign: 'center'
                  }}
                >
                  {digit || ''}
                </div>
              ))}
            </div>

            {/* 3. Payee Name */}
            <div
              style={{
                position: 'absolute',
                left: `${(activeTemplate.payeePositions.xMm + leftOffsetMm) * 3.78}px`,
                top: `${(activeTemplate.payeePositions.yMm + topOffsetMm) * 3.78}px`,
                maxWidth: `${activeTemplate.payeePositions.maxWidthMm * 3.78}px`,
                fontSize: `${activeTemplate.payeePositions.fontSizePt * 1.33}px`,
              }}
              className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide truncate"
            >
              *** {cheque.payeeName} ***
            </div>

            {/* 4. Amount in Words - Line 1 */}
            <div
              style={{
                position: 'absolute',
                left: `${(activeTemplate.amountInWordsPositions.line1.xMm + leftOffsetMm) * 3.78}px`,
                top: `${(activeTemplate.amountInWordsPositions.line1.yMm + topOffsetMm) * 3.78}px`,
                maxWidth: `${activeTemplate.amountInWordsPositions.line1.maxWidthMm * 3.78}px`,
                fontSize: `${activeTemplate.amountInWordsPositions.fontSizePt * 1.33}px`,
              }}
              className="font-bold text-slate-900 dark:text-white capitalize"
            >
              {line1}
            </div>

            {/* 4. Amount in Words - Line 2 */}
            {line2 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(activeTemplate.amountInWordsPositions.line2.xMm + leftOffsetMm) * 3.78}px`,
                  top: `${(activeTemplate.amountInWordsPositions.line2.yMm + topOffsetMm) * 3.78}px`,
                  maxWidth: `${activeTemplate.amountInWordsPositions.line2.maxWidthMm * 3.78}px`,
                  fontSize: `${activeTemplate.amountInWordsPositions.fontSizePt * 1.33}px`,
                }}
                className="font-bold text-slate-900 dark:text-white capitalize"
              >
                {line2}
              </div>
            )}

            {/* 5. Amount in Figures */}
            <div
              style={{
                position: 'absolute',
                left: `${(activeTemplate.amountInFiguresPositions.xMm + leftOffsetMm) * 3.78}px`,
                top: `${(activeTemplate.amountInFiguresPositions.yMm + topOffsetMm) * 3.78}px`,
                fontSize: `${activeTemplate.amountInFiguresPositions.fontSizePt * 1.33}px`,
              }}
              className="font-mono font-extrabold text-slate-900 dark:text-white tracking-wider"
            >
              {formattedFigures}
            </div>

            {/* 6. Strike "Or Bearer" */}
            {cheque.strikeBearer && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(activeTemplate.bearerPositions.xMm + leftOffsetMm) * 3.78}px`,
                  top: `${(activeTemplate.bearerPositions.yMm + topOffsetMm) * 3.78}px`,
                  width: `${16 * 3.78}px`,
                  height: '2px',
                }}
                className="bg-slate-900 dark:bg-white"
              />
            )}

            {/* 7. Signatory */}
            <div
              style={{
                position: 'absolute',
                left: `${(activeTemplate.signatoryPositions.xMm + leftOffsetMm) * 3.78}px`,
                top: `${(activeTemplate.signatoryPositions.yMm + topOffsetMm) * 3.78}px`,
                fontSize: `${activeTemplate.signatoryPositions.fontSizePt * 1.33}px`,
              }}
              className="text-right font-bold text-slate-900 dark:text-white w-48"
            >
              <div>For {companyName}</div>
              <div className="text-[10px] font-normal text-slate-500 mt-6">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Cheque Amount: <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">{formatINR(cheque.amount)}</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-xl transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Cheque Now</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
