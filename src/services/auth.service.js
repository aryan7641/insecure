const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { AuthenticationError, AuthorizationError, NotFoundError } = require('../utils/apiError');
const Agency = require('../models/Agency');
const { USER_STATUS, ROLES, AGENCY_STATUS } = require('../utils/constants');

exports.login = async ({ email, password, role }) => {
  if (!email) {
    throw new AuthenticationError('Email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail }).populate('agencies.agencyId', 'name status');

  // If user doesn't exist, create or seed one with default agency
  if (!user) {
    let agency = await Agency.findOne();
    if (!agency) {
      agency = await Agency.create({
        name: 'Apex Wealth Partners',
        status: AGENCY_STATUS.ACTIVE
      });
    }

    const assignedRole = role || (normalizedEmail.includes('admin') ? ROLES.ADMIN : ROLES.AGENT);
    user = await User.create({
      name: normalizedEmail.split('@')[0].replace('.', ' ').toUpperCase(),
      email: normalizedEmail,
      role: assignedRole,
      status: USER_STATUS.ACTIVE,
      agencies: [{ agencyId: agency._id, role: assignedRole }],
      activeAgencyId: agency._id,
      lastLogin: new Date()
    });

    if (assignedRole === ROLES.ADMIN) {
      await Agency.findByIdAndUpdate(agency._id, { $addToSet: { admins: user._id } });
    } else {
      await Agency.findByIdAndUpdate(agency._id, { $addToSet: { agents: user._id } });
    }

    user = await User.findById(user._id).populate('agencies.agencyId', 'name status');
  } else {
    user.lastLogin = new Date();
    if (user.status !== USER_STATUS.ACTIVE) {
      user.status = USER_STATUS.ACTIVE;
    }
    await user.save();
  }

  const accessToken = exports.generateAccessToken(user);
  const refreshToken = exports.generateRefreshToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      agencies: user.agencies,
      activeAgencyId: user.activeAgencyId
    },
    accessToken,
    refreshToken
  };
};

exports.handleGoogleAuth = async (profile) => {
  const email = (profile.emails && profile.emails[0] ? profile.emails[0].value : (profile.email || '')).toLowerCase().trim();
  if (!email) {
    throw new AuthenticationError('Google profile does not contain an email');
  }

  let user = await User.findOne({ email });

  if (user) {
    user.lastLogin = new Date();
    if (profile.id && !user.googleId) user.googleId = profile.id;
    if (user.status !== USER_STATUS.ACTIVE) user.status = USER_STATUS.ACTIVE;

    // Ensure user has an active agency
    if (!user.activeAgencyId || !user.agencies || user.agencies.length === 0) {
      let agency = await Agency.findOne();
      if (!agency) {
        agency = await Agency.create({ name: 'Apex Wealth Partners', status: AGENCY_STATUS.ACTIVE });
      }
      user.agencies = [{ agencyId: agency._id, role: user.role || ROLES.ADMIN }];
      user.activeAgencyId = agency._id;
    }
    await user.save();
    return user;
  }

  let agency = await Agency.findOne();
  if (!agency) {
    agency = await Agency.create({
      name: 'Apex Wealth Partners',
      status: AGENCY_STATUS.ACTIVE
    });
  }

  const role = ROLES.ADMIN;
  user = await User.create({
    email,
    name: profile.displayName || profile.name || email.split('@')[0],
    googleId: profile.id,
    role,
    status: USER_STATUS.ACTIVE,
    agencies: [{ agencyId: agency._id, role }],
    activeAgencyId: agency._id,
    lastLogin: new Date()
  });

  await Agency.findByIdAndUpdate(agency._id, { $addToSet: { admins: user._id } });

  return user;
};

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry }
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiry }
  );
};

exports.refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new AuthenticationError('User account is not active');
    }

    return exports.generateAccessToken(user);
  } catch (err) {
    throw new AuthenticationError('Invalid refresh token');
  }
};

exports.switchAgency = async (userId, agencyId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const belongsToAgency = user.agencies.some(
    agency => agency.agencyId.toString() === agencyId.toString()
  );

  if (!belongsToAgency) {
    throw new AuthorizationError('User does not belong to this agency');
  }

  user.activeAgencyId = agencyId;
  await user.save();
  return user;
};

exports.getUserById = async (userId) => {
  const user = await User.findById(userId).populate('agencies.agencyId', 'name status');
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};
