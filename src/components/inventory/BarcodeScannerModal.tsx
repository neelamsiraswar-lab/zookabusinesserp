import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { 
  Scan, 
  Camera, 
  X, 
  Plus, 
  Minus, 
  FileText, 
  ShoppingCart, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Layers, 
  TrendingUp, 
  RefreshCw, 
  Sparkles,
  Zap,
  Tag
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currencySymbol: string;
  onAddToInvoice: (product: Product) => void;
  onOpenPosSale: (product: Product) => void;
  onAdjustStock: (productId: string, newStock: number, reason: string) => void;
  onPrintLabel: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  currencySymbol,
  onAddToInvoice,
  onOpenPosSale,
  onAdjustStock,
  onPrintLabel,
}) => {
  const [activeMode, setActiveMode] = useState<'CAMERA' | 'HANDHELD' | 'QUICK_SELECT'>('HANDHELD');
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Play subtle feedback beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // AudioContext not available or blocked
    }
  };

  // Find product by barcode or SKU
  const handleProcessBarcode = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    const matched = products.find(
      p => (p.barcode && p.barcode.toLowerCase() === trimmed) ||
           p.sku.toLowerCase() === trimmed ||
           p.id.toLowerCase() === trimmed
    );

    if (matched) {
      playBeep();
      setScannedProduct(matched);
      setLastScannedCode(code);
      setManualBarcodeInput('');
    } else {
      setLastScannedCode(code);
      setScannedProduct(null);
    }
  };

  // Hardware Scanner / Rapid Keystroke listener
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is actively typing in a standard textarea
      if (document.activeElement?.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Barcode scanners type very rapidly (< 50ms between keys)
      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleProcessBarcode(buffer);
          buffer = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 200) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products]);

  // Focus manual input on open
  useEffect(() => {
    if (isOpen && activeMode === 'HANDHELD') {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeMode]);

  // Camera stream setup
  useEffect(() => {
    if (isOpen && activeMode === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or camera device unavailable.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Automated Barcode Detection Loop
  const startScanningLoop = () => {
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
      });

      scanIntervalRef.current = window.setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              if (detected) {
                handleProcessBarcode(detected);
              }
            }
          } catch (e) {
            // Frame detection error
          }
        }
      }, 300);
    }
  };

  const handleStockIncrement = (amount: number) => {
    if (!scannedProduct) return;
    const newStock = Math.max(0, scannedProduct.currentStock + amount);
    onAdjustStock(scannedProduct.id, newStock, `Barcode Quick Scan adjustment (${amount > 0 ? '+' : ''}${amount})`);
    setScannedProduct(prev => prev ? { ...prev, currentStock: newStock } : null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto modal-overlay">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-[96vw] sm:max-w-xl md:max-w-2xl w-full overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90dvh] my-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-500/20 text-cyan-300 border border-indigo-500/30 shrink-0">
              <Scan className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2 truncate">
                <span>Barcode Stock Scanner & Lookup</span>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  Live
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Scan barcode to locate stock, view inventory or add directly to invoice
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveMode('HANDHELD');
              setScannedProduct(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMode === 'HANDHELD'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-indigo-600" />
            <span>USB Gun / Fast Input</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('CAMERA');
              setScannedProduct(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMode === 'CAMERA'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Live Camera Scanner</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('QUICK_SELECT');
              setScannedProduct(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMode === 'QUICK_SELECT'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Simulate & Demo ({products.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* CAMERA MODE */}
          {activeMode === 'CAMERA' && (
            <div className="space-y-4">
              <div className="relative aspect-video max-h-64 w-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser animation overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-4/5 h-36 border-2 border-indigo-400/80 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                    <div className="w-full h-0.5 bg-rose-500 absolute top-1/2 -translate-y-1/2 animate-bounce shadow-[0_0_12px_#f43f5e]" />
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded">
                      Align Barcode in Box
                    </div>
                  </div>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-xs text-rose-300 font-semibold mb-3">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Point your webcam or phone camera at any standard Code 128 / EAN / UPC product barcode.
              </p>
            </div>
          )}

          {/* HANDHELD USB MODE */}
          {activeMode === 'HANDHELD' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-indigo-950">
                    Hardware Scanner Ready (Plug & Play)
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Simply point and trigger your USB/Bluetooth laser barcode gun. You can also type or paste any Barcode/SKU below and press Enter.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessBarcode(manualBarcodeInput);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Scan className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualBarcodeInput}
                    onChange={(e) => setManualBarcodeInput(e.target.value)}
                    placeholder="Scan with barcode gun or enter barcode (e.g. 890123...)"
                    className="w-full pl-10 pr-4 py-3 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Lookup Stock
                </button>
              </form>
            </div>
          )}

          {/* QUICK SELECT & DEMO SIMULATION */}
          {activeMode === 'QUICK_SELECT' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Click Any Barcode to Simulate Instant Scan:</span>
                <span className="text-[11px] text-indigo-600 font-normal">{products.length} Products</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {products.map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleProcessBarcode(prod.barcode || prod.sku)}
                    className="p-3 text-left rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-900 truncate">
                        {prod.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Barcode: {prod.barcode || prod.sku}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-slate-800">
                        {formatCurrency(prod.sellingPrice, currencySymbol)}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {prod.currentStock} {prod.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SCANNED PRODUCT RESULT CARD */}
          {scannedProduct ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/50 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-indigo-800/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Item Identified
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      HSN: {scannedProduct.hsnCode}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    {scannedProduct.name}
                  </h3>
                  <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                    <span>Category: <strong>{scannedProduct.category}</strong></span>
                    <span>•</span>
                    <span>SKU: <strong className="font-mono">{scannedProduct.sku}</strong></span>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl text-slate-900 flex flex-col items-center shrink-0">
                  <BarcodeSvg value={scannedProduct.barcode || scannedProduct.sku} height={32} showText={false} />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-slate-700 mt-0.5">
                    {scannedProduct.barcode || scannedProduct.sku}
                  </span>
                </div>
              </div>

              {/* Stock and Price KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Stock on Hand</span>
                  <div className="text-lg font-black text-cyan-300 font-mono mt-0.5">
                    {scannedProduct.currentStock} <span className="text-xs font-normal text-slate-400">{scannedProduct.unit}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Selling Price</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(scannedProduct.sellingPrice, currencySymbol)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Purchase Cost</span>
                  <div className="text-lg font-black text-slate-200 font-mono mt-0.5">
                    {formatCurrency(scannedProduct.purchasePrice, currencySymbol)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">GST Rate</span>
                  <div className="text-lg font-black text-indigo-300 font-mono mt-0.5">
                    {scannedProduct.gstRate}%
                  </div>
                </div>
              </div>

              {/* Quick stock +/- adjuster on the spot */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-300 font-semibold">
                  Quick Stock Adjust:
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStockIncrement(-1)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-700 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Minus className="w-3 h-3" />
                    <span>1 Unit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStockIncrement(1)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-700 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>1 Unit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStockIncrement(5)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-700 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>5 Units</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddToInvoice(scannedProduct);
                    onClose();
                  }}
                  className="py-2.5 px-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Add to Tax Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenPosSale(scannedProduct);
                    onClose();
                  }}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Open in POS Cart</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPrintLabel(scannedProduct);
                  }}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-indigo-400" />
                  <span>Print Barcode Tag</span>
                </button>
              </div>
            </div>
          ) : lastScannedCode ? (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="font-bold text-xs text-rose-900">
                No product found for barcode: <span className="font-mono text-rose-700 font-bold">"{lastScannedCode}"</span>
              </div>
              <p className="text-[11px] text-rose-600">
                Ensure the product barcode is registered in your Inventory catalog.
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Scanner Engine Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
