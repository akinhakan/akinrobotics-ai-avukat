// Rebuilding with simplified server setup
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KnowledgeBase from './components/KnowledgeBase';
import ContractAnalyzer from './components/ContractAnalyzer';
import ContractDrafter from './components/ContractDrafter';
import ClauseLibrary from './components/ClauseLibrary';
import HistoryView from './components/HistoryView';
import ContractComparator from './components/ContractComparator';
import SmartFiller from './components/SmartFiller';
import GeneralAssistant from './components/GeneralAssistant';
import UserManual from './components/UserManual'; 
import LoginScreen from './components/LoginScreen'; 
import TemporaryContractManager from './components/TemporaryContractManager';
import AdminPanel from './components/AdminPanel';
import { AppView, CompanyContext, ContractAnalysisResult, User } from './types';
import { ShieldCheck, FileText, Loader2, CheckCircle, XCircle, Download, BookMarked, Scale, History, Lock, Unlock, ShieldAlert, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

const DEFAULT_CONTEXT: CompanyContext = {
  companyName: "AKINROBOTICS",
  address: "",
  taxInfo: "",
  representative: "",
  phone: "",
  email: "",
  industry: "Yüksek Teknoloji & Robotik",
  operationalStyle: "Büyüme odaklı ancak yasal olarak muhafazakar. Fikri mülkiyet korumasına çok önem veriyoruz.",
  redLines: "Sınırsız sorumluluk kabul edilemez. Tam ödeme yapılmadan fikri mülkiyet devri olmaz. Yargı yetkisi yerel mahkemeler olmalı.",
  preferredJurisdiction: "Konya Mahkemeleri ve İcra Daireleri",
  
  // YENİ: Ürün Bilgisi
  productPortfolio: "İnsansı Robotlar (ADA Serisi), Tarım Robotları, Dört Ayaklı Robotlar (ARAT), Endüstriyel Robot Kolları ve Hizmet Robotları. Ürünlerimiz T.C. Sanayi ve Teknoloji Bakanlığı 'Garanti Belgesi Yönetmeliği' ve 'Satış Sonrası Hizmetler Yönetmeliği' kapsamındadır. Yazılımlarımız 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile korunmaktadır.",

  // YENİ PROVIDER YAPISI
  activeProvider: 'GOOGLE',
  apiKeys: {
      google: '',
      openai: '',
      anthropic: ''
  },
  preferredModel: "gemini-3-pro-preview", 

  masterContracts: [],
  customRules: [] 
};

type ImportStatus = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  // --- AUTH STATE ---
  const { isAuthenticated, isAuthReady, user, logout } = useAuth();
  const [showForceButton, setShowForceButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) setShowForceButton(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  // --- SOFT RELOAD KEY ---
  const [remountKey, setRemountKey] = useState(0);

  // --- CONTEXT ---
  const [companyContext, setCompanyContext] = useState<CompanyContext>(DEFAULT_CONTEXT);

  // Backend Sync
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchContext = async () => {
      try {
        const response = await fetch('/api/context');
        if (response.ok) {
          const data = await response.json();
          setCompanyContext(prev => ({
            ...prev,
            ...data,
            apiKeys: {
              ...data.apiKeys,
              ...(prev.apiKeys.google ? { google: prev.apiKeys.google } : {}),
              ...(prev.apiKeys.openai ? { openai: prev.apiKeys.openai } : {}),
              ...(prev.apiKeys.anthropic ? { anthropic: prev.apiKeys.anthropic } : {}),
            }
          }));
        }
      } catch (err) {
        console.error("Fetch context error:", err);
      }
    };

    fetchContext();
    // Poll for updates if needed, or just rely on manual saves
    const interval = setInterval(fetchContext, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const savedView = localStorage.getItem('lexguard_current_view');
    if (savedView === 'GENERAL_ASSISTANT') return AppView.DASHBOARD;
    return (savedView as AppView) || AppView.DASHBOARD;
  });

  const [selectedAnalysis, setSelectedAnalysis] = useState<ContractAnalysisResult | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>('IDLE');
  const [importMessage, setImportMessage] = useState<string>('');
  
  // Export State
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [includeSecrets, setIncludeSecrets] = useState(false); // New Toggle State
  
  // Dashboard İstatistikleri
  const [stats, setStats] = useState({ historyCount: 0, clauseCount: 0 });

  useEffect(() => { localStorage.setItem('lexguard_current_view', currentView); }, [currentView]);
  
  useEffect(() => {
     try {
         const h = localStorage.getItem('lexguard_history');
         const c = localStorage.getItem('lexguard_clauses');
         setStats({
             historyCount: h ? JSON.parse(h).length : 0,
             clauseCount: c ? JSON.parse(c).length : 0
         });
     } catch (e) {}
  }, [currentView, remountKey]);

  const handleSaveContext = async (ctx: CompanyContext) => {
    setCompanyContext(ctx);
    // Eğer kullanıcı ADMIN ise Backend'e de yaz (Paylaşılan ayar)
    if (user?.role === 'ADMIN') {
        try {
            await fetch('/api/context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ctx)
            });
        } catch (e) {
            console.error("Context Save Error:", e);
        }
    }
    // Yerel yedeği de tut
    localStorage.setItem('lexguard_context', JSON.stringify(ctx));
  };

  const handleSelectHistory = (analysis: ContractAnalysisResult) => {
    setSelectedAnalysis(analysis);
    setCurrentView(AppView.CONTRACT_REVIEW);
  };

  const handleViewChange = (view: AppView) => {
    if (view !== AppView.CONTRACT_REVIEW) {
      setSelectedAnalysis(null);
    }
    setCurrentView(view);
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
      logout();
      setCurrentView(AppView.DASHBOARD); 
  };

  // --- EXPORT LOGIC ---
  const handleExportRequest = () => {
      setIncludeSecrets(false); // Default safe
      setShowExportConfirm(true);
  };
  
  const performExport = () => {
    // 1. Context Kopyası Oluştur
    let contextToExport = { ...companyContext };

    // 2. Güvenlik Kontrolü: Eğer kullanıcı anahtarları dahil etmediyse temizle
    if (!includeSecrets) {
        contextToExport.apiKeys = {
            google: '',
            openai: '',
            anthropic: ''
        };
    }

    const fullBackup = {
        metadata: {
            version: "2.4",
            timestamp: new Date().toISOString(),
            appName: "AKINROBOTICS AI AVUKAT",
            includesSecrets: includeSecrets
        },
        context: contextToExport,
        data: {
            history: localStorage.getItem('lexguard_history'),
            clauses: localStorage.getItem('lexguard_clauses'),
            draftVersions: localStorage.getItem('lexguard_draft_versions'),
            generalChat: localStorage.getItem('lexguard_general_chat'),
            draft_SATIS: localStorage.getItem('lexguard_draft_SATIS'),
            draft_KIRALAMA: localStorage.getItem('lexguard_draft_KIRALAMA'),
            draft_BDHS: localStorage.getItem('lexguard_draft_BDHS'),
            draft_TEKNIK: localStorage.getItem('lexguard_draft_TEKNIK'),
            draft_DEMO: localStorage.getItem('lexguard_draft_DEMO'),
            draft_REKLAM: localStorage.getItem('lexguard_draft_REKLAM'),
            smartFillerSession: localStorage.getItem('lexguard_smartfiller_session'),
            comparatorSession: localStorage.getItem('lexguard_comparator_session'),
            analyzerSession: localStorage.getItem('lexguard_analyzer_session'),
            drafterTemplate: localStorage.getItem('lexguard_draft_template'),
            drafterInstruction: localStorage.getItem('lexguard_draft_instruction'),
            drafterResult: localStorage.getItem('lexguard_draft_result'),
        }
    };

    const dataStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Dosya adını içeriğe göre özelleştir
    const date = new Date().toISOString().slice(0, 10);
    const suffix = includeSecrets ? "_FULL_KEYLI" : "_GUVENLI";
    link.download = `akinrobotics_sistem_yedegi_${date}${suffix}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportConfirm(false);
  };

  const handleImportContext = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('LOADING');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const json = JSON.parse(event.target?.result as string);
          
          // Güvenlik Kontrolü: Bu dosya bizim uygulamamıza mı ait?
          if (!json.metadata || json.metadata.appName !== "AKINROBOTICS AI AVUKAT") {
              throw new Error("Geçersiz yedek dosyası. Lütfen bu uygulamadan alınan bir JSON dosyası yükleyin.");
          }

          if (json.context) {
              const importedContext = { 
                  ...DEFAULT_CONTEXT, 
                  ...json.context,
                  // Eğer dosyada key yoksa (güvenli yedekse), mevcut keyleri koru.
                  // Eğer dosyada key varsa (full yedekse), üzerine yaz.
                  apiKeys: {
                      ...DEFAULT_CONTEXT.apiKeys,
                      ...(json.context.apiKeys?.google ? json.context.apiKeys : companyContext.apiKeys)
                  }
              };
              setCompanyContext(importedContext);
              localStorage.setItem('lexguard_context', JSON.stringify(importedContext));
          }

          if (json.data) {
              const d = json.data;
              const safeSet = (key: string, value: any) => {
                  if (typeof value === 'string') {
                      localStorage.setItem(key, value);
                  } else if (value !== null && value !== undefined) {
                      localStorage.setItem(key, JSON.stringify(value));
                  }
              };

              if (d.history) safeSet('lexguard_history', d.history);
              if (d.clauses) safeSet('lexguard_clauses', d.clauses);
              if (d.draftVersions) safeSet('lexguard_draft_versions', d.draftVersions);
              if (d.generalChat) safeSet('lexguard_general_chat', d.generalChat);
              
              // Draftlar
              ['SATIS', 'KIRALAMA', 'BDHS', 'TEKNIK', 'DEMO', 'REKLAM'].forEach(type => {
                  const key = `draft_${type}`;
                  if (d[key]) safeSet(`lexguard_${key}`, d[key]);
              });

              // Oturumlar
              if (d.smartFillerSession) safeSet('lexguard_smartfiller_session', d.smartFillerSession);
              if (d.comparatorSession) safeSet('lexguard_comparator_session', d.comparatorSession);
              if (d.analyzerSession) safeSet('lexguard_analyzer_session', d.analyzerSession);
              if (d.drafterTemplate) safeSet('lexguard_draft_template', d.drafterTemplate);
              if (d.drafterInstruction) safeSet('lexguard_draft_instruction', d.drafterInstruction);
              if (d.drafterResult) safeSet('lexguard_draft_result', d.drafterResult);
          }

          setImportStatus('SUCCESS');
          setImportMessage('Sistem başarıyla geri yüklendi ve kullanıma hazır!');
          
        } catch (error: any) {
          console.error(error);
          setImportStatus('ERROR');
          setImportMessage(error.message || 'Dosya bozuk veya okunamadı.');
        }
      }, 1000); // Kullanıcı loading'i görsün diye küçük bir gecikme
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const closeImportModal = () => { 
      if (importStatus === 'SUCCESS') {
          // Sayfayı (Component tree'yi) yenilemek için key değiştir
          setRemountKey(prev => prev + 1);
          setImportStatus('IDLE');
      } else {
          setImportStatus('IDLE'); 
      }
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.KNOWLEDGE_BASE: return <KnowledgeBase key={remountKey} context={companyContext} onSave={handleSaveContext} />;
      case AppView.CONTRACT_REVIEW: return <ContractAnalyzer key={remountKey} context={companyContext} preloadedAnalysis={selectedAnalysis} onUpdateContext={handleSaveContext} onChangeView={handleViewChange} />;
      case AppView.COMPARATOR: return <ContractComparator key={remountKey} context={companyContext} onUpdateContext={handleSaveContext} onChangeView={handleViewChange} />;
      case AppView.DRAFTER: return <ContractDrafter key={remountKey} context={companyContext} onUpdateContext={handleSaveContext} onChangeView={handleViewChange} />;
      case AppView.SMART_FILLER: return <SmartFiller key={remountKey} context={companyContext} />;
      case AppView.CLAUSE_LIBRARY: return <ClauseLibrary key={remountKey} />;
      case AppView.HISTORY: return <HistoryView key={remountKey} onSelectAnalysis={handleSelectHistory} />;
      case AppView.USER_MANUAL: return <UserManual key={remountKey} />;
      case AppView.TEMPORARY_CONTRACTS: return <TemporaryContractManager key={remountKey} context={companyContext} onUpdateContext={handleSaveContext} />;
      case AppView.ADMIN_PANEL: return <AdminPanel key={remountKey} />;
      case AppView.DASHBOARD:
      default:
        return (
          <div key={remountKey} className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full p-4 md:p-8 animate-fade-in relative">
             <div className="mb-6 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Genel Bakış</h2>
                   <p className="text-slate-500 dark:text-slate-400 text-sm">Hoş geldiniz, hukuki süreçlerinizin anlık durumu.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                {/* CARD 1: KURUMSAL HAFIZA */}
                <div onClick={() => setCurrentView(AppView.KNOWLEDGE_BASE)} className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 shadow-lg shadow-blue-200 dark:shadow-none relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="bg-white/20 p-2 rounded-lg"><ShieldCheck size={24} /></div>
                        <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">GÜVENLİ</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold mb-1">{companyContext.masterContracts?.length || 0}</h3>
                        <p className="text-blue-100 text-sm font-medium">Aktif Ana Sözleşme</p>
                    </div>
                </div>

                {/* CARD 2: KÜTÜPHANE */}
                <div onClick={() => setCurrentView(AppView.CLAUSE_LIBRARY)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-teal-50 dark:bg-teal-900/30 p-2 rounded-lg text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 dark:group-hover:bg-teal-500 group-hover:text-white transition-colors"><BookMarked size={24} /></div>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.clauseCount}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Kayıtlı Standart Madde</p>
                </div>

                {/* CARD 3: GEÇMİŞ İŞLEMLER */}
                <div onClick={() => setCurrentView(AppView.HISTORY)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 dark:group-hover:bg-purple-500 group-hover:text-white transition-colors"><History size={24} /></div>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.historyCount}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tamamlanan Analiz</p>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 via-blue-400 to-slate-200 dark:from-slate-700 dark:via-blue-500 dark:to-slate-700"></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Hızlı İşlem Başlat</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">Sözleşme yükleyin, oluşturun veya mevcutları kıyaslayın.</p>
                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setCurrentView(AppView.CONTRACT_REVIEW)} className="px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-slate-200 dark:shadow-none flex items-center gap-2">
                        <Scale size={18}/> Sözleşme İncele
                    </button>
                    <button onClick={() => setCurrentView(AppView.SMART_FILLER)} className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors font-semibold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2">
                        <FileText size={18}/> Akıllı Doldur
                    </button>
                    <button onClick={() => setCurrentView(AppView.COMPARATOR)} className="px-6 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-semibold">Sözleşme Kıyasla</button>
                    <button onClick={() => setCurrentView(AppView.DRAFTER)} className="px-6 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-semibold">Yeni Taslak</button>
                </div>
             </div>
          </div>
        );
    }
  };

  // --- LOGIN CHECK ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-slate-400 font-medium animate-pulse mb-8">Sistem Hazırlanıyor...</p>
        
        {showForceButton && (
          <div className="animate-fade-in space-y-4">
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Bağlantı beklenenden uzun sürüyor. Firebase servislerine erişilemiyor olabilir.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all text-sm font-bold border border-slate-700"
            >
              Yeniden Dene
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  if (user.role === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Erişim Beklemede</h1>
        <p className="text-slate-400 max-w-md mb-8">
          Hesabınız başarıyla oluşturuldu. Ancak uygulamayı kullanabilmeniz için bir yöneticinin onay vermesi gerekmektedir. Lütfen yöneticinizle iletişime geçin.
        </p>
        <button 
          onClick={handleLogout}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut size={18} /> Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative animate-fade-in transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        activeProvider={companyContext.activeProvider}
        user={user}
        onChangeView={handleViewChange} 
        onExportData={handleExportRequest} 
        onImportData={handleImportContext}
        onLogout={handleLogout} 
      />
      <main className="flex-1 h-full overflow-hidden flex flex-col min-h-0 relative">
        {renderContent()}
      </main>
      
      <GeneralAssistant key={remountKey} context={companyContext} />

      {showExportConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transform scale-100 transition-all border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                      <Download size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sistem Yedeği Al</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                      Tüm sözleşmeler, ayarlar ve ürün bilgileri tek bir dosyaya kaydedilecek.
                  </p>
                  
                  {/* API KEY TOGGLE */}
                  <div 
                    onClick={() => setIncludeSecrets(!includeSecrets)}
                    className={`w-full p-3 rounded-xl mb-6 flex items-center gap-3 cursor-pointer border transition-all ${includeSecrets ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-700 dark:border-slate-600'}`}
                  >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${includeSecrets ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}`}>
                          {includeSecrets ? <Unlock size={18}/> : <Lock size={18}/>}
                      </div>
                      <div className="text-left flex-1">
                          <div className={`text-sm font-bold ${includeSecrets ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              API Anahtarlarını Dahil Et
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                              {includeSecrets ? 'DİKKAT: Dosyayı paylaştığınız kişi API kullanımınızı yapabilir.' : 'Güvenli Mod: Anahtarlar silinir. (Önerilen)'}
                          </div>
                      </div>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeSecrets ? 'bg-red-600 border-red-600 text-white' : 'border-slate-400 bg-white dark:bg-slate-600 dark:border-slate-500'}`}>
                          {includeSecrets && <CheckCircle size={14}/>}
                      </div>
                  </div>

                  <div className="flex gap-3 w-full">
                      <button onClick={() => setShowExportConfirm(false)} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">İptal</button>
                      <button onClick={performExport} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-colors">İndir</button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {importStatus !== 'IDLE' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-700">
                  {importStatus === 'LOADING' && <Loader2 size={48} className="text-indigo-600 dark:text-indigo-400 animate-spin mb-4 mx-auto"/>}
                  {importStatus === 'SUCCESS' && <CheckCircle size={48} className="text-green-600 dark:text-green-400 mb-4 mx-auto"/>}
                  {importStatus === 'ERROR' && <XCircle size={48} className="text-red-600 dark:text-red-400 mb-4 mx-auto"/>}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {importStatus === 'LOADING' ? 'Yükleniyor...' : importStatus === 'SUCCESS' ? 'Geri Yükleme Başarılı!' : 'Hata!'}
                  </h3>
                  {importStatus === 'ERROR' && <p className="text-sm text-red-500 dark:text-red-400 mb-2">{importMessage}</p>}
                  
                  <button onClick={closeImportModal} className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-colors ${importStatus === 'ERROR' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700'}`}>
                      {importStatus === 'SUCCESS' ? 'Tamam (Yenile)' : 'Kapat'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;