let pdfModule;
try {
  pdfModule = require('pdf-parse');
} catch (e) {
  console.warn('[pdfTextExtractor] pdf-parse module not loaded:', e.message);
}

class PdfTextExtractor {
  /**
   * Extract raw text from a document buffer
   * @param {Buffer} buffer 
   * @param {string} fileType 
   * @returns {Promise<{ rawText: string, pageCount: number, info: object }>}
   */
  async extractText(buffer, fileType = 'pdf') {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Valid file buffer is required for text extraction');
    }

    if (fileType.toLowerCase().includes('pdf') && pdfModule) {
      try {
        // Support v2 class-based PDFParse
        if (pdfModule.PDFParse) {
          const parser = new pdfModule.PDFParse({ data: buffer });
          await parser.load();
          const textResult = await parser.getText();
          return {
            rawText: textResult.text || '',
            pageCount: textResult.total || 1,
            info: {}
          };
        }
        
        // Support v1 function-based pdfParse
        if (typeof pdfModule === 'function') {
          const data = await pdfModule(buffer);
          return {
            rawText: data.text || '',
            pageCount: data.numpages || 1,
            info: data.info || {}
          };
        }
      } catch (err) {
        console.warn('[PdfTextExtractor] Failed to parse PDF text with pdf-parse:', err.message);
      }
    }

    // Fallback: UTF-8 inspection
    const rawText = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    return {
      rawText,
      pageCount: 1,
      info: {}
    };
  }
}

let instance;
function getPdfTextExtractor() {
  if (!instance) instance = new PdfTextExtractor();
  return instance;
}

module.exports = {
  PdfTextExtractor,
  getPdfTextExtractor
};
