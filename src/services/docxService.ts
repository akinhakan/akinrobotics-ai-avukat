import { Document, Packer, Paragraph, TextRun } from "docx";

// Native Tarayıcı İndirme Fonksiyonu
const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const generateAndDownloadDocx = async (text: string, filename: string = "Hukuki_Belge.docx") => {
    // 1. Metni satırlara böl (Her satır bir paragraf olacak)
    const lines = text.split('\n');

    const docChildren = lines.map(line => {
        // Boş satırsa boş paragraf dön
        if (!line.trim()) {
            return new Paragraph({ children: [] });
        }

        // 2. Satır içindeki [[ETİKET: ...]] kısımlarını regex ile parçala
        // Regex: ([[...]]) yakalar
        const parts = line.split(/(\[\[.*?\]\])/g);

        const runs = parts.map(part => {
            // Etiket içeriğini temizle (köşeli parantezleri at)
            const contentRaw = part.replace(/^\[\[/, '').replace(/\]\]$/, '');

            // A) DÜZELTME ETİKETİ (Kırmızı)
            // Regex: /^\s*DÜZELTME\s*:/i -> Case insensitive, boşluk toleranslı
            if (/^\s*DÜZELTME\s*:/i.test(contentRaw) && part.startsWith('[[')) {
                const content = contentRaw.replace(/^\s*DÜZELTME\s*:/i, '').trim();
                return new TextRun({
                    text: content, // İçeriği temizle
                    color: "FF0000", // Kırmızı
                    size: 24, // 12pt
                });
            }
            // B) DOLUM ETİKETİ (Mavi)
            else if (/^\s*DOLUM\s*:/i.test(contentRaw) && part.startsWith('[[')) {
                const content = contentRaw.replace(/^\s*DOLUM\s*:/i, '').trim();
                return new TextRun({
                    text: content, // İçeriği temizle
                    color: "0000FF", // Mavi
                    size: 24, // 12pt
                });
            }
            // C) NORMAL METİN
            else {
                return new TextRun({
                    text: part,
                    size: 24, // 12pt
                });
            }
        });

        return new Paragraph({
            children: runs,
            spacing: {
                after: 120, // Paragraf sonrası boşluk
            }
        });
    });

    // 3. Document oluştur
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: docChildren,
            },
        ],
    });

    // 4. Blob oluştur ve indir
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
};