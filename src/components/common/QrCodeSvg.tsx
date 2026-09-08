import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  showUpiBadge?: boolean;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 120,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  className = '',
  level = 'M',
  includeMargin = true,
  showUpiBadge = false,
}) => {
  const qrData = useMemo(() => {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    try {
      // Generate QR Code object with specified error correction level
      const qr = QRCode.create(value.trim(), {
        errorCorrectionLevel: (showUpiBadge ? 'Q' : level) as QRCode.QRCodeErrorCorrectionLevel,
      });
      const moduleCount = qr.modules.size;
      const margin = includeMargin ? 2 : 0;
      const totalGrid = moduleCount + margin * 2;

      // Build single unified SVG path for maximum rendering performance & crisp lines
      let pathData = '';
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qr.modules.get(r, c) === 1) {
            const x = c + margin;
            const y = r + margin;
            pathData += `M${x},${y}h1v1h-1z `;
          }
        }
      }

      return {
        pathData,
        totalGrid,
      };
    } catch (err) {
      console.error('Failed to generate QR code SVG:', err);
      return null;
    }
  }, [value, level, includeMargin, showUpiBadge]);

  if (!qrData) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center p-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-[10px] text-center font-sans ${className}`}
      >
        <span>Invalid QR Data</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-block p-1 rounded-lg border border-slate-200/80 bg-white shadow-xs ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${qrData.totalGrid} ${qrData.totalGrid}`}
        shapeRendering="crispEdges"
        className="block w-full h-full"
        style={{ width: size, height: size }}
      >
        <rect
          x="0"
          y="0"
          width={qrData.totalGrid}
          height={qrData.totalGrid}
          fill={bgColor}
        />
        <path d={qrData.pathData} fill={fgColor} />
      </svg>

      {showUpiBadge && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 rounded-md bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-[8px] text-emerald-600 tracking-tighter">
            UPI
          </div>
        </div>
      )}
    </div>
  );
};
