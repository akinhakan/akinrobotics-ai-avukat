import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Lock, Database, Zap, Sparkles, User as UserIcon, Key, Loader2, AlertCircle, Mail } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login, loginWithEmail, registerWithEmail, loginWithUsername, registerWithUsername } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'USERNAME_LOGIN' | 'USERNAME_REGISTER'>('LOGIN');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      if (authMode === 'USERNAME_LOGIN') {
        await loginWithUsername(username, password);
      } else if (authMode === 'USERNAME_REGISTER') {
        if (!name.trim()) {
          setError('Lütfen adınızı girin.');
          setIsLoading(false);
          return;
        }
        if (!username.trim()) {
          setError('Lütfen bir kullanıcı adı belirleyin.');
          setIsLoading(false);
          return;
        }
        await registerWithUsername(username, password, name);
        setSuccessMessage('Kayıt talebiniz alındı. Yönetici onayından sonra giriş yapabilirsiniz.');
        setAuthMode('LOGIN');
        // Reset form
        setName('');
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden font-sans text-slate-100">
      
      {/* Arkaplan Efektleri */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '3s'}}></div>
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* SOL TARAF: MARKA VE ÖZELLİKLER */}
          <div className="space-y-10 animate-fade-in-left hidden lg:block">
              <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-teal-400 text-xs font-bold tracking-wider mb-8 backdrop-blur-sm shadow-sm">
                      <Sparkles size={12} className="text-teal-400"/>
                      YENİ: ÇOKLU MODEL DESTEĞİ (GPT-4 & CLAUDE)
                  </div>
                  
                  <img 
                    src="https://www.akinrobotics.com/img/logo.png" 
                    alt="AKINROBOTICS" 
                    className="h-20 w-auto mb-8 object-contain filter drop-shadow-2xl bg-white p-3 rounded-2xl"
                  />
                  
                  <h1 className="text-6xl font-black tracking-tighter leading-tight text-white mb-6">
                      Hukuki Zeka, <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Yeniden Tanımlandı.</span>
                  </h1>
                  
                  <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-light">
                      AKINROBOTICS AI Avukat v2.3 ile sözleşmeleri analiz edin, riskleri saniyeler içinde tespit edin ve kurumsal hafızanızla uyumlu taslaklar oluşturun.
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-slate-800/50 pt-8">
                  <div className="flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors cursor-default">
                      <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 shrink-0"><ShieldCheck size={24}/></div>
                      <div>
                          <h4 className="font-bold text-white mb-1">Risk Analizi</h4>
                          <p className="text-xs text-slate-400 leading-snug">Sözleşmelerdeki gizli tehlikeleri %99 doğrulukla bulun.</p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors cursor-default">
                      <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400 shrink-0"><Zap size={24}/></div>
                      <div>
                          <h4 className="font-bold text-white mb-1">Akıllı Dolum</h4>
                          <p className="text-xs text-slate-400 leading-snug">Eksik bilgileri tespit edip bağlama uygun otomatik doldurun.</p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors cursor-default">
                      <div className="p-3 bg-teal-500/20 rounded-lg text-teal-400 shrink-0"><Database size={24}/></div>
                      <div>
                          <h4 className="font-bold text-white mb-1">Kurumsal Hafıza</h4>
                          <p className="text-xs text-slate-400 leading-snug">Şirketinizin geçmişini, kurallarını ve kırmızı çizgilerini öğrenen AI.</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* SAĞ TARAF: LOGIN KARTI */}
          <div className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl animate-fade-in-up relative overflow-hidden group">
              {/* Parlama Efekti */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none"></div>
              
              <div className="text-center mb-8 relative z-10">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-slate-700">
                      <Lock size={28} className="text-blue-400"/>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {authMode === 'LOGIN' ? 'Hoş Geldiniz' : 
                     (authMode === 'USERNAME_LOGIN' ? 'Giriş Yap' : 'Kayıt Ol')}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {authMode === 'LOGIN' ? 'Uygulamaya erişmek için bir yöntem seçin.' : 'Lütfen bilgilerinizi girin.'}
                  </p>
              </div>

              <div className="space-y-5 relative z-10">
                  {error && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                          <AlertCircle size={16} className="shrink-0"/>
                          {error}
                      </div>
                  )}

                  {successMessage && (
                      <div className="bg-green-500/10 border border-green-500/50 text-green-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                          <ShieldCheck size={16} className="shrink-0 text-green-400"/>
                          {successMessage}
                      </div>
                  )}

                  {authMode === 'LOGIN' ? (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        <button 
                          onClick={() => setAuthMode('USERNAME_LOGIN')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
                        >
                          <UserIcon size={20} />
                          Kullanıcı Girişi
                        </button>
                        <button 
                          onClick={() => setAuthMode('USERNAME_REGISTER')}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-3"
                        >
                          <Sparkles size={20} className="text-purple-400" />
                          Kayıt Ol
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center mt-4 italic">
                        * Kayıt olduktan sonra yönetici onayını beklemeniz gerekmektedir.
                      </p>
                    </>
                  ) : (
                    <form onSubmit={handleAuth} className="space-y-4">
                      {authMode === 'USERNAME_REGISTER' && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 ml-1">AD SOYAD</label>
                          <input 
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Adınız Soyadınız"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 ml-1">KULLANICI ADI</label>
                        <input 
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="kullanici_adi"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 ml-1">ŞİFRE</label>
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 mt-2"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20}/>}
                        {authMode === 'USERNAME_LOGIN' ? 'Giriş Yap' : 'Kayıt Ol'}
                      </button>

                      <div className="flex flex-col gap-3 pt-2">
                        <button 
                          type="button"
                          onClick={() => setAuthMode('LOGIN')}
                          className="text-xs text-slate-500 hover:text-slate-400 font-bold transition-colors"
                        >
                          Geri Dön
                        </button>
                      </div>
                    </form>
                  )}
              </div>

              <div className="text-center mt-8 pt-6 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                      <ShieldCheck size={10}/> 
                      Verileriniz yerel sunucuda güvenli bir şekilde saklanır.
                  </p>
              </div>
          </div>

      </div>

      <div className="absolute bottom-6 text-center text-slate-600 text-[10px] uppercase tracking-widest">
          &copy; {new Date().getFullYear()} AKINROBOTICS AI Solutions • v2.3.0
      </div>
    </div>
  );
};

export default LoginScreen;
