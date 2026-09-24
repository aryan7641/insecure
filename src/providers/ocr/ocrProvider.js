class OcrProvider {
  async extractFields(buffer, fileType, documentCategory) {
    throw new Error('extractFields() must be implemented');
  }
}
module.exports = OcrProvider;
