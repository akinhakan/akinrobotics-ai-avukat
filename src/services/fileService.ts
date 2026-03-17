import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

// PDF.js import yapısı
let pdfjs: any = pdfjsLib;
if (pdfjs.default) {
    pdfjs = pdfjs.default;
}

// Worker ayarı - GÜVENLİ BAŞLATMA
const globalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions || pdfjs.GlobalWorkerOptions;
if (globalWorkerOptions) {
    try {
        // Belirli bir versiyon CDN'den çekiliyor. Eğer bu versiyon değişirse veya CDN düşerse
        // uygulamanın geri kalanı etkilenmesin diye bu kısım izole edilmeli.
        globalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    } catch (e) {
        console.warn("PDF Worker ayarlanırken hata oluştu. PDF okuma çalışmayabilir:", e);
    }
}

/**
 * Dosya tipini algılar ve uygun ayrıştırıcıyı kullanarak metni döndürür.
 * Desteklenen formatlar: .txt, .md, .json, .docx, .pdf, .png, .jpg, .jpeg
 */
export const readDocumentContent = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'docx') {
      return await readDocx(file);
    } else if (extension === 'pdf') {
      return await readPdf(file);
    } else if (['png', 'jpg', 'jpeg', 'bmp', 'webp'].includes(extension || '')) {
      return await readImageOCR(file);
    } else {
      return await readPlainText(file);
    }
  } catch (error) {
    console.error("Dosya okuma hatası:", error);
    throw new Error(`Dosya okunamadı: ${error.message}`);
  }
};

const readPlainText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const readDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const mammothLib = (mammoth as any).default || mammoth;
        const result = await mammothLib.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

// Resimden Metin Okuma (OCR)
const readImageOCR = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
             try {
                 const { data: { text } } = await Tesseract.recognize(
                     e.target?.result as string,
                     'tur', // Türkçe dili
                     { 
                         logger: m => console.log(m) // İlerleme logları
                     }
                 );
                 resolve(text);
             } catch (err) {
                 reject(err);
             }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
};

const readPdf = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        if (!pdfjs.getDocument) {
             throw new Error("PDF.js kütüphanesi düzgün yüklenemedi.");
        }

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        let isScanned = true; // Varsayım: Taranmış belge

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          if (textContent.items.length > 0) {
              isScanned = false; // Metin katmanı varsa taranmış değildir
          }

          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }

        // Eğer metin çok kısaysa ve sayfa sayısı varsa, muhtemelen taranmış PDF'tir.
        if (isScanned && fullText.trim().length < 50) {
            resolve("[UYARI: Bu belge taranmış bir resim gibi görünüyor. Lütfen resmi .JPG/.PNG formatında yükleyin veya metin içeren bir PDF kullanın.]");
        } else {
            resolve(fullText);
        }
      } catch (err) {
        console.error("PDF İşleme Hatası:", err);
        reject(new Error(err.message || "PDF işlenirken hata oluştu."));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};