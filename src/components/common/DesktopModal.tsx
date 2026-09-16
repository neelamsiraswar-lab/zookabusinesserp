import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';

export type DesktopModalSize = 
  | 'xs'   // max-w-sm  (~384px)
  | 'sm'   // max-w-md  (~448px)
  | 'md'   // max-w-xl  (~576px)
  | 'lg'   // max-w-3xl (~768px)
  | 'xl'   // max-w-5xl (~1024px)
  | '2xl'  // max-w-6xl (~1152px)
  | '3xl'  // max-w-7xl (~1280px)
  | '4xl'  // max-w-[1560px]
  | 'full'; // w-[97vw] or w-full

export interface DesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  size?: DesktopModalSize;
  allowMaximize?: boolean;
  defaultMaximized?: boolean;
  closeOnEsc?: boolean;
  closeOnBackdropClick?: boolean;
  zIndex?: number;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  backdropClassName?: string;
  children: React.ReactNode;
  id?: string;
}

const SIZE_MAP: Record<DesktopModalSize, string> = {
  xs: 'max-w-[96vw] sm:max-w-sm',
  sm: 'max-w-[96vw] sm:max-w-md',
  md: 'max-w-[96vw] sm:max-w-xl',
  lg: 'max-w-[96vw] sm:max-w-2xl md:max-w-3xl',
  xl: 'max-w-[96vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl',
  '2xl': 'max-w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl',
  '3xl': 'max-w-[96vw] md:max-w-5xl lg:max-w-7xl',
  '4xl': 'max-w-[98vw] 2xl:max-w-[1560px]',
  full: 'w-[98vw] max-w-[98vw]'
};

export const DesktopModal: React.FC<DesktopModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  iconBgColor,
  headerActions,
  footer,
  size = 'lg',
  allowMaximize = true,
  defaultMaximized = false,
  closeOnEsc = true,
  closeOnBackdropClick = true,
  zIndex = 50,
  className = '',
  contentClassName = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  backdropClassName = '',
  children,
  id
}) => {
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(defaultMaximized);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Sync defaultMaximized when modal reopens
  useEffect(() => {
    if (isOpen) {
      setIsMaximized(defaultMaximized);
    }
  }, [isOpen, defaultMaximized]);

  // Handle Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, closeOnEsc, onClose]);

  const toggleMaximize = useCallback(() => {
    if (allowMaximize) {
      setIsMaximized(prev => !prev);
    }
  }, [allowMaximize]);

  if (!isOpen || !mounted || typeof document === 'undefined') {
    return null;
  }

  const hasHeader = Boolean(title || subtitle || icon || badge || headerActions || allowMaximize);

  return createPortal(
    <AnimatePresence>
      <div
        style={{ zIndex }}
        className={`fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain transition-colors duration-200 ${
          backdropClassName || 'bg-slate-950/60 backdrop-blur-sm'
        } ${className}`}
        onClick={(e) => {
          if (closeOnBackdropClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          ref={modalContainerRef}
          id={id}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-950/20 dark:shadow-black/60 flex flex-col transition-all duration-200 overflow-hidden ${
            isMaximized
              ? 'fixed inset-2 sm:inset-3 md:inset-4 w-auto h-auto max-w-none max-h-none rounded-2xl z-10'
              : `w-full ${SIZE_MAP[size]} rounded-2xl sm:rounded-3xl max-h-[min(94vh,900px)] my-auto`
          } ${contentClassName}`}
        >
          {/* Desktop Window Header */}
          {hasHeader && (
            <div
              onDoubleClick={toggleMaximize}
              title={allowMaximize ? "Double click title bar to expand or restore window" : undefined}
              className={`px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0 select-none ${headerClassName}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {icon && (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    iconBgColor || 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60'
                  }`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {typeof title === 'string' ? (
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {title}
                      </h2>
                    ) : (
                      title
                    )}
                    {badge && (
                      <div className="shrink-0">
                        {badge}
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {headerActions && (
                  <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
                    {headerActions}
                  </div>
                )}

                {/* Maximize / Restore Button for Desktop Screens */}
                {allowMaximize && (
                  <button
                    type="button"
                    onClick={toggleMaximize}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isMaximized ? "Restore Window (Alt+Enter)" : "Maximize Window (Alt+Enter)"}
                    aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
                  >
                    {isMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer group"
                  title="Close Window (Esc)"
                  aria-label="Close Window"
                >
                  <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Desktop Window Body - Flexible scroll area with custom scrollbar */}
          <div className={`p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar text-slate-700 dark:text-slate-200 ${bodyClassName}`}>
            {children}
          </div>

          {/* Desktop Window Footer */}
          {footer && (
            <div className={`px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0 ${footerClassName}`}>
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
