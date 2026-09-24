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

const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFilter
}).single('document');

const uploadImport = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: importFilter
}).single('file');

module.exports = {
  uploadDocument,
  uploadImport
};
