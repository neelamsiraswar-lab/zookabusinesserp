import React, { useState, useEffect, useMemo } from 'react';
import { ChequeRecord, ChequeTemplateConfig } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { 
  DEFAULT_CTS2010_TEMPLATE, 
  BANK_CHEQUE_PRESETS,
  splitAmountInWordsToLines,
  extractDateDigits,
  formatChequeAmountWords
} from '../../utils/chequeConstants';
import { 
  Sliders, 
  Printer, 
  RotateCcw, 
  Save, 
  Check, 
  Eye, 
  FileText, 
  Grid, 
  Sparkles,
  Layers,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Download,
  Edit3,
  Building2,
  Calendar,
  DollarSign,
  User,
  Shield,
  HelpCircle,
  Undo2,
  Maximize2
} from 'lucide-react';
import jsPDF from 'jspdf';

interface ChequeCalibrationTabProps {
  initialChequeId?: string;
  onBack?: () => void;
}

export const ChequeCalibrationTab: React.FC<ChequeCalibrationTabProps> = ({
  initialChequeId,
  onBack
}) => {
  const { business, cheques, chequeTemplates, saveChequeTemplate, showToast } = useApp();

  const allTemplates = useMemo(() => {
    return [...BANK_CHEQUE_PRESETS, ...chequeTemplates.filter(t => !BANK_CHEQUE_PRESETS.some(bp => bp.id === t.id))];
  }, [chequeTemplates]);

  // Selected template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_CTS2010_TEMPLATE.id);
  const [template, setTemplate] = useState<ChequeTemplateConfig>(DEFAULT_CTS2010_TEMPLATE);

  // Cheque Data Binding Source: 'REGISTER' (live cheque from DB) or 'CUSTOM' (interactive custom values)
  const [dataSourceMode, setDataSourceMode] = useState<'REGISTER' | 'CUSTOM'>('CUSTOM');
  const [selectedChequeId, setSelectedChequeId] = useState<string>(initialChequeId || '');

  // Live Editable Cheque Data fields
  const [testChequeNumber, setTestChequeNumber] = useState<string>('000101');
  const [testPayeeName, setTestPayeeName] = useState<string>('M/S BHARAT ELECTRONICS & LOGISTICS PVT LTD');
  const [testAmount, setTestAmount] = useState<number>(148500);
  const [testChequeDate, setTestChequeDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [testIsAccountPayee, setTestIsAccountPayee] = useState<boolean>(true);
  const [testStrikeBearer, setTestStrikeBearer] = useState<boolean>(true);
  const [testCompanyName, setTestCompanyName] = useState<string>(
    business.tradeName || business.name || 'Authorised Signatory'
  );

  // Inspector & Canvas View Settings
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showWatermarkGuide, setShowWatermarkGuide] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<'DATE' | 'PAYEE' | 'WORDS' | 'FIGURES' | 'CROSSING' | 'SIGNATORY'>('DATE');
  const [activeTabPanel, setActiveTabPanel] = useState<'CONTENT' | 'COORDINATES'>('COORDINATES');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Load cheque data if initialChequeId is passed or selected from register
  useEffect(() => {
    if (initialChequeId) {
      const found = cheques.find(c => c.id === initialChequeId);
      if (found) {
        setSelectedChequeId(found.id);
        setDataSourceMode('REGISTER');
        loadChequeData(found);
      }
    }
  }, [initialChequeId, cheques]);

  const loadChequeData = (chq: ChequeRecord) => {
    setTestChequeNumber(chq.chequeNumber || '000001');
    setTestPayeeName(chq.payeeName || '');
    setTestAmount(chq.amount || 0);
    setTestChequeDate(chq.chequeDate || new Date().toISOString().split('T')[0]);
    setTestIsAccountPayee(chq.isAccountPayeeOnly ?? true);
    setTestStrikeBearer(chq.strikeBearer ?? true);

    // Auto-match template
    if (chq.templateConfigId) {
      const match = allTemplates.find(t => t.id === chq.templateConfigId);
      if (match) {
        setSelectedTemplateId(match.id);
        setTemplate(JSON.parse(JSON.stringify(match)));
        return;
      }
    }

    if (chq.bankName) {
      const bankMatch = allTemplates.find(t => 
        t.bankPreset.toLowerCase() === chq.bankName.toLowerCase() ||
        chq.bankName.toLowerCase().includes(t.bankPreset.toLowerCase())
      );
      if (bankMatch) {
        setSelectedTemplateId(bankMatch.id);
        setTemplate(JSON.parse(JSON.stringify(bankMatch)));
        return;
      }
    }
  };

  // Handle Cheque Selection from register dropdown
  const handleSelectChequeFromRegister = (chqId: string) => {
    setSelectedChequeId(chqId);
    if (!chqId) {
      setDataSourceMode('CUSTOM');
      return;
    }
    const found = cheques.find(c => c.id === chqId);
    if (found) {
      setDataSourceMode('REGISTER');
      loadChequeData(found);
      showToast('info', 'Cheque Data Loaded', `Loaded Cheque #${found.chequeNumber} for ${found.payeeName} (₹${found.amount.toLocaleString('en-IN')})`);
    }
  };

  // Handle Preset change
  const handleSelectPreset = (id: string) => {
    setSelectedTemplateId(id);
    const chosen = allTemplates.find(t => t.id === id) || DEFAULT_CTS2010_TEMPLATE;
    setTemplate(JSON.parse(JSON.stringify(chosen)));
  };

  // Computed Values for active cheque preview
  const dateDigits = useMemo(() => {
    return extractDateDigits(testChequeDate);
  }, [testChequeDate]);

  const amountInWords = useMemo(() => {
    return formatChequeAmountWords(testAmount);
  }, [testAmount]);

  const { line1, line2 } = useMemo(() => {
    return splitAmountInWordsToLines(amountInWords, 48);
  }, [amountInWords]);

  const formattedFigures = useMemo(() => {
    if (testAmount <= 0 || isNaN(testAmount)) return '** 0.00 /-';
    return `** ${formatINR(testAmount).replace('₹', '').trim()} /-`;
  }, [testAmount]);

  // Quick Nudge Helpers for millimeter positioning
  const nudge = (axis: 'x' | 'y', deltaMm: number) => {
    const updated = { ...template };
    if (activeSection === 'DATE') {
      if (axis === 'x') updated.datePositions.xMm = Math.round((updated.datePositions.xMm + deltaMm) * 10) / 10;
      if (axis === 'y') updated.datePositions.yMm = Math.round((updated.datePositions.yMm + deltaMm) * 10) / 10;
    } else if (activeSection === 'PAYEE') {
      if (axis === 'x') updated.payeePositions.xMm = Math.round((updated.payeePositions.xMm + deltaMm) * 10) / 10;
      if (axis === 'y') updated.payeePositions.yMm = Math.round((updated.payeePositions.yMm + deltaMm) * 10) / 10;
    } else if (activeSection === 'WORDS') {
      if (axis === 'x') {
        updated.amountInWordsPositions.line1.xMm = Math.round((updated.amountInWordsPositions.line1.xMm + deltaMm) * 10) / 10;
        updated.amountInWordsPositions.line2.xMm = Math.round((updated.amountInWordsPositions.line2.xMm + deltaMm) * 10) / 10;
      }
      if (axis === 'y') {
        updated.amountInWordsPositions.line1.yMm = Math.round((updated.amountInWordsPositions.line1.yMm + deltaMm) * 10) / 10;
        updated.amountInWordsPositions.line2.yMm = Math.round((updated.amountInWordsPositions.line2.yMm + deltaMm) * 10) / 10;
      }
    } else if (activeSection === 'FIGURES') {
      if (axis === 'x') updated.amountInFiguresPositions.xMm = Math.round((updated.amountInFiguresPositions.xMm + deltaMm) * 10) / 10;
      if (axis === 'y') updated.amountInFiguresPositions.yMm = Math.round((updated.amountInFiguresPositions.yMm + deltaMm) * 10) / 10;
    } else if (activeSection === 'CROSSING') {
      if (axis === 'x') updated.accountPayeePositions.xMm = Math.round((updated.accountPayeePositions.xMm + deltaMm) * 10) / 10;
      if (axis === 'y') updated.accountPayeePositions.yMm = Math.round((updated.accountPayeePositions.yMm + deltaMm) * 10) / 10;
    } else if (activeSection === 'SIGNATORY') {
      if (axis === 'x') updated.signatoryPositions.xMm = Math.round((updated.signatoryPositions.xMm + deltaMm) * 10) / 10;
      if (axis === 'y') updated.signatoryPositions.yMm = Math.round((updated.signatoryPositions.yMm + deltaMm) * 10) / 10;
    }
    setTemplate(updated);
  };

  // Save changes
  const handleSaveTemplate = () => {
    saveChequeTemplate(template);
    showToast('success', 'Layout Saved', `Cheque format "${template.name}" calibration saved to system.`);
  };

  // Test Direct Print with active live data
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CTS-2010 Cheque Calibration - #${testChequeNumber}</title>
          <style>
            @page {
              size: 203mm 93mm;
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
            .cheque {
              position: relative;
              width: 203mm;
              height: 93mm;
              margin: 0 auto;
              box-sizing: border-box;
              overflow: hidden;
            }
            .date-box {
              position: absolute;
              left: ${template.datePositions.xMm}mm;
              top: ${template.datePositions.yMm}mm;
              font-family: monospace, Courier, monospace;
              font-weight: bold;
              font-size: ${template.datePositions.fontSizePt}pt;
              display: flex;
            }
            .d-digit {
              display: inline-block;
              width: ${template.datePositions.boxSpacingMm}mm;
              text-align: center;
            }
            .payee {
              position: absolute;
              left: ${template.payeePositions.xMm}mm;
              top: ${template.payeePositions.yMm}mm;
              width: ${template.payeePositions.maxWidthMm}mm;
              font-weight: bold;
              font-size: ${template.payeePositions.fontSizePt}pt;
              text-transform: uppercase;
            }
            .words-1 {
              position: absolute;
              left: ${template.amountInWordsPositions.line1.xMm}mm;
              top: ${template.amountInWordsPositions.line1.yMm}mm;
              width: ${template.amountInWordsPositions.line1.maxWidthMm}mm;
              font-weight: bold;
              font-size: ${template.amountInWordsPositions.fontSizePt}pt;
              text-transform: capitalize;
            }
            .words-2 {
              position: absolute;
              left: ${template.amountInWordsPositions.line2.xMm}mm;
              top: ${template.amountInWordsPositions.line2.yMm}mm;
              width: ${template.amountInWordsPositions.line2.maxWidthMm}mm;
              font-weight: bold;
              font-size: ${template.amountInWordsPositions.fontSizePt}pt;
              text-transform: capitalize;
            }
            .figures {
              position: absolute;
              left: ${template.amountInFiguresPositions.xMm}mm;
              top: ${template.amountInFiguresPositions.yMm}mm;
              font-family: monospace, Courier, monospace;
              font-weight: bold;
              font-size: ${template.amountInFiguresPositions.fontSizePt}pt;
            }
            .crossing {
              position: absolute;
              left: ${template.accountPayeePositions.xMm}mm;
              top: ${template.accountPayeePositions.yMm}mm;
              transform: rotate(${template.accountPayeePositions.rotationDeg}deg);
              transform-origin: top left;
              border-top: 1.5px solid #000;
              border-bottom: 1.5px solid #000;
              padding: 2px 6px;
              font-size: 8pt;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .strike {
              position: absolute;
              left: ${template.bearerPositions.xMm}mm;
              top: ${template.bearerPositions.yMm}mm;
              width: 14mm;
              height: 2px;
              background: #000;
            }
            .sign {
              position: absolute;
              left: ${template.signatoryPositions.xMm}mm;
              top: ${template.signatoryPositions.yMm}mm;
              font-size: ${template.signatoryPositions.fontSizePt}pt;
              font-weight: bold;
              text-align: right;
              width: 50mm;
            }
          </style>
        </head>
        <body>
          <div class="cheque">
            ${testIsAccountPayee ? `<div class="crossing">${template.accountPayeePositions.text}</div>` : ''}
            <div class="date-box">${dateDigits.map(d => `<span class="d-digit">${d || '&nbsp;'}</span>`).join('')}</div>
            <div class="payee">*** ${testPayeeName.toUpperCase()} ***</div>
            <div class="words-1">${line1}</div>
            ${line2 ? `<div class="words-2">${line2}</div>` : ''}
            <div class="figures">${formattedFigures}</div>
            ${testStrikeBearer ? `<div class="strike"></div>` : ''}
            <div class="sign">
              <div>For ${testCompanyName}</div>
              <div style="margin-top: 8mm; font-size: 8pt; font-weight: normal; color: #444;">Authorised Signatory</div>
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

  // Test PDF Export
  const handleDownloadTestPdf = () => {
    try {
      setIsExportingPdf(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [203, 93]
      });

      if (showWatermarkGuide) {
        doc.setDrawColor(200, 210, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(2, 2, 199, 89, 2, 2, 'FD');
        doc.setFontSize(14);
        doc.setTextColor(180, 190, 210);
        doc.text(template.name.toUpperCase(), 15, 15);
      }

      doc.setTextColor(0, 0, 0);

      // 1. Account Payee Crossing
      if (testIsAccountPayee) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(template.accountPayeePositions.text, template.accountPayeePositions.xMm, template.accountPayeePositions.yMm, {
          angle: 45
        });
      }

      // 2. Date Digits
      doc.setFont('courier', 'bold');
      doc.setFontSize(template.datePositions.fontSizePt);
      dateDigits.forEach((digit, idx) => {
        if (digit) {
          const posX = template.datePositions.xMm + (idx * template.datePositions.boxSpacingMm);
          doc.text(digit, posX, template.datePositions.yMm);
        }
      });

      // 3. Payee Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(template.payeePositions.fontSizePt);
      doc.text(`*** ${testPayeeName.toUpperCase()} ***`, template.payeePositions.xMm, template.payeePositions.yMm);

      // 4. Amount in Words
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(template.amountInWordsPositions.fontSizePt);
      doc.text(line1, template.amountInWordsPositions.line1.xMm, template.amountInWordsPositions.line1.yMm);
      if (line2) {
        doc.text(line2, template.amountInWordsPositions.line2.xMm, template.amountInWordsPositions.line2.yMm);
      }

      // 5. Amount in Figures
      doc.setFont('courier', 'bold');
      doc.setFontSize(template.amountInFiguresPositions.fontSizePt);
      doc.text(formattedFigures, template.amountInFiguresPositions.xMm, template.amountInFiguresPositions.yMm);

      // 6. Signatory
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(template.signatoryPositions.fontSizePt);
      doc.text(`For ${testCompanyName}`, template.signatoryPositions.xMm, template.signatoryPositions.yMm, { align: 'right' });

      doc.save(`Calibration_Test_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      showToast('success', 'PDF Exported', 'Calibration layout test PDF generated.');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('error', 'Export Failed', 'Failed to generate calibration PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-300" />
            <h3 className="font-extrabold text-lg">
              Cheque Layout & Coordinate Calibration Studio
            </h3>
            {dataSourceMode === 'REGISTER' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Synced with Cheque #{testChequeNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Test and align exact millimeter (mm) coordinates for Date boxes, Payee, Amount in words, Amount in figures, and Crossing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              <span>Back to Register</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadTestPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestPrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-400/40 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Test Print Cheque</span>
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Calibration</span>
          </button>
        </div>
      </div>

      {/* Cheque Data Selector & Bank Layout Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Bank Template */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Bank Cheque Layout Preset
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {allTemplates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cheque Data Mode / Source Selection */}
        <div className="md:col-span-5 flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Cheque Data Source</span>
            {dataSourceMode === 'REGISTER' && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                • active record
              </span>
            )}
          </label>
          <select
            value={selectedChequeId}
            onChange={(e) => handleSelectChequeFromRegister(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Custom Interactive Test Cheque Data --</option>
            {cheques.map(c => (
              <option key={c.id} value={c.id}>
                Cheque #{c.chequeNumber} • {c.payeeName} ({formatINR(c.amount)}) • {formatDate(c.chequeDate)}
              </option>
            ))}
          </select>
        </div>

        {/* Visual Overlay Toggles */}
        <div className="md:col-span-3 flex items-center justify-end gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-3 md:pt-0">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600"
            />
            <Grid className="w-3.5 h-3.5 text-slate-400" />
            <span>Grid (10mm)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWatermarkGuide}
              onChange={(e) => setShowWatermarkGuide(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600"
            />
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Watermark</span>
          </label>
        </div>

      </div>

      {/* Main Studio Area: Interactive Canvas (Left 7 Cols) + Control Panels (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Live Interactive Canvas (7 Cols) */}
        <div className="lg:col-span-7 p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-auto min-h-[440px]">
          
          {/* Header Info & Active Highlight Indicator */}
          <div className="w-full max-w-[768px] flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2">
            <div className="flex items-center gap-2">
              <span>Canvas: 203mm × 93mm (100% CTS-2010)</span>
              <span>•</span>
              <span className="text-blue-600 font-bold">1mm = 3.78px</span>
            </div>
            <div className="flex items-center gap-1 font-sans text-xs">
              <span className="text-slate-400">Selected:</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                {activeSection}
              </span>
            </div>
          </div>

          {/* Cheque Leaf Canvas (203mm x 93mm scaled) */}
          <div
            style={{
              width: '768px',
              height: '352px',
            }}
            className={`relative rounded-xl border select-none transition-all shadow-xl ${
              showWatermarkGuide
                ? 'bg-gradient-to-br from-emerald-50/50 via-teal-50/40 to-slate-50 border-teal-300 text-slate-900 dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 dark:border-teal-800 dark:text-slate-100'
                : 'bg-white border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
            }`}
          >
            {/* Optional MM Grid Overlay */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                  backgroundSize: `${10 * 3.78}px ${10 * 3.78}px`
                }}
              />
            )}

            {/* Background Bank Watermarks Guide */}
            {showWatermarkGuide && (
              <div className="absolute inset-0 p-4 pointer-events-none opacity-40">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-sm tracking-wider uppercase text-slate-700 dark:text-slate-300">
                      {template.name}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {business.bankName || 'HDFC Bank Ltd'} • IFSC: {business.ifscCode || 'HDFC0000000'} • CTS-2010 Leaf
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    CTS-2010
                  </div>
                </div>

                <div className="absolute left-6 right-6 top-[95px] border-b border-slate-300/80 dark:border-slate-700 flex justify-between text-[8px] text-slate-400 pb-0.5">
                  <span>PAY</span>
                  <span>OR BEARER</span>
                </div>
                <div className="absolute left-6 right-6 top-[138px] border-b border-slate-300/80 dark:border-slate-700 text-[8px] text-slate-400 pb-0.5">
                  <span>RUPEES</span>
                </div>
                <div className="absolute left-6 right-6 top-[174px] border-b border-slate-300/80 dark:border-slate-700"></div>

                <div className="absolute right-7 top-[152px] w-36 h-9 border border-slate-400/80 dark:border-slate-600 rounded bg-white/40 dark:bg-slate-800/40 flex items-center px-2 text-xs font-bold text-slate-400">
                  <span>₹</span>
                </div>

                <div className="absolute right-7 top-[34px] flex gap-1">
                  {['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'].map((l, i) => (
                    <div key={i} className="w-5 h-6 border border-slate-400/80 dark:border-slate-600 rounded-sm flex items-center justify-center text-[8px] font-bold text-slate-400">
                      {l}
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-2 left-10 right-10 text-center font-mono text-[10px] tracking-widest text-slate-400">
                  ⑈ {testChequeNumber} ⑈ 110229045 ⑆ 000124 ⑈ 10
                </div>
              </div>
            )}

            {/* 1. Account Payee Crossing */}
            {testIsAccountPayee && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${template.accountPayeePositions.xMm * 3.78}px`,
                  top: `${template.accountPayeePositions.yMm * 3.78}px`,
                  transform: `rotate(${template.accountPayeePositions.rotationDeg}deg)`,
                  transformOrigin: 'top left'
                }}
                className={`border-t-2 border-b-2 border-slate-900 dark:border-white px-2 py-0.5 text-[10px] font-black tracking-widest cursor-pointer whitespace-nowrap transition ${
                  activeSection === 'CROSSING' ? 'ring-2 ring-blue-500 rounded bg-blue-500/10' : 'hover:bg-slate-200/50'
                }`}
                onClick={() => { setActiveSection('CROSSING'); setActiveTabPanel('COORDINATES'); }}
              >
                {template.accountPayeePositions.text}
              </div>
            )}

            {/* 2. Date Digits */}
            <div
              style={{
                position: 'absolute',
                left: `${template.datePositions.xMm * 3.78}px`,
                top: `${template.datePositions.yMm * 3.78}px`,
              }}
              className={`flex font-mono font-extrabold text-slate-900 dark:text-white cursor-pointer transition ${
                activeSection === 'DATE' ? 'ring-2 ring-blue-500 rounded p-0.5 bg-blue-500/10' : 'hover:bg-slate-200/50'
              }`}
              onClick={() => { setActiveSection('DATE'); setActiveTabPanel('COORDINATES'); }}
            >
              {dateDigits.map((digit, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${template.datePositions.boxSpacingMm * 3.78}px`,
                    fontSize: `${template.datePositions.fontSizePt * 1.33}px`,
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
                left: `${template.payeePositions.xMm * 3.78}px`,
                top: `${template.payeePositions.yMm * 3.78}px`,
                maxWidth: `${template.payeePositions.maxWidthMm * 3.78}px`,
                fontSize: `${template.payeePositions.fontSizePt * 1.33}px`,
              }}
              className={`font-extrabold text-slate-900 dark:text-white uppercase tracking-wide truncate cursor-pointer transition ${
                activeSection === 'PAYEE' ? 'ring-2 ring-blue-500 rounded px-1 bg-blue-500/10' : 'hover:bg-slate-200/50'
              }`}
              onClick={() => { setActiveSection('PAYEE'); setActiveTabPanel('COORDINATES'); }}
            >
              *** {testPayeeName} ***
            </div>

            {/* 4. Words Line 1 */}
            <div
              style={{
                position: 'absolute',
                left: `${template.amountInWordsPositions.line1.xMm * 3.78}px`,
                top: `${template.amountInWordsPositions.line1.yMm * 3.78}px`,
                maxWidth: `${template.amountInWordsPositions.line1.maxWidthMm * 3.78}px`,
                fontSize: `${template.amountInWordsPositions.fontSizePt * 1.33}px`,
              }}
              className={`font-bold text-slate-900 dark:text-white capitalize cursor-pointer transition ${
                activeSection === 'WORDS' ? 'ring-2 ring-blue-500 rounded px-1 bg-blue-500/10' : 'hover:bg-slate-200/50'
              }`}
              onClick={() => { setActiveSection('WORDS'); setActiveTabPanel('COORDINATES'); }}
            >
              {line1}
            </div>

            {/* 4. Words Line 2 */}
            {line2 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${template.amountInWordsPositions.line2.xMm * 3.78}px`,
                  top: `${template.amountInWordsPositions.line2.yMm * 3.78}px`,
                  maxWidth: `${template.amountInWordsPositions.line2.maxWidthMm * 3.78}px`,
                  fontSize: `${template.amountInWordsPositions.fontSizePt * 1.33}px`,
                }}
                className={`font-bold text-slate-900 dark:text-white capitalize cursor-pointer transition ${
                  activeSection === 'WORDS' ? 'ring-2 ring-blue-500 rounded px-1 bg-blue-500/10' : 'hover:bg-slate-200/50'
                }`}
                onClick={() => { setActiveSection('WORDS'); setActiveTabPanel('COORDINATES'); }}
              >
                {line2}
              </div>
            )}

            {/* 5. Figures */}
            <div
              style={{
                position: 'absolute',
                left: `${template.amountInFiguresPositions.xMm * 3.78}px`,
                top: `${template.amountInFiguresPositions.yMm * 3.78}px`,
                fontSize: `${template.amountInFiguresPositions.fontSizePt * 1.33}px`,
              }}
              className={`font-mono font-extrabold text-slate-900 dark:text-white tracking-wider cursor-pointer transition ${
                activeSection === 'FIGURES' ? 'ring-2 ring-blue-500 rounded px-1 bg-blue-500/10' : 'hover:bg-slate-200/50'
              }`}
              onClick={() => { setActiveSection('FIGURES'); setActiveTabPanel('COORDINATES'); }}
            >
              {formattedFigures}
            </div>

            {/* 6. Bearer Strike */}
            {testStrikeBearer && (
              <div
                style={{
                  position: 'absolute',
                  left: `${template.bearerPositions.xMm * 3.78}px`,
                  top: `${template.bearerPositions.yMm * 3.78}px`,
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
                left: `${template.signatoryPositions.xMm * 3.78}px`,
                top: `${template.signatoryPositions.yMm * 3.78}px`,
                fontSize: `${template.signatoryPositions.fontSizePt * 1.33}px`,
              }}
              className={`text-right font-bold text-slate-900 dark:text-white w-48 cursor-pointer transition ${
                activeSection === 'SIGNATORY' ? 'ring-2 ring-blue-500 rounded p-1 bg-blue-500/10' : 'hover:bg-slate-200/50'
              }`}
              onClick={() => { setActiveSection('SIGNATORY'); setActiveTabPanel('COORDINATES'); }}
            >
              <div>For {testCompanyName}</div>
              <div className="text-[10px] font-normal text-slate-500 mt-6">
                Authorised Signatory
              </div>
            </div>

          </div>

          {/* Quick Nudge Control Bar Below Canvas */}
          <div className="mt-4 flex items-center justify-between w-full max-w-[768px] px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Fine-tune <span className="text-blue-600">[{activeSection}]</span>:
              </span>
              <span className="text-slate-400 text-[11px]">(Click arrow buttons to nudge element by ±0.5mm)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudge('x', -0.5)}
                title="Nudge Left 0.5mm"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => nudge('x', 0.5)}
                title="Nudge Right 0.5mm"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => nudge('y', -0.5)}
                title="Nudge Up 0.5mm"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => nudge('y', 0.5)}
                title="Nudge Down 0.5mm"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Right: Studio Control Panel (5 Cols) with Dual Tabs (Coordinates & Live Data Content) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between">
          
          <div>
            {/* Top Switcher: Element Coordinates vs Cheque Content Data */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setActiveTabPanel('COORDINATES')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTabPanel === 'COORDINATES'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Element Coordinates (mm)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabPanel('CONTENT')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTabPanel === 'CONTENT'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Cheque Content & Amount</span>
              </button>
            </div>

            {/* TAB PANEL 1: ELEMENT COORDINATES */}
            {activeTabPanel === 'COORDINATES' && (
              <div className="space-y-4">
                
                {/* Element Picker Subtabs */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Select Element to Calibrate
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'DATE', label: 'Date Boxes' },
                      { id: 'PAYEE', label: 'Payee Line' },
                      { id: 'WORDS', label: 'Amount (Words)' },
                      { id: 'FIGURES', label: 'Amount (Fig)' },
                      { id: 'CROSSING', label: 'A/C Payee' },
                      { id: 'SIGNATORY', label: 'Signatory' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center cursor-pointer ${
                          activeSection === tab.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DATE BOXES CONTROLS */}
                {activeSection === 'DATE' && (
                  <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Date Box Grid Positioning (8 Digits DDMMYYYY)
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Left Position (X in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.datePositions.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            datePositions: { ...template.datePositions, xMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Top Position (Y in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.datePositions.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            datePositions: { ...template.datePositions, yMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Box Spacing (mm)
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          value={template.datePositions.boxSpacingMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            datePositions: { ...template.datePositions, boxSpacingMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Font Size (pt)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.datePositions.fontSizePt}
                          onChange={(e) => setTemplate({
                            ...template,
                            datePositions: { ...template.datePositions, fontSizePt: parseFloat(e.target.value) || 12 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PAYEE LINE CONTROLS */}
                {activeSection === 'PAYEE' && (
                  <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Payee Line Positioning
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Left Position (X in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.payeePositions.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            payeePositions: { ...template.payeePositions, xMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Top Position (Y in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.payeePositions.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            payeePositions: { ...template.payeePositions, yMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Max Width (mm)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={template.payeePositions.maxWidthMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            payeePositions: { ...template.payeePositions, maxWidthMm: parseFloat(e.target.value) || 120 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Font Size (pt)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.payeePositions.fontSizePt}
                          onChange={(e) => setTemplate({
                            ...template,
                            payeePositions: { ...template.payeePositions, fontSizePt: parseFloat(e.target.value) || 11 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* AMOUNT IN WORDS CONTROLS */}
                {activeSection === 'WORDS' && (
                  <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Amount in Words (Line 1 & Line 2)
                    </h4>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line 1 (X, Y mm)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="X mm"
                          value={template.amountInWordsPositions.line1.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            amountInWordsPositions: {
                              ...template.amountInWordsPositions,
                              line1: { ...template.amountInWordsPositions.line1, xMm: parseFloat(e.target.value) || 0 }
                            }
                          })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                        />
                        <input
                          type="number"
                          step="0.5"
                          placeholder="Y mm"
                          value={template.amountInWordsPositions.line1.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            amountInWordsPositions: {
                              ...template.amountInWordsPositions,
                              line1: { ...template.amountInWordsPositions.line1, yMm: parseFloat(e.target.value) || 0 }
                            }
                          })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line 2 (X, Y mm)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="X mm"
                          value={template.amountInWordsPositions.line2.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            amountInWordsPositions: {
                              ...template.amountInWordsPositions,
                              line2: { ...template.amountInWordsPositions.line2, xMm: parseFloat(e.target.value) || 0 }
                            }
                          })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                        />
                        <input
                          type="number"
                          step="0.5"
                          placeholder="Y mm"
                          value={template.amountInWordsPositions.line2.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            amountInWordsPositions: {
                              ...template.amountInWordsPositions,
                              line2: { ...template.amountInWordsPositions.line2, yMm: parseFloat(e.target.value) || 0 }
                            }
                          })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Font Size (pt)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={template.amountInWordsPositions.fontSizePt}
                        onChange={(e) => setTemplate({
                          ...template,
                          amountInWordsPositions: {
                            ...template.amountInWordsPositions,
                            fontSizePt: parseFloat(e.target.value) || 10
                          }
                        })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* FIGURES CONTROLS */}
                {activeSection === 'FIGURES' && (
                  <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Amount in Figures Box (₹)
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Left Position (X in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.amountInFiguresPositions.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            amountInFiguresPositions: { ...template.amountInFiguresPositions, xMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Top Position (Y in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.amountInFiguresPositions.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            amountInFiguresPositions: { ...template.amountInFiguresPositions, yMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Font Size (pt)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={template.amountInFiguresPositions.fontSizePt}
                        onChange={(e) => setTemplate({
                          ...template,
                          amountInFiguresPositions: { ...template.amountInFiguresPositions, fontSizePt: parseFloat(e.target.value) || 12 }
                        })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* CROSSING CONTROLS */}
                {activeSection === 'CROSSING' && (
                  <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      "A/C PAYEE ONLY" Crossing Banner
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Left Position (X in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.accountPayeePositions.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            accountPayeePositions: { ...template.accountPayeePositions, xMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Top Position (Y in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.accountPayeePositions.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            accountPayeePositions: { ...template.accountPayeePositions, yMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Rotation (Degrees)
                        </label>
                        <input
                          type="number"
                          step="5"
                          value={template.accountPayeePositions.rotationDeg}
                          onChange={(e) => setTemplate({
                            ...template,
                            accountPayeePositions: { ...template.accountPayeePositions, rotationDeg: parseFloat(e.target.value) || -45 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Banner Text
                        </label>
                        <input
                          type="text"
                          value={template.accountPayeePositions.text}
                          onChange={(e) => setTemplate({
                            ...template,
                            accountPayeePositions: { ...template.accountPayeePositions, text: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SIGNATORY CONTROLS */}
                {activeSection === 'SIGNATORY' && (
                  <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Authorised Signatory Block
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Left Position (X in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.signatoryPositions.xMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            signatoryPositions: { ...template.signatoryPositions, xMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Top Position (Y in mm)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={template.signatoryPositions.yMm}
                          onChange={(e) => setTemplate({
                            ...template,
                            signatoryPositions: { ...template.signatoryPositions, yMm: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Font Size (pt)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={template.signatoryPositions.fontSizePt}
                        onChange={(e) => setTemplate({
                          ...template,
                          signatoryPositions: { ...template.signatoryPositions, fontSizePt: parseFloat(e.target.value) || 9.5 }
                        })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB PANEL 2: CHEQUE CONTENT & AMOUNT DATA EDITOR */}
            {activeTabPanel === 'CONTENT' && (
              <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Live Cheque Data & Amount Editor</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Live preview sync</span>
                </div>

                {/* Amount (₹) */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cheque Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      value={testAmount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTestAmount(val);
                      }}
                      placeholder="e.g. 148500"
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 font-medium">
                    Words: <span className="text-slate-800 dark:text-slate-200 italic font-normal">{amountInWords}</span>
                  </div>
                </div>

                {/* Payee Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payee Name (Beneficiary)
                  </label>
                  <input
                    type="text"
                    value={testPayeeName}
                    onChange={(e) => setTestPayeeName(e.target.value)}
                    placeholder="e.g. M/S BHARAT ELECTRONICS"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date & Cheque No */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cheque Date
                    </label>
                    <input
                      type="date"
                      value={testChequeDate}
                      onChange={(e) => setTestChequeDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cheque Leaf #
                    </label>
                    <input
                      type="text"
                      value={testChequeNumber}
                      onChange={(e) => setTestChequeNumber(e.target.value)}
                      placeholder="000101"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Signatory / Company */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Signatory / Company Name
                  </label>
                  <input
                    type="text"
                    value={testCompanyName}
                    onChange={(e) => setTestCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Checkbox Options */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testIsAccountPayee}
                      onChange={(e) => setTestIsAccountPayee(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">A/C Payee Only</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testStrikeBearer}
                      onChange={(e) => setTestStrikeBearer(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Strike 'Bearer'</span>
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const base = BANK_CHEQUE_PRESETS.find(b => b.id === template.id) || DEFAULT_CTS2010_TEMPLATE;
                setTemplate(JSON.parse(JSON.stringify(base)));
                showToast('info', 'Reset Defaults', 'Coordinates reset to standard bank preset values.');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Bank Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Calibration</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
