const { BlobServiceClient } = require('@azure/storage-blob');
const config = require('./index');

let containerClient = null;

const getContainerClient = () => {
  if (containerClient) return containerClient;
  
  if (!config.azure.connectionString) {
    console.warn('Azure Storage Connection String is missing. File uploads may fail.');
    return null;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(config.azure.connectionString);
  containerClient = blobServiceClient.getContainerClient(config.azure.containerName);
  return containerClient;
};

module.exports = {
  getContainerClient
};
