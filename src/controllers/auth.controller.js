const { catchAsync, ApiResponse } = require('../utils/apiResponse');
const authService = require('../services/auth.service');
const config = require('../config');

exports.login = catchAsync(async (req, res) => {
  const { email, password, role } = req.body;
  const result = await authService.login({ email, password, role });
  
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return new ApiResponse(200, 'Login successful', result).send(res);
});

exports.googleCallback = catchAsync(async (req, res) => {
  const user = await authService.handleGoogleAuth(req.user);
  
  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Redirect to frontend with access token in query param or set in cookie
  res.redirect(`${config.frontendUrl}/auth/callback?accessToken=${accessToken}`);
});

exports.refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return ApiResponse.unauthorized(res, 'Refresh token not found');
  }

  const accessToken = await authService.refreshAccessToken(token);
  return ApiResponse.success(res, { accessToken }, 'Token refreshed successfully');
});

exports.logout = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  return ApiResponse.success(res, null, 'Logged out successfully');
});

exports.getMe = catchAsync(async (req, res) => {
  const user = await authService.getUserById(req.user.userId);
  return ApiResponse.success(res, { user }, 'User retrieved successfully');
});

exports.switchAgency = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const user = await authService.switchAgency(req.user.userId, agencyId);
  return ApiResponse.success(res, { user }, 'Agency switched successfully');
});
