const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, GetObjectCommand: GetObj } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const StorageProvider = require('./storageProvider');

class S3StorageProvider extends StorageProvider {
  constructor() {
    super();
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.bucketName = process.env.S3_BUCKET_NAME;
    if (!this.bucketName) {
      console.warn('[S3StorageProvider] S3_BUCKET_NAME not set in environment');
    }
  }

  /**
   * Upload a file buffer to S3
   * @param {Buffer} buffer - File data
   * @param {string} fileName - Original file name
   * @param {string} contentType - MIME type
   * @param {object} metadata - { agencyId, customerId }
   * @returns {{ blobKey: string, blobUrl: string }}
   */
  async upload(buffer, fileName, contentType, metadata = {}) {
    const agencyId = metadata.agencyId || 'default';
    const customerId = metadata.customerId || 'general';
    const blobKey = `${agencyId}/${customerId}/${uuidv4()}-${fileName}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: blobKey,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        agencyId: String(agencyId),
        customerId: String(customerId),
        originalName: fileName
      }
    }));

    const blobUrl = `https://${this.bucketName}.s3.ap-south-1.amazonaws.com/${blobKey}`;
    return { blobKey, blobUrl };
  }

  /**
   * Download a file from S3 as Buffer
   * @param {string} blobKey - S3 object key
   * @returns {{ buffer: Buffer, contentType: string }}
   */
  async download(blobKey) {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucketName,
      Key: blobKey
    }));

    const buffer = await streamToBuffer(response.Body);
    return { buffer, contentType: response.ContentType };
  }

  /**
   * Delete a file from S3
   * @param {string} blobKey - S3 object key
   */
  async delete(blobKey) {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: blobKey
      }));
    } catch (err) {
      if (err.name !== 'NoSuchKey') throw err;
    }
  }

  /**
   * Generate a time-limited pre-signed URL for secure document download
   * @param {string} blobKey - S3 object key
   * @param {number} expiryMinutes - URL expiry duration
   * @returns {string} Pre-signed URL
   */
  async getSecureUrl(blobKey, expiryMinutes = 15) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: blobKey
    });

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiryMinutes * 60
    });

    return signedUrl;
  }
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

let instance;
function getStorageProvider() {
  if (!instance) instance = new S3StorageProvider();
  return instance;
}

module.exports = { S3StorageProvider, getStorageProvider };
