import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Landmark, 
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { ChequeRecord, BusinessProfile } from '../../types';
import { generateChequeWhatsAppText } from '../../utils/chequeReminders';
import { formatINR, formatDate } from '../../utils/formatters';

export type ChequeReminderType = 'DUE_TODAY' | 'UPCOMING_PDC' | 'BOUNCED' | 'CLEARANCE_NOTICE';

interface ChequeReminderDrawerModalProps {
  isOpen: boolean;
  cheque: ChequeRecord | null;
  business: BusinessProfile;
  initialType?: ChequeReminderType;
  onClose: () => void;
  onReminderSent?: (chequeId: string) => void;
}

export const ChequeReminderDrawerModal: React.FC<ChequeReminderDrawerModalProps> = ({
  isOpen,
  cheque,
  business,
  initialType = 'DUE_TODAY',
  onClose,
  onReminderSent
}: ChequeReminderDrawerModalProps) => {
  const [reminderType, setReminderType] = useState<ChequeReminderType>(initialType as ChequeReminderType);
  const [messageText, setMessageText] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (cheque) {
      // Choose smart default if initialType wasn't explicitly set
      let effectiveType: ChequeReminderType = (initialType || 'DUE_TODAY') as ChequeReminderType;
      if (cheque.status === 'BOUNCED') {
        effectiveType = 'BOUNCED';
      } else if (cheque.status === 'CLEARED') {
        effectiveType = 'CLEARANCE_NOTICE';
      }
      setReminderType(effectiveType);
      const generated = generateChequeWhatsAppText(cheque, business, effectiveType);
      setMessageText(generated);
      setRecipientPhone(cheque.partyPhone || '');
    }
  }, [cheque, initialType, business]);

  useEffect(() => {
    if (cheque) {
      const generated = generateChequeWhatsAppText(cheque, business, reminderType);
      setMessageText(generated);
    }
  }, [reminderType]);

  if (!isOpen || !cheque) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(messageText);
    let url = `https://api.whatsapp.com/send?text=${encodedText}`;
    if (cleanPhone) {
      const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;
    }
    window.open(url, '_blank');
    if (onReminderSent) {
      onReminderSent(cheque.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto animate-scale-in">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cheque Reminder & Notification
              </h2>
              <p className="text-xs text-slate-500">
                Send instant WhatsApp / SMS / Email notice to party
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Cheque Summary Pill */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                <Landmark className="w-3.5 h-3.5 text-blue-600" />
                <span>#{cheque.chequeNumber}</span>
                <span className="font-sans text-slate-500 font-normal">• {cheque.payeeName}</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                {cheque.bankName} • Date: {formatDate(cheque.chequeDate)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                {formatINR(cheque.amount)}
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                cheque.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-800' :
                cheque.status === 'BOUNCED' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {cheque.status}
              </span>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Notice Template Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setReminderType('DUE_TODAY')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  reminderType === 'DUE_TODAY'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Due Today</span>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('UPCOMING_PDC')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  reminderType === 'UPCOMING_PDC'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Upcoming PDC</span>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('BOUNCED')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  reminderType === 'BOUNCED'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Bounced</span>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('CLEARANCE_NOTICE')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  reminderType === 'CLEARANCE_NOTICE'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Cleared</span>
              </button>
            </div>
          </div>

          {/* Party Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Recipient Phone Number (Optional)
            </label>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Message Preview Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
