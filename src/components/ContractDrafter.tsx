import React, { useState, useEffect } from 'react';
import { CompanyContext, Clause, DraftVersion, AppView } from '../types';
import { draftContract } from '../services/geminiService';
import { FilePlus, Send, Copy, FileText, Loader2, Download, Trash2, CheckCircle, BookTemplate, AlertCircle, BookMarked, Plus, X, History, RotateCcw, Check, Shield, Briefcase, ChevronDown, FileDown } from 'lucide-react';
import { readDocumentContent } from '../services/fileService';
import { saveToHistory } from '../services/historyService';
import { exportToWord } from '../services/exportService';
import ConfirmationModal from './ui/ConfirmationModal';
import { useToast } from '../context/ToastContext';

interface ContractDrafterProps {
  context: CompanyContext;
  onUpdateContext?: (ctx: CompanyContext) => void;
  onChangeView?: (view: AppView) => void;
}

const ContractDrafter: React.FC<ContractDrafterProps> = ({ context, onUpdateContext, onChangeView }) => {
  // Initialize from localStorage
  const [template, setTemplate] = useState(() => localStorage.getItem('lexguard_draft_template') || '');
  const [instruction, setInstruction] = useState(() => localStorage.getItem('lexguard_draft_instruction') || '');
  const [draft, setDraft] = useState(() => localStorage.getItem('lexguard_draft_result') || '');
  
  // Versions State
  const [versions, setVersions] = useState<DraftVersion[]>(() => {
      try {
          const saved = localStorage.getItem('lexguard_draft_versions');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  const [showVersions, setShowVersions] = useState(false);
  
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const { addToast } = useToast();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<DraftVersion | null>(null);
  const [showDeleteVersionConfirm, setShowDeleteVersionConfirm] = useState<string | null>(null);

  const [showRules, setShowRules] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddContent, setQuickAddContent] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const handleQuickAddRule = () => {
    if (!quickAddContent.trim() || !onUpdateContext || !context) return;

    const newRule = {
      id: crypto.randomUUID(),
      content: quickAddContent,
      category: quickAddTitle || 'Geçici Madde',
      isActive: true,
      dateAdded: Date.now(),
      isTemporaryContract: true
    };

    const updatedRules = [...(context.customRules || []), newRule];
    onUpdateContext({ ...context, customRules: updatedRules });
    
    setQuickAddTitle('');
    setQuickAddContent('');
    setIsQuickAdding(false);
    addToast('Kural eklendi.', 'success');
  };

  // Clause Modal State
  const [showClauseModal, setShowClauseModal] = useState(false);
  const [libraryClauses, setLibraryClauses] = useState<Clause[]>([]);

  // Save to localStorage
  useEffect(() => { localStorage.setItem('lexguard_draft_template', template); }, [template]);
  useEffect(() => { localStorage.setItem('lexguard_draft_instruction', instruction); }, [instruction]);
  useEffect(() => { localStorage.setItem('lexguard_draft_result', draft); }, [draft]);
  useEffect(() => { localStorage.setItem('lexguard_draft_versions', JSON.stringify(versions)); }, [versions]);

  useEffect(() => {
      if (showClauseModal) {
          const saved = localStorage.getItem('lexguard_clauses');
          if (saved) {
              setLibraryClauses(JSON.parse(saved));
          }
      }
  }, [showClauseModal]);

  const handleMasterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      setSelectedMasterId(id);
      setUploadedFileName(''); 
      if (id) {
          const master = context.masterContracts?.find(m => m.id === id);
          if (master) {
              setTemplate(master.content);
          }
      }
  };

  const handleDraft = async () => {
    if (!instruction) return;
    setLoading(true);
    setDraft(''); 
    try {
      const generatedDraft = await draftContract(
        instruction, 
        template.trim() ? template : null, 
        context
      );
      setDraft(generatedDraft);
      
      // Save to history
      saveToHistory({
        type: 'DRAFT',
        fileName: uploadedFileName || selectedMasterId || 'Yeni Taslak',
        summary: instruction,
        originalText: template,
        revisedText: generatedDraft,
        riskScore: 0,
        risks: []
      });

      // Save Version
      const newVersion: DraftVersion = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          content: generatedDraft,
          instruction: instruction
      };
      setVersions(prev => [newVersion, ...prev].slice(0, 10)); // Keep last 10 versions
      addToast('Taslak başarıyla oluşturuldu.', 'success');

    } catch (error: any) {
      console.error(error);
      addToast(`Taslak oluşturulamadı: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = (version: DraftVersion) => {
      setDraft(version.content);
      setInstruction(version.instruction);
      setShowVersions(false);
      addToast('Versiyon geri yüklendi.', 'success');
  };

  const deleteVersion = (versionId: string) => {
      setVersions(prev => prev.filter(v => v.id !== versionId));
      addToast('Versiyon silindi.', 'info');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    setCopySuccess(true);
    addToast('Panoya kopyalandı.', 'success');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportWord = async () => {
    if (!draft) return;
    try {
      await exportToWord('SÖZLEŞME TASLAĞI', draft, `taslak_${uploadedFileName || selectedMasterId || 'sozlesme'}`);
      addToast('Word dosyası indiriliyor...', 'success');
    } catch (error) {
      addToast('Word dışa aktarma başarısız oldu.', 'error');
    }
  };

  const clearAll = () => {
      setTemplate('');
      setInstruction('');
      setDraft('');
      setSelectedMasterId('');
      setUploadedFileName('');
      
      // Local storage'ı temizle
      localStorage.removeItem('lexguard_draft_template');
      localStorage.removeItem('lexguard_draft_instruction');
      localStorage.removeItem('lexguard_draft_result');
      localStorage.removeItem('lexguard_draft_master_id');
      localStorage.removeItem('lexguard_draft_file_name');
      
      addToast('Tüm alanlar temizlendi.', 'info');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsFileLoading(true);
        setUploadedFileName(file.name);
        try {
            const text = await readDocumentContent(file);
            setTemplate(text);
            setSelectedMasterId(''); 
            addToast('Dosya başarıyla yüklendi.', 'success');
        } catch (error) {
            addToast("Dosya okunamadı. Desteklenen formatlar: .docx, .pdf, .txt, .jpg, .png", 'error');
            setUploadedFileName('');
        } finally {
            setIsFileLoading(false);
            e.target.value = '';
        }
    }
  };

  const insertClauseToInstruction = (clause: Clause) => {
      const textToAdd = `\n\n[KULLANILACAK ÖZEL MADDE - ${clause.title}]:\n"${clause.content}"`;
      setInstruction(prev => prev + textToAdd);
      setShowClauseModal(false);
      addToast('Madde talimatlara eklendi.', 'info');
  };


  return (
    <div className="h-full flex flex-col p-6 space-y-6 relative">
       <div className="mb-2 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Akıllı Sözleşme Hazırlayıcı</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Standart şablonlarımızı kullanarak veya sıfırdan yeni sözleşmeler oluşturun.</p>
          </div>
          <div className="flex gap-2">
              {versions.length > 0 && (
                  <button onClick={() => setShowVersions(true)} className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 rounded text-sm flex items-center gap-2 font-medium transition-colors">
                      <History size={16}/> Geçmiş Versiyonlar ({versions.length})
                  </button>
              )}
              {(template || instruction || draft) && (
                 <button onClick={() => setShowClearConfirm(true)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors">
                     <Trash2 size={16}/> Temizle
                 </button>
              )}
          </div>
        </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Input Column */}
        <div className="flex flex-col space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                     <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <BookTemplate size={16} /> Kaynak Şablon
                        {template && <CheckCircle size={14} className="text-green-500"/>}
                    </label>
                </div>

                {/* Dropdown for Knowledge Base */}
                {context.masterContracts && context.masterContracts.length > 0 ? (
                    <div className="relative">
                        <select 
                            value={selectedMasterId}
                            onChange={handleMasterSelect}
                            className="w-full p-3 bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-lg text-sm text-blue-900 dark:text-blue-300 font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">-- Boş Şablon / Sıfırdan Yaz --</option>
                            {context.masterContracts.map(m => (
                                <option key={m.id} value={m.id}>📄 {m.type} Şablonunu Kullan</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none text-blue-800 dark:text-blue-400">▼</div>
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                        * Profil sekmesinden standart sözleşme yüklerseniz burada görünür.
                    </div>
                )}
                
                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">VEYA</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                     <span className="text-xs text-slate-500 dark:text-slate-400">Manuel dosya yükleyin (Görsel Dahil):</span>
                     <label className="cursor-pointer text-xs font-medium hover:underline flex items-center gap-1 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg sm:border-0 sm:p-0 sm:bg-transparent justify-center w-full sm:w-auto">
                        {isFileLoading ? <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={12}/> : uploadedFileName ? <CheckCircle className="text-green-600 dark:text-green-400" size={12}/> : <FileText className="text-blue-600 dark:text-blue-400" size={12}/>}
                        <span className={uploadedFileName ? "text-green-600 dark:text-green-400 font-bold" : "text-blue-600 dark:text-blue-400"}>
                            {isFileLoading ? 'Okunuyor (OCR)...' : uploadedFileName ? `${uploadedFileName} Yüklendi` : '.docx / .pdf / .jpg Yükle'}
                        </span>
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.doc,.docx,.pdf,.jpg,.png"/>
                    </label>
                </div>

                <textarea
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                    placeholder="Seçilen şablon içeriği buraya gelir veya manuel yapıştırabilirsiniz..."
                />
            </div>

            {/* User Instructions */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col relative">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FilePlus size={16} /> Değişkenler & Talimatlar
                    </label>
                    <button 
                        onClick={() => setShowClauseModal(true)}
                        className="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-3 py-2 rounded-lg font-bold border border-teal-100 dark:border-teal-900/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <BookMarked size={14} /> <span className="truncate">Kütüphaneden Madde Ekle</span>
                    </button>
                </div>
                
                <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="flex-1 w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                    placeholder="Örn: 'ABC Ltd. Şti.' ile yapılacak Demo Sözleşmesi. Süre 30 gün. Kütüphaneden 'Standart Gizlilik' maddesini ekle..."
                />

                <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full mb-1">Hızlı Maddeler:</span>
                    {['Gizlilik', 'Mücbir Sebep', 'Uyuşmazlık Çözümü', 'Sözleşmenin Feshi'].map(clauseName => (
                        <button
                            key={clauseName}
                            onClick={() => {
                                setInstruction(prev => prev ? `${prev}\n${clauseName} maddesi ekle.` : `${clauseName} maddesi ekle.`);
                            }}
                            className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
                        >
                            + {clauseName}
                        </button>
                    ))}
                </div>

                {/* --- QUICK RULES PANEL (GEÇİCİ SÖZLEŞME) --- */}
                <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowRules(!showRules)}>
                        <div className="flex items-center gap-2">
                            <Shield size={16} className="text-amber-600 dark:text-amber-500"/>
                            <h3 className="font-bold text-amber-900 dark:text-amber-400 text-xs">
                                Geçici Sözleşme / Ek Protokol
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                                {context?.customRules?.filter(r => r.isActive).length || 0} Aktif
                            </span>
                            <ChevronDown size={14} className={`text-amber-700 dark:text-amber-500 transition-transform ${showRules ? 'rotate-180' : ''}`}/>
                        </div>
                    </div>

                    {showRules && (
                        <div className="mt-3 space-y-3 animate-fade-in text-left border-t border-amber-200/50 dark:border-amber-800/50 pt-3">
                            {/* Master Toggle */}
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-sm">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Taslağa Dahil Et</span>
                                <label className="relative inline-flex items-center cursor-pointer scale-75">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={context?.customRules?.some(r => r.isActive && (r.isTemporaryContract || r.category === 'Geçici Sözleşme' || r.category === 'Geçici' || r.category === 'Ek Belge')) ?? false}
                                        onChange={(e) => {
                                            if (!onUpdateContext || !context) return;
                                            const newState = e.target.checked;
                                            const updatedRules = (context.customRules || []).map(r => 
                                                (r.isTemporaryContract || r.category === 'Geçici Sözleşme' || r.category === 'Geçici' || r.category === 'Ek Belge') 
                                                ? { ...r, isActive: newState } 
                                                : r
                                            );
                                            onUpdateContext({ ...context, customRules: updatedRules });
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                </label>
                            </div>

                            {/* Quick Add Form */}
                            {!isQuickAdding ? (
                                <button 
                                    onClick={() => setIsQuickAdding(true)}
                                    className="w-full py-1.5 border border-dashed border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-500 rounded-lg text-[10px] font-bold hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={12}/> Hızlı Madde Ekle
                                </button>
                            ) : (
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-inner space-y-2 animate-fade-in">
                                    <input 
                                        value={quickAddTitle}
                                        onChange={(e) => setQuickAddTitle(e.target.value)}
                                        placeholder="Başlık"
                                        className="w-full text-[10px] p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                                    />
                                    <textarea 
                                        value={quickAddContent}
                                        onChange={(e) => setQuickAddContent(e.target.value)}
                                        placeholder="İçerik..."
                                        className="w-full text-[10px] p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded h-16 outline-none focus:ring-1 focus:ring-amber-500 resize-none text-slate-900 dark:text-white"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsQuickAdding(false)} className="text-[9px] font-bold text-slate-500">İptal</button>
                                        <button onClick={handleQuickAddRule} disabled={!quickAddContent.trim()} className="px-2 py-1 bg-amber-600 text-white rounded text-[9px] font-bold">Ekle</button>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={() => onChangeView?.(AppView.TEMPORARY_CONTRACTS)}
                                className="w-full py-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Briefcase size={12}/> Tümünü Yönet
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleDraft}
                    disabled={loading || !instruction}
                    className="mt-4 w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                    {loading ? 'Avukat Yazıyor...' : 'Sözleşmeyi Hazırla'}
                </button>
            </div>
        </div>

        {/* Output Column */}
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
             <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Oluşturulan Belge</h3>
                {draft && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExportWord}
                            className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Word Olarak İndir"
                        >
                            <FileDown size={16} />
                            Word
                        </button>
                        <button 
                            onClick={copyToClipboard} 
                            className={`p-2 rounded transition-colors flex items-center gap-1 text-xs font-bold ${copySuccess ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                            title="Kopyala"
                        >
                            {copySuccess ? <Check size={16}/> : <Copy size={16} />}
                            {copySuccess && "Kopyalandı"}
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar">
                {draft ? (
                    <pre className="whitespace-pre-wrap font-serif text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-w-none animate-fade-in">
                        {draft}
                    </pre>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        {loading ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <Loader2 size={48} className="mb-4 text-blue-500 animate-spin" />
                                <p className="text-slate-600 dark:text-slate-400 font-medium">Sözleşme hazırlanıyor...</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center max-w-[250px]">Bu işlem sözleşme uzunluğuna göre 30-60 saniye sürebilir.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center max-w-[300px] text-center">
                                <FileText size={48} className="mb-4 opacity-20" />
                                <p className="text-sm">Sol taraftan bir standart şablon seçin ve değişkenleri girin. AI sizin formatınızı bozmadan belgeyi dolduracaktır.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* Clause Selector Modal */}
      {showClauseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-teal-50 dark:bg-teal-900/30">
                      <h3 className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-2">
                          <BookMarked size={18}/> Kütüphaneden Madde Seç
                      </h3>
                      <button onClick={() => setShowClauseModal(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                      {libraryClauses.length === 0 ? (
                          <div className="text-center text-slate-400 dark:text-slate-500 py-10">
                              <BookTemplate size={40} className="mx-auto mb-2 opacity-20"/>
                              <p>Kütüphanenizde henüz kayıtlı madde yok.</p>
                              <p className="text-xs mt-1">"Kütüphane" sekmesinden sık kullanılan maddelerinizi ekleyin.</p>
                          </div>
                      ) : (
                        libraryClauses.map(clause => (
                            <div key={clause.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{clause.title}</span>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-bold uppercase">{clause.category}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-mono mb-3">{clause.content}</p>
                                <button 
                                    onClick={() => insertClauseToInstruction(clause)}
                                    className="w-full py-2 bg-slate-50 dark:bg-slate-700 hover:bg-teal-600 dark:hover:bg-teal-700 hover:text-white text-teal-700 dark:text-teal-300 text-xs font-bold rounded border border-slate-200 dark:border-slate-600 hover:border-teal-600 dark:hover:border-teal-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={14}/> Talimatlara Ekle
                                </button>
                            </div>
                        ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Version History Modal */}
      {showVersions && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <History size={18}/> Geçmiş Versiyonlar
                      </h3>
                      <button onClick={() => setShowVersions(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                      {versions.map((ver, idx) => (
                          <div key={ver.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative group">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Versiyon {versions.length - idx}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(ver.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 italic">"{ver.instruction}"</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setShowRestoreConfirm(ver)}
                                  className="flex-1 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold rounded border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={14}/> Geri Yükle
                                </button>
                                <button 
                                  onClick={() => setShowDeleteVersionConfirm(ver.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-colors"
                                  title="Sil"
                                >
                                    <Trash2 size={14}/>
                                </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Modals */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={clearAll}
        title="Alanları Temizle"
        message="Tüm taslak metni, talimatlar ve şablon verileri kalıcı olarak silinecek. Bu işlemi onaylıyor musunuz?"
        confirmText="Evet, Temizle"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showRestoreConfirm !== null}
        onClose={() => setShowRestoreConfirm(null)}
        onConfirm={() => {
          if (showRestoreConfirm) {
            restoreVersion(showRestoreConfirm);
          }
        }}
        title="Versiyonu Geri Yükle"
        message="Bu versiyona dönmek mevcut taslağı ve talimatları değiştirecektir. Onaylıyor musunuz?"
        confirmText="Geri Yükle"
        type="warning"
      />

      <ConfirmationModal
        isOpen={showDeleteVersionConfirm !== null}
        onClose={() => setShowDeleteVersionConfirm(null)}
        onConfirm={() => {
          if (showDeleteVersionConfirm) {
            deleteVersion(showDeleteVersionConfirm);
          }
        }}
        title="Versiyonu Sil"
        message="Bu taslak versiyonu kalıcı olarak silinecek. Bu işlemi onaylıyor musunuz?"
        confirmText="Sil"
        type="danger"
      />
    </div>
  );
};

export default ContractDrafter;
