const OcrProvider = require('./ocrProvider');

class MockOcrProvider extends OcrProvider {
  async extractFields(buffer, fileType, documentCategory) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      fields: {},
      confidence: {},
      rawText: 'Mock OCR - no provider configured'
    };
  }
}

let instance;
function getOcrProvider() {
  if (!instance) instance = new MockOcrProvider();
  return instance;
}

module.exports = { MockOcrProvider, getOcrProvider };
