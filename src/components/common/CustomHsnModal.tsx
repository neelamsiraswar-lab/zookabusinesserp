import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomHsnCode, GstTaxRate } from '../../types';
import { STANDARD_UNITS, COMMON_HSN_CODES } from '../../utils/constants';
import { ModalWrapper } from './Portal';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Check, 
  Upload, 
  FileSpreadsheet, 
  Tag, 
  Layers, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Sparkles,
  Cloud
} from 'lucide-react';

interface CustomHsnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHsn?: (hsn: CustomHsnCode) => void;
  initialQuery?: string;
}

export const CustomHsnModal: React.FC<CustomHsnModalProps> = ({
  isOpen,
  onClose,
  onSelectHsn,
  initialQuery = ''
}) => {
  const { 
    customHsnCodes, 
    addCustomHsnCode, 
    updateCustomHsnCode, 
    deleteCustomHsnCode, 
    bulkImportCustomHsnCodes,
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ADD' | 'IMPORT' | 'TARIFF_DIRECTORY'>('LIST');
  const [filterType, setFilterType] = useState<'ALL' | 'HSN' | 'SAC'>('ALL');

  // Form State for Add / Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'HSN' | 'SAC'>('HSN');
  const [gstRate, setGstRate] = useState<GstTaxRate>(18);
  const [uqc, setUqc] = useState('PCS');

  // Bulk Import text state
  const [importText, setImportText] = useState('');

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setDescription('');
    setType('HSN');
    setGstRate(18);
    setUqc('PCS');
  };

  const handleOpenAdd = () => {
    resetForm();
    if (searchQuery && /^[0-9a-zA-Z]+$/.test(searchQuery.trim())) {
      setCode(searchQuery.trim().toUpperCase());
    }
    setActiveTab('ADD');
  };

  const handleEdit = (item: CustomHsnCode) => {
    setEditingId(item.id);
    setCode(item.code);
    setDescription(item.description);
    setType(item.type || (item.code.startsWith('99') ? 'SAC' : 'HSN'));
    setGstRate(item.gstRate);
    setUqc(item.uqc || 'PCS');
    setActiveTab('ADD');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanDesc = description.trim();

    if (!cleanCode) {
      showToast('error', 'Validation Error', 'Please enter an HSN or SAC code.');
      return;
    }
    if (!cleanDesc) {
      showToast('error', 'Validation Error', 'Please enter a description for the HSN/SAC code.');
      return;
    }

    if (editingId) {
      updateCustomHsnCode(editingId, {
        code: cleanCode,
        description: cleanDesc,
        type,
        gstRate,
        uqc
      });
      showToast('success', 'HSN/SAC Updated', `Updated code ${cleanCode}`);
    } else {
      // Check duplicate
      const exists = customHsnCodes.some(c => c.code.toLowerCase() === cleanCode.toLowerCase());
      if (exists) {
        showToast('warning', 'Already Exists', `Custom code ${cleanCode} already exists in your directory.`);
      } else {
        addCustomHsnCode({
          code: cleanCode,
          description: cleanDesc,
          type,
          gstRate,
          uqc,
          isCustom: true
        });
        showToast('success', 'Custom Code Added', `Added ${cleanCode} (${type}) to directory.`);
      }
    }

    resetForm();
    setActiveTab('LIST');
  };

  const handleDelete = (item: CustomHsnCode) => {
    if (window.confirm(`Are you sure you want to delete custom HSN/SAC code ${item.code}?`)) {
      deleteCustomHsnCode(item.id);
      showToast('info', 'Code Deleted', `Removed ${item.code} from custom directory.`);
    }
  };

  const handleBulkImport = () => {
    if (!importText.trim()) {
      showToast('error', 'Import Empty', 'Please paste CSV or text lines with HSN codes.');
      return;
    }

    const lines = importText.split('\n');
    const itemsToAdd: Omit<CustomHsnCode, 'id'>[] = [];

    lines.forEach(line => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const itemCode = parts[0].toUpperCase();
        if (itemCode.toLowerCase() === 'code' || itemCode.toLowerCase() === 'hsn') return; // skip header
        
        const itemDesc = parts[1];
        const rawGst = parts[2] ? parseInt(parts[2].replace(/[^0-9]/g, '')) : 18;
        const validGst: GstTaxRate = [0, 5, 12, 18, 28].includes(rawGst) ? (rawGst as GstTaxRate) : 18;
        const itemUqc = parts[3] ? parts[3].toUpperCase() : (itemCode.startsWith('99') ? 'OTH' : 'PCS');
        const itemType = itemCode.startsWith('99') ? 'SAC' : 'HSN';

        if (itemCode && itemDesc) {
          itemsToAdd.push({
            code: itemCode,
            description: itemDesc,
            type: itemType,
            gstRate: validGst,
            uqc: itemUqc,
            isCustom: true
          });
        }
      }
    });

    if (itemsToAdd.length === 0) {
      showToast('error', 'Invalid Format', 'No valid rows found. Format: Code, Description, GST Slab, Unit');
      return;
    }

    const added = bulkImportCustomHsnCodes(itemsToAdd);
    showToast('success', 'Import Successful', `Added/updated ${added} custom HSN/SAC codes.`);
    setImportText('');
    setActiveTab('LIST');
  };

  const handleCopyStandardTariff = (tariff: { code: string; description: string; defaultGst: number }) => {
    const isSac = tariff.code.startsWith('99');
    addCustomHsnCode({
      code: tariff.code,
      description: tariff.description,
      type: isSac ? 'SAC' : 'HSN',
      gstRate: tariff.defaultGst as GstTaxRate,
      uqc: isSac ? 'OTH' : 'PCS',
      isCustom: true
    });
    showToast('success', 'Added to Custom Directory', `Copied ${tariff.code} to your business directory.`);
  };

  // Filtered List
  const filteredCustomCodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customHsnCodes.filter(item => {
      const matchType = filterType === 'ALL' || item.type === filterType;
      const matchQuery = !q || 
        item.code.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [customHsnCodes, searchQuery, filterType]);

  const filteredStandardTariff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COMMON_HSN_CODES.filter(item => {
      return !q || item.code.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
  }, [searchQuery]);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} zIndex={9999}>
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[min(92vh,92dvh)] my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">Custom HSN & SAC Code Directory</h3>
                <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  GST Master
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Define, manage, and use your own custom Goods HSN and Service SAC codes for products & billing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold shrink-0 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setActiveTab('LIST'); resetForm(); }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LIST'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Custom Directory ({customHsnCodes.length})</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ADD'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Edit Code' : 'Add Custom Code'}</span>
            </button>

            <button
              onClick={() => setActiveTab('IMPORT')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'IMPORT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>

            <button
              onClick={() => setActiveTab('TARIFF_DIRECTORY')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'TARIFF_DIRECTORY'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tariff Lookup</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* TAB 1: LIST */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search code or description..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                  {(['ALL', 'HSN', 'SAC'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filterType === t
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t === 'ALL' ? 'All Types' : t === 'HSN' ? 'Goods (HSN)' : 'Services (SAC)'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New</span>
                  </button>
                </div>
              </div>

              {filteredCustomCodes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">No Custom HSN/SAC Codes Found</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      You haven't defined any custom codes yet or none match your search. Add custom codes or browse standard tariff templates.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Custom Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('TARIFF_DIRECTORY')}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Browse Tariff Directory</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 font-mono">HSN / SAC Code</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-center">GST Slab</th>
                        <th className="py-2.5 px-3 text-center">UQC Unit</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomCodes.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.type === 'SAC' 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}>
                              {item.type || (item.code.startsWith('99') ? 'SAC' : 'HSN')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 max-w-xs truncate">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 text-[11px]">
                              {item.gstRate}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                            {item.uqc || 'PCS'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onSelectHsn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectHsn(item);
                                    onClose();
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] border border-emerald-200 cursor-pointer flex items-center gap-1 mr-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Apply</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Code"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Code"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD / EDIT FORM */}
          {activeTab === 'ADD' && (
            <form onSubmit={handleSave} className="space-y-4 max-w-xl mx-auto py-2">
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {editingId ? 'Modify custom HSN / SAC properties' : 'Create a new custom HSN / SAC code for your catalog & billing'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code Type */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Classification Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      type === 'HSN' 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="hsnType"
                        checked={type === 'HSN'}
                        onChange={() => {
                          setType('HSN');
                          if (uqc === 'OTH') setUqc('PCS');
                        }}
                        className="text-indigo-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">HSN Code (Goods)</div>
                        <div className="text-[10px] text-slate-500">2, 4, 6, or 8 digits for physical items</div>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      type === 'SAC' 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="hsnType"
                        checked={type === 'SAC'}
                        onChange={() => {
                          setType('SAC');
                          setUqc('OTH');
                        }}
                        className="text-indigo-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">SAC Code (Services)</div>
                        <div className="text-[10px] text-slate-500">Service Accounting Code (starts with 99)</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* HSN / SAC Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === 'HSN' ? 'HSN Code' : 'SAC Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={type === 'HSN' ? 'e.g. 8471, 1006, 3004' : 'e.g. 9983, 9954, 9982'}
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Any numeric or custom alphanumeric code
                  </span>
                </div>

                {/* Prescribed GST Rate */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Tax Slab *
                  </label>
                  <select
                    value={gstRate}
                    onChange={e => setGstRate(Number(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>0% (Exempt / Nil Rated)</option>
                    <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                    <option value={12}>12% GST (6% CGST + 6% SGST)</option>
                    <option value={18}>18% GST (9% CGST + 9% SGST)</option>
                    <option value={28}>28% GST (14% CGST + 14% SGST)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Default slab auto-applied to invoices
                  </span>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description / Item Specification *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer hardware, Cloud software consulting, Custom fabricated metal"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Default UQC Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default UQC Unit of Measure
                  </label>
                  <select
                    value={uqc}
                    onChange={e => setUqc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="OTH">OTH (Others / Services)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab('LIST'); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Update Code' : 'Save Custom Code'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BULK IMPORT */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Bulk Import Custom HSN/SAC Codes</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Paste rows copied from Excel, Google Sheets, or CSV text.
                  Format per line: <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">HSN_CODE, Description, GST_Rate, Unit</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paste CSV / Tab-Separated Data:
                </label>
                <textarea
                  rows={8}
                  placeholder={`8471, Electronic Computing Devices, 18, PCS\n9983, Custom Web & Mobile App Development, 18, OTH\n1006, Premium Basmati Rice, 5, KGS\n3004, Pharmaceutical Capsules, 12, BOX`}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Back to List
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Parse & Import Codes</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: STANDARD TARIFF LOOKUP */}
          {activeTab === 'TARIFF_DIRECTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">GST Tariff Directory Reference</h4>
                  <p className="text-[11px] text-slate-500">
                    Click "+ Add to Custom Directory" to copy any standard code into your personal business master.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 font-mono">Standard Code</th>
                      <th className="py-2.5 px-3">Tariff Description</th>
                      <th className="py-2.5 px-3 text-center">GST Slab</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStandardTariff.map(tariff => {
                      const alreadyInCustom = customHsnCodes.some(c => c.code === tariff.code);
                      return (
                        <tr key={tariff.code} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                            {tariff.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {tariff.description}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 text-[11px]">
                              {tariff.defaultGst}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {alreadyInCustom ? (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                                <Check className="w-3 h-3" />
                                <span>In Directory</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCopyStandardTariff(tariff)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                              >
                                + Add to Custom
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-slate-700">Cloud Database Synced:</span>
            <span>Custom HSN & SAC codes automatically persist to Cloud Firestore</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
};
