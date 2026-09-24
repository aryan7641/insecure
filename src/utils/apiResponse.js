class ApiResponse {
  static success(data, message = 'Success', statusCode = 200) {
    return { success: true, statusCode, message, data };
  }
  static error(message, statusCode = 500, errors = null) {
    return { success: false, statusCode, message, errors };
  }
  static paginated(data, pagination, message = 'Success') {
    return { success: true, statusCode: 200, message, data, pagination };
  }
}

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { ApiResponse, catchAsync };
