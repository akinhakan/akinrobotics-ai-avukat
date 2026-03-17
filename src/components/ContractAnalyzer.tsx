import React, { useState, useEffect, useRef } from 'react';
import { CompanyContext, ContractAnalysisResult, AnalysisStatus, ChatMessage, AppView } from '../types';
import { analyzeContract, askContractQuestion } from '../services/geminiService';
import { saveToHistory } from '../services/historyService';
import { Upload, CheckCircle, ArrowRight, Loader2, Download, MessageSquare, GitCompare, Layers, Send, User, Bot, Shield, ChevronDown, Trash2, FileText, RefreshCw, X, AlertTriangle, Briefcase, Plus, FileDown, Edit3 } from 'lucide-react';
import * as Diff from 'diff';
import { readDocumentContent } from '../services/fileService';
import { exportToWord, exportAnalysisToWord } from '../services/exportService';
import ConfirmationModal from './ui/ConfirmationModal';
import { useToast } from '../context/ToastContext';

interface ContractAnalyzerProps {
  context: CompanyContext;
  preloadedAnalysis?: ContractAnalysisResult | null;
  onUpdateContext?: (ctx: CompanyContext) => void;
  onChangeView?: (view: AppView) => void;
}

type Tab = 'ANALYSIS' | 'CHAT' | 'COMPARE';

const ContractAnalyzer: React.FC<ContractAnalyzerProps> = ({ context, preloadedAnalysis, onUpdateContext, onChangeView }) => {
  // --- STATE INITIALIZATION (LAZY LOAD - F5 SAFETY) ---
  // Session verisini tek seferde okuyoruz, böylece render öncesi veri hazır oluyor.
  const getInitialSession = () => {
    if (preloadedAnalysis) return {}; // Eğer geçmişten geliyorsak storage'a bakma
    try {
        const saved = localStorage.getItem('lexguard_analyzer_session');
        return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  };

  const session = getInitialSession();

  const [contractText, setContractText] = useState<string>(() => 
    preloadedAnalysis ? preloadedAnalysis.originalText : (session.contractText || '')
  );
  
  const [fileName, setFileName] = useState<string>(() => 
    preloadedAnalysis ? (preloadedAnalysis.fileName || 'Geçmiş Kayıt') : (session.fileName || '')
  );
  
  const [status, setStatus] = useState<AnalysisStatus>(() => 
    preloadedAnalysis ? AnalysisStatus.COMPLETED : (session.status || AnalysisStatus.IDLE)
  );

  const [result, setResult] = useState<ContractAnalysisResult | null>(() => 
    preloadedAnalysis ? preloadedAnalysis : (session.result || null)
  );

  const [activeTab, setActiveTab] = useState<Tab>(() => session.activeTab || 'ANALYSIS');
  
  const [selectedReference, setSelectedReference] = useState<string>(() => session.selectedReference || 'AUTO');
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => session.chatHistory || []);

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { addToast } = useToast();
  // const [isFileLoading, setIsFileLoading] = useState(false); // Removed in favor of uploadStatus
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showRules, setShowRules] = useState(false); // Toggle for rules panel
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickAddContent, setQuickAddContent] = useState('');

  const handleUpdateTemporaryContract = (content: string) => {
    if (!onUpdateContext) return;
    onUpdateContext({ ...context, temporaryContract: content });
  };

  const handleToggleTemporaryContract = () => {
    if (!onUpdateContext) return;
    onUpdateContext({ ...context, isTemporaryContractActive: !context.isTemporaryContractActive });
  };
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- RULE MANAGEMENT ---
  const toggleRule = (id: string) => {
      if (!onUpdateContext) return;
      const updatedRules = (context.customRules || []).map(r => 
          r.id === id ? { ...r, isActive: !r.isActive } : r
      );
      onUpdateContext({ ...context, customRules: updatedRules });
  };

  // --- PRELOADED ANALYSIS WATCHER ---
  // Eğer kullanıcı Geçmiş ekranından bir şeye tıklarsa state'i güncelle
  useEffect(() => {
    if (preloadedAnalysis) {
      setResult(preloadedAnalysis);
      setContractText(preloadedAnalysis.originalText);
      setFileName(preloadedAnalysis.fileName || 'Geçmiş Kayıt');
      setStatus(AnalysisStatus.COMPLETED);
    } else if (status === AnalysisStatus.ANALYZING) {
        // Eğer sayfa yenilendiğinde veya başka bir şekilde ANALYZING durumunda kaldıysa
        // (isAnalyzingRef false olacağı için) IDLE durumuna çekiyoruz.
        setStatus(AnalysisStatus.IDLE);
    }
  }, [preloadedAnalysis]);

  // --- AUTO SAVE TO LOCAL STORAGE ---
  // Artık sadece kaydetme işlemi yapıyoruz. Yükleme işlemi yukarıda (useState içinde) bitti.
  useEffect(() => {
    if (!preloadedAnalysis) {
      const sessionData = {
        contractText,
        fileName,
        result,
        status,
        activeTab,
        selectedReference,
        chatHistory
      };
      localStorage.setItem('lexguard_analyzer_session', JSON.stringify(sessionData));
    }
  }, [contractText, fileName, result, status, activeTab, selectedReference, chatHistory, preloadedAnalysis]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const isAnalyzingRef = useRef(false);

  useEffect(() => {
    return () => {
      isAnalyzingRef.current = false;
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploadStatus('UPLOADING');
      setUploadMessage('Dosya okunuyor ve işleniyor...');
      
      try {
        const text = await readDocumentContent(file);
        setContractText(text); 
        if (status === AnalysisStatus.ERROR) setStatus(AnalysisStatus.IDLE);
        
        setUploadStatus('SUCCESS');
        setUploadMessage('Dosya başarıyla yüklendi.');
        
        // 3 saniye sonra başarı mesajını temizle
        setTimeout(() => {
            setUploadStatus(prev => {
                if (prev === 'SUCCESS') {
                    setUploadMessage('');
                    return 'IDLE';
                }
                return prev;
            });
        }, 3000);

      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus('ERROR');
        setUploadMessage("Dosya okunamadı. Lütfen .docx, .pdf veya .txt formatında geçerli bir dosya yükleyin.");
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleAnalyze = async () => {
    if (!contractText.trim()) return;
    setStatus(AnalysisStatus.ANALYZING);
    isAnalyzingRef.current = true;

    // İstemci tarafı zaman aşımı (60 saniye)
    const timeoutId = setTimeout(() => {
        if (isAnalyzingRef.current) {
            isAnalyzingRef.current = false;
            setStatus(AnalysisStatus.ERROR);
            addToast("İşlem çok uzun sürdü. Lütfen internet bağlantınızı kontrol edin veya daha kısa bir metin deneyin.", "error");
        }
    }, 60000);

    try {
      const analysis = await analyzeContract(
          contractText, 
          context, 
          fileName || "Metin Girişi",
          selectedReference
      );
      
      clearTimeout(timeoutId); // Başarılı olursa zaman aşımını iptal et

      if (!isAnalyzingRef.current) return; // Eğer timeout olduysa veya component unmount olduysa dur

      if (analysis && analysis.riskScore !== undefined) {
          const analysisWithType = { ...analysis, type: 'ANALYSIS' as const };
          setResult(analysisWithType);
          setStatus(AnalysisStatus.COMPLETED);
          saveToHistory(analysisWithType);
          setActiveTab('ANALYSIS');
      } else {
          throw new Error("Analiz sonucu geçersiz.");
      }
    } catch (error) {
      clearTimeout(timeoutId); // Hata durumunda zaman aşımını iptal et
      if (!isAnalyzingRef.current) return;
      
      console.error(error);
      setStatus(AnalysisStatus.ERROR);
      addToast("Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.", "error");
    } finally {
        isAnalyzingRef.current = false;
    }
  };

  const handleClearInput = () => {
    setContractText('');
    setFileName('');
    if (status === AnalysisStatus.ERROR) setStatus(AnalysisStatus.IDLE);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleClearSession = () => {
      // Önce state'leri temizle
      setContractText('');
      setFileName('');
      setResult(null);
      setChatHistory([]);
      setActiveTab('ANALYSIS');
      
      // Local storage'ı temizle
      localStorage.removeItem('lexguard_analyzer_session');
      
      // En son status'u güncelle (Bu re-render tetikler)
      setStatus(AnalysisStatus.IDLE);
      addToast('Oturum temizlendi.', 'info');
      setShowClearConfirm(false);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !contractText) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await askContractQuestion(chatInput, contractText, chatHistory, context);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Üzgünüm, bir hata oluştu." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const downloadRevised = () => {
    if (!result) return;
    const element = document.createElement("a");
    const file = new Blob([result.revisedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `revize_${fileName || 'sozlesme'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportRevisedWord = async () => {
    if (!result) return;
    try {
      await exportToWord('REVİZE SÖZLEŞME METNİ', result.revisedText, `revize_${fileName || 'sozlesme'}`);
      addToast('Word dosyası indiriliyor...', 'success');
    } catch (error) {
      addToast('Word dışa aktarma başarısız oldu.', 'error');
    }
  };

  const handleExportAnalysisWord = async () => {
    if (!result) return;
    try {
      await exportAnalysisToWord(result, `analiz_raporu_${fileName || 'sozlesme'}`);
      addToast('Analiz raporu indiriliyor...', 'success');
    } catch (error) {
      addToast('Rapor dışa aktarma başarısız oldu.', 'error');
    }
  };

  const handleEditInDrafter = () => {
    if (!result) return;
    // Save to localStorage so Drafter can pick it up
    localStorage.setItem('lexguard_draft_result', result.revisedText);
    localStorage.setItem('lexguard_draft_template', result.originalText);
    localStorage.setItem('lexguard_draft_instruction', `Analiz sonucu üzerinden düzeltme yapılıyor: ${result.summary}`);
    
    if (onChangeView) {
      onChangeView(AppView.DRAFTER);
      addToast('Düzeltilmiş metin Hazırlayıcıya aktarıldı.', 'success');
    }
  };

  const downloadOriginal = () => {
    if (!result) return;
    const element = document.createElement("a");
    const file = new Blob([result.originalText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `orijinal_${fileName || 'sozlesme'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Render Functions ---

  const renderAnalysis = () => (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="text-sm font-uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">RİSK PUANI</h4>
                <div className={`text-5xl font-black mt-2 ${
                    result!.riskScore > 70 ? 'text-red-600 dark:text-red-500' : result!.riskScore > 40 ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-500'
                }`}>
                    {result!.riskScore}/100
                </div>
            </div>
            <div className="text-right max-w-lg">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Yönetici Özeti</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{result!.summary}</p>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Risk Haritası & Bulgular</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {/* OPTIONAL CHAINING EKLENDI: result!.risks? */}
            {result!.risks?.map((risk, idx) => (
                <div key={idx} className={`p-6 transition-colors border-l-4 ${
                    risk.severity === 'High' ? 'border-red-500 bg-red-50/30 dark:bg-red-900/10' : 
                    risk.severity === 'Medium' ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10' : 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10'
                }`}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            risk.severity === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                            risk.severity === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                            {risk.severity === 'High' ? 'Kritik' : risk.severity === 'Medium' ? 'Orta' : 'Düşük'} Risk
                        </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium mb-3">{risk.description}</p>
                    <div className="flex gap-3 items-start text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <CheckCircle size={18} className="text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-bold text-slate-900 dark:text-white block mb-1">AKINROBOTICS Önerisi:</span>
                            {risk.suggestion}
                        </div>
                    </div>
                </div>
            )) || <div className="p-6 text-slate-500 dark:text-slate-400 text-sm">Hiçbir risk tespit edilemedi veya veri eksik.</div>}
        </div>
      </div>
    </div>
  );

  const renderDiff = () => {
    if (!result) return null;
    const diff = Diff.diffWords(result.originalText || '', result.revisedText || '');

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-900 dark:bg-slate-950 text-white">
          <h3 className="font-bold flex items-center gap-2"><GitCompare size={16}/> Değişiklik Takibi (Redline)</h3>
          <div className="flex gap-2">
              <button 
                onClick={handleEditInDrafter}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1 font-bold"
              >
                  <Edit3 size={14} /> Düzeltmeleri Düzenle
              </button>
              <button 
                onClick={handleExportRevisedWord}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                  <FileDown size={14} /> Word Olarak İndir
              </button>
          </div>
        </div>
        <div className="p-8 bg-white dark:bg-slate-900 font-mono text-sm overflow-y-auto leading-loose whitespace-pre-wrap text-slate-800 dark:text-slate-300">
          {diff.map((part, index) => {
            const color = part.added ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-semibold px-0.5 rounded border-b-2 border-green-300 dark:border-green-700' : 
                          part.removed ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 line-through decoration-red-500 px-0.5 rounded opacity-70' : 
                          'text-slate-700 dark:text-slate-400';
            return <span key={index} className={color}>{part.value}</span>;
          })}
        </div>
      </div>
    );
  };

  const renderChat = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col overflow-hidden transition-colors">
       <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><MessageSquare size={18}/> Sözleşme Asistanı</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Bu sözleşme hakkında merak ettiğiniz her şeyi sorun.</p>
       </div>
       <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          {chatHistory.length === 0 && (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-10">
              <Bot size={48} className="mx-auto mb-4 opacity-20" />
              <p>Sözleşmeyle ilgili sorularınızı bekliyorum.</p>
              <div className="flex gap-2 justify-center mt-4">
                <button onClick={() => setChatInput("En büyük risk nedir?")} className="text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-600 dark:text-slate-300">En büyük risk nedir?</button>
                <button onClick={() => setChatInput("Fesih şartları neler?")} className="text-xs bg-white dark:bg-slate-700 border dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-600 dark:text-slate-300">Fesih şartları neler?</button>
              </div>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'bg-blue-600 text-white'}`}>
                {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
              </div>
              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-slate-700 dark:bg-slate-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white"><Bot size={14}/></div>
               <div className="bg-white dark:bg-slate-700 border dark:border-slate-600 p-3 rounded-xl rounded-tl-none shadow-sm flex items-center"><Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={16}/></div>
            </div>
          )}
          <div ref={chatEndRef} />
       </div>
       <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
         <div className="flex gap-2">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Bir soru sorun (örn: Tazminat limiti nedir?)"
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button 
              onClick={handleChatSend} 
              disabled={chatLoading || !chatInput}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
         </div>
       </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden">
      {(status === AnalysisStatus.IDLE || status === AnalysisStatus.ERROR) && (
         <>
         <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sözleşme İnceleme</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Yapay zeka ile derinlemesine analiz.</p>
            </div>
         </div>
         
         {status === AnalysisStatus.ERROR && (
             <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                 <AlertTriangle className="text-red-500 shrink-0" size={20}/>
                 <div>
                     <p className="font-bold text-red-800 dark:text-red-300 text-sm">Analiz Başarısız Oldu</p>
                     <p className="text-red-700 dark:text-red-400 text-xs">Bağlantı sorunu veya metin formatı hatası olabilir. Lütfen tekrar deneyin.</p>
                 </div>
             </div>
         )}

         <div className="flex-1 flex flex-col justify-center items-center">
            <div className={`max-w-xl w-full bg-white dark:bg-slate-800 p-8 rounded-2xl border-2 border-dashed transition-all text-center shadow-sm ${
                uploadStatus === 'ERROR' ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-800' :
                uploadStatus === 'SUCCESS' ? 'border-green-300 bg-green-50 dark:bg-green-900/10 dark:border-green-800' :
                'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
            }`}>
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
                   uploadStatus === 'UPLOADING' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                   uploadStatus === 'SUCCESS' || contractText ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                   uploadStatus === 'ERROR' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                   'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
               }`}>
                 {uploadStatus === 'UPLOADING' ? <Loader2 className="animate-spin" size={32}/> : 
                  uploadStatus === 'SUCCESS' || contractText ? <CheckCircle size={32}/> : 
                  uploadStatus === 'ERROR' ? <AlertTriangle size={32}/> :
                  <Upload size={32} />}
               </div>
               
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                   {uploadStatus === 'UPLOADING' ? 'Yükleniyor...' :
                    uploadStatus === 'SUCCESS' ? 'Yükleme Başarılı!' :
                    contractText ? 'Belge Hazır' : 'Belgenizi Buraya Bırakın'}
               </h3>
               
               <p className="text-slate-500 dark:text-slate-400 mb-6">
                   {fileName ? fileName : '.docx (Word), .pdf, .txt veya metin yapıştırın.'}
               </p>
               
               {/* Progress Indicator & Status Message */}
               {(uploadStatus !== 'IDLE' || uploadMessage) && (
                   <div className={`mb-6 p-3 rounded-lg text-sm font-medium animate-fade-in ${
                       uploadStatus === 'ERROR' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                       uploadStatus === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                   }`}>
                       {uploadStatus === 'UPLOADING' && (
                           <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mb-2 overflow-hidden">
                               <div className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full animate-progress-indeterminate"></div>
                           </div>
                       )}
                       {uploadMessage}
                   </div>
               )}

               <div className="flex flex-col items-center gap-3">
                   <label className={`inline-flex cursor-pointer px-6 py-3 rounded-xl font-semibold transition-all shadow-lg items-center gap-2 ${
                       uploadStatus === 'UPLOADING' ? 'bg-slate-400 cursor-not-allowed' :
                       contractText ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none' : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-slate-200 dark:shadow-none'
                   }`}>
                      {uploadStatus === 'UPLOADING' ? <Loader2 className="animate-spin" size={18}/> : contractText ? <RefreshCw size={18} /> : <Upload size={18}/>}
                      {uploadStatus === 'UPLOADING' ? 'İşleniyor...' : contractText ? 'Dosyayı Değiştir' : 'Dosya Seç'}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload} 
                        className="hidden" 
                        disabled={uploadStatus === 'UPLOADING'}
                        accept=".txt,.md,.json,.csv,.docx,.pdf" 
                      />
                   </label>
                   
                   {contractText && fileName && uploadStatus === 'IDLE' && (
                       <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full animate-fade-in">
                           <FileText size={14}/> {fileName} yüklendi
                       </span>
                   )}
               </div>
               
               <div className="mt-8 relative w-full">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">veya metni aşağıya yapıştırın</span></div>
               </div>

               <textarea
                    value={contractText}
                    onChange={(e) => setContractText(e.target.value)}
                    placeholder="Sözleşme metnini buraya yapıştırın..."
                    className="mt-6 w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg resize-none text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
                
                <div className="mt-4 flex gap-2">
                    <div className="relative flex-1">
                        <select 
                            value={selectedReference}
                            onChange={(e) => setSelectedReference(e.target.value)}
                            className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 px-4 pr-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="AUTO">✨ AI Karar Versin (Otomatik)</option>
                            <option value="Satış Sözleşmesi">📦 Satış Sözleşmesi ile Kıyasla</option>
                            <option value="Kiralama Sözleşmesi">🔑 Kiralama Sözleşmesi ile Kıyasla</option>
                            <option value="BDHS Sözleşmesi">🛠️ BDHS Sözleşmesi ile Kıyasla</option>
                            <option value="Teknik Servis Sözleşmesi">🔧 Teknik Servis Sözleşmesi ile Kıyasla</option>
                            <option value="Demo Sözleşmesi">🧪 Demo Sözleşmesi ile Kıyasla</option>
                            <option value="Reklam/Tanıtım Anlaşması">📢 Reklam Anlaşması ile Kıyasla</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={16} />
                    </div>
                    {contractText && (
                        <button 
                            onClick={handleClearInput}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 rounded-lg font-bold flex items-center justify-center transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button
                        onClick={handleAnalyze}
                        disabled={!contractText || status === AnalysisStatus.ANALYZING}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                        Analizi Başlat <ArrowRight size={18} />
                    </button>
                </div>
                
                <div className="mt-4">
                    <button 
                        onClick={() => onChangeView?.(AppView.COMPARATOR)}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                    >
                        <GitCompare size={16}/> İki Farklı Belgeyi Kıyasla (Müzakere Masası)
                    </button>
                </div>
            </div>
         </div>

         {/* --- TEMPORARY CONTRACT PANEL --- */}
         <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-4 mt-8 w-full max-w-xl mx-auto">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowRules(!showRules)}>
                  <div className="flex items-center gap-2">
                      <Shield size={18} className="text-amber-600 dark:text-amber-500"/>
                      <div>
                          <h3 className="font-bold text-amber-900 dark:text-amber-400 text-sm">
                              Geçici Sözleşme / Ek Protokol
                          </h3>
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80">
                              Analize dahil edilecek geçici sözleşme metni.
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${context.isTemporaryContractActive ? 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                          {context.isTemporaryContractActive ? 'Sistemde Aktif' : 'Pasif'}
                      </span>
                      <ChevronDown size={16} className={`text-amber-700 dark:text-amber-500 transition-transform ${showRules ? 'rotate-180' : ''}`}/>
                  </div>
              </div>
              {showRules && (
                  <div className="mt-4 space-y-3 animate-fade-in text-left border-t border-amber-200/50 dark:border-amber-800/50 pt-3">
                      
                      {/* Master Toggle for Temporary Contract */}
                      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-sm">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Bu Metni Analize Dahil Et</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={context.isTemporaryContractActive ?? false}
                                  onChange={handleToggleTemporaryContract}
                              />
                              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                          </label>
                      </div>

                      {/* Content Preview / Edit */}
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-bold text-slate-500">Sözleşme İçeriği</label>
                              {!isQuickAdding && (
                                  <button 
                                      onClick={() => {
                                          setQuickAddContent(context.temporaryContract || '');
                                          setIsQuickAdding(true);
                                      }}
                                      className="text-[10px] font-bold text-blue-600 hover:underline"
                                  >
                                      Düzenle
                                  </button>
                              )}
                          </div>
                          
                          {isQuickAdding ? (
                              <div className="space-y-2">
                                  <textarea 
                                      value={quickAddContent}
                                      onChange={(e) => setQuickAddContent(e.target.value)}
                                      placeholder="Geçici sözleşme metnini buraya yazın..."
                                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded h-32 outline-none focus:ring-1 focus:ring-amber-500 resize-none text-slate-900 dark:text-white font-mono"
                                  />
                                  <div className="flex justify-end gap-2">
                                      <button 
                                          onClick={() => setIsQuickAdding(false)}
                                          className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                                      >
                                          İptal
                                      </button>
                                      <button 
                                          onClick={() => {
                                              handleUpdateTemporaryContract(quickAddContent);
                                              setIsQuickAdding(false);
                                          }}
                                          className="px-3 py-1 bg-amber-600 text-white rounded text-[10px] font-bold hover:bg-amber-700"
                                      >
                                          Güncelle
                                      </button>
                                  </div>
                              </div>
                          ) : (
                              <div className="max-h-32 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                                  {context.temporaryContract || 'Henüz bir metin eklenmemiş.'}
                              </div>
                          )}
                      </div>

                      {/* Link to Management Page */}
                      <button 
                          onClick={() => onChangeView?.(AppView.TEMPORARY_CONTRACTS)}
                          className="w-full py-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                          <Briefcase size={16}/> Tümünü Yönet
                      </button>
                  </div>
              )}
          </div>
         </>
      )}

      {status === AnalysisStatus.ANALYZING && (
         <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-fade-in">
            <div className="relative">
               <div className="w-24 h-24 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
               <Shield className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" size={32}/>
            </div>
            
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">AKINROBOTICS AI İnceliyor...</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {selectedReference === 'AUTO' 
                        ? 'Sözleşme türü tespit ediliyor ve riskler taranıyor.' 
                        : `${selectedReference} şablonu baz alınarak riskler taranıyor.`}
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={() => {
                        isAnalyzingRef.current = false;
                        setStatus(AnalysisStatus.IDLE);
                    }}
                    className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <X size={18}/> Analizi Durdur
                </button>
                
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="px-2 bg-slate-50 dark:bg-slate-900 text-slate-400">veya</span></div>
                </div>

                <button 
                    onClick={() => onChangeView?.(AppView.COMPARATOR)}
                    className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800"
                >
                    <GitCompare size={18}/> Kıyaslama Masasına Git
                </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-widest pt-4">
                <Loader2 size={12} className="animate-spin"/> İşlem 30-60 saniye sürebilir
            </div>
         </div>
      )}

      {result && status === AnalysisStatus.COMPLETED && (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-4 shrink-0">
               <div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={24}/> Analiz Tamamlandı
                 </h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400">{fileName || 'İsimsiz Belge'} • {new Date(result.timestamp).toLocaleTimeString()}</p>
               </div>
               
               <div className="flex gap-2">
                   <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                      <button 
                        onClick={() => setActiveTab('ANALYSIS')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <Layers size={16}/> Rapor & Riskler
                      </button>
                      <button 
                        onClick={() => setActiveTab('COMPARE')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'COMPARE' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <GitCompare size={16}/> Kıyasla (Diff)
                      </button>
                      <button 
                        onClick={() => setActiveTab('CHAT')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'CHAT' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <MessageSquare size={16}/> Asistana Sor
                      </button>
                   </div>
                   
                   <button 
                       onClick={downloadOriginal} 
                       className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-colors font-bold text-sm flex items-center gap-2"
                       title="Orijinal Metni İndir"
                   >
                       <Download size={16}/> Orijinal
                   </button>

                   <button 
                       onClick={handleExportAnalysisWord} 
                       className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors font-bold text-sm flex items-center gap-2"
                       title="Analiz Raporunu Word Olarak İndir"
                   >
                       <FileDown size={16}/> Raporu İndir
                   </button>

                   {!preloadedAnalysis && (
                       <button 
                           onClick={() => setShowClearConfirm(true)} 
                           className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors font-bold text-sm flex items-center gap-2"
                           title="Analizi Temizle ve Başa Dön"
                       >
                           <Trash2 size={16}/> Analizi Temizle
                       </button>
                   )}
               </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0">
               {activeTab === 'ANALYSIS' && renderAnalysis()}
               {activeTab === 'COMPARE' && renderDiff()}
               {activeTab === 'CHAT' && renderChat()}
            </div>
        </div>
      )}
      {/* Modals */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearSession}
        title="Oturumu Temizle"
        message="Mevcut analiz verileri ve sohbet geçmişi kalıcı olarak silinecek. Bu işlemi onaylıyor musunuz?"
        confirmText="Evet, Temizle"
        type="danger"
      />
    </div>
  );
};

export default ContractAnalyzer;