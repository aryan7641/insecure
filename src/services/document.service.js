const Document = require('../models/Document');
const Customer = require('../models/Customer');
const { getStorageProvider } = require('../providers/storage/azureBlobProvider');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const { NotFoundError, ValidationError } = require('../utils/apiError');
const { ACTIVITY_TYPES, DOCUMENT_CATEGORIES } = require('../utils/constants');

const upload = async (agencyId, data, file, user) => {
  const { customerId, category } = data;
  
  if (!customerId) throw new ValidationError('customerId is required');
  if (!category || !Object.values(DOCUMENT_CATEGORIES).includes(category)) {
    throw new ValidationError('Valid category is required');
  }

  const customer = await Customer.findOne({ _id: customerId, agencyId, isDeleted: false });
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  const storageProvider = getStorageProvider();
  const fileType = file.mimetype;
  const fileName = file.originalname;
  
  const uploadResult = await storageProvider.upload(file.buffer, fileName, fileType, {
    agencyId,
    customerId
  });

  const document = await Document.create({
    agencyId,
    customerId,
    category,
    fileName,
    fileType,
    fileSize: file.size,
    blobKey: uploadResult.blobKey,
    uploadedBy: user.userId
  });

  await activityService.logActivity({
    agencyId,
    type: ACTIVITY_TYPES.DOCUMENT_UPLOADED,
    customerId,
    documentId: document._id,
    userId: user.userId,
    description: `Uploaded document ${fileName}`
  });

  return document;
};

const list = async (agencyId, filters, pagination, user) => {
  const query = { agencyId, isDeleted: false };
  
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.category) query.category = filters.category;

  // Agent filter: if user is not admin, only show docs for their customers
  if (user.role !== 'admin') {
    const assignedCustomers = await Customer.find({ assignedAgent: user.userId, isDeleted: false }).select('_id');
    const customerIds = assignedCustomers.map(c => c._id);
    if (query.customerId && !customerIds.some(id => id.toString() === query.customerId)) {
      return { documents: [], total: 0 };
    }
    if (!query.customerId) {
      query.customerId = { $in: customerIds };
    }
  }

  const total = await Document.countDocuments(query);
  const documents = await Document.find(query)
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit)
    .populate('customerId', 'name');

  return { documents, total };
};

const getById = async (docId, agencyId) => {
  const document = await Document.findOne({ _id: docId, agencyId, isDeleted: false })
    .populate('customerId', 'name');
    
  if (!document) {
    throw new NotFoundError('Document not found');
  }
  return document;
};

const getDownloadUrl = async (docId, agencyId) => {
  const document = await getById(docId, agencyId);
  const storageProvider = getStorageProvider();
  const url = await storageProvider.getSecureUrl(document.blobKey);
  
  return {
    url,
    fileName: document.fileName,
    fileType: document.fileType
  };
};

const deleteDoc = async (docId, agencyId, user) => {
  const document = await getById(docId, agencyId);
  
  const storageProvider = getStorageProvider();
  await storageProvider.delete(document.blobKey);
  
  document.isDeleted = true;
  await document.save();

  await auditLogService.logAction(user.userId, agencyId, 'DOCUMENT_DELETED', 'Document', document._id, document.toObject(), null);

  await activityService.logActivity({
    agencyId,
    type: ACTIVITY_TYPES.DOCUMENT_DELETED,
    customerId: document.customerId,
    userId: user.userId,
    description: `Deleted document ${document.fileName}`
  });
};

module.exports = {
  upload,
  list,
  getById,
  getDownloadUrl,
  delete: deleteDoc
};
