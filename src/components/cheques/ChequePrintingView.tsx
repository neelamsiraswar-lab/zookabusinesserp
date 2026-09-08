import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ChequeRecord, 
  ChequeType, 
  ChequeStatus, 
  ChequeBook,
  ChequeClearancePayload,
  ChequeBouncePayload
} from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { getChequeReminderMetrics } from '../../utils/chequeReminders';
import { 
  IssueChequeModal 
} from './IssueChequeModal';
import { 
  ChequePrintModal 
} from './ChequePrintModal';
import { 
  ChequeBookManagerModal 
} from './ChequeBookManagerModal';
import { 
  ChequeCalibrationTab 
} from './ChequeCalibrationTab';
import { 
  ChequeClearanceModal 
} from './ChequeClearanceModal';
import { 
  ChequeBounceModal 
} from './ChequeBounceModal';
import { 
  ChequeReminderDrawerModal 
} from './ChequeReminderDrawerModal';
import { 
  ChequeReturnMemoModal 
} from './ChequeReturnMemoModal';
import { 
  Landmark, 
  Plus, 
  Printer, 
  Sliders,
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  FileText,
  Calendar,
  Send,
  MessageSquare,
  FileWarning,
  RotateCcw,
  Check,
  Bell,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

export const ChequePrintingView: React.FC = () => {
  const { 
    cheques, 
    chequeBooks, 
    business, 
    deleteCheque, 
    deleteChequeBook,
    updateChequeBook,
    updateCheque,
    markChequeAsPrinted,
    markChequeAsCleared,
    markChequeAsBounced,
    setActiveTab,
    showToast 
  } = useApp();

  // Active View Tab
  const [activeTab, setActiveTabState] = useState<'REGISTER' | 'ISSUED' | 'RECEIVED' | 'CHEQUE_BOOKS' | 'CALIBRATION'>('REGISTER');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CURRENT_FY'>('ALL');
  const [reminderQuickFilter, setReminderQuickFilter] = useState<'ALL' | 'DUE_TODAY' | 'UPCOMING_PDC' | 'OVERDUE' | 'STALE' | 'BOUNCED'>('ALL');

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [activeChequeForPrint, setActiveChequeForPrint] = useState<ChequeRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [calibrationChequeId, setCalibrationChequeId] = useState<string | null>(null);

  // Clearance Modal
  const [clearanceModalCheque, setClearanceModalCheque] = useState<ChequeRecord | null>(null);

  // Bounce Modal
  const [bounceModalCheque, setBounceModalCheque] = useState<ChequeRecord | null>(null);

  // Reminder / WhatsApp Notice Modal
  const [reminderModalCheque, setReminderModalCheque] = useState<ChequeRecord | null>(null);
  const [reminderNoticeType, setReminderNoticeType] = useState<'DUE_TODAY' | 'UPCOMING_PDC' | 'BOUNCED' | 'CLEARANCE_NOTICE'>('DUE_TODAY');

  // Return Memo Modal (Printable Cheque Return Advice)
  const [memoModalCheque, setMemoModalCheque] = useState<ChequeRecord | null>(null);

  // Deletion confirmation states
  const [chequeToDelete, setChequeToDelete] = useState<ChequeRecord | null>(null);
  const [bookToDelete, setBookToDelete] = useState<ChequeBook | null>(null);

  // Unique Banks for filter dropdown
  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    cheques.forEach(c => { if (c.bankName) set.add(c.bankName); });
    return Array.from(set);
  }, [cheques]);

  // Reminder Metrics Calculation
  const reminderMetrics = useMemo(() => {
    return getChequeReminderMetrics(cheques);
  }, [cheques]);

  // General Summary Metrics
  const metrics = useMemo(() => {
    let totalIssuedAmt = 0;
    let totalIssuedCount = 0;
    let totalReceivedAmt = 0;
    let totalReceivedCount = 0;
    let pendingClearanceAmt = 0;
    let pendingClearanceCount = 0;
    let clearedAmt = 0;
    let clearedCount = 0;
    let bouncedAmt = 0;
    let bouncedCount = 0;

    cheques.forEach(c => {
      if (c.status === 'BOUNCED') {
        bouncedAmt += c.amount;
        bouncedCount++;
        return;
      }
      if (c.status === 'CANCELLED') return;

      if (c.chequeType === 'PAYMENT_OUT' || c.chequeType === 'SELF_CASH') {
        totalIssuedAmt += c.amount;
        totalIssuedCount++;
      } else if (c.chequeType === 'PAYMENT_IN') {
        totalReceivedAmt += c.amount;
        totalReceivedCount++;
      }

      if (c.status === 'CLEARED') {
        clearedAmt += c.amount;
        clearedCount++;
      } else {
        pendingClearanceAmt += c.amount;
        pendingClearanceCount++;
      }
    });

    return {
      totalIssuedAmt,
      totalIssuedCount,
      totalReceivedAmt,
      totalReceivedCount,
      pendingClearanceAmt,
      pendingClearanceCount,
      clearedAmt,
      clearedCount,
      bouncedAmt,
      bouncedCount
    };
  }, [cheques]);

  // Filtered Cheques List
  const filteredCheques = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return cheques.filter(c => {
      // Tab filter
      if (activeTab === 'ISSUED' && c.chequeType !== 'PAYMENT_OUT' && c.chequeType !== 'SELF_CASH') return false;
      if (activeTab === 'RECEIVED' && c.chequeType !== 'PAYMENT_IN') return false;

      // Reminder Quick Filter
      if (reminderQuickFilter !== 'ALL') {
        const chqDate = new Date(c.chequeDate);
        chqDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((chqDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (reminderQuickFilter === 'DUE_TODAY') {
          if (c.status === 'CLEARED' || c.status === 'CANCELLED' || c.status === 'BOUNCED' || diffDays !== 0) {
            return false;
          }
        } else if (reminderQuickFilter === 'UPCOMING_PDC') {
          if (c.status === 'CLEARED' || c.status === 'CANCELLED' || c.status === 'BOUNCED' || diffDays <= 0 || diffDays > 7) {
            return false;
          }
        } else if (reminderQuickFilter === 'OVERDUE') {
          if (c.status === 'CLEARED' || c.status === 'CANCELLED' || c.status === 'BOUNCED' || diffDays >= -2 || diffDays < -89) {
            return false;
          }
        } else if (reminderQuickFilter === 'STALE') {
          if (c.status === 'CLEARED' || c.status === 'CANCELLED' || c.status === 'BOUNCED' || diffDays > -90) {
            return false;
          }
        } else if (reminderQuickFilter === 'BOUNCED') {
          if (c.status !== 'BOUNCED') return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

      // Bank filter
      if (bankFilter !== 'ALL' && c.bankName !== bankFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = (c.chequeNumber || '').toLowerCase().includes(q);
        const matchPayee = (c.payeeName || '').toLowerCase().includes(q);
        const matchBank = (c.bankName || '').toLowerCase().includes(q);
        const matchRef = (c.billReference || '').toLowerCase().includes(q);
        const matchMemo = (c.memo || '').toLowerCase().includes(q);
        const matchAmt = String(c.amount).includes(q);
        const matchReason = (c.bouncedReason || '').toLowerCase().includes(q);
        const matchClearRef = (c.clearanceReference || '').toLowerCase().includes(q);
        if (!matchNum && !matchPayee && !matchBank && !matchRef && !matchMemo && !matchAmt && !matchReason && !matchClearRef) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const chequeD = new Date(c.chequeDate);
        if (dateFilter === 'THIS_MONTH') {
          if (chequeD.getMonth() !== today.getMonth() || chequeD.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'LAST_30_DAYS') {
          const diffDays = (today.getTime() - chequeD.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        } else if (dateFilter === 'CURRENT_FY') {
          const curYear = today.getFullYear();
          const curMonth = today.getMonth();
          const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
          const fyStart = new Date(fyStartYear, 3, 1);
          const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
          if (chequeD < fyStart || chequeD > fyEnd) return false;
        }
      }

      return true;
    });
  }, [cheques, activeTab, reminderQuickFilter, statusFilter, bankFilter, searchQuery, dateFilter]);

  // Open Print Modal for a cheque
  const handleOpenPrint = (cheque: ChequeRecord) => {
    setActiveChequeForPrint(cheque);
    setIsPrintModalOpen(true);
  };

  // Open Calibration Studio with a specific cheque
  const handleOpenCalibration = (cheque?: ChequeRecord) => {
    if (cheque) {
      setCalibrationChequeId(cheque.id);
    }
    setActiveTabState('CALIBRATION');
  };

  // Open Reminder / WhatsApp Modal
  const handleOpenReminder = (cheque: ChequeRecord, type?: 'DUE_TODAY' | 'UPCOMING_PDC' | 'BOUNCED' | 'CLEARANCE_NOTICE') => {
    setReminderModalCheque(cheque);
    if (type) {
      setReminderNoticeType(type);
    } else {
      if (cheque.status === 'BOUNCED') {
        setReminderNoticeType('BOUNCED');
      } else if (cheque.status === 'CLEARED') {
        setReminderNoticeType('CLEARANCE_NOTICE');
      } else {
        const chqDate = new Date(cheque.chequeDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        chqDate.setHours(0, 0, 0, 0);
        if (chqDate.getTime() === today.getTime()) {
          setReminderNoticeType('DUE_TODAY');
        } else {
          setReminderNoticeType('UPCOMING_PDC');
        }
      }
    }
  };

  // Handle Cheque Creation Success
  const handleChequeCreated = (newCheque: ChequeRecord, openPrintNow?: boolean) => {
    if (openPrintNow) {
      setActiveChequeForPrint(newCheque);
      setIsPrintModalOpen(true);
    }
  };

  // Handle Clearance Confirmation from Modal
  const handleConfirmClearance = (id: string, payload: ChequeClearancePayload) => {
    markChequeAsCleared(id, payload);
    setClearanceModalCheque(null);
  };

  // Handle Bounce Confirmation from Modal
  const handleConfirmBounce = (id: string, payload: ChequeBouncePayload) => {
    markChequeAsBounced(id, payload);
    setBounceModalCheque(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Cheque Printing & Management
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  CTS-2010
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Auto-Ledger Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Print Indian bank cheques, manage cheque reminders, track clear & bounce statuses, and reconcile accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsBookModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Cheque Books ({chequeBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsIssueModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue & Print Cheque</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Issued */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cheques Issued (Out)
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {formatINR(metrics.totalIssuedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-rose-600">{metrics.totalIssuedCount}</span> issued out
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Received */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cheques Received (In)
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {formatINR(metrics.totalReceivedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-emerald-600">{metrics.totalReceivedCount}</span> received in
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Clearance */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Clearance
            </span>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatINR(metrics.pendingClearanceAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-amber-600">{metrics.pendingClearanceCount}</span> uncleared / in-transit
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Cleared & Settled */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cleared & Settled
            </span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatINR(metrics.clearedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-emerald-600">{metrics.clearedCount}</span> reconciled
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Bounced Cheques */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bounced / Returned
            </span>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {formatINR(metrics.bouncedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-rose-600">{metrics.bouncedCount}</span> returned unpaid
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* CHEQUE REMINDERS & ACTION CENTER BANNER */}
      {reminderMetrics.totalActionRequiredCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Cheque Reminder & Realization Center</span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {reminderMetrics.totalActionRequiredCount} action items
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Track cheques due today, upcoming post-dated instruments, and bounced cheque recovery notices.
                </p>
              </div>
            </div>

            {reminderQuickFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setReminderQuickFilter('ALL')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start md:self-auto"
              >
                <span>Clear Reminder Filter</span>
              </button>
            )}
          </div>

          {/* Action Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            
            {/* Due Today Chip */}
            <button
              type="button"
              onClick={() => setReminderQuickFilter(prev => prev === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY')}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                reminderQuickFilter === 'DUE_TODAY'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={reminderQuickFilter === 'DUE_TODAY' ? 'text-white' : 'text-blue-700 dark:text-blue-300'}>
                  Due Today
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  reminderQuickFilter === 'DUE_TODAY' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                }`}>
                  {reminderMetrics.dueToday.length}
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                {reminderMetrics.dueToday.length > 0
                  ? formatINR(reminderMetrics.dueToday.reduce((acc, c) => acc + c.amount, 0))
                  : 'No cheques today'}
              </div>
            </button>

            {/* Upcoming PDC Chip */}
            <button
              type="button"
              onClick={() => setReminderQuickFilter(prev => prev === 'UPCOMING_PDC' ? 'ALL' : 'UPCOMING_PDC')}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                reminderQuickFilter === 'UPCOMING_PDC'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={reminderQuickFilter === 'UPCOMING_PDC' ? 'text-white' : 'text-indigo-700 dark:text-indigo-300'}>
                  Upcoming PDC (7d)
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  reminderQuickFilter === 'UPCOMING_PDC' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                }`}>
                  {reminderMetrics.upcomingPdc.length}
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                {reminderMetrics.upcomingPdc.length > 0
                  ? formatINR(reminderMetrics.upcomingPdc.reduce((acc, c) => acc + c.amount, 0))
                  : 'No upcoming PDC'}
              </div>
            </button>

            {/* Overdue Uncleared Chip */}
            <button
              type="button"
              onClick={() => setReminderQuickFilter(prev => prev === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                reminderQuickFilter === 'OVERDUE'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={reminderQuickFilter === 'OVERDUE' ? 'text-white' : 'text-amber-700 dark:text-amber-300'}>
                  Pending &gt; 3 Days
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  reminderQuickFilter === 'OVERDUE' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {reminderMetrics.overdueUncleared.length}
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                {reminderMetrics.overdueUncleared.length > 0
                  ? formatINR(reminderMetrics.overdueUncleared.reduce((acc, c) => acc + c.amount, 0))
                  : 'None pending'}
              </div>
            </button>

            {/* Stale Cheques (>90 Days) Chip */}
            <button
              type="button"
              onClick={() => setReminderQuickFilter(prev => prev === 'STALE' ? 'ALL' : 'STALE')}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                reminderQuickFilter === 'STALE'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={reminderQuickFilter === 'STALE' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}>
                  Stale (&gt;90 Days)
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  reminderQuickFilter === 'STALE' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {reminderMetrics.staleCheques.length}
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                {reminderMetrics.staleCheques.length > 0 ? 'CTS Expired' : 'Zero stale cheques'}
              </div>
            </button>

            {/* Bounced Action Chip */}
            <button
              type="button"
              onClick={() => setReminderQuickFilter(prev => prev === 'BOUNCED' ? 'ALL' : 'BOUNCED')}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between col-span-2 sm:col-span-1 ${
                reminderQuickFilter === 'BOUNCED'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={reminderQuickFilter === 'BOUNCED' ? 'text-white' : 'text-rose-700 dark:text-rose-300'}>
                  Bounced Follow-up
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  reminderQuickFilter === 'BOUNCED' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                }`}>
                  {reminderMetrics.recentlyBounced.length}
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                {reminderMetrics.recentlyBounced.length > 0 ? 'Recovery action needed' : 'All clear'}
              </div>
            </button>

          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
          {[
            { id: 'REGISTER', label: 'All Cheques Register', count: cheques.length },
            { id: 'ISSUED', label: 'Cheques Issued', count: cheques.filter(c => c.chequeType !== 'PAYMENT_IN').length },
            { id: 'RECEIVED', label: 'Cheques Received', count: cheques.filter(c => c.chequeType === 'PAYMENT_IN').length },
            { id: 'CHEQUE_BOOKS', label: 'Cheque Books', count: chequeBooks.length },
            { id: 'CALIBRATION', label: 'Print Calibration Studio' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTabState(tab.id as any);
                setReminderQuickFilter('ALL');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CALIBRATION TAB */}
      {activeTab === 'CALIBRATION' && (
        <ChequeCalibrationTab 
          initialChequeId={calibrationChequeId || undefined}
          onBack={() => setActiveTabState('REGISTER')}
        />
      )}

      {/* CHEQUE BOOKS TAB */}
      {activeTab === 'CHEQUE_BOOKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Bank Cheque Books Overview
              </h3>
              <p className="text-xs text-slate-500">
                Register bank cheque series to auto-increment cheque numbers during issuance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBookModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Cheque Book</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chequeBooks.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No cheque books added yet</p>
                <p className="text-xs text-slate-500 mt-1">Click "Register New Cheque Book" above to set up your leaf series.</p>
              </div>
            ) : (
              chequeBooks.map(book => {
                const startNum = parseInt(book.startChequeNo, 10);
                const currentNum = parseInt(book.currentChequeNo, 10);
                const used = Math.max(0, currentNum - startNum);
                const remaining = Math.max(0, book.totalLeaves - used);
                const progressPct = Math.min(100, Math.round((used / book.totalLeaves) * 100));

                return (
                  <div
                    key={book.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {book.bankName}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            book.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {book.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          A/C: {book.accountNumber || 'Primary Bank Account'}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Series Range:</span>
                        <strong className="text-slate-800 dark:text-slate-200">#{book.startChequeNo} - #{book.endChequeNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Next Cheque #:</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-bold">#{book.currentChequeNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Leaves:</span>
                        <span className="text-slate-800 dark:text-slate-200">{book.totalLeaves} leaves</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>{used} Used</span>
                        <span>{remaining} Remaining</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            progressPct > 90 ? 'bg-rose-500' : progressPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const newStatus = book.status === 'ACTIVE' ? 'EXHAUSTED' : 'ACTIVE';
                          updateChequeBook(book.id, { status: newStatus });
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        {book.status === 'ACTIVE' ? 'Mark Exhausted' : 'Activate Series'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBookToDelete(book)}
                        title="Delete Cheque Book"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* REGISTER / ISSUED / RECEIVED TABLE TAB */}
      {(activeTab === 'REGISTER' || activeTab === 'ISSUED' || activeTab === 'RECEIVED') && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Cheque #, Payee, Bank, Ref #, Amount, Return Reason..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setReminderQuickFilter('ALL');
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PRINTED">Printed</option>
                <option value="CLEARED">Cleared</option>
                <option value="BOUNCED">Bounced / Returned</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Bank Filter */}
              {uniqueBanks.length > 0 && (
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Banks</option>
                  {uniqueBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Dates</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="CURRENT_FY">Current FY</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Cheque #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Payee / Client Name</th>
                    <th className="py-3.5 px-4">Bank Account</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 text-right">Amount ({business.currencySymbol})</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ledger Sync</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredCheques.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold">No cheques found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {searchQuery || reminderQuickFilter !== 'ALL' 
                            ? 'No cheques match the current filter or search criteria.' 
                            : 'Click "Issue & Print Cheque" to record your first cheque.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCheques.map(cheque => {
                      const isPaymentOut = cheque.chequeType === 'PAYMENT_OUT' || cheque.chequeType === 'SELF_CASH';
                      const chqDate = new Date(cheque.chequeDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      chqDate.setHours(0, 0, 0, 0);
                      const isDueToday = chqDate.getTime() === today.getTime() && cheque.status !== 'CLEARED' && cheque.status !== 'BOUNCED' && cheque.status !== 'CANCELLED';

                      return (
                        <tr
                          key={cheque.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            cheque.status === 'BOUNCED' ? 'bg-rose-50/20 dark:bg-rose-950/10' :
                            isDueToday ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                          }`}
                        >
                          {/* Cheque # */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-blue-600 dark:text-blue-400">#{cheque.chequeNumber}</span>
                              {cheque.isAccountPayeeOnly && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" title="A/C Payee Only">
                                  A/C
                                </span>
                              )}
                              {isDueToday && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 animate-pulse">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {formatDate(cheque.chequeDate)}
                          </td>

                          {/* Payee Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[200px]">
                              {cheque.payeeName}
                            </div>
                            {cheque.partyName && cheque.partyName !== cheque.payeeName && (
                              <div className="text-[10px] text-slate-400">
                                Party: {cheque.partyName}
                              </div>
                            )}
                            {cheque.billReference && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                Ref: {cheque.billReference}
                              </div>
                            )}
                          </td>

                          {/* Bank */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold">{cheque.bankName}</div>
                            {cheque.accountNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                A/C: ••••{cheque.accountNumber.slice(-4)}
                              </div>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              cheque.chequeType === 'PAYMENT_OUT'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                : cheque.chequeType === 'PAYMENT_IN'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            }`}>
                              {cheque.chequeType === 'PAYMENT_OUT' ? 'Out (Issued)' : cheque.chequeType === 'PAYMENT_IN' ? 'In (Received)' : 'Self Cash'}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatINR(cheque.amount)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {cheque.status === 'CLEARED' ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>CLEARED</span>
                                </span>
                                {cheque.clearedAt && (
                                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                                    {formatDate(cheque.clearedAt)}
                                  </span>
                                )}
                              </div>
                            ) : cheque.status === 'BOUNCED' ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 inline-flex items-center gap-1" title={cheque.bouncedReason}>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>BOUNCED</span>
                                </span>
                                <span className="text-[9px] text-rose-600 dark:text-rose-400 truncate max-w-[110px] mt-0.5" title={cheque.bouncedReason}>
                                  {cheque.bouncedReason || 'Unpaid'}
                                </span>
                              </div>
                            ) : cheque.status === 'PRINTED' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 inline-flex items-center gap-1">
                                <Printer className="w-3 h-3" />
                                <span>PRINTED</span>
                              </span>
                            ) : cheque.status === 'ISSUED' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>ISSUED</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                {cheque.status}
                              </span>
                            )}
                          </td>

                          {/* Ledger Sync Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {cheque.autoPostLedger ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full" title="Ledger & Accounting Entry Created">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Synced</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Manual</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              
                              {/* Print Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPrint(cheque)}
                                title="Print Cheque Instrument"
                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Layout Studio Calibration */}
                              <button
                                type="button"
                                onClick={() => handleOpenCalibration(cheque)}
                                title="Calibrate Layout in Cheque Studio"
                                className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>

                              {/* Send Reminder / WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleOpenReminder(cheque)}
                                title="Send WhatsApp Reminder / Notice"
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>

                              {/* Mark Cleared Action */}
                              {cheque.status !== 'CLEARED' && (
                                <button
                                  type="button"
                                  onClick={() => setClearanceModalCheque(cheque)}
                                  title="Mark as Cleared in Bank"
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Mark Bounced Action */}
                              {cheque.status !== 'BOUNCED' && cheque.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => setBounceModalCheque(cheque)}
                                  title="Record Cheque Bounce / Return Memo"
                                  className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}

                              {/* View Return Memo (For Bounced Cheques) */}
                              {cheque.status === 'BOUNCED' && (
                                <button
                                  type="button"
                                  onClick={() => setMemoModalCheque(cheque)}
                                  title="Print Return Advice Memo"
                                  className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                                >
                                  <FileWarning className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Cheque */}
                              <button
                                type="button"
                                onClick={() => setChequeToDelete(cheque)}
                                title="Delete Cheque"
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE CHEQUE MODAL */}
      <IssueChequeModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={handleChequeCreated}
      />

      {/* CHEQUE PRINT PREVIEW MODAL */}
      <ChequePrintModal
        isOpen={isPrintModalOpen}
        cheque={activeChequeForPrint}
        onClose={() => {
          setIsPrintModalOpen(false);
          setActiveChequeForPrint(null);
        }}
        onMarkPrinted={(id) => markChequeAsPrinted(id)}
        onOpenCalibration={(chq) => handleOpenCalibration(chq)}
      />

      {/* CHEQUE BOOK MANAGER MODAL */}
      <ChequeBookManagerModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
      />

      {/* CHEQUE CLEARANCE MODAL */}
      <ChequeClearanceModal
        isOpen={!!clearanceModalCheque}
        cheque={clearanceModalCheque}
        currencySymbol={business.currencySymbol}
        onClose={() => setClearanceModalCheque(null)}
        onConfirmClearance={handleConfirmClearance}
      />

      {/* CHEQUE BOUNCE MODAL */}
      <ChequeBounceModal
        isOpen={!!bounceModalCheque}
        cheque={bounceModalCheque}
        business={business}
        currencySymbol={business.currencySymbol}
        onClose={() => setBounceModalCheque(null)}
        onConfirmBounce={handleConfirmBounce}
        onOpenReminderNotice={(chq, type) => {
          setBounceModalCheque(null);
          handleOpenReminder(chq, type);
        }}
      />

      {/* CHEQUE REMINDER DRAWER MODAL */}
      <ChequeReminderDrawerModal
        isOpen={!!reminderModalCheque}
        cheque={reminderModalCheque}
        business={business}
        initialType={reminderNoticeType}
        onClose={() => setReminderModalCheque(null)}
        onReminderSent={(id) => {
          updateCheque(id, { reminderSentAt: new Date().toISOString() });
          showToast('success', 'Reminder Logged', 'Reminder notification recorded for cheque.');
        }}
      />

      {/* CHEQUE RETURN ADVICE MEMO MODAL */}
      <ChequeReturnMemoModal
        isOpen={!!memoModalCheque}
        cheque={memoModalCheque}
        business={business}
        currencySymbol={business.currencySymbol}
        onClose={() => setMemoModalCheque(null)}
      />

      {/* CHEQUE DELETION MODAL */}
      {chequeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Remove Cheque #{chequeToDelete.chequeNumber}?
                </h3>
                <p className="text-xs text-slate-500">
                  {chequeToDelete.payeeName} • {formatINR(chequeToDelete.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this cheque from the register? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChequeToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteCheque(chequeToDelete.id);
                  setChequeToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Cheque</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHEQUE BOOK DELETION MODAL */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Delete Cheque Book Series?
                </h3>
                <p className="text-xs text-slate-500">
                  {bookToDelete.bankName} • #{bookToDelete.startChequeNo} - #{bookToDelete.endChequeNo}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to remove this cheque book? Any already recorded cheques in this series will remain in your register.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteChequeBook(bookToDelete.id);
                  setBookToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Cheque Book</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
