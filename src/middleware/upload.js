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

module.exports = {
  uploadDocument,     // raw multer instance — use as uploadDocument.single('file')
  uploadImport,       // raw multer instance — use as uploadImport.single('file')
  uploadDocumentSingle, // pre-configured single middleware
  uploadImportSingle,   // pre-configured single middleware
};
