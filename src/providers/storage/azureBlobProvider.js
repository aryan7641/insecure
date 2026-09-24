const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const StorageProvider = require('./storageProvider');

class AzureBlobProvider extends StorageProvider {
  constructor() {
    super();
    this.blobServiceClient = BlobServiceClient.fromConnectionString(config.azure.connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(config.azure.containerName);
    // Extract account name and key from connection string for SAS generation
    const connParts = {};
    config.azure.connectionString.split(';').forEach(part => {
      const [key, ...vals] = part.split('=');
      if (key && vals.length) connParts[key.trim()] = vals.join('=');
    });
    this.accountName = connParts['AccountName'] || '';
    this.accountKey = connParts['AccountKey'] || '';
  }

  async upload(buffer, fileName, contentType, metadata = {}) {
    const blobKey = `${metadata.agencyId}/${metadata.customerId}/${uuidv4()}-${fileName}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobKey);
    await blockBlobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
    return { blobKey, blobUrl: blockBlobClient.url };
  }

  async download(blobKey) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobKey);
    const downloadBlockBlobResponse = await blockBlobClient.download();
    const buffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    return { buffer, contentType: downloadBlockBlobResponse.contentType };
  }

  async delete(blobKey) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobKey);
    try {
      await blockBlobClient.delete();
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

  async getSecureUrl(blobKey, expiryMinutes = 15) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobKey);
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setMinutes(startDate.getMinutes() + expiryMinutes);

    if (!this.accountName || !this.accountKey) {
      // Fallback: return the blob URL directly (not recommended for production)
      return blockBlobClient.url;
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey
    );

    const sasOptions = {
      containerName: this.containerClient.containerName,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: startDate,
      expiresOn: expiryDate,
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `${blockBlobClient.url}?${sasToken}`;
  }
}

// Helper to convert stream to buffer
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

let instance;
function getStorageProvider() {
  if (!instance) instance = new AzureBlobProvider();
  return instance;
}

module.exports = { AzureBlobProvider, getStorageProvider };
