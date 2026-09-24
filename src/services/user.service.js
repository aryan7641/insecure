const User = require('../models/User');
const { NotFoundError, AuthorizationError } = require('../utils/apiError');
const { ROLES } = require('../utils/constants');

exports.listUsers = async (agencyId) => {
  return User.find({ 'agencies.agencyId': agencyId }).select('-__v');
};

exports.getUserById = async (userId) => {
  const user = await User.findById(userId).select('-__v');
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

exports.updateUser = async (userId, data, requestingUser) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Only users can update themselves, or admins can update others
  if (user._id.toString() !== requestingUser.userId.toString() && requestingUser.role !== ROLES.ADMIN) {
    throw new AuthorizationError('Not authorized to update this user');
  }

  const updateData = {};
  if (data.name) updateData.name = data.name;
  
  // Only admins can update roles
  if (data.role && requestingUser.role === ROLES.ADMIN) {
    updateData.role = data.role;
  }

  Object.assign(user, updateData);
  await user.save();
  
  return user;
};
