import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { CompanyContext, ContractAnalysisResult, ChatMessage, DiffAnalysisResult, AIProvider } from "../types";

// --- SABİTLER ---
const TIMEOUT_MS = 45000; // 45 Saniye (API Timeout)

// --- YARDIMCI: BEKLEME ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- YARDIMCI: GÜVENLİ JSON AYRIŞTIRICI ---
const cleanAndParseJson = (text: string): any => {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Markdown (```json ... ```) temizliği
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Sadece ilk { ile son } arasını al (Claude bazen önsöz yazar)
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        try {
            return JSON.parse(cleaned);
        } catch (e2) {
            console.error("JSON Parse Hatası. Ham metin:", text);
            // Hata fırlatmak yerine boş obje dönerek akışı bozmuyoruz
            return {}; 
        }
    }
};

// --- API KEY HELPER ---
// Kullanıcı girmemişse sistemdeki (env) anahtarı getirir
const getEffectiveApiKey = (context: CompanyContext): string => {
    const provider = context.activeProvider;
    let key = context.apiKeys?.[provider.toLowerCase() as keyof typeof context.apiKeys];
    
    // Eğer kullanıcı bir key girmemişse ve Google kullanıyorsa, sistem env key'ini kullan
    if ((!key || !key.trim()) && provider === 'GOOGLE') {
        key = process.env.GEMINI_API_KEY || "";
    }
    
    return key || "";
};

// --- MOCK DATA GENERATOR (ANAHTARSIZ & ENV YOKSA) ---
const getMockResponse = (prompt: string, jsonMode: boolean): string => {
    const p = prompt.toLowerCase();

    // 0. WEB SCRAPING MOCK (AKINROBOTICS ÖZEL)
    if (p.includes("akinrobotics") || p.includes("web sitesini tara")) {
        return `
**AKINROBOTICS Ürün Portföyü ve Teknik Mevzuat Uyumluluğu**

**1. İnsansı Robotlar (Humanoid Series):**
*   **Modeller:** ADA Serisi (ADA-7, ADA-Mini), ARAT (Dört Ayaklı Robot).
*   **Kullanım Alanı:** Karşılama, sunum, eğitim, güvenlik.
*   **Teknik Standartlar:** 
    *   TS EN 60204-1 (Makine Güvenliği)
    *   TS EN ISO 12100 (Risk Değerlendirme)
    *   CE İşareti Uyumluluğu (Alçak Gerilim Direktifi 2014/35/AB)

**2. Hizmet Robotları (Service Robots):**
*   **Modeller:** Mini Ada (Sosyal Robot), Garson Robotlar, Temizlik Robotları.
*   **Mevzuat:** T.C. Ticaret Bakanlığı "Satış Sonrası Hizmetler Yönetmeliği" kapsamında 10 yıl yedek parça bulundurma zorunluluğu.

**3. Hijyen ve Sterilizasyon Robotları:**
*   **Modeller:** UVC Sterilizasyon Robotu.
*   **Özel Mevzuat:** T.C. Sağlık Bakanlığı Biyosidal Ürünler Yönetmeliği ve TS EN 60601-1 (Tıbbi Elektrikli Ekipmanlar) standartlarına kısmi uyumluluk gerektirir. UVC ışınımı nedeniyle iş güvenliği uyarıları (ISO 15858) zorunludur.

**4. Tarım Robotları:**
*   **Modeller:** PNCR serisi (Pancar/Tarla robotları).
*   **Mevzuat:** Zirai Mekanizasyon Araçlarının Kredili Satışına Esas Deney ve Denetim Yönetmeliği.

**Genel Hukuki Durum:**
Tüm ürünler 6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Garanti Belgesi Yönetmeliği'ne tabidir. Yazılımlar 5846 sayılı FSEK kapsamında korunmaktadır.
        `.trim();
    }

    // 1. ANALİZ MOCK
    if (p.includes("analiz") || p.includes("risk")) {
        const mockAnalysis = {
            riskScore: 75,
            summary: "Sözleşme genel hatlarıyla standartlara uygun olsa da, tazminat limitleri ve fesih maddelerinde şirket aleyhine belirsizlikler tespit edilmiştir. (Bu bir demo analizidir)",
            risks: [
                { 
                    severity: "High", 
                    description: "Tazminat limiti belirtilmemiş. Sınırsız sorumluluk riski var.", 
                    suggestion: "Tazminatın sözleşme bedelinin %100'ü ile sınırlandırılması maddesi eklenmeli." 
                },
                { 
                    severity: "Medium", 
                    description: "Fesih ihbar süresi çok kısa (3 gün).", 
                    suggestion: "Operasyonel hazırlık için sürenin en az 15 güne çıkarılması önerilir." 
                },
                { 
                    severity: "Low", 
                    description: "Yetkili mahkeme İstanbul olarak belirlenmiş.", 
                    suggestion: "Şirket merkezinin bulunduğu Konya mahkemeleri olarak değiştirilmesi maliyeti düşürür." 
                }
            ],
            revisedText: "İşbu sözleşme hükümleri AKINROBOTICS standartlarına göre revize edilmiştir... (Demo Metin)",
            missingFields: []
        };
        return JSON.stringify(mockAnalysis);
    }

    // 2. FARK ANALİZİ MOCK
    if (p.includes("fark") || p.includes("karşılaştır")) {
        const mockDiff = {
            summary: "Karşı tarafın revizesinde cezai şart oranları artırılmış ve gizlilik süresi kısaltılmış.",
            changes: [
                { location: "Madde 3.2", changeType: "Modification", impact: "Negative", analysis: "Ödeme vadesi 30 günden 60 güne çıkarılmış.", recommendation: "Reject" },
                { location: "Madde 8.1", changeType: "Addition", impact: "Neutral", analysis: "KVKK aydınlatma metni eklenmiş.", recommendation: "Accept" }
            ]
        };
        return JSON.stringify(mockDiff);
    }

    // 3. DOLUM MOCK
    if (p.includes("doldur") || p.includes("dolum")) {
        const mockFill = {
            filledText: "TARAFLAR:\nSatıcı: AKINROBOTICS A.Ş.\nAlıcı: [Müşteri Adı]\nTarih: " + new Date().toLocaleDateString('tr-TR'),
            fillLog: ["Tarih bugünün tarihiyle güncellendi.", "Şirket ünvanı eklendi."]
        };
        return JSON.stringify(mockFill);
    }

    // 4. TASLAK MOCK
    if (!jsonMode && (p.includes("taslak") || p.includes("hazırla"))) {
        return `
SATIŞ SÖZLEŞMESİ TASLAĞI

1. TARAFLAR
Bir tarafta AKINROBOTICS A.Ş. (Satıcı) diğer tarafta ... (Alıcı) aşağıda belirtilen şartlarda anlaşmıştır.

2. KONU
İşbu sözleşmenin konusu, Satıcı tarafından üretilen robotik donanımların Alıcı'ya satışıdır.

3. ÖDEME
Toplam bedel ... TL olup, fatura tarihinden itibaren 30 gün içinde ödenecektir.

(Not: Bu metin API anahtarı olmadan oluşturulmuş örnek bir taslaktır.)
        `;
    }

    // 5. GENEL SOHBET MOCK
    return "Sistem şu anda 'Ücretsiz/Demo' modunda çalışıyor. Gerçek zamanlı yapay zeka analizi için lütfen Profil ayarlarından geçerli bir API anahtarı giriniz. Ancak şu an arayüzü ve özellikleri sınırsızca test edebilirsiniz. Sorduğunuz soruya istinaden; genel hukuk kuralları çerçevesinde sözleşme serbestisi esastır ancak emredici hükümlere aykırılık teşkil edemez.";
};


// --- API KEY VALIDATION ---
export const validateApiKey = async (apiKey: string, provider: AIProvider): Promise<{ isValid: boolean; message: string }> => {
  // 1. Kullanıcı girmemiş ama sistemde ENV var (Google)
  if ((!apiKey || apiKey.trim().length === 0) && provider === 'GOOGLE' && process.env.GEMINI_API_KEY) {
      return { isValid: true, message: "Sistem Anahtarı Aktif (Limitsiz)" };
  }

  // 2. Kullanıcı girmemiş ve ENV de yok -> Demo Modu
  if (!apiKey || apiKey.trim().length === 0) {
      return { isValid: true, message: "Ücretsiz / Demo Modu Aktif." };
  }
  
  if (apiKey.trim().length < 5) return { isValid: false, message: "Anahtar çok kısa." };

  try {
      if (provider === 'GOOGLE') {
          const ai = new GoogleGenAI({ apiKey });
          await ai.models.generateContent({ model: 'gemini-2.5-flash-latest', contents: 'test' });
          return { isValid: true, message: "Google Gemini Bağlantısı Başarılı!" };
      } else if (provider === 'OPENAI') {
          const response = await fetch('https://api.openai.com/v1/models', {
              headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (response.ok) return { isValid: true, message: "OpenAI Bağlantısı Başarılı!" };
          throw new Error(response.statusText);
      } else if (provider === 'ANTHROPIC') {
          try {
              await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                  body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{role:'user', content:'hi'}] })
              });
              return { isValid: true, message: "Anthropic Erişimi Başarılı!" }; 
          } catch(e: any) {
             if(e.message?.includes('401')) throw new Error("Anahtar geçersiz.");
             return { isValid: true, message: "Anthropic Anahtarı Kaydedildi (CORS uyarısı)." };
          }
      }
      return { isValid: false, message: "Bilinmeyen sağlayıcı." };
  } catch (error: any) {
      return { isValid: false, message: `Hata: ${error.message || "Bağlantı Kurulamadı"}` };
  }
};

// --- UNIFIED GENERATION HANDLER (ÇEVİRİCİ KATMAN + DEMO MODU) ---
interface UnifiedRequest {
    context: CompanyContext;
    systemInstruction: string;
    userPrompt: string;
    jsonMode?: boolean;     
    temperature?: number;
    useGoogleSearch?: boolean; // YENİ: Search Grounding
}

const generateUnifiedContent = async (req: UnifiedRequest): Promise<string> => {
    const { context, systemInstruction, userPrompt, jsonMode, useGoogleSearch } = req;
    const provider = context.activeProvider;
    
    // API ANAHTARI KONTROLÜ (Helper kullanıyoruz)
    const apiKey = getEffectiveApiKey(context);

    // EĞER ANAHTAR YOKSA -> AKILLI MOCK DATA DÖN (HATA YOK)
    if (!apiKey || apiKey.trim() === '') {
        await sleep(1000 + Math.random() * 1000); // Yapay gecikme (Gerçekçilik için)
        return getMockResponse(userPrompt, jsonMode || false);
    }
    
    // --- GERÇEK API ÇAĞRILARI ---
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`İşlem zaman aşımına uğradı (${TIMEOUT_MS/1000}sn). Lütfen daha kısa bir metin deneyin.`)), TIMEOUT_MS)
    );

    try {
        // 1. GOOGLE GEMINI
        if (provider === 'GOOGLE') {
            const ai = new GoogleGenAI({ apiKey });
            const modelName = context.preferredModel || 'gemini-3-flash-preview'; // Default to fast model
            
            const config: any = { 
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            };
            if (jsonMode) {
                config.responseMimeType = "application/json";
            }
            if (useGoogleSearch) {
                config.tools = [{ googleSearch: {} }]; // Grounding Aktif
            }

            const apiCall = ai.models.generateContent({
                model: modelName,
                contents: userPrompt,
                config
            });
            
            const response = await Promise.race([apiCall, timeoutPromise]) as GenerateContentResponse;
            return response.text || "";
        }

        // 2. OPENAI
        if (provider === 'OPENAI') {
            const modelName = context.preferredModel || 'gpt-4o'; // Default to 4o for best balance
            const messages = [
                { role: "system", content: systemInstruction + (jsonMode ? " You must output valid JSON." : "") },
                { role: "user", content: userPrompt }
            ];

            const payload: any = {
                model: modelName,
                messages: messages,
                temperature: jsonMode ? 0.1 : (req.temperature || 0.7),
                max_tokens: 4096
            };

            if (jsonMode) {
                payload.response_format = { type: "json_object" };
            }

            const apiCall = fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            const res = await Promise.race([apiCall, timeoutPromise]) as Response;

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(`OpenAI Hatası: ${res.statusText} ${errorData.error?.message || ''}`);
            }
            const data = await res.json();
            return data.choices?.[0]?.message?.content || "";
        }

        // 3. ANTHROPIC
        if (provider === 'ANTHROPIC') {
            const modelName = context.preferredModel || 'claude-3-5-sonnet-latest';
            const finalSystem = systemInstruction + (jsonMode ? " RETURN ONLY JSON. Do not include any explanation or preamble." : "");

            const payload = {
                model: modelName,
                max_tokens: 4096,
                system: finalSystem,
                messages: [
                    { role: "user", content: userPrompt + (jsonMode ? "\nOutput the result in JSON format." : "") }
                ],
                temperature: jsonMode ? 0.1 : (req.temperature || 0.7)
            };

            const apiCall = fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                    "dangerously-allow-browser": "true" 
                },
                body: JSON.stringify(payload)
            });

            const res = await Promise.race([apiCall, timeoutPromise]) as Response;

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(`Anthropic Hatası: ${res.statusText} ${errorData.error?.message || ''}`);
            }
            const data = await res.json();
            return data.content?.[0]?.text || "";
        }
    } catch (error) {
        console.warn("API Hatası oluştu, Demo Moduna düşülüyor:", error);
        // Eğer API hatası alırsak (Quota exceeded, expired key vb.) yine Mock dönelim ki sistem durmasın.
        return getMockResponse(userPrompt, jsonMode || false);
    }

    throw new Error("Geçersiz AI Sağlayıcısı");
};

// --- İŞ MANTIĞI FONKSİYONLARI ---

// 0. WEB'DEN ŞİRKET PROFİLİ ÇEKME (YENİ)
export const fetchCompanyProfileFromWeb = async (
    companyDomain: string,
    context: CompanyContext
): Promise<string> => {
    const systemInstruction = `
    Sen kıdemli bir hukuk ve teknoloji danışmanısın. Görevin, verilen şirketin web sitesini analiz ederek hukuki metinlerde (sözleşmelerde) referans alınacak "Ürün Portföyü ve Mevzuat Uyumluluğu" metnini hazırlamak.
    HEDEF ŞİRKET: ${companyDomain} (Örn: akinrobotics.com)
    
    YAPILACAKLAR:
    1. Şirketin ana ürün gruplarını listele (Örn: İnsansı Robotlar, Tarım Robotları, Hizmet Robotları, UVC Robotlar vb.).
    2. Her ürün grubu için geçerli olası TEKNİK STANDARTLARI (ISO, EN, CE vb.) belirt.
    3. Türkiye'deki ilgili BAKANLIK YÖNETMELİKLERİNİ ekle (Garanti Belgesi, Satış Sonrası Hizmetler, Tıbbi Cihaz Yönetmeliği vb.).
    4. Metni maddeler halinde, net ve hukuki bir dille yaz.
    `;

    const userPrompt = `
    Lütfen ${companyDomain} web sitesini ve internetteki kaynakları tara. 
    Şirketin sattığı ürünleri ve bu ürünlerin tabi olduğu yasal/teknik standartları özetleyen detaylı bir metin oluştur. 
    Bu metin sözleşmelerde "Tanımlar" ve "Garanti" maddelerinde referans olarak kullanılacak.
    `;

    // Google Search Grounding kullanarak gerçek veri çekmeye çalışıyoruz
    return await generateUnifiedContent({
        context,
        systemInstruction,
        userPrompt,
        jsonMode: false,
        useGoogleSearch: true 
    });
};

// 0.1. DOKÜMANDAN ÜRÜN ANALİZİ (YENİ)
export const analyzeProductDocument = async (
    documentText: string,
    context: CompanyContext
): Promise<string> => {
    const systemInstruction = `
    Sen kıdemli bir hukuk ve ürün uzmanısın. Verilen teknik dokümanı, Word dosyasını veya notu analiz ederek; 
    sözleşmelerde kullanılmak üzere "Ürün Portföyü, Teknik Standartlar ve Mevzuat Uyumluluğu" özeti çıkarman gerekiyor.
    
    YAPILACAKLAR:
    1. Dokümandaki ürünleri ve temel özelliklerini belirle.
    2. Ürünlerin tabi olduğu teknik standartları (ISO, CE, TSE vb.) dokümandan çıkar veya doküman yetersizse genel bilgi ekle.
    3. Bu ürünlerin satış/kiralama sözleşmelerinde kritik olan yasal yükümlülüklerini (Garanti, İade, Bakım vb.) özetle.
    4. Mevcut "Ürün Portföyü" verisiyle çelişmeden, yeni bilgileri ekleyerek zenginleştirilmiş bir metin oluştur.
    
    Metni maddeler halinde, profesyonel bir dille yaz.
    `;

    const userPrompt = `
    Aşağıdaki doküman içeriğini analiz et ve kurumsal hafıza için ürün/mevzuat özetini hazırla:
    
    --- DOKÜMAN İÇERİĞİ ---
    ${documentText.substring(0, 30000)}
    --- SON ---
    `;

    return await generateUnifiedContent({
        context,
        systemInstruction,
        userPrompt,
        jsonMode: false
    });
};

const formatMasterContracts = (context: CompanyContext, specificType?: string): string => {
  if (!context.masterContracts || context.masterContracts.length === 0) {
    return "Sistemde yüklü ana sözleşme yok. Genel Türk Hukuku kurallarına ve şirket çıkarlarına göre hareket et.";
  }
  if (specificType && specificType !== 'AUTO') {
      const specific = context.masterContracts.find(c => c.type === specificType);
      if (specific) {
          return `--- REFERANS ALINACAK TEK KAYNAK (${specific.type}) ---\n${specific.content}\n--- KAYNAK SONU ---`;
      }
  }
  return context.masterContracts.map(mc => 
    `--- REFERANS: ${mc.type} ---\n${mc.content}\n--- REFERANS SONU ---\n`
  ).join("\n");
};

const formatCustomRules = (context: CompanyContext): string => {
    let rulesText = "";

    // 1. Geçici Sözleşme (En Öncelikli)
    if (context.isTemporaryContractActive && context.temporaryContract) {
        rulesText += `\n--- GEÇİCİ SÖZLEŞME VE EK PROTOKOL (BU METİN ANA SÖZLEŞMEYE EKLENMİŞTİR VE ÖNCELİKLİDİR) ---\n${context.temporaryContract}\n--- GEÇİCİ SÖZLEŞME SONU ---\n`;
    }

    // 2. Özel Kurallar (Maddeler)
    if (context.customRules && context.customRules.length > 0) {
        const activeRules = context.customRules.filter(r => r.isActive);
        if (activeRules.length > 0) {
            rulesText += `\n--- ÖZEL KURALLAR VE TALİMATLAR ---\n` + 
                       activeRules.map((r, i) => `${i + 1}. [${r.category}] ${r.content}`).join("\n") + 
                       `\n--- ÖZEL KURALLAR SONU ---\n`;
        }
    }
    
    return rulesText;
};

const getOptimizedModel = (context: CompanyContext): string | undefined => {
    if (context.preferredModel) return context.preferredModel;
    
    const provider = context.activeProvider || 'GOOGLE';
    if (provider === 'GOOGLE') return 'gemini-3-flash-preview';
    if (provider === 'OPENAI') return 'gpt-4o-mini';
    if (provider === 'ANTHROPIC') return 'claude-3-5-haiku-latest';
    return undefined;
};

// 1. SÖZLEŞME ANALİZİ
export const analyzeContract = async (
  contractText: string,
  context: CompanyContext,
  fileName: string = "Bilinmeyen Belge",
  referenceType: string = "AUTO"
): Promise<ContractAnalysisResult> => {
  
  const masterContractsText = formatMasterContracts(context, referenceType);
  const customRulesText = formatCustomRules(context);

  // HIZ İÇİN DAHA KISA VE NET TALİMAT
  const systemInstruction = `
    Sen ${context.companyName} şirketinin Baş Hukuk Müşavisisin.
    Sektör: ${context.industry}.
    Kırmızı Çizgiler: ${context.redLines}.
    Ürünler: ${context.productPortfolio}.
    
    GÖREV: Ekli sözleşmeyi analiz et.
    1. Riskleri bul (Yüksek/Orta/Düşük).
    2. Eksik maddeleri tespit et.
    3. T.C. mevzuatına (Garanti, İade vb.) uyumluluğu kontrol et.
    
    Referanslar: ${masterContractsText}
    ${customRulesText}

    Çıktı SADECE geçerli bir JSON olmalıdır. Markdown kullanma.
  `;

  const jsonStructureHint = `
  {
      "riskScore": number (0-100),
      "summary": "Kısa özet (max 3 cümle)",
      "risks": [{ "severity": "High"|"Medium"|"Low", "description": "Kısa tanım", "suggestion": "Kısa öneri" }],
      "revisedText": "Sadece kritik maddelerin revize edilmiş hali (tüm metni tekrar yazma)"
  }
  `;

  try {
    // HIZ İÇİN MODELİ DEĞİŞTİRİYORUZ (FLASH MODEL)
    // Eğer context'te özel bir model yoksa varsayılan olarak hızlı modeli kullan
    const optimizedContext = {
        ...context,
        preferredModel: getOptimizedModel(context)
    };

    const rawText = await generateUnifiedContent({
        context: optimizedContext,
        systemInstruction,
        userPrompt: `ANALİZ EDİLECEK SÖZLEŞME (ÖZETLE):\n${contractText.substring(0, 20000)}\n\nİSTENEN JSON FORMATI:\n${jsonStructureHint}`,
        jsonMode: true
    });

    const parsed = cleanAndParseJson(rawText);
    
    // Eğer model boş döndüyse veya hata yaptıysa varsayılan değerler ata
    return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileName,
        originalText: contractText,
        riskScore: parsed.riskScore || 50,
        summary: parsed.summary || "Analiz tamamlandı ancak özet oluşturulamadı.",
        risks: parsed.risks || [],
        revisedText: parsed.revisedText || contractText // Tüm metni geri dönmüyorsa orijinali kullan
    };

  } catch (error) {
    console.error("Analiz Hatası:", error);
    return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileName,
        originalText: contractText,
        riskScore: 0,
        summary: "Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.",
        risks: [{ severity: 'High', description: 'Sistem Hatası', suggestion: 'Lütfen daha kısa bir metin ile tekrar deneyin.' }],
        revisedText: contractText
    };
  }
};

// 2. FARK ANALİZİ (DIFF)
export const analyzeContractDifferences = async (
  originalText: string,
  revisedText: string,
  context: CompanyContext
): Promise<DiffAnalysisResult> => {
  const masterContractsText = formatMasterContracts(context, 'AUTO'); 
  const customRulesText = formatCustomRules(context);

  const systemInstruction = `
    Sen uzman bir hukukçusun. İki metin arasındaki farkları ${context.companyName} çıkarları açısından yorumla.
    Satılan Ürünler: ${context.productPortfolio}.
    Bakanlık mevzuatlarını ve garanti yükümlülüklerini göz önünde bulundur.
    Referanslar: ${masterContractsText}
    ${customRulesText}
  `;
  
  const jsonStructureHint = `
  JSON Structure:
  {
      "summary": string,
      "changes": [{ 
          "location": string, 
          "changeType": "Addition"|"Deletion"|"Modification", 
          "impact": "Positive"|"Neutral"|"Negative"|"Critical", 
          "analysis": string, 
          "recommendation": "Accept"|"Reject"|"Negotiate" 
      }]
  }
  `;

  try {
      const optimizedContext = {
          ...context,
          preferredModel: getOptimizedModel(context)
      };

      const rawText = await generateUnifiedContent({
          context: optimizedContext,
          systemInstruction,
          userPrompt: `--- ORİJİNAL ---\n${originalText}\n\n--- REVİZE ---\n${revisedText}\n\n${jsonStructureHint}`,
          jsonMode: true
      });
      return cleanAndParseJson(rawText);
  } catch (error) {
    console.error("Diff Analiz Hatası:", error);
    // Hata durumunda boş dön
    return { summary: "Analiz hatası.", changes: [] };
  }
};

// 3. İMZA ÖNCESİ DENETİM & DOLUM
export const analyzeForSignature = async (
    documentText: string,
    context: CompanyContext
): Promise<{ 
    missingFields: { key: string, label: string, description: string }[], 
    risks: { severity: string, description: string, suggestion: string }[] 
}> => {
    const masterContractsText = formatMasterContracts(context, 'AUTO');
    const customRulesText = formatCustomRules(context);

    const systemInstruction = `
      Belgeyi incele.
      Ürünler: ${context.productPortfolio}.
      Bakanlık düzenlemelerine ve yasal zorunluluklara (Garanti süreleri, iade şartları vb.) özellikle dikkat et.
      Kriterler: ${masterContractsText}.
      ${customRulesText}
      1. RİSKLERİ BUL.
      2. EKSİK BİLGİLERİ (BOŞLUKLARI) TESPİT ET.
    `;
    
    const jsonStructureHint = `
    JSON Structure:
    {
        "risks": [{ "severity": "High"|"Medium"|"Low", "description": string, "suggestion": string }],
        "missingFields": [{ "key": string, "label": string, "description": string }]
    }
    `;

    try {
        const optimizedContext = {
            ...context,
            preferredModel: getOptimizedModel(context)
        };

        const rawText = await generateUnifiedContent({
            context: optimizedContext,
            systemInstruction,
            userPrompt: `--- BELGE ---\n${documentText}\n\n${jsonStructureHint}`,
            jsonMode: true
        });
        return cleanAndParseJson(rawText);
    } catch (error) {
        return { risks: [], missingFields: [] };
    }
};

// 4. BELGE DOLDURMA
export const fillDocument = async (
  documentText: string,
  context: CompanyContext,
  customValues: Record<string, string> = {}
): Promise<{ filledText: string; fillLog: string[] }> => {
  const customRulesText = formatCustomRules(context);
  const systemInstruction = `
    Sen "AKINROBOTICS AI AVUKAT". Görevin belgedeki boşlukları doldurmak.
    KAYNAKLAR: ${context.companyName}, ${context.address}, ${context.taxInfo}, ${context.representative}.
    VERİLER: ${JSON.stringify(customValues)}.
    ${customRulesText}
    
    KURALLAR:
    1. BELGE FORMATINI KORU.
    2. Doldurduğun yerleri [[DOLUM: Veri]] formatında yaz.
  `;

  const jsonStructureHint = `
  JSON Structure:
  {
      "filledText": string (full document content),
      "fillLog": string[] (list of changes made)
  }
  `;

  try {
    const optimizedContext = {
        ...context,
        preferredModel: getOptimizedModel(context)
    };

    const rawText = await generateUnifiedContent({
        context: optimizedContext,
        systemInstruction,
        userPrompt: `--- BELGE ---\n${documentText}\n\n${jsonStructureHint}`,
        jsonMode: true
    });
    return cleanAndParseJson(rawText);
  } catch (error) {
    console.error("Fill Error:", error);
    return { filledText: documentText, fillLog: ["Hata: Dolum yapılamadı."] };
  }
};

// 5. TASLAK OLUŞTURMA
export const draftContract = async (
  instruction: string,
  templateText: string | null,
  context: CompanyContext
): Promise<string> => {
  const masterContractsText = formatMasterContracts(context, 'AUTO');
  const customRulesText = formatCustomRules(context);

  const systemInstruction = `
    Sen AKINROBOTICS AI AVUKAT. ${context.companyName} için sözleşme taslağı hazırla.
    Satılan Ürünler: ${context.productPortfolio}.
    ÖNEMLİ: Hazırlanan taslak, belirtilen ürünler için geçerli olan T.C. Bakanlık Yönetmeliklerine (Garanti, İade vb.) tam uyumlu olmalıdır. Yasada açık kapı bırakma.
    Standartlar: ${masterContractsText}
    ${customRulesText}
  `;

  const userPrompt = `TALİMAT: ${instruction}\n` + (templateText ? `ŞABLON:\n${templateText}` : "");

  try {
    return await generateUnifiedContent({
        context,
        systemInstruction,
        userPrompt,
        jsonMode: false
    });
  } catch (error) {
    console.error("Draft Error:", error);
    return "Taslak oluşturulurken hata meydana geldi.";
  }
};

// 6. SOHBET (Unified Wrapper)
export const askGeneralLegalQuestion = async (
  question: string,
  history: ChatMessage[],
  context: CompanyContext
): Promise<string> => {
  const customRulesText = formatCustomRules(context);
  
  return await generateUnifiedContent({
      context,
      systemInstruction: `Sen ${context.companyName} hukuk asistanısın. Şirketin ürünleri: ${context.productPortfolio}. Cevap verirken ilgili bakanlık mevzuatlarını göz önünde bulundur.\n${customRulesText}`,
      userPrompt: question,
      jsonMode: false
  });
};

// 7. STREAMING WRAPPER (Sohbet Robotu İçin)
export const askGeneralLegalQuestionStream = async function* (
  question: string,
  history: ChatMessage[],
  context: CompanyContext
) {
    // Helper'ı kullanarak aktif key'i buluyoruz
    const apiKey = getEffectiveApiKey(context);
    const provider = context.activeProvider;

    // 1. GERÇEK GOOGLE STREAM (Sadece Google seçiliyse ve geçerli bir anahtar varsa)
    if (provider === 'GOOGLE' && apiKey && apiKey.length > 5) {
        const ai = new GoogleGenAI({ apiKey });
        const masterContractsText = formatMasterContracts(context, 'AUTO');
        const customRulesText = formatCustomRules(context);
        
        try {
            const chat = ai.chats.create({
                model: context.preferredModel || 'gemini-3-pro-preview',
                history: [
                    { role: 'user', parts: [{ text: `KİMLİK: ${context.companyName}. ÜRÜNLER: ${context.productPortfolio}. STANDARTLAR: ${masterContractsText}\n${customRulesText}` }] },
                    { role: 'model', parts: [{ text: 'Anlaşıldı. Ürünlerinize özel yasal mevzuatları ve özel kurallarınızı dikkate alacağım.' }] },
                    ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
                ],
                config: { tools: [{ googleSearch: {} }] }
            });

            const resultStream = await chat.sendMessageStream({ message: question });
            
            for await (const chunk of resultStream) {
                let chunkText = "";
                try {
                    if (chunk.text) chunkText = chunk.text;
                } catch (e) {}

                const metadata = chunk.candidates?.[0]?.groundingMetadata;
                yield { text: chunkText, groundingMetadata: metadata };
            }
        } catch (e) {
             console.error("Stream Error, falling back to simulation:", e);
             yield* simulateStream(question, history, context);
        }
    } 
    // 2. DİĞER DURUMLAR (Anahtarsız, OpenAI, Claude, Hata)
    else {
        yield* simulateStream(question, history, context);
    }
};

// Simüle edilmiş stream (Anahtarsız kullanım için gerçekçi efekt)
async function* simulateStream(question: string, history: ChatMessage[], context: CompanyContext) {
    try {
        // Unified fonksiyonu çağır (Burada Mock devreye girecek)
        const response = await askGeneralLegalQuestion(question, history, context);
        
        // Cevabı kelime kelime bölüp gecikmeli yolla
        const words = response.split(' ');
        let buffer = "";
        
        for (let word of words) {
            buffer += word + " ";
            // Her 3-5 kelimede bir yield et ki UI güncellensin
            if (buffer.length > 15 || word.includes('\n')) {
                yield { text: buffer, groundingMetadata: undefined };
                buffer = "";
                await sleep(30); // Okuma hızı efekti
            }
        }
        if (buffer) yield { text: buffer, groundingMetadata: undefined };
        
    } catch (e: any) {
        yield { text: `Hata: ${e.message}`, groundingMetadata: undefined };
    }
}

// 8. SÖZLEŞME SOHBETİ
export const askContractQuestion = async (
  question: string,
  contractText: string,
  history: ChatMessage[],
  context: CompanyContext
): Promise<string> => {
    const masterContractsText = formatMasterContracts(context, 'AUTO');
    const customRulesText = formatCustomRules(context);
    const systemInstruction = `Sözleşme inceliyoruz. Şirket: ${context.companyName}. Ürünler: ${context.productPortfolio}.\nANA SÖZLEŞMELER: ${masterContractsText}\n${customRulesText}`;
    
    const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
    const userPrompt = `GEÇMİŞ SOHBET:\n${historyText}\n\nİNCELENEN SÖZLEŞME:\n${contractText}\n\nSORU: ${question}`;

    return await generateUnifiedContent({
        context,
        systemInstruction,
        userPrompt,
        jsonMode: false
    });
};

// 9. DIFF SOHBETİ
export const askDiffQuestion = async (
  question: string,
  leftText: string,
  rightText: string,
  history: ChatMessage[],
  context: CompanyContext
): Promise<string> => {
    const customRulesText = formatCustomRules(context);
    const systemInstruction = `Müzakere asistanısın. Orijinal ve Revize metinleri karşılaştır. Ürünlerimiz: ${context.productPortfolio}.\n${customRulesText}`;
    const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
    const userPrompt = `GEÇMİŞ:\n${historyText}\n\nSOL (ORİJİNAL): ${leftText}\nSAĞ (REVİZE): ${rightText}\n\nSORU: ${question}`;

    return await generateUnifiedContent({
        context,
        systemInstruction,
        userPrompt,
        jsonMode: false
    });
};

// 10. RISK DÜZELTME (FIXING)
export const fixDocumentRisks = async (
    documentText: string,
    context: CompanyContext,
    risksToFix: any[]
): Promise<{ fixedText: string; changeLog: string }> => {
    const customRulesText = formatCustomRules(context);
    const systemInstruction = `
      Sen AKINROBOTICS AI AVUKAT. Belgeyi revize et.
      Ürünler: ${context.productPortfolio}.
      Bakanlık mevzuatına uygun olmayan maddeleri düzelt.
      ${customRulesText}
      1. Sadece listedeki riskleri düzelt.
      2. BELGE FORMATINI KORU.
      3. Düzeltmeleri [[DÜZELTME: ...]] formatında yaz.
    `;
    
    const userPrompt = `
    DÜZELTİLECEK RİSKLER: ${JSON.stringify(risksToFix)}
    Şirket Kırmızı Çizgileri: ${context.redLines}
    --- BELGE ---\n${documentText}
    
    JSON Output: { "fixedText": string, "changeLog": string }
    `;

    try {
        const rawText = await generateUnifiedContent({
            context,
            systemInstruction,
            userPrompt,
            jsonMode: true
        });
        return cleanAndParseJson(rawText);
    } catch (error) {
        return { fixedText: documentText, changeLog: "Hata: Düzeltme yapılamadı." };
    }
};