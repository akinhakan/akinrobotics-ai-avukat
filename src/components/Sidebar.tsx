import React, { useState } from 'react';
import { AppView, AIProvider, User } from '../types';
import { Shield, Database, Scale, GitCompare, PenTool, BookMarked, History, HelpCircle, FileSignature, Menu, X, Code, Terminal, Download, Upload, HardDrive, Bot, Cpu, Brain, LogOut, Save, Briefcase, Moon, Sun, Users } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentView: AppView;
  activeProvider?: AIProvider; 
  user?: User | null;
  onChangeView: (view: AppView) => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout?: () => void; 
}

const SidebarInner: React.FC<{
  currentView: AppView;
  activeProvider?: AIProvider;
  user?: User | null;
  onNavigate: (view: AppView) => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout?: () => void;
}> = ({ currentView, activeProvider, user, onNavigate, onExportData, onImportData, onLogout }) => {
    
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: AppView.DASHBOARD, label: 'Panel', icon: <Shield size={20} /> },
    { id: AppView.KNOWLEDGE_BASE, label: 'Profil & Eğitim', icon: <Database size={20} /> },
    { id: AppView.CONTRACT_REVIEW, label: 'İncele', icon: <Scale size={20} /> },
    { id: AppView.TEMPORARY_CONTRACTS, label: 'Geçici Sözleşmeler', icon: <Briefcase size={20} /> },
    { id: AppView.SMART_FILLER, label: 'Akıllı Doldur', icon: <FileSignature size={20} /> },
    { id: AppView.COMPARATOR, label: 'Kıyasla', icon: <GitCompare size={20} /> },
    { id: AppView.DRAFTER, label: 'Taslak', icon: <PenTool size={20} /> },
    { id: AppView.CLAUSE_LIBRARY, label: 'Kütüphane', icon: <BookMarked size={20} /> },
    { id: AppView.HISTORY, label: 'Geçmiş', icon: <History size={20} /> },
    { id: AppView.USER_MANUAL, label: 'Yardım & Kılavuz', icon: <HelpCircle size={20} /> },
  ];

  // Admin Link
  if (user?.role === 'ADMIN') {
      navItems.push({ id: AppView.ADMIN_PANEL, label: 'Yönetim Paneli', icon: <Users size={20} /> });
  }

  const getProviderInfo = () => {
      switch(activeProvider) {
          case 'OPENAI': return { label: 'OpenAI (GPT)', icon: <Cpu size={12}/>, color: 'text-teal-400' };
          case 'ANTHROPIC': return { label: 'Claude AI', icon: <Brain size={12}/>, color: 'text-orange-400' };
          default: return { label: 'Google Gemini', icon: <Bot size={12}/>, color: 'text-blue-400' };
      }
  };

  const providerInfo = getProviderInfo();

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 shadow-2xl">
      
      {/* 1. LOGO ALANI */}
      <div className="bg-white dark:bg-slate-950 flex flex-col items-center justify-center py-6 px-4 shrink-0 border-b-4 border-blue-600 relative z-10 transition-colors">
          <img 
            src="https://www.akinrobotics.com/img/logo.png" 
            className="w-full max-w-[200px] h-auto object-contain mb-3 drop-shadow-sm"
            alt="AKINROBOTICS"
            onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement?.querySelector('.fallback-logo')?.classList.remove('hidden');
            }}
          />
          <div className="fallback-logo hidden text-slate-900 dark:text-white font-black text-3xl tracking-tighter mb-1 text-center leading-none">
             AKINROBOTICS
          </div>
          
          <div className="flex items-center gap-3 w-full justify-center mt-2">
             <div className="h-px w-8 bg-slate-300 dark:bg-slate-700"></div>
             <span className="text-slate-600 dark:text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase whitespace-nowrap">Yapay Zeka Hukuk</span>
             <div className="h-px w-8 bg-slate-300 dark:bg-slate-700"></div>
          </div>
      </div>
      
      {/* 2. MENÜ LİSTESİ */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-medium group relative overflow-hidden ${
              currentView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1' 
                : 'hover:bg-slate-800 hover:text-white hover:translate-x-1 text-slate-400'
            }`}
          >
            {currentView === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20"></div>
            )}
            <div className={`${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`}>
                {item.icon}
            </div>
            <span className="tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 3. FOOTER */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-4">
         
         {/* THEME TOGGLE */}
         <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors group"
         >
            <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300">Görünüm</span>
            <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-400 transition-colors">
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                <span className="text-[10px] uppercase font-bold">{theme === 'dark' ? 'Karanlık' : 'Aydınlık'}</span>
            </div>
         </button>

         {/* PROVIDER STATUS */}
         <div className="bg-slate-900 rounded-lg p-2 border border-slate-800 flex items-center justify-between">
             <span className="text-[10px] font-bold text-slate-500 uppercase">Aktif Beyin</span>
             <div className={`flex items-center gap-1.5 text-xs font-bold ${providerInfo.color}`}>
                 {providerInfo.icon}
                 {providerInfo.label}
             </div>
         </div>

         {/* BACKUP & RESTORE ACTIONS */}
         <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pl-1">Veri Transferi</span>
            <div className="grid grid-cols-2 gap-2">
                {onExportData && (
                    <button
                        onClick={onExportData}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-slate-600 group"
                        title="Tüm verileri indir"
                    >
                        <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" /> Tam Yedek
                    </button>
                )}
                {onImportData && (
                    <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-slate-600 cursor-pointer group">
                        <Upload size={14} className="group-hover:-translate-y-0.5 transition-transform" /> Yükle
                        <input type="file" onChange={onImportData} className="hidden" accept=".json" />
                    </label>
                )}
            </div>
         </div>

         {/* LOGOUT */}
         {onLogout && (
             <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900/10 text-red-500 hover:bg-red-900/30 hover:text-red-400 rounded-lg text-xs font-bold transition-all border border-red-900/20 hover:border-red-900/40"
             >
                 <LogOut size={14}/> Güvenli Çıkış
             </button>
         )}

         {/* CREDITS */}
         <div className="text-center pt-2">
             <div className="text-[10px] text-slate-600">
                 &copy; {new Date().getFullYear()} AKINROBOTICS
             </div>
         </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, activeProvider, user, onChangeView, onExportData, onImportData, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView) => {
    onChangeView(view);
    setIsMobileMenuOpen(false); 
  };

  return (
    <>
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm transition-colors">
          <div className="flex items-center gap-2">
             <img src="https://www.akinrobotics.com/img/logo.png" className="h-8 w-auto object-contain" alt="Logo"/>
             <span className="font-bold text-slate-800 dark:text-white text-sm">AI AVUKAT</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
             <Menu size={24}/>
          </button>
      </div>

      <div className="hidden md:flex w-72 h-full flex-col z-20 relative">
          <SidebarInner 
            currentView={currentView} 
            activeProvider={activeProvider}
            user={user}
            onNavigate={handleNavClick}
            onExportData={onExportData}
            onImportData={onImportData}
            onLogout={onLogout}
          />
      </div>

      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
              <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" 
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 shadow-2xl transform transition-transform animate-fade-in-left">
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full z-50"
                  >
                      <X size={20}/>
                  </button>
                  <SidebarInner 
                    currentView={currentView}
                    activeProvider={activeProvider}
                    user={user}
                    onNavigate={handleNavClick}
                    onExportData={onExportData}
                    onImportData={onImportData}
                    onLogout={onLogout}
                  />
              </div>
          </div>
      )}
    </>
  );
};

export default Sidebar;