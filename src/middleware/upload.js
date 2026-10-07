const multer = require('multer');
const { AppError } = require('../utils/apiError');

class FileProcessingError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

const storage = multer.memoryStorage();

const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileProcessingError('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
  }
};

const importFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'text/csv', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileProcessingError('Invalid file type. Only CSV and Excel files are allowed.'));
  }
};

const uploadDocumentSingle = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFilter
}).single('document');

const uploadImportSingle = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: importFilter
}).single('file');

// Raw multer instances (so routes can call .single() themselves)
const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: documentFilter
});

const uploadImport = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: importFilter
});

const uploadPolicyDocumentSingle = (req, res, next) => {
  const upload = multer({
    storage,
    limits: { fileSize: (parseInt(process.env.MAX_POLICY_DOCUMENT_SIZE_MB, 10) || 15) * 1024 * 1024 },
    fileFilter: documentFilter
  }).fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]);

  upload(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = (req.files.file && req.files.file[0]) || (req.files.document && req.files.document[0]) || null;
    }
    next();
  });
};

module.exports = {
  uploadDocument,     // raw multer instance — use as uploadDocument.single('file')
  uploadImport,       // raw multer instance — use as uploadImport.single('file')
  uploadDocumentSingle, // pre-configured single middleware
  uploadImportSingle,   // pre-configured single middleware
  uploadPolicyDocumentSingle
};
