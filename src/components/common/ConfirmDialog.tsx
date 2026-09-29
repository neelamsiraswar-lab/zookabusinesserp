import React, { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Portal } from './Portal';

export interface ConfirmDialogOptions {
  title?: string;
  message?: string;
  itemName?: string;
  itemType?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface ConfirmDialogProps extends ConfirmDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName,
  itemType,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus confirm button when dialog opens
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancel();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'danger':
      default:
        return <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800';
      case 'danger':
      default:
        return 'bg-rose-100 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800';
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';
      case 'danger':
      default:
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20';
    }
  };

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div 
          className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getIconBg()}`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h3 
                id="confirm-dialog-title" 
                className="text-base font-bold text-slate-900 dark:text-white leading-snug"
              >
                {title}
              </h3>
              {itemType && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {itemType}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dialog Body */}
          <div className="p-4 sm:p-5 space-y-3">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {message}
            </p>

            {itemName && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-0.5">
                  Target Item
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                  {itemName}
                </span>
              </div>
            )}

            <div className="text-[11px] text-rose-700 dark:text-rose-400/90 font-medium flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Warning: This operation cannot be reverted.</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${getConfirmButtonClasses()}`}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {variant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
