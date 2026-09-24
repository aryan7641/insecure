const Agency = require('../models/Agency');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { NotFoundError, ConflictError, AuthorizationError } = require('../utils/apiError');
const { ROLES, USER_STATUS, AGENCY_STATUS } = require('../utils/constants');

exports.createAgency = async (data, userId) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const agency = await Agency.create({
    ...data,
    admins: [userId],
    status: AGENCY_STATUS.ACTIVE
  });

  user.agencies.push({
    agencyId: agency._id,
    role: ROLES.ADMIN
  });

  if (!user.activeAgencyId) {
    user.activeAgencyId = agency._id;
  }
  
  if (user.role !== ROLES.ADMIN) {
    user.role = ROLES.ADMIN;
  }

  await user.save();
  return agency;
};

exports.getUserAgencies = async (userId) => {
  return Agency.find({
    $or: [{ admins: userId }, { agents: userId }]
  });
};

exports.getAgencyById = async (agencyId, userId) => {
  const agency = await Agency.findById(agencyId)
    .populate('admins', 'name email status')
    .populate('agents', 'name email status');

  if (!agency) throw new NotFoundError('Agency not found');

  const isMember = agency.admins.some(admin => admin._id.toString() === userId.toString()) ||
                   agency.agents.some(agent => agent._id.toString() === userId.toString());

  if (!isMember) {
    throw new AuthorizationError('Not authorized to access this agency');
  }

  return agency;
};

exports.updateAgency = async (agencyId, data) => {
  const agency = await Agency.findByIdAndUpdate(agencyId, data, { new: true });
  if (!agency) throw new NotFoundError('Agency not found');
  return agency;
};

exports.addAgent = async (agencyId, agentData) => {
  const { email, name } = agentData;
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name,
      status: USER_STATUS.ACTIVE,
      role: ROLES.AGENT
    });
  }

  const agency = await Agency.findById(agencyId);
  if (!agency) throw new NotFoundError('Agency not found');

  if (agency.agents.includes(user._id) || agency.admins.includes(user._id)) {
    throw new ConflictError('User is already a member of this agency');
  }

  agency.agents.push(user._id);
  await agency.save();

  user.agencies.push({
    agencyId,
    role: ROLES.AGENT
  });
  
  user.status = USER_STATUS.ACTIVE;
  if (!user.activeAgencyId) {
    user.activeAgencyId = agencyId;
  }

  await user.save();
  return user;
};

exports.removeAgent = async (agencyId, userId) => {
  const customerCount = await Customer.countDocuments({ 
    agencyId, 
    assignedAgentId: userId, 
    isDeleted: { $ne: true } 
  });

  if (customerCount > 0) {
    throw new ConflictError(`Cannot remove agent. Agent has ${customerCount} assigned customers that must be reassigned first.`);
  }

  const agency = await Agency.findById(agencyId);
  if (!agency) throw new NotFoundError('Agency not found');

  agency.agents = agency.agents.filter(id => id.toString() !== userId.toString());
  await agency.save();

  const user = await User.findById(userId);
  if (user) {
    user.agencies = user.agencies.filter(a => a.agencyId.toString() !== agencyId.toString());
    if (user.activeAgencyId && user.activeAgencyId.toString() === agencyId.toString()) {
      user.activeAgencyId = user.agencies.length > 0 ? user.agencies[0].agencyId : null;
    }
    await user.save();
  }
};

exports.addAdmin = async (agencyId, adminData) => {
  const { email, name } = adminData;
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name,
      status: USER_STATUS.ACTIVE,
      role: ROLES.ADMIN
    });
  } else {
    if (user.role !== ROLES.ADMIN) {
      user.role = ROLES.ADMIN;
    }
  }

  const agency = await Agency.findById(agencyId);
  if (!agency) throw new NotFoundError('Agency not found');

  if (agency.admins.includes(user._id) || agency.agents.includes(user._id)) {
    throw new ConflictError('User is already a member of this agency');
  }

  agency.admins.push(user._id);
  await agency.save();

  user.agencies.push({
    agencyId,
    role: ROLES.ADMIN
  });
  
  user.status = USER_STATUS.ACTIVE;
  if (!user.activeAgencyId) {
    user.activeAgencyId = agencyId;
  }

  await user.save();
  return user;
};

exports.getAgencyMembers = async (agencyId) => {
  const agency = await Agency.findById(agencyId)
    .populate('admins', 'name email role status')
    .populate('agents', 'name email role status');
    
  if (!agency) throw new NotFoundError('Agency not found');
  
  return {
    admins: agency.admins,
    agents: agency.agents
  };
};
