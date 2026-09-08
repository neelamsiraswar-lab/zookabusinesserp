import React, { useMemo } from 'react';

interface BarcodeSvgProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 40,
  showText = true,
  className = '',
}) => {
  const code = value || '8901234567890';
  
  // Generate distinct pseudo Code-128 / EAN bar patterns based on characters
  const bars = useMemo(() => {
    const pattern: { width: number; isBlack: boolean }[] = [];
    // Start guard
    pattern.push({ width: 2, isBlack: true });
    pattern.push({ width: 1, isBlack: false });
    pattern.push({ width: 1, isBlack: true });
    pattern.push({ width: 2, isBlack: false });

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const w1 = ((charCode % 3) + 1);
      const w2 = (((charCode >> 1) % 3) + 1);
      const w3 = (((charCode >> 2) % 2) + 1);
      const w4 = 2;

      pattern.push({ width: w1, isBlack: true });
      pattern.push({ width: w2, isBlack: false });
      pattern.push({ width: w3, isBlack: true });
      pattern.push({ width: w4, isBlack: false });
    }

    // Stop guard
    pattern.push({ width: 2, isBlack: true });
    pattern.push({ width: 1, isBlack: false });
    pattern.push({ width: 3, isBlack: true });

    return pattern;
  }, [code]);

  let totalWidth = 0;
  bars.forEach(b => { totalWidth += b.width; });

  let currentX = 0;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={totalWidth * 2}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="block"
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={height}
              fill="#0f172a"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="text-[10px] font-mono tracking-widest text-slate-700 mt-0.5">
          {code}
        </span>
      )}
    </div>
  );
};
