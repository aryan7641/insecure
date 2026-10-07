const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const policyDocumentService = require('../services/policyDocument.service');

exports.uploadDocument = catchAsync(async (req, res) => {
  const { policyId } = req.params;
  const documentType = req.body.documentType || req.body.type;
  
  const document = await policyDocumentService.uploadPolicyDocument({
    agencyId: req.agencyId,
    policyId,
    documentType,
    file: req.file,
    user: req.user
  });

  return ApiResponse.created(res, { document }, 'Policy document uploaded successfully');
});

exports.listDocuments = catchAsync(async (req, res) => {
  const { policyId } = req.params;
  const includeHistory = req.query.includeHistory === 'true' || req.query.all === 'true';

  const documents = await policyDocumentService.getPolicyDocuments({
    agencyId: req.agencyId,
    policyId,
    user: req.user,
    includeHistory
  });

  return ApiResponse.success(res, { documents }, 'Policy documents retrieved successfully');
});

exports.getDocumentById = catchAsync(async (req, res) => {
  const { policyId, documentId } = req.params;

  const document = await policyDocumentService.getPolicyDocumentById({
    agencyId: req.agencyId,
    policyId,
    documentId,
    user: req.user
  });

  return ApiResponse.success(res, { document }, 'Policy document retrieved successfully');
});

exports.getDownloadUrl = catchAsync(async (req, res) => {
  const { policyId, documentId } = req.params;
  const inline = req.query.inline === 'true' || req.query.view === 'true';

  const result = await policyDocumentService.getPolicyDocumentDownload({
    agencyId: req.agencyId,
    policyId,
    documentId,
    user: req.user,
    inline
  });

  if (req.query.redirect === 'true') {
    return res.redirect(result.presignedUrl);
  }

  return ApiResponse.success(res, {
    downloadUrl: result.presignedUrl,
    document: result.document
  }, 'Authorized document URL generated successfully');
});

exports.streamDocument = catchAsync(async (req, res) => {
  const { policyId, documentId } = req.params;
  const inline = req.query.inline === 'true';

  const { buffer, contentType, filename } = await policyDocumentService.streamPolicyDocument({
    agencyId: req.agencyId,
    policyId,
    documentId,
    user: req.user
  });

  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(filename)}"`
  );
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  return res.send(buffer);
});

exports.deleteDocument = catchAsync(async (req, res) => {
  const { policyId, documentId } = req.params;

  const result = await policyDocumentService.deletePolicyDocument({
    agencyId: req.agencyId,
    policyId,
    documentId,
    user: req.user
  });

  return ApiResponse.success(res, result, 'Policy document archived successfully');
});
