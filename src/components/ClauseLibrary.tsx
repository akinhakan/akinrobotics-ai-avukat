import React, { useState, useEffect } from 'react';
import { Clause } from '../types';
import { Plus, Trash2, Search, BookMarked, Save, Copy, Check, ShieldCheck, Zap } from 'lucide-react';

const ClauseLibrary: React.FC = () => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [search, setSearch] = useState('');
  const [editingClause, setEditingClause] = useState<Partial<Clause> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lexguard_clauses');
    if (saved) {
      setClauses(JSON.parse(saved));
    } else {
      // Default sample clauses
      const defaults: Clause[] = [
        { id: '1', title: 'Standart Gizlilik (Sıkı)', category: 'Gizlilik', content: 'Taraflar, işbu sözleşme kapsamında edindikleri her türlü bilgiyi ticari sır olarak saklamayı, üçüncü kişilerle paylaşmamayı ve sadece sözleşme amacı doğrultusunda kullanmayı kabul ve taahhüt eder. İhlal halinde 50.000 USD cezai şart derhal muaccel olur.', lastUpdated: Date.now() },
        { id: '2', title: 'Mücbir Sebep (Pro)', category: 'Genel', content: 'Doğal afet, salgın hastalık, savaş, siber saldırı, genel grev gibi mücbir sebeplerin ortaya çıkması halinde, tarafların yükümlülükleri söz konusu sebep ortadan kalkana kadar askıya alınır. Mücbir sebep 30 günü aşarsa taraflar sözleşmeyi tazminatsız feshedebilir.', lastUpdated: Date.now() },
        { id: '3', title: 'Ödeme ve Vade', category: 'Finans', content: 'Faturalar, kesim tarihinden itibaren 30 (otuz) gün içinde nakden ödenecektir. Gecikme halinde aylık %5 vade farkı uygulanır.', lastUpdated: Date.now() }
      ];
      setClauses(defaults);
      localStorage.setItem('lexguard_clauses', JSON.stringify(defaults));
    }
  }, []);

  const saveToStorage = (newClauses: Clause[]) => {
    setClauses(newClauses);
    localStorage.setItem('lexguard_clauses', JSON.stringify(newClauses));
  };

  const handleDelete = (id: string) => {
    if(confirm('Bu maddeyi silmek istediğinize emin misiniz?')) {
        const filtered = clauses.filter(c => c.id !== id);
        saveToStorage(filtered);
    }
  };

  const handleCopy = (content: string, id: string) => {
      navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = () => {
    if (!editingClause?.title || !editingClause?.content) return;
    
    const newClause: Clause = {
      id: editingClause.id || crypto.randomUUID(),
      title: editingClause.title,
      content: editingClause.content,
      category: editingClause.category || 'Genel',
      lastUpdated: Date.now()
    };

    if (editingClause.id) {
      saveToStorage(clauses.map(c => c.id === newClause.id ? newClause : c));
    } else {
      saveToStorage([...clauses, newClause]);
    }
    setEditingClause(null);
  };

  const filteredClauses = clauses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="text-teal-600"/> Madde Kütüphanesi
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-2xl">
            Burası şirketinizin <strong>"Yasal LEGO Parçaları"</strong> kutusudur. Sık kullandığınız, hukuk departmanınızın onayladığı "mükemmel" paragrafları (Gizlilik, Mücbir Sebep, Ödeme Şartları vb.) burada saklayın. Taslak oluştururken bu maddeleri tek tıkla kullanabilirsiniz.
          </p>
        </div>
        <button 
          onClick={() => setEditingClause({})}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 font-bold shadow-sm transition-all shrink-0"
        >
          <Plus size={18} /> Yeni Madde Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded text-blue-600 dark:text-blue-400"><Zap size={18}/></div>
              <div className="text-xs text-blue-900 dark:text-blue-200">
                  <strong>Hız Kazandırır:</strong> Her seferinde sıfırdan yazmak yerine onaylı metni kopyalayın.
              </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 p-3 rounded-lg flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded text-green-600 dark:text-green-400"><ShieldCheck size={18}/></div>
              <div className="text-xs text-green-900 dark:text-green-200">
                  <strong>Hata Önler:</strong> Şirket standartlarına aykırı, hatalı cümle kurma riskini yok eder.
              </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 p-3 rounded-lg flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-purple-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Madde ara..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 p-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm dark:text-white"
                />
            </div>
          </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        {filteredClauses.map(clause => (
          <div key={clause.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col group relative">
            <div className="flex justify-between items-start mb-3">
              <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-teal-100 dark:border-teal-900/50">{clause.category}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-white dark:bg-slate-700 pl-2 shadow-sm rounded-lg border border-slate-100 dark:border-slate-600 p-1">
                <button 
                    onClick={() => handleCopy(clause.content, clause.id)} 
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                    title="Panoya Kopyala"
                >
                    {copiedId === clause.id ? <Check size={16} /> : <Copy size={16}/>}
                </button>
                <button 
                    onClick={() => setEditingClause(clause)} 
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                    title="Düzenle"
                >
                    <BookMarked size={16}/>
                </button>
                <button 
                    onClick={() => handleDelete(clause.id)} 
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Sil"
                >
                    <Trash2 size={16}/>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 pr-16 text-sm">{clause.title}</h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex-1 relative group-hover:bg-slate-100 dark:group-hover:bg-slate-900 transition-colors">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono line-clamp-6">{clause.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Edit/Create */}
      {editingClause && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookMarked className="text-teal-600"/>
                {editingClause.id ? 'Madde Düzenle' : 'Yeni Standart Madde Ekle'}
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Madde Başlığı</label>
              <input 
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                placeholder="Örn: 2024 Standart Tazminat Limiti"
                value={editingClause.title || ''} 
                onChange={e => setEditingClause({...editingClause, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kategori</label>
              <input 
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                placeholder="Örn: Mali, Operasyonel, Genel, Gizlilik"
                value={editingClause.category || ''} 
                onChange={e => setEditingClause({...editingClause, category: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">İçerik (Tam Metin)</label>
              <textarea 
                rows={8}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg font-mono text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                placeholder="Onaylı madde metnini buraya yapıştırın..."
                value={editingClause.content || ''} 
                onChange={e => setEditingClause({...editingClause, content: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
              <button onClick={() => setEditingClause(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">İptal</button>
              <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 font-bold shadow-lg shadow-teal-200 dark:shadow-none transition-all">
                <Save size={18} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClauseLibrary;