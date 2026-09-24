const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const userService = require('../services/user.service');

exports.listUsers = catchAsync(async (req, res) => {
  const users = await userService.listUsers(req.agencyId);
  return ApiResponse.success(res, { users }, 'Users retrieved successfully');
});

exports.getUserById = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  return ApiResponse.success(res, { user }, 'User retrieved successfully');
});

exports.updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUser(req.params.userId, req.body, req.user);
  return ApiResponse.success(res, { user }, 'User updated successfully');
});
