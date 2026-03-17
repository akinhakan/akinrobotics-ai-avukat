import React, { useState } from 'react';
import { Shield, Database, Scale, GitCompare, PenTool, BookMarked, BrainCircuit, Save, MessageSquare, RefreshCw, Zap, Unlock, FileSignature, CheckCircle, Search, Bot } from 'lucide-react';

const UserManual: React.FC = () => {
  const [imgError, setImgError] = useState(false);

  const sections = [
    {
      title: "1. Ücretsiz / Demo Modu & API Anahtarları",
      icon: <Unlock className="text-emerald-600" size={24}/>,
      color: "bg-emerald-50 border-emerald-100",
      content: (
        <div className="space-y-3">
          <p>
            AKINROBOTICS AI Avukat'ı kullanmak için hemen bir ödeme yapmanıza veya karmaşık API anahtarları almanıza gerek yoktur.
          </p>
          <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
             <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>
                    <strong>Demo Modu (Varsayılan):</strong> Hiçbir anahtar girmeden sistemi sınırsızca test edebilirsiniz. Sistem, simülasyon verileriyle size yapay zekanın neler yapabileceğini gösterir.
                </li>
                <li>
                    <strong>Gerçek Yapay Zeka (Pro Mod):</strong> Kendi verilerinizle gerçek analizler yapmak için <strong>Profil & Eğitim</strong> sekmesinden Google Gemini (Tavsiye Edilen), OpenAI veya Claude anahtarınızı girebilirsiniz.
                </li>
             </ul>
          </div>
        </div>
      )
    },
    {
      title: "2. Kurumsal Hafıza & Eğitim (Beyin)",
      icon: <BrainCircuit className="text-blue-600" size={24}/>,
      color: "bg-blue-50 border-blue-100",
      content: (
        <div className="space-y-3">
          <p>
            Yapay zekanın şirketinizi tanıması için en önemli adımdır. Buraya girdiğiniz bilgiler, AI'nın tüm kararlarını etkiler.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
            <li>
              <strong>Strateji & Kimlik:</strong> Şirketinizin kırmızı çizgilerini (Örn: <i>"Tazminat limiti sözleşme bedelini aşamaz"</i>) buraya yazın. AI, tüm sözleşmeleri bu kurallara göre denetler.
            </li>
            <li>
              <strong>Şablon Yükleme:</strong> "Satış", "Teknik Servis" gibi sekmelere tıklayarak, şirketinize ait onaylı sözleşme metinlerini yapıştırın. AI, dışarıdan gelen sözleşmeleri incelerken <u>bu metinleri referans alarak</u> riskleri bulur.
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "3. Akıllı Dolum & Risk Düzeltme (Smart Filler)",
      icon: <FileSignature className="text-indigo-600" size={24}/>,
      color: "bg-indigo-50 border-indigo-100",
      content: (
        <div className="space-y-2">
          <p>
            Bu modül sadece boşluk doldurmaz, belgeyi imzaya hazır hale getirir. İşleyiş sırası şöyledir:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
             <li><strong>Yükleme:</strong> Belgenizi yükleyin.</li>
             <li><strong>Risk Denetimi:</strong> AI önce belgedeki hukuki tuzakları bulur.</li>
             <li><strong>Otomatik Düzeltme (YENİ):</strong> Tespit edilen riskleri seçerek <i>"Bunu Düzelt"</i> diyebilirsiniz. AI, o maddeyi sizin şirket politikanıza uygun şekilde <u>yeniden yazar</u>.</li>
             <li><strong>Boşluk Doldurma:</strong> Riskler temizlendikten sonra AI, eksik bilgileri (Tarih, Ünvan vb.) sorar ve belgeyi doldurur.</li>
             <li><strong>İndirme:</strong> Temiz ve doldurulmuş belgeyi Word (.docx) olarak indirirsiniz.</li>
          </ol>
        </div>
      )
    },
    {
      title: "4. Sözleşme İnceleme & Asistan",
      icon: <Scale className="text-purple-600" size={24}/>,
      color: "bg-purple-50 border-purple-100",
      content: (
        <div className="space-y-2">
          <p>Müşteriden gelen karmaşık sözleşmeleri saniyeler içinde analiz eder.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
            <li><strong>Risk Puanı:</strong> Sözleşmenin ne kadar tehlikeli olduğunu 100 üzerinden puanlar.</li>
            <li><strong>Karşılaştırma:</strong> Yüklediğiniz belgeyi, sistemdeki "Standart Şablonunuz" ile kıyaslayabilir.</li>
            <li><strong>Sohbet:</strong> Analiz bittikten sonra <i>"Fesih şartları neler?", "Cezai şart var mı?"</i> gibi sorular sorarak belgeyle konuşabilirsiniz.</li>
          </ul>
        </div>
      )
    },
    {
      title: "5. Müzakere Masası (Kıyasla/Diff)",
      icon: <GitCompare className="text-orange-600" size={24}/>,
      content: (
        <div className="space-y-2">
          <p>
            Sözleşme gitti-geldi süreçlerinde (ping-pong) kullanılır.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li>Sol tarafa <strong>Orijinal</strong>, sağ tarafa <strong>Revize</strong> (karşı taraftan gelen) metni koyun.</li>
            <li>Sistem kelime bazlı değişiklikleri gösterir (Kırmızı: Silinen, Yeşil: Eklenen).</li>
            <li><strong>"Değişiklikleri Yorumla"</strong> butonu ile yapay zeka, karşı tarafın yaptığı kurnazlıkları yorumlar (Örn: <i>"Ödeme süresini 30 günden 60 güne çıkarmışlar, bu nakit akışınızı bozar."</i>).</li>
          </ul>
        </div>
      )
    },
    {
      title: "6. Madde Kütüphanesi & Taslak Oluşturucu",
      icon: <BookMarked className="text-teal-600" size={24}/>,
      content: (
        <div className="space-y-2">
          <p>
            Sıfırdan sözleşme yazarken kullanacağınız araçlardır.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li><strong>Kütüphane:</strong> Sık kullandığınız, hukuk departmanınızın onayladığı "mükemmel" paragrafları (Gizlilik, Mücbir Sebep vb.) burada saklayın.</li>
            <li><strong>Taslak Oluşturucu:</strong> Şablon seçin, talimat verin (<i>"Ahmet Bey ile 1 yıllık danışmanlık sözleşmesi hazırla"</i>) ve kütüphaneden madde ekleyerek taslağı oluşturun.</li>
          </ul>
        </div>
      )
    },
    {
      title: "7. Genel Asistan & İnternet Erişimi",
      icon: <Bot className="text-pink-600" size={24}/>,
      content: (
        <div className="space-y-2">
          <p>
             Sağ alttaki yüzen butona tıklayarak ulaşabileceğiniz genel hukuk asistanıdır.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li><strong>Grounding (Google Arama):</strong> Eğer Google Gemini API anahtarı kullanıyorsanız, asistan güncel kanunları ve emsal kararları internetten araştırarak cevap verir.</li>
            <li>Şirket içi verilerinize ve yüklediğiniz şablonlara hakimdir.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col p-6 md:p-12 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-6xl mx-auto w-full pb-20">
        <div className="mb-10 text-center animate-fade-in">
            <div className="inline-flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-3xl mb-6 shadow-xl shadow-slate-200 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-800 min-w-[200px] min-h-[100px]">
                {imgError ? (
                   <div className="fallback-text text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                     AKINROBOTICS
                   </div>
                ) : (
                    <img 
                        src="https://www.akinrobotics.com/img/logo.png" 
                        className="h-12 w-auto object-contain" 
                        alt="AkınRobotics Logo"
                        onError={() => setImgError(true)}
                    />
                )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Kullanım Kılavuzu & Özellikler</h1>
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                AKINROBOTICS AI Avukat v2.3, sadece analiz yapmaz; riskleri düzeltir, belgeleri doldurur ve sizin yerinize müzakere eder.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {sections.map((section, idx) => (
                <div key={idx} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group ${section.color || 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform duration-300">
                            {section.icon}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{section.title}</h2>
                    </div>
                    <div className="p-6 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {section.content}
                    </div>
                </div>
            ))}
        </div>

        {/* PRO TIP CARD */}
        <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 text-slate-300 p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            <div className="flex-1">
                <h3 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400 fill-yellow-400"/> Gizlilik ve Güvenlik Garantisi
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    <strong>%100 Yerel Depolama:</strong> Bu uygulama, girdiğiniz sözleşme şablonlarını, şirket sırlarını ve analiz geçmişini <u>sadece sizin bilgisayarınızın tarayıcısında (Local Storage)</u> saklar. Hiçbir veri merkezi bir sunucuya kaydedilmez. Sayfayı yenileseniz (F5) bile verileriniz kaybolmaz.
                </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
                 <div className="flex items-center gap-3 mb-2">
                     <Shield className="text-green-400" size={24}/>
                     <span className="font-bold text-white">Güvenli Veri</span>
                 </div>
                 <div className="text-xs font-mono text-slate-400">
                    <div>AES-256 (Simüle)</div>
                    <div>Local Browser Storage</div>
                    <div>No Cloud Sync</div>
                 </div>
            </div>
        </div>
        
        <div className="text-center mt-8 text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} AKINROBOTICS AI Solutions
        </div>

      </div>
    </div>
  );
};

export default UserManual;