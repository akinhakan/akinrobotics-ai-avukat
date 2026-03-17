import React, { useEffect, useState } from 'react';
import { ContractAnalysisResult } from '../types';
import { Clock, FileText, ArrowRight, Trash2, FileSearch, GitCompare, FilePlus, Wand2 } from 'lucide-react';
import ConfirmationModal from './ui/ConfirmationModal';
import { useToast } from '../context/ToastContext';

interface HistoryViewProps {
  onSelectAnalysis: (analysis: ContractAnalysisResult) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onSelectAnalysis }) => {
  const [history, setHistory] = useState<ContractAnalysisResult[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('lexguard_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch(e) { console.error(e); }
    }
  }, []);

  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClearHistory = () => {
    localStorage.removeItem('lexguard_history');
    setHistory([]);
    setShowClearConfirm(false);
    addToast("Analiz geçmişi temizlendi.", "success");
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'ANALYSIS': return { label: 'Analiz', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <FileSearch size={14} /> };
      case 'COMPARISON': return { label: 'Kıyaslama', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <GitCompare size={14} /> };
      case 'DRAFT': return { label: 'Taslak', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <FilePlus size={14} /> };
      case 'FILL': return { label: 'Doldurma', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Wand2 size={14} /> };
      default: return { label: 'İşlem', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400', icon: <FileText size={14} /> };
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Geçmiş Analizler</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Daha önce incelediğiniz sözleşmelerin kayıtları.</p>
        </div>
        {history.length > 0 && (
          <button onClick={handleClearHistory} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded flex items-center gap-2">
            <Trash2 size={16} /> Temizle
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
             <Clock size={48} className="mb-4 opacity-20" />
             <p>Henüz kaydedilmiş bir analiz yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {history.sort((a,b) => b.timestamp - a.timestamp).map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between group transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    item.riskScore > 70 ? 'bg-red-500' : item.riskScore > 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}>
                    {item.riskScore}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{item.fileName || 'İsimsiz Sözleşme'}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${getTypeLabel(item.type).color}`}>
                        {getTypeLabel(item.type).icon} {getTypeLabel(item.type).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Clock size={12} /> {new Date(item.timestamp).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onSelectAnalysis(item)}
                  className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500 transition-all flex items-center gap-2"
                >
                  Raporu Aç <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearHistory}
        title="Geçmişi Temizle"
        message="Tüm analiz geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Temizle"
        type="danger"
      />
    </div>
  );
};

export default HistoryView;