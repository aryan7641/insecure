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
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    response = { success: false, message: 'Validation failed', errors };
  } else if (err.name === 'CastError') {
    statusCode = 400;
    response = { success: false, message: 'Invalid ID format' };
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    response = { success: false, message: `Duplicate value for field: ${field}` };
  } else if (config.env === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
