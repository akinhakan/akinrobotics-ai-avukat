import React, { useState, useRef, useEffect } from 'react';
import { CompanyContext, ChatMessage } from '../types';
import { askGeneralLegalQuestionStream } from '../services/geminiService';
import { Send, User, Bot, Loader2, MessageCircle, Trash2, X, Maximize2, Minimize2, Sparkles, Globe, ExternalLink } from 'lucide-react';

interface GeneralAssistantProps {
  context: CompanyContext;
}

const GeneralAssistant: React.FC<GeneralAssistantProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 
  
  // Session yönetimi
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
      try {
          const saved = localStorage.getItem('lexguard_general_chat');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('lexguard_general_chat', JSON.stringify(chatHistory));
    if (isOpen) {
        setTimeout(scrollToBottom, 100);
    }
  }, [chatHistory, isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // AI Mesajı için yer tutucu ekle
    setChatHistory(prev => [...prev, { role: 'model', text: '', sources: [] }]);

    try {
      let fullText = "";
      const currentSources: { title: string; uri: string }[] = [];
      const stream = askGeneralLegalQuestionStream(input, chatHistory, context);

      for await (const chunk of stream) {
          if (chunk.text) {
              fullText += chunk.text;
          }
          if (chunk.groundingMetadata?.groundingChunks) {
              chunk.groundingMetadata.groundingChunks.forEach((c: any) => {
                  if (c.web?.uri && c.web?.title) {
                      // Duplicate kontrolü
                      if (!currentSources.find(s => s.uri === c.web.uri)) {
                          currentSources.push({ title: c.web.title, uri: c.web.uri });
                      }
                  }
              });
          }

          // State'i anlık güncelle (Streaming Effect)
          setChatHistory(prev => {
              const newHistory = [...prev];
              const lastMsg = newHistory[newHistory.length - 1];
              lastMsg.text = fullText;
              lastMsg.sources = currentSources.length > 0 ? currentSources : undefined;
              return newHistory;
          });
      }
    } catch (error: any) {
      console.error("GeneralAssistant Hatası:", error);
      setChatHistory(prev => {
           const newHistory = [...prev];
           const errorMsg = error.message || "Bağlantı hatası.";
           newHistory[newHistory.length - 1].text = `⚠️ Hata oluştu: ${errorMsg}\n(Lütfen Profil sayfasından API anahtarınızı kontrol edin.)`;
           return newHistory;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
      if(confirm('Sohbet geçmişi silinecek. Emin misiniz?')) {
          setChatHistory([]);
          localStorage.removeItem('lexguard_general_chat');
      }
  };

  const handleSuggestion = (question: string) => {
      setInput(question);
  };

  const suggestions = [
      "Satış sözleşmesinde vade süresi nedir?",
      "Şu anki Yargıtay kararlarına göre fesih süreci nasıl?",
      "Gizlilik sözleşmesi cezai şartı kaç TL?",
      "Müşteri tazminat limitini artırmak istiyor."
  ];

  return (
    <>
        {/* --- WIDGET PENCERESİ --- */}
        <div 
            className={`fixed bottom-24 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 transform origin-bottom-right z-50 ${
                isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'
            } ${
                isExpanded ? 'w-[90vw] md:w-[600px] h-[80vh]' : 'w-[90vw] md:w-[400px] h-[500px]'
            }`}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-t-2xl p-4 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                        <Bot size={18}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">AI Hukuk Asistanı</h3>
                        <p className="text-[10px] text-purple-100 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            Kurumsal Hafıza + Google Search Aktif
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleClearChat} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Temizle">
                        <Trash2 size={16}/>
                    </button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden md:block" title={isExpanded ? "Küçült" : "Büyüt"}>
                        {isExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Kapat">
                        <X size={18}/>
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
                         <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-2">
                             <Sparkles size={32}/>
                         </div>
                         <p className="text-slate-600 font-medium text-sm">
                             Merhaba! Şirket içi belgeler ve <strong>güncel internet kaynakları (Grounding)</strong> ile size yardımcı olabilirim.
                         </p>
                         <div className="grid grid-cols-1 gap-2 w-full">
                             {suggestions.map((s, i) => (
                                 <button 
                                    key={i} 
                                    onClick={() => handleSuggestion(s)}
                                    className="p-2 bg-white border border-purple-100 hover:border-purple-400 hover:text-purple-700 rounded-lg text-xs text-slate-500 transition-all text-left shadow-sm"
                                 >
                                     {s}
                                 </button>
                             ))}
                         </div>
                    </div>
                ) : (
                    chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm text-xs ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-purple-600 text-white'}`}>
                                 {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                             </div>
                             <div className={`max-w-[85%] flex flex-col gap-2`}>
                                 <div className={`p-3 rounded-xl text-xs md:text-sm leading-relaxed shadow-sm ${
                                     msg.role === 'user' 
                                     ? 'bg-slate-700 text-white rounded-tr-none' 
                                     : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                 }`}>
                                     {/* Markdown benzeri rendering ve Streaming cursor */}
                                     <pre className="whitespace-pre-wrap font-sans">
                                         {msg.text}
                                         {loading && idx === chatHistory.length - 1 && <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse align-middle"></span>}
                                     </pre>
                                 </div>

                                 {/* Grounding Sources (Google Search Results) */}
                                 {msg.sources && msg.sources.length > 0 && (
                                     <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 animate-fade-in">
                                         <div className="flex items-center gap-1 text-[10px] font-bold text-blue-800 mb-1 uppercase tracking-wider">
                                             <Globe size={12}/> Kaynaklar (Google Search)
                                         </div>
                                         <div className="flex flex-wrap gap-2">
                                             {msg.sources.map((src, i) => (
                                                 <a 
                                                    key={i} 
                                                    href={src.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                                 >
                                                     {src.title.length > 20 ? src.title.substring(0,20)+'...' : src.title}
                                                     <ExternalLink size={10}/>
                                                 </a>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    ))
                )}
                
                <div ref={chatEndRef}/>
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-200 rounded-b-2xl">
                <div className="flex gap-2">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Sorunuzu yazın..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent rounded-lg p-3 text-sm resize-none outline-none max-h-24 min-h-[44px]"
                        rows={1}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                    </button>
                </div>
            </div>
        </div>

        {/* --- FLOATING ACTION BUTTON (FAB) --- */}
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 hover:scale-105 active:scale-95 ${
                isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-purple-600 text-white animate-bounce-subtle'
            }`}
            title="AI Hukuk Asistanı"
        >
            {isOpen ? <X size={24}/> : <MessageCircle size={28}/>}
        </button>
    </>
  );
};

export default GeneralAssistant;