class ApiResponse {
  constructor(statusCode = 200, message = 'Success', data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data
    });
  }

  static success(resOrData, messageOrData = 'Success', statusCode = 200) {
    if (resOrData && typeof resOrData.status === 'function') {
      return resOrData.status(statusCode).json({
        success: true,
        statusCode,
        message: typeof messageOrData === 'string' ? messageOrData : 'Success',
        data: typeof messageOrData === 'object' ? messageOrData : undefined
      });
    }
    return { success: true, statusCode, message: messageOrData, data: resOrData };
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
