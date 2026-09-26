const mongoose = require('mongoose');
const User = require('../models/User');
const Agency = require('../models/Agency');
const Customer = require('../models/Customer');
const InsurancePolicy = require('../models/InsurancePolicy');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const FollowUp = require('../models/FollowUp');
const { ROLES, USER_STATUS, AGENCY_STATUS, POLICY_TYPES, POLICY_STATUSES, FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } = require('./constants');

async function seedDatabaseIfEmpty() {
  try {
    // Drop old non-sparse googleId index if it exists in users collection
    try {
      await User.collection.dropIndex('googleId_1');
      console.log('[Seeder] Dropped legacy non-sparse googleId_1 index');
    } catch (e) {}

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
        name: 'Aryan Sharma',
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

    // Seed Indian Insurance WhatsApp Templates if empty
    const templateCount = await WhatsAppTemplate.countDocuments({ agencyId: agency._id });
    if (templateCount === 0) {
      const templates = [
        {
          agencyId: agency._id,
          name: 'Policy Renewal Reminder',
          body: 'Dear {{customerName}}, your {{insuranceCompany}} policy (No. {{policyNumber}}) of ₹{{premium}} is due for renewal on {{renewalDate}}. Please renew now to maintain uninterrupted coverage: {{paymentLink}}. Contact {{agentName}} at {{agentContact}} for help.',
          variables: ['customerName', 'insuranceCompany', 'policyNumber', 'premium', 'renewalDate', 'paymentLink', 'agentName', 'agentContact'],
          isAgencyWide: true,
          createdBy: adminUser._id
        },
        {
          agencyId: agency._id,
          name: 'Motor Insurance Renewal Notice',
          body: 'Hi {{customerName}}, your motor insurance for {{vehicleNumber}} ({{vehicleModel}}) with {{insuranceCompany}} is expiring on {{renewalDate}}. Claim NCB discount of {{ncb}}%. Click here to renew instantly: {{paymentLink}} or call {{agentName}}.',
          variables: ['customerName', 'vehicleNumber', 'vehicleModel', 'insuranceCompany', 'renewalDate', 'ncb', 'paymentLink', 'agentName'],
          isAgencyWide: true,
          createdBy: adminUser._id
        },
        {
          agencyId: agency._id,
          name: 'Health Insurance Due Reminder',
          body: 'Dear {{customerName}}, a friendly reminder that your Health Insurance plan with {{insuranceCompany}} (Sum Insured: ₹{{sumAssured}}) renews on {{renewalDate}}. Premium amount: ₹{{premium}}. Stay protected without waiting period breaks: {{paymentLink}}.',
          variables: ['customerName', 'insuranceCompany', 'sumAssured', 'renewalDate', 'premium', 'paymentLink'],
          isAgencyWide: true,
          createdBy: adminUser._id
        },
        {
          agencyId: agency._id,
          name: 'Welcome & Policy Document Dispatch',
          body: 'Dear {{customerName}}, thank you for choosing Apex Wealth Partners! Attached is your official policy schedule for {{insuranceCompany}} (Policy #{{policyNumber}}). We are here 24/7 for any claims or servicing queries.',
          variables: ['customerName', 'insuranceCompany', 'policyNumber'],
          isAgencyWide: true,
          createdBy: adminUser._id
        }
      ];
      await WhatsAppTemplate.insertMany(templates);
      console.log('[Seeder] Seeded insurance WhatsApp templates');
    }

    // Seed sample policies if empty
    const policyCount = await InsurancePolicy.countDocuments({ agencyId: agency._id });
    if (policyCount === 0) {
      const customer = await Customer.findOne({ agencyId: agency._id });
      if (customer) {
        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 25);

        const in10Days = new Date();
        in10Days.setDate(in10Days.getDate() + 8);

        const policies = [
          {
            agencyId: agency._id,
            customerId: customer._id,
            assignedAgentId: agentUser._id,
            insuranceCompany: 'HDFC ERGO General Insurance',
            productName: 'Optima Secure Health Plan',
            planName: 'Family Floater',
            policyNumber: 'HDFC-HE-998822',
            policyType: POLICY_TYPES.HEALTH,
            lob: 'HEALTH',
            subLob: 'Family Floater',
            businessType: 'renewal',
            startDate: new Date('2025-10-15'),
            endDate: in30Days,
            renewalDate: in30Days,
            sumAssured: 1000000,
            basicPremium: 23728,
            gst: 4272,
            premium: 28000,
            premiumFrequency: 'yearly',
            status: POLICY_STATUSES.EXPIRING_SOON,
            insuredMembers: [
              { name: customer.name, relationship: 'Self', age: 38, sumInsured: 1000000 },
              { name: 'Ananya Roy', relationship: 'Spouse', age: 35, sumInsured: 1000000 }
            ],
            createdBy: adminUser._id
          },
          {
            agencyId: agency._id,
            customerId: customer._id,
            assignedAgentId: agentUser._id,
            insuranceCompany: 'ICICI Lombard General Insurance',
            productName: 'Private Car Comprehensive',
            planName: 'Zero Depreciation + RSA',
            policyNumber: 'ICICI-MOT-774411',
            policyType: POLICY_TYPES.MOTOR,
            lob: 'MOTOR',
            subLob: 'Private Car Comprehensive',
            businessType: 'new',
            startDate: new Date('2025-10-01'),
            endDate: in10Days,
            renewalDate: in10Days,
            sumAssured: 850000,
            basicPremium: 14500,
            gst: 2610,
            premium: 17110,
            premiumFrequency: 'yearly',
            status: POLICY_STATUSES.EXPIRING_SOON,
            vehicleDetails: {
              registrationNumber: 'MH02EK4921',
              vehicleType: 'Private Car',
              make: 'Hyundai',
              model: 'Creta',
              variant: 'SX (O) 1.5 Petrol',
              fuelType: 'Petrol',
              manufacturingYear: 2022,
              idv: 850000,
              ncb: 25
            },
            createdBy: adminUser._id
          },
          {
            agencyId: agency._id,
            customerId: customer._id,
            assignedAgentId: adminUser._id,
            insuranceCompany: 'Tata AIA Life Insurance',
            productName: 'Sampoorna Raksha Supreme',
            planName: 'Pure Term with Life Stage Option',
            policyNumber: 'TATA-LIFE-552299',
            policyType: POLICY_TYPES.TERM,
            lob: 'LIFE',
            subLob: 'Pure Term Life',
            businessType: 'new',
            startDate: new Date('2024-03-10'),
            endDate: new Date('2054-03-10'),
            renewalDate: new Date('2027-03-10'),
            sumAssured: 20000000,
            basicPremium: 22000,
            gst: 3960,
            premium: 25960,
            premiumFrequency: 'yearly',
            status: POLICY_STATUSES.ACTIVE,
            createdBy: adminUser._id
          }
        ];
        await InsurancePolicy.insertMany(policies);
        console.log('[Seeder] Seeded sample insurance policies');
      }
    }
  } catch (err) {
    console.error('[Seeder] Error seeding database:', err.message);
  }
}

module.exports = { seedDatabaseIfEmpty };
