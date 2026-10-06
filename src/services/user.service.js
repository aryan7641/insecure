const User = require('../models/User');
const { NotFoundError, AuthorizationError } = require('../utils/apiError');
const { ROLES } = require('../utils/constants');

exports.listUsers = async (agencyId) => {
  return User.find({ 'agencies.agencyId': agencyId }).select('-__v');
};

exports.getUserById = async (userId, requestingUser) => {
  const user = await User.findById(userId).select('-__v');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (requestingUser) {
    const isSelf = user._id.toString() === requestingUser.userId.toString();
    const isSuperAdmin = requestingUser.role === ROLES.SUPER_ADMIN;

    if (!isSelf && !isSuperAdmin) {
      const requestingAgencies = (requestingUser.agencies || []).map(a => (a.agencyId?._id || a.agencyId).toString());
      const targetAgencies = (user.agencies || []).map(a => (a.agencyId?._id || a.agencyId).toString());
      const hasSharedAgency = requestingAgencies.some(id => targetAgencies.includes(id));

      if (!(requestingUser.role === ROLES.ADMIN && hasSharedAgency)) {
        throw new AuthorizationError('Not authorized to view this user');
      }
    }
  }

  return user;
};

exports.updateUser = async (userId, data, requestingUser) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isSelf = user._id.toString() === requestingUser.userId.toString();
  const isSuperAdmin = requestingUser.role === ROLES.SUPER_ADMIN;

  const requestingAgencies = (requestingUser.agencies || []).map(a => (a.agencyId?._id || a.agencyId).toString());
  const targetAgencies = (user.agencies || []).map(a => (a.agencyId?._id || a.agencyId).toString());
  const hasSharedAgency = requestingAgencies.some(id => targetAgencies.includes(id));

  // Only self, super_admin, or admin of a shared agency can update
  if (!isSelf && !isSuperAdmin && !(requestingUser.role === ROLES.ADMIN && hasSharedAgency)) {
    throw new AuthorizationError('Not authorized to update this user');
  }

  const updateData = {};
  if (data.name) updateData.name = data.name;
  
  // Only admins can update roles (super_admin or admin in same agency)
  if (data.role && (isSuperAdmin || (requestingUser.role === ROLES.ADMIN && hasSharedAgency))) {
    updateData.role = data.role;
  }

  Object.assign(user, updateData);
  await user.save();
  
  return user;
};
