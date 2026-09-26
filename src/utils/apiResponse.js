class ApiResponse {
  constructor(statusCode = 200, arg2 = null, arg3 = null) {
    this.statusCode = typeof statusCode === 'number' ? statusCode : 200;
    this.success = this.statusCode < 400;

    if (typeof arg2 === 'string') {
      this.message = arg2;
      this.data = arg3;
    } else {
      this.data = arg2;
      this.message = typeof arg3 === 'string' ? arg3 : (this.success ? 'Success' : 'Error');
    }
  }

  send(res) {
    if (res && typeof res.status === 'function') {
      return res.status(this.statusCode).json({
        success: this.success,
        statusCode: this.statusCode,
        message: this.message,
        data: this.data
      });
    }
    return this;
  }

  static success(arg1, arg2, arg3 = 200) {
    // If called as ApiResponse.success(res, data, message)
    if (arg1 && typeof arg1.status === 'function') {
      const res = arg1;
      const data = arg2;
      const message = typeof arg3 === 'string' ? arg3 : 'Success';
      const statusCode = typeof arg3 === 'number' ? arg3 : 200;
      return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data
      });
    }

    // If called as ApiResponse.success(data, message, statusCode)
    const data = arg1;
    const message = typeof arg2 === 'string' ? arg2 : 'Success';
    const statusCode = typeof arg3 === 'number' ? arg3 : 200;
    return { success: true, statusCode, message, data };
  }

  static created(resOrData, dataOrMessage = null, messageOrStatusCode = 'Created') {
    if (resOrData && typeof resOrData.status === 'function') {
      return resOrData.status(201).json({
        success: true,
        statusCode: 201,
        message: typeof messageOrStatusCode === 'string' ? messageOrStatusCode : 'Created',
        data: dataOrMessage
      });
    }
    return { success: true, statusCode: 201, message: typeof dataOrMessage === 'string' ? dataOrMessage : 'Created', data: resOrData };
  }

  static unauthorized(resOrMessage, message = 'Unauthorized') {
    if (resOrMessage && typeof resOrMessage.status === 'function') {
      return resOrMessage.status(401).json({
        success: false,
        statusCode: 401,
        message: typeof message === 'string' ? message : 'Unauthorized'
      });
    }
    return { success: false, statusCode: 401, message: typeof resOrMessage === 'string' ? resOrMessage : 'Unauthorized' };
  }

  static error(message = 'Error', statusCode = 500, errors = null) {
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
