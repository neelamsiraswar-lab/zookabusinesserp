import React, { useState } from 'react';
import { ChequeBook } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatChequeNumber } from '../../utils/chequeConstants';
import { 
  X, 
  BookOpen, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Building2, 
  CreditCard,
  Hash
} from 'lucide-react';

interface ChequeBookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChequeBookManagerModal: React.FC<ChequeBookManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    chequeBooks, 
    createChequeBook, 
    deleteChequeBook, 
    updateChequeBook, 
    business, 
    showToast 
  } = useApp();

  const [isAddingNew, setIsAddingNew] = useState<boolean>(chequeBooks.length === 0);
  const [bankName, setBankName] = useState<string>(business.bankName || 'HDFC Bank Ltd');
  const [accountNumber, setAccountNumber] = useState<string>(business.accountNumber || '');
  const [startChequeNo, setStartChequeNo] = useState<string>('000101');
  const [totalLeaves, setTotalLeaves] = useState<number>(50);
  const [notes, setNotes] = useState<string>('');

  // Delete confirmation modal state
  const [bookToDelete, setBookToDelete] = useState<ChequeBook | null>(null);

  if (!isOpen) return null;

  // Calculate ending cheque number
  const startInt = parseInt(startChequeNo, 10) || 1;
  const endChequeNo = formatChequeNumber(startInt + totalLeaves - 1);

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName.trim()) {
      showToast('error', 'Missing Bank Name', 'Please specify the bank name.');
      return;
    }

    if (!startChequeNo.trim() || totalLeaves <= 0) {
      showToast('error', 'Invalid Input', 'Please enter valid starting cheque number and leaf count.');
      return;
    }

    const formattedStart = formatChequeNumber(startChequeNo);

    createChequeBook({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      startChequeNo: formattedStart,
      endChequeNo,
      totalLeaves,
      currentChequeNo: formattedStart,
      status: 'ACTIVE',
      notes: notes.trim() || undefined
    });

    setIsAddingNew(false);
  };

  const handleConfirmDelete = () => {
    if (!bookToDelete) return;
    deleteChequeBook(bookToDelete.id);
    setBookToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                Bank Cheque Books Register
              </h3>
              <p className="text-xs text-slate-500">
                Track cheque book series, available leaves & sequential issuance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Top action */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Configured Cheque Books ({chequeBooks.length})
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'View Existing Books' : 'Add New Cheque Book'}</span>
            </button>
          </div>

          {/* New Book Form */}
          {isAddingNew && (
            <form onSubmit={handleCreateBook} className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-2xl space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
                <Plus className="w-4 h-4" />
                <span>Register New Cheque Book Series</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50200000000000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Starting Cheque # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={startChequeNo}
                    onChange={(e) => setStartChequeNo(e.target.value)}
                    placeholder="000101"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold tracking-widest text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Leaves / Count <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={totalLeaves}
                    onChange={(e) => setTotalLeaves(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value={20}>20 Leaves</option>
                    <option value={25}>25 Leaves</option>
                    <option value={50}>50 Leaves</option>
                    <option value={100}>100 Leaves</option>
                    <option value={200}>200 Leaves</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Calculated Ending Cheque #
                  </label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-600 dark:text-slate-300">
                    #{endChequeNo}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Book Description / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. HDFC Current A/c Cheque Book #3 received on Aug 2026"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save & Register Cheque Book
                </button>
              </div>
            </form>
          )}

          {/* List of Cheque Books */}
          <div className="space-y-3">
            {chequeBooks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No cheque books added yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Add your bank cheque book series above to track leaf usage and auto-fill sequential cheque numbers.
                </p>
              </div>
            ) : (
              chequeBooks.map(book => {
                const startNum = parseInt(book.startChequeNo, 10);
                const currentNum = parseInt(book.currentChequeNo, 10);
                const endNum = parseInt(book.endChequeNo, 10);
                const used = Math.max(0, currentNum - startNum);
                const remaining = Math.max(0, book.totalLeaves - used);
                const progressPct = Math.min(100, Math.round((used / book.totalLeaves) * 100));

                return (
                  <div
                    key={book.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {book.bankName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                          #{book.startChequeNo} - #{book.endChequeNo}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          book.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {book.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-mono">
                        A/C: {book.accountNumber || 'Primary Account'} • Next Cheque: <strong className="text-blue-600 dark:text-blue-400 font-bold">#{book.currentChequeNo}</strong>
                      </div>

                      {book.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          {book.notes}
                        </p>
                      )}
                    </div>

                    {/* Progress & Actions */}
                    <div className="flex items-center gap-6">
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span>{used} Used</span>
                          <span>{remaining} Left</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progressPct > 90 ? 'bg-rose-500' : progressPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newStatus = book.status === 'ACTIVE' ? 'EXHAUSTED' : 'ACTIVE';
                            updateChequeBook(book.id, { status: newStatus });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          {book.status === 'ACTIVE' ? 'Mark Exhausted' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setBookToDelete(book)}
                          title="Delete Cheque Book"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
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
                  {bookToDelete.bankName} • Series #{bookToDelete.startChequeNo} - #{bookToDelete.endChequeNo}
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
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
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
