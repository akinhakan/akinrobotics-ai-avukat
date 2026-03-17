import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Exports a contract text to a professional Word document (.docx)
 */
export const exportToWord = async (title: string, content: string, fileName: string = 'sozlesme') => {
  // Split content by paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim() !== '');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          }),
          
          // Content Paragraphs
          ...paragraphs.map(p => {
            // Check if it looks like a clause title (e.g., "MADDE 1:", "1.")
            const isClauseTitle = /^(MADDE|ARTICLE|BÖLÜM|SECTION)\s+\d+/i.test(p) || /^\d+\./.test(p);
            
            return new Paragraph({
              children: [
                new TextRun({
                  text: p,
                  bold: isClauseTitle,
                  size: 24, // 12pt
                  font: 'Times New Roman',
                }),
              ],
              spacing: {
                before: 200,
                after: 200,
                line: 360, // 1.5 line spacing
              },
              alignment: AlignmentType.JUSTIFIED,
            });
          }),

          // Footer-like info
          new Paragraph({
            children: [
              new TextRun({
                text: `\n\nOluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
                italics: true,
                size: 18,
              }),
              new TextRun({
                text: '\nAKINROBOTICS AI Avukat Sistemi tarafından hazırlanmıştır.',
                italics: true,
                size: 18,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  });

  // Generate and save the file
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};

/**
 * Exports a contract analysis report to a professional Word document (.docx)
 */
export const exportAnalysisToWord = async (result: any, fileName: string = 'analiz_raporu') => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'SÖZLEŞME ANALİZ VE RİSK RAPORU',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Summary
          new Paragraph({
            children: [
              new TextRun({ text: 'YÖNETİCİ ÖZETİ', bold: true, size: 28 }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: result.summary,
            spacing: { after: 400 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          // Risk Score
          new Paragraph({
            children: [
              new TextRun({ text: `TOPLAM RİSK PUANI: ${result.riskScore}/100`, bold: true, color: result.riskScore > 50 ? 'FF0000' : '008000' }),
            ],
            spacing: { after: 400 },
          }),

          // Risks
          new Paragraph({
            children: [
              new TextRun({ text: 'TESPİT EDİLEN RİSKLER VE ÖNERİLER', bold: true, size: 28 }),
            ],
            spacing: { before: 400, after: 200 },
          }),

          ...result.risks.flatMap((risk: any, idx: number) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. ${risk.description}`, bold: true, size: 24 }),
                new TextRun({ text: ` (${risk.severity === 'High' ? 'KRİTİK' : risk.severity === 'Medium' ? 'ORTA' : 'DÜŞÜK'})`, italics: true, color: risk.severity === 'High' ? 'FF0000' : '000000' }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'ÖNERİ: ', bold: true }),
                new TextRun({ text: risk.suggestion }),
              ],
              spacing: { after: 200 },
              indent: { left: 720 },
            })
          ]),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: `\n\nAnaliz Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
                italics: true,
                size: 18,
              }),
              new TextRun({
                text: '\nAKINROBOTICS AI Avukat Sistemi tarafından otomatik olarak oluşturulmuştur.',
                italics: true,
                size: 18,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};
