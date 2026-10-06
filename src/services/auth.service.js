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

  const apexAgency = await Agency.findOne({ name: 'Apex Wealth Partners' });
  const isApexUser = normalizedEmail === 'admin@apexwealth.in' || normalizedEmail === 'aryansharma7641@gmail.com' || normalizedEmail === 'priya@apexwealth.in';

  // If user doesn't exist, create one with dedicated agency
  if (!user) {
    const defaultName = normalizedEmail.split('@')[0].replace('.', ' ').toUpperCase();
    const assignedRole = role || (normalizedEmail.includes('admin') ? ROLES.ADMIN : ROLES.AGENT);

    let agency;
    if (isApexUser && apexAgency) {
      agency = apexAgency;
    } else {
      agency = await Agency.create({
        name: `${defaultName}'s Agency`,
        status: AGENCY_STATUS.ACTIVE,
        config: { theme: 'dark', currency: 'INR' }
      });
    }

    user = await User.create({
      name: defaultName,
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

    // Migrate non-apex user who was erroneously attached to Apex Wealth Partners due to legacy bug
    if (!isApexUser && apexAgency && user.activeAgencyId && user.activeAgencyId.toString() === apexAgency._id.toString()) {
      const newAgency = await Agency.create({
        name: `${user.name}'s Agency`,
        status: AGENCY_STATUS.ACTIVE,
        config: { theme: 'dark', currency: 'INR' },
        admins: [user._id]
      });
      await Agency.findByIdAndUpdate(apexAgency._id, {
        $pull: { admins: user._id, agents: user._id }
      });
      user.agencies = [{ agencyId: newAgency._id, role: ROLES.ADMIN }];
      user.activeAgencyId = newAgency._id;
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
  const googleId = profile.googleId || profile.id;
  const rawEmail = (profile.emails && profile.emails[0] ? profile.emails[0].value : (profile.email || '')).toLowerCase().trim();
  if (!rawEmail) {
    throw new AuthenticationError('Google profile does not contain an email');
  }

  const profileName = profile.displayName || profile.name || (profile.givenName ? `${profile.givenName} ${profile.familyName || ''}`.trim() : null) || rawEmail.split('@')[0];

  let user = null;
  if (googleId) {
    user = await User.findOne({ googleId });
  }
  if (!user) {
    user = await User.findOne({ email: rawEmail });
  }

  const apexAgency = await Agency.findOne({ name: 'Apex Wealth Partners' });
  const isApexUser = rawEmail === 'admin@apexwealth.in' || rawEmail === 'aryansharma7641@gmail.com' || rawEmail === 'priya@apexwealth.in';

  if (user) {
    user.lastLogin = new Date();
    if (googleId && !user.googleId) user.googleId = googleId;
    if (user.status !== USER_STATUS.ACTIVE) user.status = USER_STATUS.ACTIVE;

    // Update name from Google profile if user has placeholder or default
    if (profileName && (!user.name || user.name.toLowerCase() === rawEmail.split('@')[0].toLowerCase())) {
      user.name = profileName;
    }

    // Tenant Isolation Check:
    // If this is NOT an Apex Admin/Agent user, but is pointing to Apex Wealth Partners due to legacy bug, migrate them to their own dedicated agency!
    if (!isApexUser && apexAgency && user.activeAgencyId && user.activeAgencyId.toString() === apexAgency._id.toString()) {
      const newAgency = await Agency.create({
        name: `${user.name || profileName}'s Agency`,
        status: AGENCY_STATUS.ACTIVE,
        config: { theme: 'dark', currency: 'INR' },
        admins: [user._id]
      });
      // Remove user from Apex Wealth Partners admins/agents
      await Agency.findByIdAndUpdate(apexAgency._id, {
        $pull: { admins: user._id, agents: user._id }
      });
      user.agencies = [{ agencyId: newAgency._id, role: ROLES.ADMIN }];
      user.activeAgencyId = newAgency._id;
    } else if (!user.activeAgencyId || !user.agencies || user.agencies.length === 0) {
      // User has no agency at all
      if (isApexUser && apexAgency) {
        user.agencies = [{ agencyId: apexAgency._id, role: user.role || ROLES.ADMIN }];
        user.activeAgencyId = apexAgency._id;
      } else {
        const newAgency = await Agency.create({
          name: `${user.name || profileName}'s Agency`,
          status: AGENCY_STATUS.ACTIVE,
          config: { theme: 'dark', currency: 'INR' },
          admins: [user._id]
        });
        user.agencies = [{ agencyId: newAgency._id, role: ROLES.ADMIN }];
        user.activeAgencyId = newAgency._id;
      }
    }

    await user.save();
    return user;
  }

  // Brand NEW User!
  if (isApexUser && apexAgency) {
    // Designated seed admin
    const role = ROLES.ADMIN;
    user = await User.create({
      email: rawEmail,
      name: profileName,
      googleId,
      role,
      status: USER_STATUS.ACTIVE,
      agencies: [{ agencyId: apexAgency._id, role }],
      activeAgencyId: apexAgency._id,
      lastLogin: new Date()
    });
    await Agency.findByIdAndUpdate(apexAgency._id, { $addToSet: { admins: user._id } });
    return user;
  }

  // Create dedicated agency for the new user!
  const newAgency = await Agency.create({
    name: `${profileName}'s Agency`,
    status: AGENCY_STATUS.ACTIVE,
    config: { theme: 'dark', currency: 'INR' }
  });

  const role = ROLES.ADMIN;
  user = await User.create({
    email: rawEmail,
    name: profileName,
    googleId,
    role,
    status: USER_STATUS.ACTIVE,
    agencies: [{ agencyId: newAgency._id, role }],
    activeAgencyId: newAgency._id,
    lastLogin: new Date()
  });

  await Agency.findByIdAndUpdate(newAgency._id, { $set: { admins: [user._id] } });

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
