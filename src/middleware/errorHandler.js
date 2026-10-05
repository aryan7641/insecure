const { AppError } = require('../utils/apiError');
const config = require('../config');

const errorHandler = (err, req, res, next) => {
  if (config.env === 'development') {
    console.error(err);
  } else {
    console.error({ message: err.message, stack: err.stack });
  }

  let statusCode = 500;
  let response = { success: false, message: 'Internal server error' };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response = { success: false, message: err.message, errors: err.errors };
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errorList = Object.values(err.errors || {});
    const errors = errorList.map(e => ({ field: e.path, message: e.message }));
    const firstMsg = errorList.length > 0 ? errorList[0].message : 'Validation failed';
    response = { success: false, message: firstMsg, errors };
  } else if (err.name === 'CastError') {
    statusCode = 400;
    response = { success: false, message: `Invalid ID format for ${err.path || 'field'}` };
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'record';
    const val = err.keyValue ? err.keyValue[field] : '';
    response = { success: false, message: `A record with ${field} "${val || ''}" already exists in this agency.`, code: 'DUPLICATE_ENTRY', field };
  } else if (config.env === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
