import React, { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ArrowRightLeft, FileDiff, Upload, Columns, AlignJustify, MessageSquare, Send, User, Bot, AlertTriangle, CheckCircle, XCircle, Loader2, Sparkles, Trash2, FileText, BookTemplate, ChevronDown, ArrowLeft, RotateCcw, X, Undo2, Shield, Briefcase, Plus } from 'lucide-react';
import { CompanyContext, DiffAnalysisResult, ChatMessage, AppView } from '../types';
import { analyzeContractDifferences, askDiffQuestion } from '../services/geminiService';
import { readDocumentContent } from '../services/fileService';
import { saveToHistory } from '../services/historyService';

interface ContractComparatorProps {
  context?: CompanyContext; 
  onUpdateContext?: (ctx: CompanyContext) => void;
  onChangeView?: (view: AppView) => void;
}

const ContractComparator: React.FC<ContractComparatorProps> = ({ context, onUpdateContext, onChangeView }) => {
  // --- STATE INITIALIZATION (LAZY LOAD - F5 SAFETY) ---
  const getInitialSession = () => {
    try {
        const saved = localStorage.getItem('lexguard_comparator_session');
        return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  };
  
  const session = getInitialSession();

  const [leftText, setLeftText] = useState<string>(() => session.leftText || '');
  const [rightText, setRightText] = useState<string>(() => session.rightText || '');
  
  const [isComparing, setIsComparing] = useState<boolean>(() => session.isComparing || false);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'UNIFIED'>('SPLIT');
  
  const [analyzingDiff, setAnalyzingDiff] = useState(false);
  const [diffAnalysis, setDiffAnalysis] = useState<DiffAnalysisResult | null>(() => session.diffAnalysis || null);
  
  const [showAnalysisPanel, setShowAnalysisPanel] = useState<boolean>(() => session.showAnalysisPanel || false);
  const [showChat, setShowChat] = useState<boolean>(() => session.showChat || false);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => session.chatHistory || []);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  
  const [leftFileName, setLeftFileName] = useState<string>(() => session.leftFileName || '');
  const [rightFileName, setRightFileName] = useState<string>(() => session.rightFileName || '');

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
  };

  // Performance Optimization: Diff Result State
  const [diffResult, setDiffResult] = useState<Diff.Change[]>([]);
  const [isDiffCalculating, setIsDiffCalculating] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- AUTO SAVE TO LOCAL STORAGE ---
  useEffect(() => {
    const sessionData = {
        leftText,
        rightText,
        isComparing,
        diffAnalysis,
        chatHistory,
        showAnalysisPanel,
        showChat,
        leftFileName,
        rightFileName
    };
    localStorage.setItem('lexguard_comparator_session', JSON.stringify(sessionData));
  }, [leftText, rightText, isComparing, diffAnalysis, chatHistory, showAnalysisPanel, showChat, leftFileName, rightFileName]);

  // --- HEAVY CALCULATION EFFECT ---
  // Calculates diff only when texts change, not on every render
  useEffect(() => {
    if (!isComparing || !leftText || !rightText) return;

    setIsDiffCalculating(true);
    // Use setTimeout to allow UI to render the loader before freezing for calculation
    const timer = setTimeout(() => {
        try {
            // If texts are extremely large (>100k chars), consider diffLines instead of diffWords
            const result = Diff.diffWords(leftText, rightText);
            setDiffResult(result);
        } catch (e) {
            console.error("Diff calculation error", e);
        } finally {
            setIsDiffCalculating(false);
        }
    }, 100);

    return () => clearTimeout(timer);
  }, [isComparing, leftText, rightText]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, showChat]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'LEFT' | 'RIGHT') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (side === 'LEFT') {
        setLoadingLeft(true);
        setLeftFileName(file.name);
    } else {
        setLoadingRight(true);
        setRightFileName(file.name);
    }

    try {
        const text = await readDocumentContent(file);
        if (side === 'LEFT') setLeftText(text);
        else setRightText(text);
    } catch (error) {
        alert("Dosya okunamadı.");
        if (side === 'LEFT') setLeftFileName(''); else setRightFileName('');
    } finally {
        if (side === 'LEFT') setLoadingLeft(false);
        else setLoadingRight(false);
        e.target.value = '';
    }
  };

  const handleMasterSelect = (e: React.ChangeEvent<HTMLSelectElement>, side: 'LEFT' | 'RIGHT') => {
      const id = e.target.value;
      if (!id) return; // Empty selection

      if (!context?.masterContracts) return;

      const master = context.masterContracts.find(m => m.id === id);
      if (master) {
          if (side === 'LEFT') {
              setLeftText(master.content);
              setLeftFileName(`Şablon: ${master.type}`);
          } else {
              setRightText(master.content);
              setRightFileName(`Şablon: ${master.type}`);
          }
      }
      e.target.value = ""; // Reset select to allow re-selection
  };

  const handleClearSide = (side: 'LEFT' | 'RIGHT') => {
      if (side === 'LEFT') {
          setLeftText('');
          setLeftFileName('');
      } else {
          setRightText('');
          setRightFileName('');
      }
  };

  const handleBackToEdit = () => {
      setIsComparing(false);
      setDiffAnalysis(null);
      setDiffResult([]);
  };

  const clearAll = () => {
    if(confirm("Tüm kıyaslama verileri temizlenecek. Devam edilsin mi?")) {
        setLeftText('');
        setRightText('');
        setDiffAnalysis(null);
        setChatHistory([]);
        setIsComparing(false);
        setShowAnalysisPanel(false);
        setShowChat(false);
        setLeftFileName('');
        setRightFileName('');
        setDiffResult([]);
        localStorage.removeItem('lexguard_comparator_session');
    }
  };

  const handleAnalyzeDiff = async () => {
    if (!context || !leftText || !rightText) return;
    setAnalyzingDiff(true);
    setShowAnalysisPanel(true);
    try {
      const result = await analyzeContractDifferences(leftText, rightText, context);
      setDiffAnalysis(result);
      
      // Save to history
      saveToHistory({
        type: 'COMPARISON',
        fileName: `${leftFileName || 'Sözleşme 1'} vs ${rightFileName || 'Sözleşme 2'}`,
        summary: result.summary,
        originalText: leftText,
        revisedText: rightText,
        riskScore: 0, // Comparison doesn't have a single risk score
        risks: result.changes.map(c => ({
          severity: c.impact === 'Critical' || c.impact === 'Negative' ? 'High' : c.impact === 'Positive' ? 'Low' : 'Medium',
          description: `${c.location}: ${c.analysis}`,
          suggestion: c.recommendation
        }))
      });
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzingDiff(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !context) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await askDiffQuestion(chatInput, leftText, rightText, chatHistory, context);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Hata oluştu." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- NEW: INTERACTIVE DIFF ACTIONS ---
  // Kullanıcı bir değişikliği (ekleme/silme) kabul etmezse metni güncelleriz.
  const handleRejectChange = (index: number) => {
    // Amaç: Sağ taraftaki (Revize) metni güncellemek.
    // Diff array'i üzerinden geçerek yeni Right Text'i oluşturacağız.
    
    let newRightText = "";
    
    diffResult.forEach((part, i) => {
        if (i === index) {
            // Tıklanan parça bu
            if (part.added) {
                // EKLENMİŞTİ -> REDDETMEK İSTİYORUZ (SİL)
                // newRightText += ""; // Hiçbir şey ekleme
            } else if (part.removed) {
                // SİLİNMİŞTİ -> REDDETMEK İSTİYORUZ (GERİ GETİR / RESTORE)
                newRightText += part.value;
            }
        } else {
            // Diğer parçalar (Normal akış)
            // Diff mantığına göre Right Text nasıl oluşur?
            // Neutral -> Var
            // Added -> Var
            // Removed -> Yok
            if (!part.removed) {
                newRightText += part.value;
            }
        }
    });

    setRightText(newRightText);
    // State değişince useEffect çalışacak ve diff tekrar hesaplanacak
  };

  // Replaced direct calculation with stored state "diffResult"
  const renderUnified = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm font-mono text-sm leading-loose whitespace-pre-wrap overflow-y-auto h-full relative transition-colors">
      {isDiffCalculating ? (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
              <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 mb-2" size={32}/>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Metinler karşılaştırılıyor...</span>
          </div>
      ) : (
          diffResult.map((part, index) => {
            const isAdded = part.added;
            const isRemoved = part.removed;
            
            const color = isAdded ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold px-1 rounded border-b-2 border-green-300 dark:border-green-700 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/60' : 
                        isRemoved ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 line-through decoration-red-500 px-1 rounded opacity-60 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60' : 
                        'text-slate-700 dark:text-slate-300';
            
            // Eğer normal metinse span, değişiklikse aksiyonlu span
            if (!isAdded && !isRemoved) {
                return <span key={index} className={color}>{part.value}</span>;
            }

            return (
                <span key={index} className={`${color} relative group inline-block mx-0.5`}>
                    {part.value}
                    {/* HOVER ACTION BUTTONS */}
                    <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none mb-1 shadow-lg">
                        {isAdded ? "Eklendi: Silmek için tıkla" : "Silindi: Geri almak için tıkla"}
                    </span>
                    <button 
                        onClick={() => handleRejectChange(index)}
                        className={`absolute -top-3 -right-3 rounded-full w-5 h-5 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isAdded ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        title={isAdded ? "Bu eklemeyi sil" : "Bu silme işlemini geri al"}
                    >
                        {isAdded ? <X size={12}/> : <Undo2 size={12}/>}
                    </button>
                </span>
            );
          })
      )}
    </div>
  );

  const renderSplit = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-hidden relative">
      {/* Loading Overlay for Split View */}
      {isDiffCalculating && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
              <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 mb-2" size={40}/>
              <span className="text-slate-800 dark:text-white font-bold text-lg">Analiz Güncelleniyor...</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sözleşme yeniden hesaplanıyor.</span>
          </div>
      )}

      {/* Left Side (Original) */}
      <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative transition-colors">
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold text-xs uppercase tracking-wide sticky top-0 flex justify-between z-10">
          <span>{leftFileName ? `ORİJİNAL: ${leftFileName}` : 'SİZİN SÖZLEŞMENİZ (ORİJİNAL)'}</span>
          <span className="text-blue-400 dark:text-blue-500">Silinenler Kırmızı</span>
        </div>
        <div className="p-4 font-mono text-sm leading-loose overflow-y-auto whitespace-pre-wrap flex-1 text-slate-800 dark:text-slate-300">
          {diffResult.map((part, index) => {
             if (part.added) return null; // Eklenenler solda görünmez
             
             if (part.removed) {
                 return (
                     <span key={index} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-b-2 border-red-300 dark:border-red-700 px-1 relative group inline-block mx-0.5 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60">
                         {part.value}
                         <button 
                            onClick={() => handleRejectChange(index)}
                            className="absolute -top-3 -right-3 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-600"
                            title="Bu silme işlemini geri al (Sağ tarafa geri ekle)"
                         >
                            <Undo2 size={12}/>
                         </button>
                     </span>
                 );
             }
             return <span key={index} className="text-slate-600 dark:text-slate-400">{part.value}</span>;
          })}
        </div>
      </div>

      {/* Right Side (Revised) */}
      <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative transition-colors">
        <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 border-b border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-xs uppercase tracking-wide sticky top-0 flex justify-between z-10">
          <span>{rightFileName ? `REVİZE: ${rightFileName}` : 'KARŞI TARAFIN REVİZESİ'}</span>
          <span className="text-purple-400 dark:text-purple-500">Eklenenler Yeşil</span>
        </div>
        <div className="p-4 font-mono text-sm leading-loose overflow-y-auto whitespace-pre-wrap flex-1 text-slate-800 dark:text-slate-300">
          {diffResult.map((part, index) => {
             if (part.removed) return null; // Silinenler sağda görünmez
             
             if (part.added) {
                 return (
                     <span key={index} className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-b-2 border-green-300 dark:border-green-700 px-1 font-bold relative group inline-block mx-0.5 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/60">
                         {part.value}
                         <button 
                            onClick={() => handleRejectChange(index)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                            title="Bu eklemeyi reddet (Sil)"
                         >
                            <X size={12}/>
                         </button>
                     </span>
                 );
             }
             return <span key={index} className="text-slate-600 dark:text-slate-400">{part.value}</span>;
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="text-blue-600 dark:text-blue-400" /> Müzakere Masası
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Orijinal metniniz ve karşı tarafın revizesini yükleyin.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
             {!isComparing ? (
                <button 
                  onClick={() => setIsComparing(true)}
                  disabled={!leftText || !rightText}
                  className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold shadow-sm transition-all flex items-center justify-center gap-2 shadow-blue-200 dark:shadow-none"
                >
                  <FileDiff size={18}/> Farkları Bul
                </button>
             ) : (
                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg w-full md:w-auto items-center">
                   <button 
                    onClick={handleBackToEdit}
                    className="px-3 py-2 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium flex items-center gap-1 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors"
                    title="Düzenlemeye Dön"
                  >
                    <ArrowLeft size={16}/> <span className="hidden sm:inline">Düzenle</span>
                  </button>
                  <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1 h-5"></div>
                   <button 
                    onClick={clearAll}
                    className="px-3 py-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors"
                    title="Her Şeyi Temizle"
                  >
                    <Trash2 size={16}/>
                  </button>
                  <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1 h-5"></div>
                  <button 
                    onClick={() => setViewMode('SPLIT')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'SPLIT' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <Columns size={16}/> Yan Yana
                  </button>
                  <button 
                    onClick={() => setViewMode('UNIFIED')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'UNIFIED' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <AlignJustify size={16}/> Birleşik
                  </button>
                </div>
             )}
        </div>
      </div>

      {!isComparing ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 min-h-0 overflow-hidden">
            {/* Left Input */}
            <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
              <div className="flex flex-col w-full sm:w-auto">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                     <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">1</span> 
                     Sizin Orijinal Sözleşmeniz
                  </span>
                  
                  {/* Master Template Selector Left - ALWAYS VISIBLE & ENABLED */}
                  <div className="relative w-full sm:w-48 ml-0 sm:ml-8 mt-2 sm:mt-0">
                      <select 
                        onChange={(e) => handleMasterSelect(e, 'LEFT')}
                        className={`w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-1 px-2 pr-6 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${(!context?.masterContracts || context.masterContracts.length === 0) ? 'text-slate-400 italic' : ''}`}
                      >
                          <option value="">
                              {(!context?.masterContracts || context.masterContracts.length === 0) 
                                ? "⚠️ Liste Boş (Profilden Ekleyin)" 
                                : "📂 Kayıtlı Şablonlardan Seç..."}
                          </option>
                          {context?.masterContracts?.map(m => (
                              <option key={m.id} value={m.id}>{m.type}</option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" size={12} />
                  </div>
                  
                  {leftFileName && !leftFileName.startsWith('Şablon:') && <span className="text-xs text-blue-600 dark:text-blue-400 ml-8 mt-1 font-medium truncate max-w-[200px]">{leftFileName}</span>}
              </div>
              
              <div className="flex gap-2 self-end sm:self-auto items-center">
                <button 
                    onClick={() => handleClearSide('LEFT')}
                    disabled={!leftText}
                    className={`px-2 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-colors ${leftText ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer' : 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed'}`}
                    title={leftText ? "Bu alanı temizle" : "Temizlenecek veri yok"}
                >
                    <Trash2 size={14}/> Temizle
                </button>

                {leftText && <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"><CheckCircle size={10}/> Hazır</span>}
                <label className={`cursor-pointer text-xs border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors ${loadingLeft ? 'bg-slate-100 dark:bg-slate-800 cursor-wait' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    {loadingLeft ? <Loader2 className="animate-spin" size={12}/> : <Upload size={12} />} 
                    {loadingLeft ? 'Okunuyor...' : 'Dosya Yükle'}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'LEFT')} accept=".docx,.pdf,.txt"/>
                </label>
              </div>
            </div>
            <textarea
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              placeholder="Orijinal şablonu buraya yapıştırın veya listeden seçin..."
              className="flex-1 w-full p-4 resize-none outline-none text-sm font-mono text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Right Input */}
          <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors">
              <div className="flex flex-col w-full sm:w-auto">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
                     <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs shrink-0">2</span> 
                     Karşı Tarafın Revizesi
                  </span>

                  {/* Master Template Selector Right - ALWAYS VISIBLE & ENABLED */}
                   <div className="relative w-full sm:w-48 ml-0 sm:ml-8 mt-2 sm:mt-0">
                      <select 
                        onChange={(e) => handleMasterSelect(e, 'RIGHT')}
                        className={`w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-1 px-2 pr-6 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer ${(!context?.masterContracts || context.masterContracts.length === 0) ? 'text-slate-400 italic' : ''}`}
                      >
                          <option value="">
                              {(!context?.masterContracts || context.masterContracts.length === 0) 
                                ? "⚠️ Liste Boş (Profilden Ekleyin)" 
                                : "📂 Kayıtlı Şablonlardan Seç..."}
                          </option>
                          {context?.masterContracts?.map(m => (
                              <option key={m.id} value={m.id}>{m.type}</option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" size={12} />
                  </div>

                  {rightFileName && !rightFileName.startsWith('Şablon:') && <span className="text-xs text-purple-600 dark:text-purple-400 ml-8 mt-1 font-medium truncate max-w-[200px]">{rightFileName}</span>}
              </div>
              <div className="flex gap-2 self-end sm:self-auto items-center">
                 <button 
                    onClick={() => handleClearSide('RIGHT')}
                    disabled={!rightText}
                    className={`px-2 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-colors ${rightText ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer' : 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed'}`}
                    title={rightText ? "Bu alanı temizle" : "Temizlenecek veri yok"}
                >
                    <Trash2 size={14}/> Temizle
                </button>
                 {rightText && <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"><CheckCircle size={10}/> Hazır</span>}
                 <label className={`cursor-pointer text-xs border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors ${loadingRight ? 'bg-slate-100 dark:bg-slate-800 cursor-wait' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    {loadingRight ? <Loader2 className="animate-spin" size={12}/> : <Upload size={12} />} 
                    {loadingRight ? 'Okunuyor...' : 'Dosya Yükle'}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'RIGHT')} accept=".docx,.pdf,.txt"/>
                 </label>
              </div>
            </div>
            <textarea
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              placeholder="Karşı taraftan gelen revize metni buraya yapıştırın..."
              className="flex-1 w-full p-4 resize-none outline-none text-sm font-mono text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* --- QUICK RULES PANEL (GEÇİCİ SÖZLEŞME) --- */}
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 w-full max-w-2xl mx-auto shrink-0">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowRules(!showRules)}>
                <div className="flex items-center gap-2">
                    <Shield size={18} className="text-amber-600 dark:text-amber-500"/>
                    <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-400 text-sm">
                            Geçici Sözleşme / Ek Protokol
                        </h3>
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80">
                            Kıyaslama ve analize dahil edilecek ek maddeler.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-full">
                        {context?.customRules?.filter(r => r.isActive).length || 0} Aktif Madde
                    </span>
                    <ChevronDown size={16} className={`text-amber-700 dark:text-amber-500 transition-transform ${showRules ? 'rotate-180' : ''}`}/>
                </div>
            </div>

            {showRules && (
                <div className="mt-4 space-y-3 animate-fade-in text-left border-t border-amber-200/50 dark:border-amber-800/50 pt-3">
                    
                    {/* Master Toggle for Temporary Contract */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-sm">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Bu Geçici Sözleşmeyi Kıyaslamaya Dahil Et</span>
                        <label className="relative inline-flex items-center cursor-pointer">
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
                    <div className="mt-2 pt-2">
                        {!isQuickAdding ? (
                            <button 
                                onClick={() => setIsQuickAdding(true)}
                                className="w-full py-2 border-2 border-dashed border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-500 rounded-lg text-xs font-bold hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14}/> Hızlı Geçici Madde Ekle
                            </button>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-inner space-y-2 animate-fade-in">
                                <input 
                                    value={quickAddTitle}
                                    onChange={(e) => setQuickAddTitle(e.target.value)}
                                    placeholder="Başlık (Örn: Ek Protokol 1)"
                                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                                />
                                <textarea 
                                    value={quickAddContent}
                                    onChange={(e) => setQuickAddContent(e.target.value)}
                                    placeholder="Geçici madde içeriğini buraya yazın..."
                                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded h-20 outline-none focus:ring-1 focus:ring-amber-500 resize-none text-slate-900 dark:text-white"
                                />
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => setIsQuickAdding(false)}
                                        className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        onClick={handleQuickAddRule}
                                        disabled={!quickAddContent.trim()}
                                        className="px-3 py-1 bg-amber-600 text-white rounded text-[10px] font-bold hover:bg-amber-700 disabled:opacity-50"
                                    >
                                        Ekle
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Link to Management Page */}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center">
                        <button 
                            onClick={() => onChangeView?.(AppView.TEMPORARY_CONTRACTS)}
                            className="w-full py-1.5 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Briefcase size={14}/> Tümünü Yönet
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden relative gap-4">
           {/* Main comparison area */}
           <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Action Bar inside view */}
                <div className="flex gap-2 mb-2 justify-end">
                    <button 
                        onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
                        className={`text-xs px-3 py-1.5 rounded font-bold border transition-colors flex items-center gap-1 ${showAnalysisPanel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                    >
                        <Sparkles size={14}/> {diffAnalysis ? 'Analiz Raporu' : 'Değişiklikleri Yorumla'}
                    </button>
                    <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`text-xs px-3 py-1.5 rounded font-bold border transition-colors flex items-center gap-1 ${showChat ? 'bg-slate-800 dark:bg-slate-600 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                    >
                        <MessageSquare size={14}/> Müzakere Asistanı
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden">
                    {viewMode === 'SPLIT' ? renderSplit() : renderUnified()}
                </div>
           </div>

           {/* Analysis Panel (Conditional) */}
           {showAnalysisPanel && (
               <div className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg flex flex-col overflow-hidden animate-fade-in z-10 absolute right-0 top-0 bottom-0 md:relative md:w-96 transition-colors">
                   <div className="p-4 border-b bg-indigo-50 dark:bg-indigo-900/20 flex justify-between items-center">
                       <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2"><Sparkles size={16}/> AKINROBOTICS Yorumu</h3>
                       <button onClick={() => setShowAnalysisPanel(false)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200"><XCircle size={18}/></button>
                   </div>
                   
                   {!diffAnalysis ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                           {analyzingDiff ? (
                               <>
                                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-2" size={24}/>
                                <p className="text-sm text-indigo-800 dark:text-indigo-300">Değişiklikler şirket çıkarlarına göre analiz ediliyor...</p>
                               </>
                           ) : (
                               <>
                                <FileDiff className="text-indigo-200 dark:text-indigo-800 mb-2" size={48}/>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Görsel farklar tespit edildi. Bu değişikliklerin hukuki risklerini öğrenmek ister misiniz?</p>
                                <button onClick={handleAnalyzeDiff} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">Analizi Başlat</button>
                               </>
                           )}
                       </div>
                   ) : (
                       <div className="flex-1 overflow-y-auto p-4 space-y-4">
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-700">
                               "{diffAnalysis.summary}"
                           </div>
                           {diffAnalysis.changes.map((change, idx) => (
                               <div key={idx} className={`border rounded-lg p-3 ${
                                   change.recommendation === 'Reject' ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800' :
                                   change.recommendation === 'Negotiate' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800' : 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                               }`}>
                                   <div className="flex justify-between items-start mb-1">
                                       <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{change.location}</span>
                                       <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                            change.recommendation === 'Reject' ? 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                            change.recommendation === 'Negotiate' ? 'bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                       }`}>
                                           {change.recommendation === 'Reject' ? 'REDDET' : change.recommendation === 'Negotiate' ? 'MÜZAKERE' : 'KABUL'}
                                       </span>
                                   </div>
                                   <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{change.analysis}</p>
                                   <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                       {change.impact === 'Critical' && <AlertTriangle size={12} className="text-red-500"/>}
                                       Etki: {change.impact}
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           )}

           {/* Chat Panel (Conditional) */}
           {showChat && (
               <div className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg flex flex-col overflow-hidden animate-fade-in z-10 absolute right-0 top-0 bottom-0 md:relative md:w-80 transition-colors">
                   <div className="p-4 border-b bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center">
                       <h3 className="font-bold flex items-center gap-2"><MessageSquare size={16}/> Müzakere Asistanı</h3>
                       <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white"><XCircle size={18}/></button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 space-y-3">
                       {chatHistory.length === 0 && (
                           <div className="text-center text-slate-400 dark:text-slate-500 mt-10">
                               <p className="text-sm">"Bu maddeyi neden değiştirdiler?" veya "Bunu kabul edersem risk ne?" gibi sorular sorabilirsiniz.</p>
                           </div>
                       )}
                       {chatHistory.map((msg, i) => (
                           <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'bg-blue-600 text-white'}`}>
                                   {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>}
                               </div>
                               <div className={`p-2 rounded-lg text-xs md:text-sm ${msg.role === 'user' ? 'bg-slate-700 dark:bg-slate-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                                   {msg.text}
                               </div>
                           </div>
                       ))}
                       {chatLoading && <div className="text-xs text-slate-400 italic">Yazıyor...</div>}
                       <div ref={chatEndRef}/>
                   </div>
                   <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                       <input 
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                           placeholder="Bir soru sorun..."
                           className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded px-2 outline-none focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                       />
                       <button onClick={handleChatSend} disabled={!chatInput || chatLoading} className="bg-slate-900 dark:bg-slate-700 text-white p-2 rounded hover:bg-slate-800 dark:hover:bg-slate-600"><Send size={16}/></button>
                   </div>
               </div>
           )}

        </div>
      )}
    </div>
  );
};

export default ContractComparator;