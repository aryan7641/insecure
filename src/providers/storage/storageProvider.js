class StorageProvider {
  async upload(buffer, fileName, contentType, metadata = {}) {
    throw new Error('upload() must be implemented');
  }
  async download(blobKey) {
    throw new Error('download() must be implemented');
  }
  async delete(blobKey) {
    throw new Error('delete() must be implemented');
  }
  async getSecureUrl(blobKey, expiryMinutes = 15) {
    throw new Error('getSecureUrl() must be implemented');
  }
}
module.exports = StorageProvider;
