const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Import = require('../models/Import');
const Customer = require('../models/Customer');
const activityService = require('./activity.service');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/apiError');
const { IMPORT_STATUSES, IMPORT_TYPES, ACTIVITY_TYPES, DUPLICATE_ACTIONS } = require('../utils/constants');

const parseFile = async (agencyId, fileBuffer, fileName, importType, user) => {
  const extension = path.extname(fileName).toLowerCase();
  if (extension !== '.csv') {
    throw new ValidationError('Only CSV files are currently supported');
  }

  const importRecord = await Import.create({
    agencyId,
    type: importType,
    fileName,
    uploadedBy: user.userId,
    status: IMPORT_STATUSES.PARSING
  });

  const parsedData = [];
  const errors = [];
  const duplicates = [];

  return new Promise((resolve, reject) => {
    const stream = Readable.from(fileBuffer);
    let rowNum = 1;

    stream.pipe(csv())
      .on('data', (data) => {
        rowNum++;
        let isValid = true;
        
        // Basic validation depending on type
        if (importType === IMPORT_TYPES.CUSTOMER) {
          if (!data.name || !data.mobile) {
            errors.push({ row: rowNum, data, message: 'Name and mobile are required' });
            isValid = false;
          }
        } else if (importType === IMPORT_TYPES.INSURANCE) {
          if (!data.customer_mobile || !data.policy_number) {
            errors.push({ row: rowNum, data, message: 'Customer mobile and policy number are required' });
            isValid = false;
          }
        }
        
        if (isValid) {
          parsedData.push({ rowNum, data });
        }
      })
      .on('end', async () => {
        try {
          importRecord.parsedData = parsedData.map(p => p.data);
          importRecord.errors = errors;
          importRecord.duplicates = duplicates;
          importRecord.totalRows = parsedData.length + errors.length;
          importRecord.validRows = parsedData.length;
          importRecord.errorCount = errors.length;
          importRecord.duplicateCount = duplicates.length;
          importRecord.status = IMPORT_STATUSES.PREVIEW;
          
          await importRecord.save();
          
          const preview = await getPreview(importRecord._id, agencyId);
          resolve({ importId: importRecord._id, preview });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
};

const getPreview = async (importId, agencyId) => {
  const importRecord = await Import.findOne({ _id: importId, agencyId });
  if (!importRecord) throw new NotFoundError('Import not found');

  return {
    parsedData: importRecord.parsedData,
    errors: importRecord.errors,
    duplicates: importRecord.duplicates,
    totalRows: importRecord.totalRows,
    validRows: importRecord.validRows,
    errorCount: importRecord.errorCount,
    duplicateCount: importRecord.duplicateCount
  };
};

const setResolutions = async (importId, agencyId, resolutions) => {
  const importRecord = await Import.findOne({ _id: importId, agencyId });
  if (!importRecord) throw new NotFoundError('Import not found');

  importRecord.resolutions = resolutions;
  await importRecord.save();
  return importRecord;
};

const executeImport = async (importId, agencyId, user) => {
  const importRecord = await Import.findOne({ _id: importId, agencyId });
  if (!importRecord) throw new NotFoundError('Import not found');
  if (importRecord.status !== IMPORT_STATUSES.PREVIEW) {
    throw new ConflictError('Import is not in PREVIEW status');
  }

  importRecord.status = IMPORT_STATUSES.IMPORTING;
  await importRecord.save();

  try {
    let successCount = 0;
    let failedCount = 0;

    // Process in batches (simplified for this implementation)
    for (const row of importRecord.parsedData) {
      try {
        if (importRecord.type === IMPORT_TYPES.CUSTOMER) {
          await Customer.create({
            agencyId,
            name: row.name,
            mobile: row.mobile,
            email: row.email,
            pan: row.pan,
            aadhaar: row.aadhaar
          });
        }
        successCount++;
      } catch (err) {
        importRecord.errors.push({ data: row, message: err.message });
        failedCount++;
      }
    }

    importRecord.successCount = successCount;
    importRecord.errorCount += failedCount;
    importRecord.status = IMPORT_STATUSES.COMPLETED;
    await importRecord.save();

    await activityService.logActivity({
      agencyId,
      type: ACTIVITY_TYPES.IMPORT_COMPLETED,
      userId: user.userId,
      description: `Completed import of ${importRecord.fileName} with ${successCount} successes`
    });

    return { successCount, errorCount: importRecord.errorCount };
  } catch (error) {
    importRecord.status = IMPORT_STATUSES.FAILED;
    await importRecord.save();
    throw error;
  }
};

const getStatus = async (importId, agencyId) => {
  const importRecord = await Import.findOne({ _id: importId, agencyId });
  if (!importRecord) throw new NotFoundError('Import not found');

  return {
    status: importRecord.status,
    totalRows: importRecord.totalRows,
    successCount: importRecord.successCount,
    errorCount: importRecord.errorCount,
    duplicateCount: importRecord.duplicateCount
  };
};

const getErrorReport = async (importId, agencyId) => {
  const importRecord = await Import.findOne({ _id: importId, agencyId });
  if (!importRecord) throw new NotFoundError('Import not found');
  return importRecord.errors;
};

const getTemplate = (type) => {
  const templateMap = {
    [IMPORT_TYPES.CUSTOMER]: 'customer_import_template.csv',
    [IMPORT_TYPES.INSURANCE]: 'insurance_import_template.csv',
    [IMPORT_TYPES.MUTUAL_FUND]: 'mutualfund_import_template.csv',
    [IMPORT_TYPES.SIP]: 'sip_import_template.csv',
    [IMPORT_TYPES.TRANSACTION]: 'transaction_import_template.csv',
    [IMPORT_TYPES.NAV]: 'nav_import_template.csv',
  };
  
  const fileName = templateMap[type];
  if (!fileName) throw new ValidationError('Invalid import type');
  
  return path.join(__dirname, '..', 'templates', fileName);
};

const listImports = async (agencyId, query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  
  const total = await Import.countDocuments({ agencyId });
  const imports = await Import.find({ agencyId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
    
  return {
    imports,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
};

module.exports = {
  parseFile,
  getPreview,
  setResolutions,
  executeImport,
  getStatus,
  getErrorReport,
  getTemplate,
  listImports
};
