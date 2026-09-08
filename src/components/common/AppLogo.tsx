import React, { useState } from 'react';
import { 
  Receipt, 
  Building2, 
  Landmark, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Briefcase, 
  Layers, 
  ShoppingBag, 
  PieChart 
} from 'lucide-react';
import { PlatformConfig } from '../../types';

interface AppLogoProps {
  config?: Partial<PlatformConfig>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Receipt,
  Building2,
  Landmark,
  Sparkles,
  Zap,
  ShieldCheck,
  Briefcase,
  Layers,
  ShoppingBag,
  PieChart,
};

export const AppLogo: React.FC<AppLogoProps> = ({ 
  config, 
  size = 'md',
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);

  const logoType = config?.appLogoType || 'icon';
  const logoUrl = config?.appLogoUrl;
  const iconKey = config?.appLogoIcon || 'Receipt';
  const gradientClass = config?.appLogoGradient || 'bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400';
  const IconComponent = ICON_MAP[iconKey] || Receipt;

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg text-xs',
    sm: 'w-8 h-8 rounded-xl text-sm',
    md: 'w-9 h-9 rounded-xl text-base',
    lg: 'w-12 h-12 rounded-2xl text-xl',
    xl: 'w-16 h-16 rounded-3xl text-2xl',
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size];

  if (logoType === 'image' && logoUrl && !imgError) {
    return (
      <div 
        className={`${sizeClasses} overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center p-1 shrink-0 ${className}`}
      >
        <img 
          src={logoUrl} 
          alt={config?.appName || 'App Logo'} 
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClasses} ${gradientClass} flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 ring-1 ring-white/20 shrink-0 ${className}`}
    >
      <IconComponent className={iconSizes} />
    </div>
  );
};
