import React, { useState, useEffect, useRef } from 'react';
import { CompanyContext } from '../types';
import { analyzeForSignature, fixDocumentRisks, fillDocument } from '../services/geminiService';
import { readDocumentContent } from '../services/fileService';
import { generateAndDownloadDocx } from '../services/docxService';
import { saveToHistory } from '../services/historyService';
import { FileSignature, Upload, CheckCircle, Loader2, Copy, Trash2, ArrowRight, AlertTriangle, PenTool, Check, Edit3, Sparkles, ShieldAlert, ShieldCheck, X, Scale, Square, CheckSquare, ListChecks, XCircle, Clock, Terminal, Hourglass, Eye, FileText, Download, Wand2 } from 'lucide-react';
import ConfirmationModal from './ui/ConfirmationModal';
import { useToast } from '../context/ToastContext';

interface SmartFillerProps {
  context: CompanyContext;
}

type Step = 'UPLOAD' | 'ANALYZING' | 'RISK_REVIEW' | 'FIXING_RISKS' | 'QUESTIONS' | 'FILLING' | 'DONE';

interface IdentifiedField {
    key: string;
    label: string;
    description: string;
}

interface IdentifiedRisk {
    severity: string;
    description: string;
    suggestion: string;
}

const TIMEOUT_LIMIT = 120; // 120 Saniye (geminiService.ts ile uyumlu olmalı)

const SmartFiller: React.FC<SmartFillerProps> = ({ context }) => {
  // --- SESSION MANAGEMENT ---
  const getInitialSession = () => {
    try {
        const saved = localStorage.getItem('lexguard_smartfiller_session');
        return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  };
  
  const session = getInitialSession();

  const [step, setStep] = useState<Step>(session.step || 'UPLOAD');
  const [inputText, setInputText] = useState(session.inputText || '');
  const [uploadedFileName, setUploadedFileName] = useState(session.uploadedFileName || '');
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<IdentifiedField[]>(session.missingFields || []);
  const [risks, setRisks] = useState<IdentifiedRisk[]>(session.risks || []);
  const [userInputs, setUserInputs] = useState<Record<string, string>>(session.userInputs || {});
  const [outputText, setOutputText] = useState(session.outputText || '');
  const [changeLog, setChangeLog] = useState<string>(session.changeLog || '');
  const [fillLog, setFillLog] = useState<string[]>(session.fillLog || []);
  const [selectedRiskIndices, setSelectedRiskIndices] = useState<number[]>(session.selectedRiskIndices || []);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { addToast } = useToast();
  
  // New: View Mode Toggle
  const [isEditMode, setIsEditMode] = useState(false);

  // --- FEEDBACK STATES ---
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // --- OPERATION SAFETY ---
  const operationIdRef = useRef(0);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  
  // --- LOG TERMINAL ---
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
      const time = new Date().toLocaleTimeString('tr-TR', { hour12: false });
      setLogs(prev => [...prev, `[${time}] ${message}`]);
  };

  useEffect(() => {
      if (logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [logs]);

  // --- AUTO SAVE ---
  useEffect(() => {
    const sessionData = {
        step,
        inputText,
        uploadedFileName,
        missingFields,
        risks,
        userInputs,
        outputText,
        changeLog,
        fillLog,
        selectedRiskIndices
    };
    localStorage.setItem('lexguard_smartfiller_session', JSON.stringify(sessionData));
  }, [step, inputText, uploadedFileName, missingFields, risks, userInputs, outputText, changeLog, fillLog, selectedRiskIndices]);

  // Timer Logic
  useEffect(() => {
      let interval: any;
      if (step === 'ANALYZING' || step === 'FILLING' || step === 'FIXING_RISKS') {
          interval = setInterval(() => {
              setLoadingSeconds(s => {
                  if (s >= TIMEOUT_LIMIT - 1) {
                      addLog("⚠️ Zaman aşımı sınırına yaklaşıldı...");
                  }
                  return s + 1;
              });
          }, 1000);
      } else {
          setLoadingSeconds(0);
      }
      return () => clearInterval(interval);
  }, [step]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsFileLoading(true);
      setUploadedFileName(file.name);
      try {
        const text = await readDocumentContent(file);
        setInputText(text);
        addToast("Dosya başarıyla yüklendi.", "success");
      } catch (error) {
        addToast("Dosya okunamadı.", "error");
      } finally {
        setIsFileLoading(false);
        e.target.value = '';
      }
    }
  };

  const startProcess = async () => {
      if (!inputText) return;
      
      const currentOpId = operationIdRef.current + 1;
      operationIdRef.current = currentOpId;

      setStep('ANALYZING');
      setChangeLog(''); 
      setFillLog([]);   
      setLogs([]); 
      addLog("Analiz işlemi başlatılıyor...");
      addLog(`Belge boyutu: ${inputText.length} karakter.`);
      
      try {
          addLog("Yapay zekaya risk analizi gönderiliyor...");
          const result = await analyzeForSignature(inputText, context);
          
          if (operationIdRef.current !== currentOpId) return;
          addLog("Analiz sonucu alındı.");
          addLog(`${result.risks?.length || 0} risk ve ${result.missingFields?.length || 0} eksik alan tespit edildi.`);

          setMissingFields(result.missingFields || []);
          setRisks(result.risks || []);

          const riskCount = result.risks?.length || 0;
          setSelectedRiskIndices(Array.from({length: riskCount}, (_, i) => i));

          const initialInputs: Record<string, string> = {};
          (result.missingFields || []).forEach(f => initialInputs[f.key] = "");
          setUserInputs(initialInputs);

          if (riskCount > 0) {
              setStep('RISK_REVIEW');
              addLog("Risk inceleme ekranına geçiliyor.");
          } else if (result.missingFields?.length > 0) {
              setStep('QUESTIONS'); 
              addLog("Eksik bilgi doldurma ekranına geçiliyor.");
          } else {
              addLog("Risk ve eksik yok. Otomatik doldurma başlatılıyor...");
              await performFinalFill({}, currentOpId); 
          }

      } catch (error) {
          if (operationIdRef.current !== currentOpId) return;
          console.error(error);
          addLog("HATA: Analiz sırasında beklenmeyen bir sorun oluştu.");
          addToast("Analiz sırasında bir hata oluştu.", "error");
          setStep('UPLOAD');
      }
  };

  const toggleRiskSelection = (index: number) => {
      setSelectedRiskIndices(prev => 
          prev.includes(index) 
          ? prev.filter(i => i !== index) 
          : [...prev, index]
      );
  };

  const handleApplyRiskDecisions = async () => {
      if (selectedRiskIndices.length === 0) {
          handleIgnoreRisks();
          return;
      }

      const currentOpId = operationIdRef.current + 1;
      operationIdRef.current = currentOpId;

      setStep('FIXING_RISKS');
      setLogs([]); 
      addLog("Risk düzeltme işlemi başlatıldı.");
      addLog(`${selectedRiskIndices.length} risk için avukat revizesi isteniyor...`);

      try {
          const risksToFix = risks.filter((_, i) => selectedRiskIndices.includes(i));
          const result = await fixDocumentRisks(inputText, context, risksToFix);
          
          if (operationIdRef.current !== currentOpId) return;

          addLog("Revize metin başarıyla oluşturuldu.");
          setInputText(result.fixedText);
          setChangeLog(result.changeLog);
          setStep('QUESTIONS');
      } catch (error) {
          if (operationIdRef.current !== currentOpId) return;
          addLog("HATA: Risk düzeltme servisi yanıt vermedi.");
          addToast("Risk düzeltme sırasında hata oluştu. Orijinal metinle devam ediliyor.", "warning");
          setStep('QUESTIONS');
      }
  };

  const handleIgnoreRisks = () => {
      setChangeLog(''); 
      setStep('QUESTIONS');
  };

  const performFinalFill = async (customValues: Record<string, string>, opIdOverride?: number) => {
      const currentOpId = opIdOverride || (operationIdRef.current + 1);
      if (!opIdOverride) operationIdRef.current = currentOpId;

      setStep('FILLING');
      setLogs([]); 
      addLog("Belge doldurma işlemi başlatıldı.");
      addLog(`Kullanıcı verileri (${Object.keys(customValues).length} adet) işleniyor...`);

      try {
          const result = await fillDocument(inputText, context, customValues);
          
          if (operationIdRef.current !== currentOpId) return;
          addLog("Belge başarıyla dolduruldu.");

          setOutputText(result.filledText);
          setFillLog(result.fillLog || []);
          setStep('DONE');

          // Save to history
          saveToHistory({
            type: 'FILL',
            fileName: uploadedFileName || 'Doldurulmuş Belge',
            summary: 'Akıllı Belge Doldurma ve Risk Giderme',
            originalText: inputText,
            revisedText: result.filledText,
            riskScore: 0,
            risks: risks.map(r => ({
                severity: r.severity as any,
                description: r.description,
                suggestion: r.suggestion
            }))
          });
      } catch (error) {
           if (operationIdRef.current !== currentOpId) return;
           console.error(error);
           addLog("HATA: Belge doldurma servisi yanıt vermedi.");
           addToast("Belge doldurulurken hata oluştu.", "error");
           setStep('UPLOAD');
      }
  };

  const handleFormSubmit = () => {
      performFinalFill(userInputs);
  };

  const handleInputChange = (key: string, value: string) => {
      setUserInputs(prev => ({ ...prev, [key]: value }));
  };

  // --- CLEANER HELPER FOR CLIPBOARD ---
  const getCleanText = (rawText: string) => {
      // [[DÜZELTME: ...]] ve [[DOLUM: ...]] etiketlerini temizle, sadece içindeki metni al.
      // Regex iyileştirildi: Boşluk toleransı eklendi (\s*)
      return rawText.replace(/\[\[\s*(DÜZELTME|DOLUM)\s*:\s*(.*?)\s*\]\]/gi, '$2');
  };

  const copyToClipboard = () => {
    setIsCopying(true);
    // Panoya 'Temiz' metni kopyala (etiketler olmadan)
    const cleanText = getCleanText(outputText);
    navigator.clipboard.writeText(cleanText);
    setTimeout(() => {
        setIsCopying(false);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }, 600); 
  };

  const handleDownloadDocx = async () => {
      setIsDownloading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await generateAndDownloadDocx(outputText, `Revize_Sozlesme_${new Date().toISOString().slice(0,10)}.docx`);
      setIsDownloading(false);
  };

  const startNewSession = () => {
      operationIdRef.current += 1; 
      setInputText('');
      setOutputText('');
      setUploadedFileName('');
      setMissingFields([]);
      setRisks([]);
      setSelectedRiskIndices([]);
      setUserInputs({});
      setChangeLog('');
      setFillLog([]);
      setLogs([]);
      setStep('UPLOAD');
      setIsEditMode(false);
      setCopySuccess(false);
  };

  const handleCancel = () => {
      setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
      startNewSession();
      setShowCancelConfirm(false);
      addToast("İşlem iptal edildi.", "info");
  };

  const handleForceCancel = () => {
      operationIdRef.current += 1; 
      setStep('UPLOAD'); 
      addToast("İşlem kullanıcı tarafından durduruldu.", "warning");
  };

  const isContextMissing = !context.address || !context.taxInfo || !context.representative;
  
  const progressPercent = Math.min((loadingSeconds / TIMEOUT_LIMIT) * 100, 100);
  const remainingSeconds = Math.max(TIMEOUT_LIMIT - loadingSeconds, 0);

  // --- RENDER FORMATTED TEXT ---
  // Metni parse edip [[DÜZELTME: ...]] ve [[DOLUM: ...]] kısımlarını renklendirir.
  // GÜNCELLEME: Regex artık boşluklara ve büyük/küçük harf durumuna karşı daha toleranslı.
  const renderFormattedText = (text: string) => {
      // Regex: [[ ile başlayıp ]] ile biten kısımları ayır.
      const parts = text.split(/(\[\[.*?\]\])/g);
      
      return parts.map((part, index) => {
          if (part.startsWith('[[') && part.endsWith(']]')) {
              // Etiket içeriğini temizle
              const contentRaw = part.replace(/^\[\[/, '').replace(/\]\]$/, '');
              
              let label = "";
              let value = contentRaw;
              let containerClass = "font-bold px-1 rounded ";
              
              // Toleranslı Kontrol
              // /^\s*DÜZELTME\s*:/i -> Başta boşluk olabilir, DÜZELTME yazısı (case-insensitive), sonra :
              if (/^\s*DÜZELTME\s*:/i.test(contentRaw)) {
                  label = "DÜZELTME";
                  value = contentRaw.replace(/^\s*DÜZELTME\s*:/i, '').trim();
                  containerClass += "text-red-700 bg-red-100 border border-red-200 shadow-sm"; // Stil güçlendirildi
              } else if (/^\s*DOLUM\s*:/i.test(contentRaw)) {
                  label = "DOLUM";
                  value = contentRaw.replace(/^\s*DOLUM\s*:/i, '').trim();
                  containerClass += "text-blue-700 bg-blue-100 border border-blue-200 shadow-sm"; // Stil güçlendirildi
              } else {
                  // Bilinmeyen etiket, olduğu gibi göster ama biraz silik yap
                  return <span key={index} className="text-gray-400 text-xs">{part}</span>;
              }

              return (
                  <span key={index} className={containerClass} title={label}>
                      {value}
                  </span>
              );
          }
          return <span key={index}>{part}</span>;
      });
  };

  // --- RENDER HELPERS ---

  const renderUploadStep = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
        <div className="max-w-xl w-full bg-white dark:bg-slate-800 p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-center shadow-sm">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
                inputText ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
            }`}>
                {isFileLoading ? <Loader2 className="animate-spin" size={32}/> : inputText ? <CheckCircle size={32}/> : <Upload size={32} />}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {inputText ? 'Belge İncelenmeye Hazır' : 'Belgeyi Yükleyin'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Sözleşme, protokol veya form yükleyin. <br/>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">AI önce riskleri denetleyecek, sonra boşlukları dolduracaktır.</span>
            </p>

            <div className="flex flex-col items-center gap-3 w-full">
                <label className={`w-full max-w-xs cursor-pointer px-6 py-3 rounded-xl font-semibold transition-all shadow-sm items-center justify-center gap-2 flex ${
                    inputText ? 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600' : 'bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white'
                }`}>
                    {isFileLoading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>}
                    {isFileLoading ? 'Dosya Okunuyor...' : inputText ? 'Başka Dosya Seç' : 'Dosya Seç (.pdf/.docx)'}
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt"/>
                </label>

                {inputText && (
                     <button 
                        onClick={startProcess}
                        className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                     >
                        <ShieldCheck size={18} /> Denetle ve Doldur
                     </button>
                )}
            </div>

            {uploadedFileName && (
                <div className="mt-4 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <CheckCircle size={12}/> {uploadedFileName}
                </div>
            )}
        </div>
    </div>
  );

  const renderRiskReviewStep = () => (
      <div className="h-full flex flex-col max-w-4xl mx-auto w-full p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-red-100 dark:border-red-900/30 overflow-hidden flex flex-col h-full relative">
               <div className="bg-red-50 dark:bg-red-900/20 p-6 border-b border-red-100 dark:border-red-900/30 shrink-0 flex items-center gap-4">
                   <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shrink-0">
                       <ShieldAlert size={28}/>
                   </div>
                   <div>
                        <h3 className="text-xl font-bold text-red-900 dark:text-red-300">Risk Yönetim Paneli</h3>
                        <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                            Şirket politikalarına aykırı <strong>{risks?.length || 0} risk</strong> bulundu. Düzeltilmesini istediklerinizi seçin.
                        </p>
                   </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                   {risks && risks.length > 0 ? risks.map((risk, idx) => {
                       const isSelected = selectedRiskIndices.includes(idx);
                       return (
                           <div 
                                key={idx} 
                                onClick={() => toggleRiskSelection(idx)}
                                className={`border rounded-lg p-4 cursor-pointer transition-all relative ${
                                   isSelected 
                                   ? (risk.severity === 'High' ? 'border-red-400 bg-red-50 dark:bg-red-900/30 ring-1 ring-red-400' : 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-400')
                                   : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-70 hover:opacity-100'
                               }`}
                           >
                               <div className="absolute top-4 right-4 text-slate-400 dark:text-slate-500">
                                   {isSelected ? <CheckSquare className="text-indigo-600 dark:text-indigo-400" size={24}/> : <Square size={24}/>}
                               </div>

                               <div className="flex justify-between items-center mb-2 pr-8">
                                   <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                       risk.severity === 'High' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                   }`}>
                                       {risk.severity === 'High' ? 'KRİTİK RİSK' : 'ORTA RİSK'}
                                   </span>
                                   <span className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
                                       isSelected ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'
                                   }`}>
                                       {isSelected ? 'DÜZELTİLECEK' : 'YOKSAYILACAK'}
                                   </span>
                               </div>
                               <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2 pr-8">{risk.description}</p>
                               <div className="flex gap-2 items-start bg-white/60 dark:bg-slate-900/60 p-3 rounded border border-black/5 dark:border-white/5 text-sm text-slate-600 dark:text-slate-400">
                                   <Sparkles size={16} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5"/>
                                   <div>
                                       <strong className="text-indigo-900 dark:text-indigo-300">Öneri:</strong> {risk.suggestion}
                                   </div>
                               </div>
                           </div>
                       );
                   }) : (
                        <div className="text-center text-slate-500 dark:text-slate-400">Risk bulunamadı veya veri yüklenemedi.</div>
                   )}
               </div>

               <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-center">
                   <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                       * Seçilmeyen riskler orijinal haliyle bırakılacaktır.
                   </div>
                   
                   <button 
                       onClick={handleApplyRiskDecisions}
                       className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2"
                   >
                       <Sparkles size={18}/> 
                       {selectedRiskIndices.length > 0 ? `${selectedRiskIndices.length} Riski Düzelt ve İlerle` : 'Hiçbirini Düzeltme, İlerle'}
                   </button>
               </div>
          </div>
      </div>
  );

  const renderQuestionsStep = () => (
      <div className="h-full flex flex-col max-w-3xl mx-auto w-full p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900/30 overflow-hidden flex flex-col h-full">
              <div className="bg-indigo-600 p-6 text-white shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Edit3 size={24}/> Bilgileri Tamamla</h3>
                  <p className="text-indigo-100 text-sm mt-1">Belge onaylandı. Şimdi son {missingFields?.length || 0} eksik bilgiyi dolduralım.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                  {(!missingFields || missingFields.length === 0) ? (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-10">
                          <CheckCircle size={48} className="mx-auto text-green-500 mb-4"/>
                          <p>Harika! Ekstra bilgiye ihtiyaç yok. Belge oluşturulmaya hazır.</p>
                      </div>
                  ) : (
                      missingFields.map((field, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {idx + 1}. {field.label}
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{field.description}</p>
                            <input 
                                type="text"
                                value={userInputs[field.key] || ''}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                placeholder={`"${field.label}" bilgisini giriniz...`}
                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
                            />
                        </div>
                      ))
                  )}
              </div>

              <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-between items-center">
                   <button onClick={handleCancel} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-bold">İptal</button>
                   <button 
                      onClick={handleFormSubmit}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg dark:shadow-none transition-all flex items-center gap-2"
                   >
                       Belgeyi Oluştur <ArrowRight size={18}/>
                   </button>
              </div>
          </div>
      </div>
  );

  const renderDoneStep = () => (
      <div className="h-full flex flex-col p-6 animate-fade-in gap-6">
          <div className="flex justify-between items-center shrink-0">
              <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle className="text-green-500" size={28}/> Belge Hazır
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Güvenlik kontrolünden geçti ve dolduruldu.</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={startNewSession} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold border border-slate-200 dark:border-slate-700 transition-colors">
                      Yeni Belge
                  </button>
                  <button 
                    onClick={copyToClipboard}
                    className={`px-6 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 min-w-[140px] justify-center ${
                        copySuccess 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                      {isCopying ? <Loader2 size={18} className="animate-spin"/> : copySuccess ? <Check size={18}/> : <Copy size={18}/>}
                      {isCopying ? 'Kopyalanıyor...' : copySuccess ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                  <button 
                    onClick={handleDownloadDocx}
                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold shadow-md dark:shadow-none transition-all flex items-center gap-2 min-w-[160px] justify-center"
                    disabled={isDownloading}
                  >
                      {isDownloading ? <Loader2 size={18} className="animate-spin"/> : <FileText size={18}/>}
                      {isDownloading ? 'Hazırlanıyor...' : 'Word İndir (.docx)'}
                  </button>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6">
              
              {/* FINAL SÖZLEŞME */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-0 overflow-hidden flex flex-col min-h-[500px]">
                  <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-4">
                          <span>NİHAİ METİN</span>
                          {/* VIEW TOGGLE BUTTON */}
                          <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
                              <button 
                                  onClick={() => setIsEditMode(false)}
                                  className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${!isEditMode ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                              >
                                  <Eye size={12}/> Görünüm Modu
                              </button>
                              <button 
                                  onClick={() => setIsEditMode(true)}
                                  className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${isEditMode ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                              >
                                  <Edit3 size={12}/> Düzenleme Modu
                              </button>
                          </div>
                      </div>
                      
                      {isEditMode && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><PenTool size={12}/> Düzenlenebilir</span>
                      )}
                  </div>
                  
                  {isEditMode ? (
                      <textarea 
                          value={outputText}
                          onChange={(e) => setOutputText(e.target.value)}
                          className="flex-1 w-full p-8 resize-none outline-none font-serif text-sm text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800 leading-relaxed focus:bg-slate-50/50 dark:focus:bg-slate-900/50 transition-colors"
                          placeholder="Belge oluşturuluyor..."
                      />
                  ) : (
                      <div className="flex-1 w-full p-8 font-serif text-sm text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800 leading-relaxed overflow-y-auto whitespace-pre-wrap">
                          {renderFormattedText(outputText)}
                      </div>
                  )}
              </div>

              {/* RAPOR */}
              {(changeLog || (fillLog && fillLog.length > 0)) && (
                  <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-900/30 rounded-xl p-0 shadow-sm overflow-hidden">
                      <div className="bg-red-100/50 dark:bg-red-900/30 p-4 border-b border-red-200 dark:border-red-900/30 flex items-center justify-between">
                          <h4 className="text-red-900 dark:text-red-300 font-bold text-lg flex items-center gap-2">
                             <ShieldCheck size={24}/> AI Hukuk Denetim Paneli
                          </h4>
                          <span className="text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wide">Değişiklik Günlüğü</span>
                      </div>
                      
                      <div className="p-6 space-y-6">
                          {changeLog && (
                             <div>
                                 <h5 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                                     <ShieldAlert size={16}/> 1. Hukuki Risk Müdahaleleri
                                 </h5>
                                 <div className="bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-lg p-4 prose prose-sm prose-red dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                                     <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{changeLog}</pre>
                                 </div>
                             </div>
                          )}

                          {fillLog && fillLog.length > 0 && (
                             <div>
                                 <h5 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
                                     <ListChecks size={16}/> 2. Veri Dolum Raporu
                                 </h5>
                                 <div className="bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
                                     <ul className="list-disc list-inside space-y-1">
                                         {fillLog.map((log, i) => (
                                             <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                                                 {log}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 relative transition-colors">
        
        {/* Loading Overlay */}
        {(step === 'ANALYZING' || step === 'FILLING' || step === 'FIXING_RISKS') && (
            <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in px-4 text-center">
                
                {/* --- TIME INDICATOR --- */}
                <div className="mb-8 w-full max-w-md">
                     <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                         <span className="flex items-center gap-1"><Clock size={12}/> İşlem Süresi</span>
                         <span className={remainingSeconds < 20 ? "text-red-600 animate-pulse" : "text-slate-700 dark:text-slate-300"}>
                             {remainingSeconds} sn kaldı (Timeout: 120s)
                         </span>
                     </div>
                     <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                         <div 
                            className={`h-full transition-all duration-1000 ease-linear ${remainingSeconds < 20 ? 'bg-red-500' : 'bg-indigo-600'}`}
                            style={{ width: `${progressPercent}%` }}
                         ></div>
                     </div>
                </div>

                {step === 'FIXING_RISKS' ? (
                     <Sparkles size={64} className="text-indigo-600 dark:text-indigo-400 animate-pulse mb-6"/>
                ) : (
                     <Loader2 size={64} className="text-indigo-600 dark:text-indigo-400 animate-spin mb-6"/>
                )}
                
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    {step === 'ANALYZING' && 'AI Hukuk Denetimi Yapılıyor...'}
                    {step === 'FIXING_RISKS' && 'Seçtiğiniz Riskler Düzeltiliyor...'}
                    {step === 'FILLING' && 'Belge Tamamlanıyor...'}
                </h2>

                {/* --- LIVE LOG TERMINAL --- */}
                <div className="w-full max-w-lg bg-slate-900 dark:bg-black rounded-lg p-4 mb-8 text-left font-mono text-xs shadow-xl border border-slate-700 dark:border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800 dark:border-slate-900 pb-2 mb-2 sticky top-0 bg-slate-900 dark:bg-black">
                        <Terminal size={14}/> Canlı İşlem Logu
                    </div>
                    {logs.length === 0 && <span className="text-slate-600 italic">Başlatılıyor...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="text-green-400 mb-1 break-words">
                            {i === logs.length - 1 ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
                                    {log}
                                </span>
                            ) : (
                                <span className="opacity-70">{log}</span>
                            )}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {/* FORCE CANCEL BUTTON */}
                <button 
                    onClick={handleForceCancel}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-bold shadow-sm"
                >
                    <XCircle size={20}/>
                    Durdur ve İptal Et
                </button>
            </div>
        )}

        {isContextMissing && step === 'UPLOAD' && (
           <div className="absolute top-4 right-4 z-40 max-w-sm bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-lg">
               <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400" size={20}/>
               <div>
                   <h4 className="font-bold text-sm">Şirket Bilgileri Eksik</h4>
                   <p className="text-xs mt-1">
                       "Profil" sayfasından bilgileri girerseniz, AI denetimi daha sağlıklı yapar.
                   </p>
               </div>
           </div>
        )}

        {step === 'UPLOAD' && renderUploadStep()}
        {step === 'RISK_REVIEW' && renderRiskReviewStep()}
        {step === 'QUESTIONS' && renderQuestionsStep()}
        {step === 'DONE' && renderDoneStep()}

        {/* Modals */}
        <ConfirmationModal
            isOpen={showCancelConfirm}
            onClose={() => setShowCancelConfirm(false)}
            onConfirm={confirmCancel}
            title="İşlemi İptal Et"
            message="İşlemi iptal etmek istediğinize emin misiniz? Yüklenen belge ve veriler temizlenecektir."
            confirmText="Evet, İptal Et"
            type="danger"
        />
    </div>
  );
};

export default SmartFiller;