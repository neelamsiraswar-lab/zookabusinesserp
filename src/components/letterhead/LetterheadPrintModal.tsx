import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { LetterheadDocument, LetterheadTemplate, BusinessProfile } from '../../types';
import { LetterheadPreviewCanvas } from './LetterheadPreviewCanvas';
import { 
  X, 
  Printer, 
  Share2, 
  Mail, 
  Download, 
  Edit3, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  Check, 
  Copy,
  Layers,
  Sparkles
} from 'lucide-react';
import { stripHtmlToPlainText } from '../../utils/letterheadDefaults';

interface LetterheadPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LetterheadDocument | null;
  template: LetterheadTemplate;
  business: BusinessProfile;
  onEdit: (doc: LetterheadDocument) => void;
  showToast: (msg: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

export const LetterheadPrintModal: React.FC<LetterheadPrintModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  template,
  business,
  onEdit,
  showToast
}) => {
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  const [printWithLetterhead, setPrintWithLetterhead] = useState<boolean>(
    doc?.includeLetterheadOnPrint !== false
  );
  const [customTopMarginMm, setCustomTopMarginMm] = useState<number>(
    doc?.customTopMarginMm || 45
  );
  const [customBottomMarginMm, setCustomBottomMarginMm] = useState<number>(
    doc?.customBottomMarginMm || 35
  );
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !doc) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const plain = stripHtmlToPlainText(doc.bodyHtml);
    const summary = plain.length > 280 ? plain.substring(0, 280) + '...' : plain;
    const text = `*${doc.title || doc.subject}*\n` +
      `*Doc No:* ${doc.documentNumber} ${doc.referenceNumber ? `| *Ref:* ${doc.referenceNumber}` : ''}\n` +
      `*Date:* ${new Date(doc.date).toLocaleDateString('en-IN')}\n` +
      `*From:* ${business.tradeName || business.name}\n` +
      `*To:* ${doc.recipientName} (${doc.recipientCompany || 'Recipient'})\n\n` +
      `*Subject:* ${doc.subject}\n\n` +
      `${summary}\n\n` +
      `_Issued officially on corporate letterhead._`;

    const encoded = encodeURIComponent(text);
    const phone = doc.recipientPhone ? doc.recipientPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const plain = stripHtmlToPlainText(doc.bodyHtml);
    const subject = encodeURIComponent(`${doc.subject || doc.title} - ${doc.documentNumber}`);
    const body = encodeURIComponent(
      `Dear ${doc.recipientName || 'Valued Recipient'},\n\nPlease find the official communication from ${business.tradeName || business.name} below:\n\n` +
      `Doc Ref: ${doc.documentNumber} ${doc.referenceNumber ? `(${doc.referenceNumber})` : ''}\nDate: ${doc.date}\nSubject: ${doc.subject}\n\n` +
      `${plain}\n\n` +
      `Warm regards,\n${doc.signatoryName || business.signatoryName || 'Authorized Signatory'}\n${business.tradeName || business.name}\n${business.phone} | ${business.email}`
    );
    window.location.href = `mailto:${doc.recipientEmail || ''}?subject=${subject}&body=${body}`;
  };

  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${doc.title} - ${doc.documentNumber}</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 20mm; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
    th { background: #f1f5f9; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h2>${business.tradeName || business.name}</h2>
  <p>GSTIN: ${business.gstin} | ${business.address}, ${business.city} - ${business.pincode}</p>
  <hr/>
  <div style="display:flex; justify-content:space-between; margin-top: 15px;">
    <div><strong>Ref:</strong> ${doc.referenceNumber || doc.documentNumber}</div>
    <div><strong>Date:</strong> ${doc.date}</div>
  </div>
  <div style="margin: 15px 0;">
    <div><strong>To:</strong></div>
    <div>${doc.recipientName}</div>
    <div>${doc.recipientCompany || ''}</div>
  </div>
  <h3>Subject: ${doc.subject}</h3>
  <div>${doc.bodyHtml}</div>
  <div style="margin-top: 40px; text-align: right;">
    <p>For ${business.tradeName || business.name}</p>
    <p><strong>${doc.signatoryName || business.signatoryName || 'Authorised Signatory'}</strong></p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber.replace(/\//g, '_')}_${doc.title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({
      type: 'success',
      title: 'Downloaded',
      message: 'Document saved as HTML file.'
    });
  };

  const effectiveDoc = {
    ...doc,
    includeLetterheadOnPrint: printWithLetterhead,
    customTopMarginMm,
    customBottomMarginMm
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-hidden print:p-0 print:bg-white print:static print:h-auto print:overflow-visible">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-7xl h-[95vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:h-auto print:bg-white print:rounded-none"
      >
        {/* Modal Toolbar (Hidden during browser print) */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{doc.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {doc.documentNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Print preview & multi-channel dispatch
              </p>
            </div>
          </div>

          {/* Quick Settings: Print Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setPrintWithLetterhead(true)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  printWithLetterhead 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                With Full Letterhead
              </button>
              <button
                type="button"
                onClick={() => setPrintWithLetterhead(false)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !printWithLetterhead 
                    ? 'bg-amber-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Print on pre-printed physical letterhead paper (leaves top/bottom margins blank)"
              >
                Pre-printed Paper
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1.5 text-slate-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-300 px-2">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(1.4, prev + 0.1))}
                className="p-1.5 text-slate-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(doc);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {/* WhatsApp Share */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            {/* Email Share */}
            <button
              type="button"
              onClick={handleShareEmail}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Email</span>
            </button>

            {/* Download HTML */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
              title="Download HTML Document"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Primary Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/30 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- BODY AREA --- */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col items-center print:bg-white print:p-0 print:overflow-visible">
          {!printWithLetterhead && (
            <div className="mb-4 bg-amber-900/30 border border-amber-500/40 rounded-xl px-4 py-2 text-xs text-amber-200 flex items-center gap-4 print:hidden max-w-xl">
              <span>Stationery Mode: Top Offset = <strong>{customTopMarginMm}mm</strong>, Bottom Offset = <strong>{customBottomMarginMm}mm</strong></span>
              <div className="flex items-center gap-2 ml-auto">
                <input 
                  type="number" 
                  value={customTopMarginMm} 
                  onChange={(e) => setCustomTopMarginMm(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                  title="Top Margin in mm"
                />
                <span className="text-[10px] text-slate-400">mm</span>
              </div>
            </div>
          )}

          <div className="print-letterhead-container print:w-full print:m-0">
            <LetterheadPreviewCanvas
              document={effectiveDoc}
              template={template}
              business={business}
              zoomScale={zoomScale}
              containerClassName="print:shadow-none print:m-0"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
