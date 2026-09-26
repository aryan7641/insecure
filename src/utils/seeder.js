const mongoose = require('mongoose');
const User = require('../models/User');
const Agency = require('../models/Agency');
const Customer = require('../models/Customer');
const { ROLES, USER_STATUS, AGENCY_STATUS } = require('./constants');

async function seedDatabaseIfEmpty() {
  try {
    // Drop old non-sparse googleId index if it exists in users collection
    try {
      await User.collection.dropIndex('googleId_1');
      console.log('[Seeder] Dropped legacy non-sparse googleId_1 index');
    } catch (e) {
      // index didn't exist or already dropped
    }

    const agencyCount = await Agency.countDocuments();
    let agency;

    if (agencyCount === 0) {
      agency = await Agency.create({
        name: 'Apex Wealth Partners',
        status: AGENCY_STATUS.ACTIVE,
        config: { theme: 'dark', currency: 'INR' }
      });
      console.log('[Seeder] Created default agency:', agency.name, agency._id);
    } else {
      agency = await Agency.findOne();
    }

    // Check or create admin user
    let adminUser = await User.findOne({ email: 'admin@apexwealth.in' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Aryan Sharma (Admin)',
        email: 'admin@apexwealth.in',
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        agencies: [{ agencyId: agency._id, role: ROLES.ADMIN }],
        activeAgencyId: agency._id
      });
      console.log('[Seeder] Created admin user:', adminUser.email, adminUser._id);
    }

    // Check or create agent user
    let agentUser = await User.findOne({ email: 'priya@apexwealth.in' });
    if (!agentUser) {
      agentUser = await User.create({
        name: 'Priya Sundaram',
        email: 'priya@apexwealth.in',
        role: ROLES.AGENT,
        status: USER_STATUS.ACTIVE,
        agencies: [{ agencyId: agency._id, role: ROLES.AGENT }],
        activeAgencyId: agency._id
      });
      console.log('[Seeder] Created agent user:', agentUser.email, agentUser._id);
    }

    // Ensure agency contains admin and agent in its arrays
    await Agency.findByIdAndUpdate(agency._id, {
      $addToSet: { admins: adminUser._id, agents: agentUser._id }
    });

    // Check or create sample customers if customer count is 0
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      const sampleCustomers = [
        {
          agencyId: agency._id,
          assignedAgentId: agentUser._id,
          name: 'Vikramaditya Roy',
          mobile: '9820198201',
          email: 'vikram.roy@example.com',
          pan: 'ABCDE1234F',
          aadhaar: '123456789012',
          occupation: 'VP of Technology',
          income: 4500000,
          address: { street: '402, Sea Green Apartments, Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
          nominee: { name: 'Ananya Roy', relation: 'Spouse' },
          createdBy: adminUser._id
        },
        {
          agencyId: agency._id,
          assignedAgentId: agentUser._id,
          name: 'Sunita Mehra',
          mobile: '9811223344',
          email: 'sunita.mehra@example.com',
          pan: 'BLPPM4421K',
          aadhaar: '987654321098',
          occupation: 'Chief Medical Officer',
          income: 3800000,
          address: { street: '14, Golf Links', city: 'New Delhi', state: 'Delhi', pincode: '110003' },
          nominee: { name: 'Dr. Rajesh Mehra', relation: 'Spouse' },
          createdBy: adminUser._id
        },
        {
          agencyId: agency._id,
          assignedAgentId: adminUser._id,
          name: 'Rohan Deshmukh',
          mobile: '9765432100',
          email: 'rohan.deshmukh@example.com',
          pan: 'CRRPD9876Q',
          aadhaar: '456789012345',
          occupation: 'Managing Director',
          income: 7500000,
          address: { street: 'Penthouse 8, Koregaon Park', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
          nominee: { name: 'Pooja Deshmukh', relation: 'Spouse' },
          createdBy: adminUser._id
        }
      ];

      await Customer.insertMany(sampleCustomers);
      console.log('[Seeder] Inserted sample customers:', sampleCustomers.length);
    }
  } catch (err) {
    console.error('[Seeder] Error seeding database:', err.message);
  }
}

module.exports = { seedDatabaseIfEmpty };
