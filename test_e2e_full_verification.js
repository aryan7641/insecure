const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./src/config');
const ocrService = require('./src/services/ocr.service');
const insurancePolicyService = require('./src/services/insurancePolicy.service');
const commissionService = require('./src/services/commission.service');
const Agency = require('./src/models/Agency');
const User = require('./src/models/User');
const Customer = require('./src/models/Customer');
const InsurancePolicy = require('./src/models/InsurancePolicy');
const PolicyCommission = require('./src/models/PolicyCommission');
const Document = require('./src/models/Document');

async function runVerification() {
  console.log('Connecting to MongoDB at:', config.mongoUri);
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB successfully.');

  let agency = await Agency.findOne();
  if (!agency) {
    agency = await Agency.create({ name: 'Verification Test Agency' });
  }
  const agencyId = agency._id.toString();

  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      name: 'Test Agent',
      email: 'agent@test.com',
      role: 'admin'
    });
  }
  const authUser = { userId: user._id.toString(), role: user.role };

  console.log(`Using Agency ID: ${agencyId}, User ID: ${authUser.userId}`);

  // Clean up any test records for the sample policy numbers to ensure clean state
  const testPolicyNums = ['34020131260160358036', '7330359466', 'MANUAL-TEST-POL-9999'];
  await InsurancePolicy.deleteMany({ agencyId, policyNumber: { $in: testPolicyNums } });
  await Customer.deleteMany({ agencyId, mobile: { $in: ['9887885994', '9829012345', '9999988888'] } });

  // =========================================================================
  // TEST 1: MOTOR PDF EXTRACTION & CREATION WITH COMMISSION
  // =========================================================================
  console.log('\n--- TEST 1: Motor PDF Extraction & Confirmation (with Commission) ---');
  const motorPdfPath = path.join(__dirname, 'fixtures', 'motor.pdf');
  if (!fs.existsSync(motorPdfPath)) {
    throw new Error(`Motor PDF not found at ${motorPdfPath}`);
  }
  const motorBuffer = fs.readFileSync(motorPdfPath);
  const motorFile = {
    buffer: motorBuffer,
    originalname: 'motor.pdf',
    mimetype: 'application/pdf',
    size: motorBuffer.length
  };

  const motorExtracted = await ocrService.extractPolicyPdf(agencyId, motorFile, authUser);
  console.log('Motor Extracted Data:');
  console.log('- Insurer:', motorExtracted.extractedData?.policy?.insuranceCompany?.value);
  console.log('- Policy Number:', motorExtracted.extractedData?.policy?.policyNumber?.value);
  console.log('- Customer Name:', motorExtracted.extractedData?.customer?.name?.value);
  console.log('- Gender:', motorExtracted.extractedData?.customer?.gender?.value);
  console.log('- Address:', motorExtracted.extractedData?.customer?.address?.value);
  console.log('- Registration:', motorExtracted.extractedData?.motor?.registrationNumber?.value);

  if (motorExtracted.extractedData?.customer?.gender?.value !== 'Male') {
    throw new Error(`Expected Gender 'Male' from Mr. Paras Kumawat, got: ${motorExtracted.extractedData?.customer?.gender?.value}`);
  }
  if (motorExtracted.extractedData?.customer?.address?.value?.includes('\n')) {
    throw new Error(`Address contains line break: ${motorExtracted.extractedData?.customer?.address?.value}`);
  }

  // Confirm Policy with Commission
  const motorConfirmPayload = {
    customerAction: 'create_new',
    customerData: {
      name: motorExtracted.extractedData.customer.name.value,
      mobile: motorExtracted.extractedData.customer.mobile?.value || '9887885994',
      email: motorExtracted.extractedData.customer.email?.value || 'paras@example.com',
      gender: motorExtracted.extractedData.customer.gender?.value,
      address: motorExtracted.extractedData.customer.address?.value,
      customerType: 'Individual'
    },
    policyData: {
      policyNumber: motorExtracted.extractedData.policy.policyNumber.value,
      insuranceCompany: motorExtracted.extractedData.policy.insuranceCompany?.value,
      businessType: 'New',
      insuranceType: 'Motor',
      insuranceSubtype: 'car',
      premium: motorExtracted.extractedData.premium?.finalPremium?.value || 5800,
      netPremium: motorExtracted.extractedData.premium?.netPremium?.value || 4900,
      basicPremium: motorExtracted.extractedData.premium?.basicPremium?.value || 4900,
      startDate: motorExtracted.extractedData.policy.startDate?.value,
      endDate: motorExtracted.extractedData.policy.endDate?.value
    },
    commissionData: {
      commissionType: 'percentage',
      rate: 15,
      commissionBasis: 'net_premium'
    },
    subtype: 'car',
    insuranceSubtype: 'car'
  };

  const motorResult = await ocrService.confirmPolicyFromOcr(agencyId, motorExtracted.documentId, motorConfirmPayload, authUser);
  console.log('✓ Motor Policy Confirmed Successfully! Policy ID:', motorResult.policy._id);
  console.log('✓ Customer ID:', motorResult.customer._id, '| Customer Gender:', motorResult.customer.gender);
  if (motorResult.customer.gender !== 'male') {
    throw new Error(`Customer gender in DB should be 'male', got: ${motorResult.customer.gender}`);
  }

  const motorComm = await PolicyCommission.findOne({ policyId: motorResult.policy._id });
  console.log('✓ Commission Saved in DB:', motorComm ? `Amount: ₹${motorComm.commissionAmount} (${motorComm.commissionPercentage}%)` : 'None');
  if (!motorComm) throw new Error('Expected commission record to be created');

  // =========================================================================
  // TEST 2: HEALTH PDF EXTRACTION & CREATION WITHOUT COMMISSION (NON-BLOCKING)
  // =========================================================================
  console.log('\n--- TEST 2: Health PDF Extraction & Confirmation (Without Commission) ---');
  const healthPdfPath = path.join(__dirname, 'fixtures', 'health-ins.pdf');
  if (!fs.existsSync(healthPdfPath)) {
    throw new Error(`Health PDF not found at ${healthPdfPath}`);
  }
  const healthBuffer = fs.readFileSync(healthPdfPath);
  const healthFile = {
    buffer: healthBuffer,
    originalname: 'health-ins.pdf',
    mimetype: 'application/pdf',
    size: healthBuffer.length
  };

  const healthExtracted = await ocrService.extractPolicyPdf(agencyId, healthFile, authUser);
  console.log('Health Extracted Data:');
  console.log('- Insurer:', healthExtracted.extractedData?.policy?.insuranceCompany?.value);
  console.log('- Policy Number:', healthExtracted.extractedData?.policy?.policyNumber?.value);
  console.log('- Customer Name:', healthExtracted.extractedData?.customer?.name?.value);
  console.log('- Gender:', healthExtracted.extractedData?.customer?.gender?.value);
  console.log('- Address:', healthExtracted.extractedData?.customer?.address?.value);

  if (healthExtracted.extractedData?.customer?.gender?.value !== 'Male') {
    throw new Error(`Expected Gender 'Male' from Mr. Kamal Sharma, got: ${healthExtracted.extractedData?.customer?.gender?.value}`);
  }

  // Confirm Health Policy WITHOUT commission (empty)
  const healthConfirmPayload = {
    customerAction: 'create_new',
    customerData: {
      name: healthExtracted.extractedData.customer.name.value,
      mobile: healthExtracted.extractedData.customer.mobile?.value || '9829012345',
      email: healthExtracted.extractedData.customer.email?.value || 'kamal@example.com',
      gender: healthExtracted.extractedData.customer.gender?.value,
      address: healthExtracted.extractedData.customer.address?.value,
      customerType: 'Individual'
    },
    policyData: {
      policyNumber: healthExtracted.extractedData.policy.policyNumber.value,
      insuranceCompany: healthExtracted.extractedData.policy.insuranceCompany?.value,
      businessType: 'New',
      insuranceType: 'Health',
      insuranceSubtype: 'individual_health',
      premium: healthExtracted.extractedData.premium?.finalPremium?.value || 12000,
      sumAssured: healthExtracted.extractedData.coverage?.sumInsured?.value || 500000,
      startDate: healthExtracted.extractedData.policy.startDate?.value,
      endDate: healthExtracted.extractedData.policy.endDate?.value
    },
    subtype: 'individual_health',
    insuranceSubtype: 'individual_health'
    // commissionData intentionally omitted
  };

  const healthResult = await ocrService.confirmPolicyFromOcr(agencyId, healthExtracted.documentId, healthConfirmPayload, authUser);
  console.log('✓ Health Policy Confirmed Successfully! Policy ID:', healthResult.policy._id);
  console.log('✓ Customer ID:', healthResult.customer._id, '| Customer Gender:', healthResult.customer.gender);

  // =========================================================================
  // TEST 3: DUPLICATE POLICY DETECTION
  // =========================================================================
  console.log('\n--- TEST 3: Duplicate Policy Detection ---');
  let duplicateCaught = false;
  try {
    await ocrService.confirmPolicyFromOcr(agencyId, healthExtracted.documentId, healthConfirmPayload, authUser);
  } catch (err) {
    if (err.statusCode === 409 || err.message.includes('already exists')) {
      duplicateCaught = true;
      console.log('✓ Duplicate policy correctly rejected with 409 Conflict:', err.message);
    } else {
      throw err;
    }
  }
  if (!duplicateCaught) {
    throw new Error('Duplicate policy was not rejected!');
  }

  // =========================================================================
  // TEST 4: MANUAL POLICY CREATION
  // =========================================================================
  console.log('\n--- TEST 4: Manual Policy Creation ---');
  const manualCustomer = await Customer.create({
    agencyId,
    assignedAgentId: authUser.userId,
    name: 'Manual Customer',
    mobile: '9999988888',
    gender: 'female',
    customerType: 'individual',
    createdBy: authUser.userId
  });

  const manualPolicy = await insurancePolicyService.create(agencyId, {
    customerId: manualCustomer._id,
    insuranceCompany: 'HDFC ERGO General Insurance',
    policyNumber: 'MANUAL-TEST-POL-9999',
    insuranceType: 'motor',
    insuranceSubtype: 'car',
    businessType: 'renewal',
    premium: 15000,
    netPremium: 12500,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365*24*3600*1000)
  }, authUser);
  console.log('✓ Manual Policy Created Successfully! Policy ID:', manualPolicy._id);

  console.log('\n============================================================');
  console.log('ALL E2E INTEGRATION & REGRESSION VERIFICATIONS PASSED 100%!');
  console.log('============================================================\n');

  await mongoose.disconnect();
}

runVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
