import React, { useState, useEffect, useRef } from 'react';
import { CompanyContext, MasterContract, AIProvider } from '../types';
import { Save, Building2, Briefcase, AlertTriangle, Globe, FileText, Upload, BrainCircuit, Target, ShieldAlert, ScrollText, Loader2, CheckCircle, Trash2, XCircle, RefreshCw, Check, MapPin, Receipt, PenTool, Phone, Mail, Zap, Key, Lock, Activity, Bot, Cpu, Brain, Package, Gavel, Sparkles, Link } from 'lucide-react';
import { readDocumentContent } from '../services/fileService';
import { validateApiKey, fetchCompanyProfileFromWeb, analyzeProductDocument } from '../services/geminiService';

interface KnowledgeBaseProps {
  context: CompanyContext;
  onSave: (ctx: CompanyContext) => void;
}

// Sekme türlerini güncelliyoruz: URUNLER eklendi
type Tab = 'IDENTITY' | 'URUNLER' | 'TEMPORARY' | 'SATIS' | 'KIRALAMA' | 'BDHS' | 'DEMO' | 'REKLAM' | 'TEKNIK';

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ context, onSave }) => {
  // Initialize from Local Storage
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (localStorage.getItem('lexguard_kb_active_tab') as Tab) || 'IDENTITY';
  });

  const [formData, setFormData] = useState<CompanyContext>(context);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebFetching, setIsWebFetching] = useState(false); // YENİ: Web çekme durumu
  const [websiteUrl, setWebsiteUrl] = useState("https://www.akinrobotics.com"); // YENİ: URL Input State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  // API Validation State
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [keyValidationMsg, setKeyValidationMsg] = useState('');
  
  // Aktif sekmedeki metni tutmak için state
  const [activeContractText, setActiveContractText] = useState('');
  
  // --- SAFETY LOCK: Data Loading Flag ---
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Context (App State) değiştiğinde Form'u güncelle
  useEffect(() => {
    setFormData(context);
  }, [context]);

  // Tab değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('lexguard_kb_active_tab', activeTab);
    setUploadedFileName(null);
    setIsDataLoaded(false); // Yeni tab'a geçerken kilidi kapat
  }, [activeTab]);

  // --- KRİTİK GÜNCELLEME: SEKME DEĞİŞİMİ VE VERİ YÜKLEME MANTIĞI ---
  useEffect(() => {
    if (activeTab === 'IDENTITY' || activeTab === 'URUNLER') {
        setIsDataLoaded(true);
        return;
    }

    const typeMap: Record<string, string> = {
        'SATIS': 'Satış Sözleşmesi',
        'KIRALAMA': 'Kiralama Sözleşmesi',
        'BDHS': 'BDHS Sözleşmesi',
        'DEMO': 'Demo Sözleşmesi',
        'REKLAM': 'Reklam/Tanıtım Anlaşması',
        'TEKNIK': 'Teknik Servis Sözleşmesi',
        'TEMPORARY': 'Geçici Sözleşme'
    };
    
    const targetType = typeMap[activeTab];
    
    // 1. Önce bu sekme için "Kaydedilmemiş Taslak" var mı bak (F5 koruması)
    const savedDraft = localStorage.getItem(`lexguard_draft_${activeTab}`);
    
    // 2. Sonra kayıtlı "Ana Sözleşme" var mı bak
    const existingMaster = formData.masterContracts?.find(c => c.type === targetType);

    if (activeTab === 'TEMPORARY') {
        setActiveContractText(formData.temporaryContract || '');
    } else if (savedDraft && savedDraft.length > 0) {
        // Eğer taslak varsa öncelik onundur (Kullanıcı yazıyordu, F5 attı)
        setActiveContractText(savedDraft);
    } else if (existingMaster) {
        // Taslak yoksa kayıtlı veriyi getir
        setActiveContractText(existingMaster.content);
    } else {
        // Hiçbiri yoksa boşalt
        setActiveContractText('');
    }
    
    // Veri yüklendi, kilidi aç
    setIsDataLoaded(true);

  }, [activeTab, formData.masterContracts]);

  // --- CUSTOM RULES HANDLERS ---
  const [newRuleContent, setNewRuleContent] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('Genel');

  const handleAddRule = () => {
      if (!newRuleContent.trim()) return;
      
      const newRule = {
          id: crypto.randomUUID(),
          content: newRuleContent,
          category: newRuleCategory,
          isActive: true,
          dateAdded: Date.now()
      };
      
      const updatedRules = [...(formData.customRules || []), newRule];
      const newContext = { ...formData, customRules: updatedRules };
      
      setFormData(newContext);
      onSave(newContext);
      setNewRuleContent('');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleRule = (id: string) => {
      const updatedRules = (formData.customRules || []).map(rule => 
          rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
      );
      const newContext = { ...formData, customRules: updatedRules };
      setFormData(newContext);
      onSave(newContext);
  };

  const handleDeleteRule = (id: string) => {
      if(!confirm("Bu kuralı silmek istediğinize emin misiniz?")) return;
      const updatedRules = (formData.customRules || []).filter(rule => rule.id !== id);
      const newContext = { ...formData, customRules: updatedRules };
      setFormData(newContext);
      onSave(newContext);
  };

  // --- KRİTİK GÜNCELLEME: ANLIK TASLAK KAYDI ---
  // Sadece veri yüklendiyse (isDataLoaded === true) kaydet.
  useEffect(() => {
    if (activeTab !== 'IDENTITY' && activeTab !== 'URUNLER' && isDataLoaded) {
        localStorage.setItem(`lexguard_draft_${activeTab}`, activeContractText);
    }
  }, [activeContractText, activeTab, isDataLoaded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newData);
    setIsSaved(false);
  };

  // Provider veya Key değiştiğinde
  const handleKeyChange = (provider: AIProvider, val: string) => {
      setFormData(prev => ({
          ...prev,
          apiKeys: {
              ...(prev.apiKeys || {}),
              [provider.toLowerCase()]: val
          }
      }));
      setKeyValidationStatus('IDLE');
      setKeyValidationMsg('');
      setIsSaved(false);
  };

  const handleProviderSelect = (provider: AIProvider) => {
      setFormData(prev => ({ ...prev, activeProvider: provider }));
      setKeyValidationStatus('IDLE');
      setKeyValidationMsg('');
      setIsSaved(false);
  };

  const handleTestApiKey = async () => {
      const provider = formData.activeProvider;
      const key = formData.apiKeys[provider.toLowerCase() as keyof typeof formData.apiKeys] || "";

      // BOŞ KEY İZNİ: Kullanıcı anahtar girmeden de "Test" edebilir -> Demo modu
      setIsValidatingKey(true);
      setKeyValidationStatus('IDLE');
      setKeyValidationMsg('');
      
      try {
          const result = await validateApiKey(key, provider);
          setIsValidatingKey(false);
          if (result.isValid) {
              setKeyValidationStatus('SUCCESS');
              setKeyValidationMsg(result.message);
          } else {
              setKeyValidationStatus('ERROR');
              setKeyValidationMsg(result.message);
          }
      } catch (e) {
          setIsValidatingKey(false);
          setKeyValidationStatus('ERROR');
          setKeyValidationMsg("Bağlantı hatası.");
      }
  };

  // WEB SCRAPING HANDLER
  const handleAutoFillFromWeb = async () => {
      if (!websiteUrl.trim()) {
          alert("Lütfen taranacak web sitesi adresini girin.");
          return;
      }

      setIsWebFetching(true);
      try {
          const result = await fetchCompanyProfileFromWeb(websiteUrl, formData);
          
          setFormData(prev => ({
              ...prev,
              productPortfolio: result
          }));
          
          setIsSaved(false); // Yeni veri geldi, kaydedilmedi işareti koy
      } catch (e) {
          alert("Web sitesi analizi sırasında bir hata oluştu.");
          console.error(e);
      } finally {
          setIsWebFetching(false);
      }
  };

  // IDENTITY Inputları için Blur olduğunda kaydet
  const handleBlur = () => {
      onSave(formData);
  };

  const handleIdentitySave = () => {
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleContractSave = () => {
    if (activeTab === 'TEMPORARY') {
        const newContext = { 
            ...formData, 
            temporaryContract: activeContractText,
            isTemporaryContractActive: formData.isTemporaryContractActive ?? true 
        };
        setFormData(newContext);
        onSave(newContext);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        return;
    }

    const typeMap: Record<string, string> = {
        'SATIS': 'Satış Sözleşmesi',
        'KIRALAMA': 'Kiralama Sözleşmesi',
        'BDHS': 'BDHS Sözleşmesi',
        'DEMO': 'Demo Sözleşmesi',
        'REKLAM': 'Reklam/Tanıtım Anlaşması',
        'TEKNIK': 'Teknik Servis Sözleşmesi'
    };
    const targetType = typeMap[activeTab as string];
    if (!targetType) return;

    let newMasters = [...(formData.masterContracts || [])];
    const index = newMasters.findIndex(c => c.type === targetType);
    
    if (index >= 0) {
        newMasters[index] = { ...newMasters[index], content: activeContractText };
    } else {
        newMasters.push({
            id: crypto.randomUUID(),
            type: targetType,
            name: `Standart ${targetType}`, 
            content: activeContractText
        });
    }

    const newContext = { ...formData, masterContracts: newMasters };
    setFormData(newContext);
    onSave(newContext);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleContractDelete = () => {
    const typeMap: Record<string, string> = {
        'SATIS': 'Satış Sözleşmesi',
        'KIRALAMA': 'Kiralama Sözleşmesi',
        'BDHS': 'BDHS Sözleşmesi',
        'DEMO': 'Demo Sözleşmesi',
        'REKLAM': 'Reklam/Tanıtım Anlaşması',
        'TEKNIK': 'Teknik Servis Sözleşmesi'
    };
    const targetType = typeMap[activeTab as string];
    if (!targetType) return;

    if(!confirm(`${targetType} şablonunu silmek istediğinize emin misiniz?`)) return;

    const newMasters = (formData.masterContracts || []).filter(c => c.type !== targetType);
    const newContext = { ...formData, masterContracts: newMasters };
    
    setFormData(newContext);
    onSave(newContext);
    setActiveContractText(''); 
    // Taslağı da temizle
    localStorage.removeItem(`lexguard_draft_${activeTab}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadedFileName(null);
    try {
        const text = await readDocumentContent(file);
        setActiveContractText(text); // Bu işlem otomatik olarak useEffect tetikleyip taslağa yazacak
        setUploadedFileName(file.name);
    } catch (error) {
        alert("Dosya okunamadı. Lütfen geçerli bir .docx, .pdf veya .txt dosyası seçin.");
        console.error(error);
    } finally {
        setIsLoading(false);
        e.target.value = '';
    }
  };

  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
        const text = await readDocumentContent(file);
        const analyzedInfo = await analyzeProductDocument(text, formData);
        
        // Mevcut portföye ekle veya güncelle
        const updatedPortfolio = formData.productPortfolio 
            ? `${formData.productPortfolio}\n\n--- YENİ EKLENEN (DOKÜMANDAN) ---\n${analyzedInfo}`
            : analyzedInfo;

        const newContext = { ...formData, productPortfolio: updatedPortfolio };
        setFormData(newContext);
        onSave(newContext);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
        alert("Ürün dokümanı analiz edilemedi.");
        console.error(error);
    } finally {
        setIsLoading(false);
        e.target.value = '';
    }
  };

  const renderTabButton = (id: Tab, label: string) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`whitespace-nowrap pb-3 px-4 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
    >
        {id !== 'IDENTITY' && id !== 'URUNLER' && <FileText size={16}/>}
        {label}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto w-full bg-slate-50 dark:bg-slate-900 flex flex-col relative">
      {/* Header Area */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 py-4 shrink-0 shadow-sm z-10">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Kurumsal Hafıza & Eğitim</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Yapay zeka avukatınızı şirket vizyonuna göre eğitin.</p>
                </div>
            </div>
            
            <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar pb-1">
                {renderTabButton('IDENTITY', 'Strateji & Kimlik')}
                {renderTabButton('URUNLER', 'Ürün & Mevzuat')}
                {renderTabButton('TEMPORARY', 'Geçici Sözleşme')}
                <div className="w-px bg-slate-300 dark:bg-slate-600 mx-2 h-6 self-center shrink-0"></div>
                {renderTabButton('SATIS', 'Satış')}
                {renderTabButton('KIRALAMA', 'Kiralama')}
                {renderTabButton('BDHS', 'BDHS (Bakım)')}
                {renderTabButton('TEKNIK', 'Teknik Servis')}
                {renderTabButton('DEMO', 'Demo')}
                {renderTabButton('REKLAM', 'Reklam')}
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
            
            {activeTab === 'IDENTITY' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                            <BrainCircuit size={24}/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Karakter Eğitimi</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Avukatınızın olaylara nasıl yaklaşması gerektiğini buradan belirleyin.</p>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* SOL KOLON */}
                        <div className="space-y-6">
                            
                            {/* --- AI PROVIDER SELECTOR --- */}
                            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 border-2 border-indigo-200 dark:border-slate-700 p-5 rounded-xl space-y-4 shadow-md shadow-indigo-100 dark:shadow-none relative overflow-hidden">
                                {/* Visual Accent */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
                                
                                <div>
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2 mb-3">
                                        <Zap size={16} className="text-indigo-600 fill-indigo-100 dark:fill-indigo-900/30"/> Yapay Zeka Sağlayıcısı
                                    </h4>
                                    
                                    {/* Provider Tabs */}
                                    <div className="grid grid-cols-3 gap-2 bg-indigo-100/50 dark:bg-slate-950/50 p-1 rounded-lg mb-4">
                                        <button 
                                            onClick={() => handleProviderSelect('GOOGLE')}
                                            className={`py-2 px-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${formData.activeProvider === 'GOOGLE' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-slate-600' : 'text-indigo-400 hover:text-indigo-600'}`}
                                        >
                                            <Bot size={14}/> Google
                                        </button>
                                        <button 
                                            onClick={() => handleProviderSelect('OPENAI')}
                                            className={`py-2 px-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${formData.activeProvider === 'OPENAI' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm ring-1 ring-teal-200 dark:ring-slate-600' : 'text-indigo-400 hover:text-indigo-600'}`}
                                        >
                                            <Cpu size={14}/> OpenAI
                                        </button>
                                        <button 
                                            onClick={() => handleProviderSelect('ANTHROPIC')}
                                            className={`py-2 px-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${formData.activeProvider === 'ANTHROPIC' ? 'bg-white dark:bg-slate-700 text-orange-700 dark:text-orange-300 shadow-sm ring-1 ring-orange-200 dark:ring-slate-600' : 'text-indigo-400 hover:text-indigo-600'}`}
                                        >
                                            <Brain size={14}/> Claude
                                        </button>
                                    </div>

                                    {/* Dynamic Fields based on Provider */}
                                    <div className="space-y-4">
                                        
                                        {formData.activeProvider === 'GOOGLE' && (
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Model Seçimi (Google)</label>
                                                <select
                                                    name="preferredModel"
                                                    value={formData.preferredModel || 'gemini-3-pro-preview'}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-lg text-sm font-bold text-indigo-900 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="gemini-3-pro-preview">🧠 Gemini 3 Pro (En Zeki)</option>
                                                    <option value="gemini-3-flash-preview">⚡ Gemini 3 Flash (Hızlı)</option>
                                                </select>
                                                <p className="text-[10px] text-indigo-500 dark:text-indigo-400">
                                                    * Google modelleri geniş bağlam penceresi (2M token) sunar. Sözleşmeler için idealdir.
                                                </p>
                                            </div>
                                        )}

                                        {formData.activeProvider === 'OPENAI' && (
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Model Seçimi (OpenAI)</label>
                                                <select
                                                    name="preferredModel"
                                                    value={formData.preferredModel || 'gpt-4o'}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-teal-200 dark:border-slate-700 rounded-lg text-sm font-bold text-teal-900 dark:text-teal-300 focus:ring-2 focus:ring-teal-500 outline-none"
                                                >
                                                    <option value="gpt-4o">⚡ GPT-4o (En Dengeli)</option>
                                                    <option value="gpt-4o-mini">💨 GPT-4o Mini (En Hızlı)</option>
                                                    <option value="o1-preview">🧠 o1-preview (Derin Mantık)</option>
                                                </select>
                                                <p className="text-[10px] text-teal-600 dark:text-teal-400">
                                                    * OpenAI modelleri mantıksal çıkarımda ve JSON çıktılarında çok güçlüdür.
                                                </p>
                                            </div>
                                        )}

                                        {formData.activeProvider === 'ANTHROPIC' && (
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Model Seçimi (Anthropic)</label>
                                                <select
                                                    name="preferredModel"
                                                    value={formData.preferredModel || 'claude-3-5-sonnet-latest'}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-slate-700 rounded-lg text-sm font-bold text-orange-900 dark:text-orange-300 focus:ring-2 focus:ring-orange-500 outline-none"
                                                >
                                                    <option value="claude-3-5-sonnet-latest">🌟 Claude 3.5 Sonnet (Önerilen)</option>
                                                    <option value="claude-3-5-haiku-latest">💨 Claude 3.5 Haiku (Hızlı)</option>
                                                    <option value="claude-3-opus-20240229">🧠 Claude 3 Opus (En Zeki)</option>
                                                </select>
                                                <p className="text-[10px] text-orange-600 dark:text-orange-400">
                                                    * Claude modelleri uzun metinleri ve hukuki dili anlamada çok başarılıdır.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-indigo-100 dark:border-slate-700">
                                     <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2 mb-2">
                                        <Key size={16} className="text-indigo-600 dark:text-indigo-400"/> 
                                        {formData.activeProvider === 'GOOGLE' && 'Gemini API Key'}
                                        {formData.activeProvider === 'OPENAI' && 'OpenAI API Key'}
                                        {formData.activeProvider === 'ANTHROPIC' && 'Anthropic API Key'}
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="relative flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
                                                    <Lock size={14}/>
                                                </div>
                                                <input
                                                    type="password"
                                                    value={(formData.apiKeys?.[formData.activeProvider.toLowerCase() as keyof typeof formData.apiKeys] || '')}
                                                    onChange={(e) => handleKeyChange(formData.activeProvider, e.target.value)}
                                                    onBlur={handleBlur}
                                                    placeholder={
                                                        formData.activeProvider === 'GOOGLE' ? "AI Studio Key (AI-...)" :
                                                        formData.activeProvider === 'OPENAI' ? "sk-proj-..." :
                                                        "sk-ant-..."
                                                    }
                                                    className={`w-full pl-9 p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono text-indigo-900 dark:text-indigo-300 focus:ring-2 outline-none placeholder-indigo-300 dark:placeholder-slate-600 ${keyValidationStatus === 'ERROR' ? 'border-red-300 focus:ring-red-200' : keyValidationStatus === 'SUCCESS' ? 'border-green-300 focus:ring-green-200' : 'border-indigo-200 dark:border-slate-700 focus:ring-indigo-500'}`}
                                                />
                                            </div>
                                            <button 
                                                onClick={handleTestApiKey}
                                                disabled={isValidatingKey}
                                                className="px-3 py-2 bg-indigo-100 dark:bg-slate-700 hover:bg-indigo-200 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                                                title="Anahtarı Test Et"
                                            >
                                                {isValidatingKey ? <Loader2 size={16} className="animate-spin"/> : <Activity size={16}/>}
                                                {isValidatingKey ? '...' : 'Test'}
                                            </button>
                                        </div>
                                        
                                        {/* Validation Status Feedback */}
                                        {keyValidationStatus === 'SUCCESS' && (
                                            <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 dark:bg-green-900/20 p-2 rounded animate-fade-in">
                                                <CheckCircle size={14}/> {keyValidationMsg}
                                            </div>
                                        )}
                                        {keyValidationStatus === 'ERROR' && (
                                            <div className="flex items-center gap-2 text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded animate-fade-in">
                                                <XCircle size={14}/> {keyValidationMsg}
                                            </div>
                                        )}
                                        
                                        {formData.activeProvider !== 'GOOGLE' && (
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded border border-emerald-100 dark:border-emerald-900/40">
                                                ✅ Bilgi: OpenAI ve Anthropic modelleri artık tüm analiz ve dolum modüllerinde tam uyumlu olarak çalışmaktadır.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 flex items-center gap-2 mt-4">
                                <Building2 size={18} className="text-slate-400"/> Temel Kurumsal Bilgiler
                            </h4>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Şirket Ünvanı</label>
                                <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Örn: AKINROBOTICS A.Ş."
                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sektör & Faaliyet Alanı</label>
                                <input
                                type="text"
                                name="industry"
                                value={formData.industry}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Örn: Robotik, Yazılım, SaaS"
                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                />
                            </div>

                             <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tercih Edilen Yargı Yetkisi</label>
                                <input
                                type="text"
                                name="preferredJurisdiction"
                                value={formData.preferredJurisdiction}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Örn: Konya Mahkemeleri ve İcra Daireleri"
                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                />
                            </div>
                        </div>

                        {/* SAĞ KOLON */}
                        <div className="space-y-6">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 flex items-center gap-2">
                                <FileText size={18} className="text-slate-400"/> Resmi Bilgiler (Otomatik Dolum İçin)
                            </h4>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><MapPin size={14}/> Resmi Tebligat Adresi</label>
                                <textarea
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    rows={2}
                                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                    placeholder="Tam şirket adresi..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Receipt size={14}/> Vergi Dairesi / No</label>
                                    <input
                                        type="text"
                                        name="taxInfo"
                                        value={formData.taxInfo || ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Örn: Mevlana VD. 1234567890"
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><PenTool size={14}/> İmza Yetkilisi</label>
                                    <input
                                        type="text"
                                        name="representative"
                                        value={formData.representative || ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Örn: Dr. Özgür AKIN (Yön. Kur. Bşk.)"
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Phone size={14}/> Telefon Numarası</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Örn: +90 332 ..."
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Mail size={14}/> E-posta Adresi</label>
                                    <input
                                        type="text"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Örn: info@akinrobotics.com"
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* ALT TAM GENİŞLİK: VİZYON */}
                        <div className="lg:col-span-2 space-y-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                             <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 flex items-center gap-2">
                                <Target size={18} className="text-slate-400"/> Vizyon & Strateji
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                                        <span>Operasyonel Tarz & Avukat Kişiliği</span>
                                    </label>
                                    <textarea
                                        name="operationalStyle"
                                        value={formData.operationalStyle}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        rows={4}
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                        placeholder="Şirketinizin vizyonunu yapay zekaya anlatın..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                                        <ShieldAlert size={16}/> Kırmızı Çizgiler & Risk Toleransı
                                    </label>
                                    <textarea
                                        name="redLines"
                                        value={formData.redLines}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        rows={4}
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-red-100 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm leading-relaxed text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                        placeholder="Nelerden asla taviz verilemez?..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleIdentitySave} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg transform active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700'}`}>
                        <Save size={18} /> {isSaved ? 'Strateji Kaydedildi' : 'Ayarları Kaydet'}
                        </button>
                    </div>
                </div>
            ) : activeTab === 'TEMPORARY' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                            <ShieldAlert size={24}/>
                        </div>
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Geçici Sözleşme / Ek Protokol</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tüm işlemlere (Analiz, Kıyaslama, Taslak) dahil edilecek geçici metin.</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40 shadow-sm">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sisteme Dahil Et</span>
                                <button
                                    onClick={() => {
                                        const newContext = { ...formData, isTemporaryContractActive: !formData.isTemporaryContractActive };
                                        setFormData(newContext);
                                        onSave(newContext);
                                    }}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${formData.isTemporaryContractActive ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.isTemporaryContractActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                             <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-1 shrink-0" size={24}/>
                             <div>
                                 <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Aktif Olduğunda Ne Olur?</h4>
                                 <p className="text-amber-800 dark:text-amber-300 text-sm mt-1">
                                     Bu metin, yapay zekaya "Geçici Sözleşme" olarak gönderilir. Analizlerde bu metne aykırılıklar tespit edilir, kıyaslamalarda bu metin referans alınır.
                                 </p>
                             </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Sözleşme Metni</label>
                                <div className="flex gap-2">
                                    <label className="cursor-pointer text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                        <Upload size={14}/> Dosya Yükle
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".docx,.pdf,.txt"/>
                                    </label>
                                    {activeContractText && (
                                        <button onClick={handleContractDelete} className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                                            <Trash2 size={14}/> Temizle
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="relative">
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
                                        <Loader2 className="animate-spin text-blue-600" size={32}/>
                                    </div>
                                )}
                                <textarea
                                    value={activeContractText}
                                    onChange={(e) => setActiveContractText(e.target.value)}
                                    rows={15}
                                    className="w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed font-mono text-slate-800 dark:text-slate-200 shadow-inner"
                                    placeholder="Geçici sözleşme veya ek protokol metnini buraya yapıştırın..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleContractSave} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg transform active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            <Save size={18} /> {isSaved ? 'Geçici Sözleşme Kaydedildi' : 'Sözleşmeyi Kaydet'}
                        </button>
                    </div>
                </div>
            ) : activeTab === 'URUNLER' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
                            <Package size={24}/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ürün & Mevzuat Kütüphanesi</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Ne sattığınızı AI'ya öğretin, yasalarla uyumsuzluk riskini ortadan kaldırın.</p>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                             <Gavel className="text-amber-600 dark:text-amber-400 mt-1 shrink-0" size={24}/>
                             <div>
                                 <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Hukuki Güvenlik İçin Kritik</h4>
                                 <p className="text-amber-800 dark:text-amber-300 text-sm mt-1">
                                     Bakanlık yönetmelikleri sektöre göre değişir. Buraya ürün detaylarınızı girerek, yapay zekanın ilgili kanunları (Sanayi Bakanlığı, Ticaret Bakanlığı vb.) taramasını sağlarsınız.
                                 </p>
                             </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                                <label className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Building2 size={18} className="text-purple-600 dark:text-purple-400"/> Ürün Portföyü ve Teknik Özellikler
                                </label>
                                
                                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="relative flex-1 md:w-48">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                            <Link size={12}/>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={websiteUrl}
                                            onChange={(e) => setWebsiteUrl(e.target.value)}
                                            placeholder="www.sirketiniz.com"
                                            className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAutoFillFromWeb}
                                        disabled={isWebFetching}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-bold transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                                        title="Girilen web sitesini tara ve otomatik doldur"
                                    >
                                        {isWebFetching ? <Loader2 size={12} className="animate-spin"/> : <Globe size={12}/>}
                                        {isWebFetching ? 'Taranıyor...' : 'Siteden Çek'}
                                    </button>
                                    
                                    <div className="w-px bg-slate-300 dark:bg-slate-600 h-4 mx-1"></div>
                                    
                                    <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-bold transition-colors shrink-0 shadow-sm">
                                        {isLoading ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}
                                        {isLoading ? 'Analiz Ediliyor...' : 'Dosya Yükle (.docx/pdf)'}
                                        <input type="file" className="hidden" onChange={handleProductFileUpload} accept=".txt,.doc,.docx,.pdf"/>
                                    </label>
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Şirketinizin sattığı ürünleri, hizmetleri, teknik standartları (ISO, CE vb.) ve uymak zorunda olduğunuz özel yönetmelikleri detaylıca yazın.
                            </p>
                            
                            <textarea
                                name="productPortfolio"
                                value={formData.productPortfolio || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                rows={10}
                                className="w-full p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-sm leading-relaxed text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all shadow-inner"
                                placeholder="Örn: Endüstriyel mutfak robotları üretiyoruz. Ürünlerimiz CE sertifikalıdır..."
                            />
                        </div>

                        <div className="flex justify-end mt-6">
                            <button onClick={handleIdentitySave} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg transform active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                <Save size={18} /> {isSaved ? 'Portföy Kaydedildi' : 'Ürünleri Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-[75vh] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         <div>
                             <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                                <ScrollText className="text-blue-600 dark:text-blue-400" size={20}/>
                                {activeTab === 'SATIS' && 'Satış Sözleşmesi Şablonu'}
                                {activeTab === 'KIRALAMA' && 'Kiralama Sözleşmesi Şablonu'}
                                {activeTab === 'BDHS' && 'Bakım & Destek (BDHS) Şablonu'}
                                {activeTab === 'DEMO' && 'Ürün Demo / PoC Sözleşmesi'}
                                {activeTab === 'REKLAM' && 'Reklam & Tanıtım Anlaşması'}
                                {activeTab === 'TEKNIK' && 'Teknik Servis Sözleşmesi'}
                             </h3>
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <RefreshCw size={10} className="animate-spin-slow"/> Otomatik taslak kaydı aktif. Yazdıklarınız kaybolmaz.
                             </p>
                         </div>
                         <div className="flex gap-2 w-full md:w-auto items-center">
                             <div className="flex flex-col items-end">
                                 <label className={`cursor-pointer px-4 py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-2 flex-1 md:flex-none transition-colors ${uploadedFileName ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}>
                                    {isLoading ? <Loader2 className="animate-spin" size={16}/> : uploadedFileName ? <CheckCircle size={16}/> : <Upload size={16}/>} 
                                    {isLoading ? 'Okunuyor...' : uploadedFileName ? 'Yüklendi' : 'Yükle (.docx / .pdf)'}
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.doc,.docx,.pdf"/>
                                 </label>
                                 {uploadedFileName && <span className="text-[10px] text-green-600 dark:text-green-400 mt-1 mr-1">{uploadedFileName}</span>}
                             </div>

                             {formData.masterContracts?.some(c => c.type === (
                                activeTab === 'SATIS' ? 'Satış Sözleşmesi' :
                                activeTab === 'KIRALAMA' ? 'Kiralama Sözleşmesi' :
                                activeTab === 'BDHS' ? 'BDHS Sözleşmesi' :
                                activeTab === 'DEMO' ? 'Demo Sözleşmesi' :
                                activeTab === 'REKLAM' ? 'Reklam/Tanıtım Anlaşması' :
                                'Teknik Servis Sözleşmesi'
                             )) && (
                                 <button 
                                    onClick={handleContractDelete}
                                    className="px-3 py-2 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
                                    title="Bu şablonu sil"
                                 >
                                    <Trash2 size={16}/> Sil
                                 </button>
                             )}
                             
                             <button 
                                onClick={handleContractSave}
                                className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2 flex-1 md:flex-none h-10 ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                             >
                                <Save size={16}/> {isSaved ? 'Kaydedildi' : 'Şablonu Kaydet'}
                             </button>
                         </div>
                    </div>
                    <div className="flex-1 p-0 relative group">
                        <textarea
                            value={activeContractText}
                            onChange={(e) => setActiveContractText(e.target.value)}
                            placeholder={`${activeTab} için onaylı tam metni buraya yapıştırın. Yapay zeka bu metni ezberleyecektir...`}
                            className="w-full h-full p-6 resize-none outline-none font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder-slate-400 dark:placeholder-slate-600"
                        />
                        <div className="absolute bottom-2 right-4 text-[10px] text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            Her karakter anlık kaydediliyor
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>

    </div>
  );
};

export default KnowledgeBase;