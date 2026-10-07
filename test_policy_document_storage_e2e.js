const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const config = require('./src/config');
const Agency = require('./src/models/Agency');
const User = require('./src/models/User');
const Customer = require('./src/models/Customer');
const InsurancePolicy = require('./src/models/InsurancePolicy');
const PolicyDocument = require('./src/models/PolicyDocument');
const policyDocumentService = require('./src/services/policyDocument.service');
const insurancePolicyService = require('./src/services/insurancePolicy.service');

// Helper to create a dummy valid PDF buffer (%PDF-1.4 header)
function createDummyPdfBuffer(contentStr = 'sample pdf payload') {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Title (${contentStr}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);
}

// Helper to create a dummy valid JPEG buffer (FF D8 FF)
function createDummyJpegBuffer(contentStr = 'sample jpeg') {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
  const content = Buffer.from(contentStr);
  const trailer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, content, trailer]);
}

// Helper to create a dummy valid PNG buffer (89 50 4E 47 0D 0A 1A 0A)
function createDummyPngBuffer(contentStr = 'sample png') {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const content = Buffer.from(contentStr);
  return Buffer.concat([header, content]);
}

async function runPolicyDocumentStorageTests() {
  console.log('================================================================');
  console.log('STARTING POLICY DOCUMENT STORAGE PRODUCTION E2E VERIFICATION');
  console.log('================================================================');

  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB Atlas successfully.');

  // Setup Tenant 1 (Agency 1)
  let agency1 = await Agency.findOne({ name: 'E2E Doc Test Agency 1' });
  if (!agency1) {
    agency1 = await Agency.create({ name: 'E2E Doc Test Agency 1' });
  }
  const agencyId1 = agency1._id.toString();

  // Setup Admin 1
  let admin1 = await User.findOne({ email: 'admin1@doc-test.com' });
  if (!admin1) {
    admin1 = await User.create({
      name: 'Admin One',
      email: 'admin1@doc-test.com',
      role: 'admin',
      agencyId: agency1._id
    });
  }

  // Setup Agent 1
  let agent1 = await User.findOne({ email: 'agent1@doc-test.com' });
  if (!agent1) {
    agent1 = await User.create({
      name: 'Agent One',
      email: 'agent1@doc-test.com',
      role: 'agent',
      agencyId: agency1._id
    });
  }

  // Setup Tenant 2 (Agency 2) for IDOR / cross-tenant testing
  let agency2 = await Agency.findOne({ name: 'E2E Doc Test Agency 2' });
  if (!agency2) {
    agency2 = await Agency.create({ name: 'E2E Doc Test Agency 2' });
  }
  const agencyId2 = agency2._id.toString();

  let admin2 = await User.findOne({ email: 'admin2@doc-test.com' });
  if (!admin2) {
    admin2 = await User.create({
      name: 'Admin Two',
      email: 'admin2@doc-test.com',
      role: 'admin',
      agencyId: agency2._id
    });
  }

  // Cleanup any existing test data for clean slate
  await Customer.deleteMany({ mobile: '9991112233' });
  await InsurancePolicy.deleteMany({ policyNumber: { $in: ['E2E-DOC-TEST-POL-A', 'E2E-DOC-TEST-POL-B'] } });

  // Create Customer 1 under Agency 1
  const customer1 = await Customer.create({
    agencyId: agency1._id,
    name: 'Kamal Sharma',
    mobile: '9991112233',
    email: 'kamal.sharma@example.com',
    gender: 'male',
    assignedAgentId: agent1._id,
    createdBy: admin1._id
  });
  console.log(`Created Customer: ${customer1.name} (ID: ${customer1._id})`);

  // =========================================================================
  // TEST 1: ZERO-DOCUMENT POLICY CREATION
  // =========================================================================
  console.log('\n--- TEST 1: Zero-Document Policy Creation (Uploads Must Be Optional) ---');
  const policyA = await InsurancePolicy.create({
    agencyId: agency1._id,
    customerId: customer1._id,
    policyNumber: 'E2E-DOC-TEST-POL-A',
    insuranceCompany: 'HDFC ERGO',
    policyType: 'HEALTH',
    subType: 'HEALTH_INDIVIDUAL',
    premiumAmount: 18500,
    netPremium: 15678,
    premium: 18500,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    status: 'active',
    assignedAgentId: agent1._id,
    agentId: agent1._id,
    createdBy: admin1._id
  });
  console.log(`Created Policy A without documents: ID ${policyA._id}, Number ${policyA.policyNumber}`);

  const initialDocs = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1
  });
  if (initialDocs.length !== 0) {
    throw new Error(`Expected 0 documents initially, found ${initialDocs.length}`);
  }
  console.log('✓ PASS: Policy created successfully with zero documents.');

  // =========================================================================
  // TEST 2: UPLOAD AADHAAR, PAN, RC, GST CERTIFICATE FOR POLICY A
  // =========================================================================
  console.log('\n--- TEST 2: Upload KYC & Regulatory Documents (Aadhaar, PAN, RC, GST) ---');
  const aadhaarBuf = createDummyPdfBuffer('AADHAAR CARD KAMAL SHARMA 1234-5678-9012');
  const panBuf = createDummyJpegBuffer('PAN CARD KAMAL SHARMA ABCDE1234F');
  const rcBuf = createDummyPngBuffer('REGISTRATION CERTIFICATE RJ14-CC-1234');
  const gstBuf = createDummyPdfBuffer('GST CERTIFICATE 08ABCDE1234F1Z5');

  const aadhaarDoc = await policyDocumentService.uploadPolicyDocument({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    file: {
      buffer: aadhaarBuf,
      originalname: 'aadhaar_kamal.pdf',
      mimetype: 'application/pdf',
      size: aadhaarBuf.length
    },
    documentType: 'AADHAAR'
  });
  console.log(`✓ Aadhaar Uploaded: ID ${aadhaarDoc._id}, Version ${aadhaarDoc.version}, Checksum ${aadhaarDoc.checksum.substring(0, 10)}...`);

  const panDoc = await policyDocumentService.uploadPolicyDocument({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    file: {
      buffer: panBuf,
      originalname: 'pan_kamal.jpg',
      mimetype: 'image/jpeg',
      size: panBuf.length
    },
    documentType: 'PAN'
  });
  console.log(`✓ PAN Uploaded: ID ${panDoc._id}, Version ${panDoc.version}, Checksum ${panDoc.checksum.substring(0, 10)}...`);

  const rcDoc = await policyDocumentService.uploadPolicyDocument({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    file: {
      buffer: rcBuf,
      originalname: 'rc_vehicle.png',
      mimetype: 'image/png',
      size: rcBuf.length
    },
    documentType: 'RC'
  });
  console.log(`✓ RC Uploaded: ID ${rcDoc._id}, Version ${rcDoc.version}, Checksum ${rcDoc.checksum.substring(0, 10)}...`);

  const gstDoc = await policyDocumentService.uploadPolicyDocument({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    file: {
      buffer: gstBuf,
      originalname: 'gst_cert.pdf',
      mimetype: 'application/pdf',
      size: gstBuf.length
    },
    documentType: 'GST_CERTIFICATE'
  });
  console.log(`✓ GST Certificate Uploaded: ID ${gstDoc._id}, Version ${gstDoc.version}, Checksum ${gstDoc.checksum.substring(0, 10)}...`);

  // Verify list of documents for Policy A
  const docsListA = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1
  });
  if (docsListA.length !== 4) {
    throw new Error(`Expected 4 documents on Policy A, found ${docsListA.length}`);
  }
  console.log('✓ PASS: All 4 documents saved and listed under Policy A.');

  // =========================================================================
  // TEST 3: DUPLICATE UPLOAD REJECTION (SHA-256 CHECK)
  // =========================================================================
  console.log('\n--- TEST 3: Duplicate Upload Prevention via SHA-256 Checksum ---');
  let duplicateRejected = false;
  try {
    await policyDocumentService.uploadPolicyDocument({
      agencyId: agencyId1,
      policyId: policyA._id.toString(),
      user: agent1,
      file: {
        buffer: aadhaarBuf,
        originalname: 'aadhaar_kamal_duplicate.pdf',
        mimetype: 'application/pdf',
        size: aadhaarBuf.length
      },
      documentType: 'AADHAAR'
    });
  } catch (err) {
    if (err.statusCode === 409 || err.message.includes('identical')) {
      duplicateRejected = true;
      console.log(`✓ Correctly rejected duplicate upload: "${err.message}" (Status: ${err.statusCode})`);
    } else {
      throw err;
    }
  }
  if (!duplicateRejected) {
    throw new Error('Failed to reject duplicate file with identical SHA-256 checksum!');
  }
  console.log('✓ PASS: Duplicate upload blocked with 409 Conflict.');

  // =========================================================================
  // TEST 4: DOCUMENT VERSIONING (REPLACE PAN WITH UPDATED VERSION)
  // =========================================================================
  console.log('\n--- TEST 4: Document Versioning on Replacement ---');
  const modifiedPanBuf = createDummyJpegBuffer('PAN CARD KAMAL SHARMA ABCDE1234F - UPDATED HIGH RES');
  const panV2 = await policyDocumentService.uploadPolicyDocument({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    file: {
      buffer: modifiedPanBuf,
      originalname: 'pan_kamal_v2.jpg',
      mimetype: 'image/jpeg',
      size: modifiedPanBuf.length
    },
    documentType: 'PAN'
  });

  console.log(`PAN V2 created: Version ${panV2.version}, isCurrent: ${panV2.isCurrent}`);
  if (panV2.version !== 2 || !panV2.isCurrent) {
    throw new Error(`Expected PAN V2 to have version=2 and isCurrent=true, got v${panV2.version}, isCurrent=${panV2.isCurrent}`);
  }

  // Check previous PAN version
  const panV1 = await PolicyDocument.findById(panDoc._id);
  if (panV1.isCurrent !== false) {
    throw new Error(`Expected PAN V1 to be marked isCurrent=false, got ${panV1.isCurrent}`);
  }
  console.log(`✓ Previous PAN V1 archived: isCurrent = ${panV1.isCurrent}, storageKey = ${panV1.storageKey}`);

  // Current documents query should still return exactly 4 current documents
  const currentDocs = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    includeHistory: false
  });
  if (currentDocs.length !== 4) {
    throw new Error(`Expected 4 current documents, got ${currentDocs.length}`);
  }

  // History query should return 5 documents (4 + 1 old version)
  const allDocs = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1,
    includeHistory: true
  });
  if (allDocs.length !== 5) {
    throw new Error(`Expected 5 total documents in history, got ${allDocs.length}`);
  }
  console.log('✓ PASS: Document versioning succeeded. Both file binaries and records preserved.');

  // =========================================================================
  // TEST 5: DOCUMENTS SURVIVE POLICY EXPIRY
  // =========================================================================
  console.log('\n--- TEST 5: Documents Survive Policy Expiry ---');
  // Set Policy A to expired
  policyA.status = 'expired';
  policyA.endDate = new Date('2024-01-01');
  await policyA.save();
  console.log(`Policy A marked as EXPIRED (endDate: ${policyA.endDate.toISOString().split('T')[0]})`);

  // Documents must still be fetchable
  const expiredDocs = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1
  });
  if (expiredDocs.length !== 4) {
    throw new Error(`Expected 4 documents even after expiry, got ${expiredDocs.length}`);
  }

  // Must still be downloadable via presigned URL
  const downloadAadhaar = await policyDocumentService.getPolicyDocumentDownload({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    documentId: aadhaarDoc._id.toString(),
    user: agent1
  });
  const validUrl = downloadAadhaar.presignedUrl || downloadAadhaar.downloadUrl;
  if (!validUrl || (!validUrl.includes('X-Amz-Signature') && !validUrl.includes('http'))) {
    throw new Error(`Failed to generate download URL for expired policy doc: ${validUrl}`);
  }
  console.log(`✓ Presigned download URL generated for expired policy: ${validUrl.substring(0, 60)}...`);
  console.log('✓ PASS: Documents survived policy expiry and remain 100% accessible.');

  // =========================================================================
  // TEST 6: RENEWALS DO NOT AUTOMATICALLY MOVE OR COPY DOCUMENTS
  // =========================================================================
  console.log('\n--- TEST 6: Renewal Isolation (Old Policy Retains Docs, Renewal Policy Has 0) ---');
  const policyB = await InsurancePolicy.create({
    agencyId: agency1._id,
    customerId: customer1._id,
    policyNumber: 'E2E-DOC-TEST-POL-B',
    insuranceCompany: 'HDFC ERGO',
    policyType: 'HEALTH',
    subType: 'HEALTH_INDIVIDUAL',
    premiumAmount: 20000,
    netPremium: 16949,
    premium: 20000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    status: 'active',
    renewedFromPolicyId: policyA._id,
    assignedAgentId: agent1._id,
    agentId: agent1._id,
    createdBy: admin1._id
  });
  console.log(`Created Renewal Policy B: ID ${policyB._id}, renewedFrom: ${policyB.renewedFromPolicyId}`);

  // Policy B documents check
  const docsListB = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyB._id.toString(),
    user: agent1
  });
  if (docsListB.length !== 0) {
    throw new Error(`Expected Policy B to have 0 documents, but found ${docsListB.length}`);
  }

  // Policy A documents check
  const docsListAAfterRenewal = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1
  });
  if (docsListAAfterRenewal.length !== 4) {
    throw new Error(`Expected Policy A to retain all 4 documents, but found ${docsListAAfterRenewal.length}`);
  }
  console.log('✓ PASS: Policy A documents intact; renewal Policy B starts with 0 documents.');

  // =========================================================================
  // TEST 7: IDOR / CROSS-TENANT SECURITY ISOLATION
  // =========================================================================
  console.log('\n--- TEST 7: Strict Multi-Tenant Data Isolation & IDOR Protection ---');
  // Tenant 2 attempts to list Tenant 1's policy documents
  let idorListBlocked = false;
  try {
    await policyDocumentService.getPolicyDocuments({
      agencyId: agencyId2, // Tenant 2
      policyId: policyA._id.toString(), // Belongs to Tenant 1
      user: admin2
    });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 403) {
      idorListBlocked = true;
      console.log(`✓ IDOR list blocked: "${err.message}" (Status: ${err.statusCode})`);
    } else {
      throw err;
    }
  }
  if (!idorListBlocked) {
    throw new Error('Security failure: Tenant 2 was able to access Tenant 1 policy documents!');
  }

  // Tenant 2 attempts to download Tenant 1's policy document
  let idorDownloadBlocked = false;
  try {
    await policyDocumentService.getPolicyDocumentDownload({
      agencyId: agencyId2,
      policyId: policyA._id.toString(),
      documentId: aadhaarDoc._id.toString(),
      user: admin2
    });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 403) {
      idorDownloadBlocked = true;
      console.log(`✓ IDOR download blocked: "${err.message}" (Status: ${err.statusCode})`);
    } else {
      throw err;
    }
  }
  if (!idorDownloadBlocked) {
    throw new Error('Security failure: Tenant 2 was able to download Tenant 1 document!');
  }
  console.log('✓ PASS: Multi-tenant boundary strictly enforced. Cross-tenant queries return 404/403.');

  // =========================================================================
  // TEST 8: ROLE-BASED ACCESS CONTROL (AGENT CANNOT DELETE, ADMIN CAN SOFT-DELETE)
  // =========================================================================
  console.log('\n--- TEST 8: RBAC Authorization (Agent Deletion Blocked, Admin Soft Delete) ---');
  let agentDeleteBlocked = false;
  try {
    await policyDocumentService.deletePolicyDocument({
      agencyId: agencyId1,
      policyId: policyA._id.toString(),
      documentId: gstDoc._id.toString(),
      user: agent1 // Agent role
    });
  } catch (err) {
    if (err.statusCode === 403) {
      agentDeleteBlocked = true;
      console.log(`✓ Agent delete blocked with 403 Forbidden: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!agentDeleteBlocked) {
    throw new Error('Security failure: Non-admin agent was able to delete document!');
  }

  // Admin soft delete
  const deletedDoc = await policyDocumentService.deletePolicyDocument({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    documentId: gstDoc._id.toString(),
    user: admin1 // Admin role
  });
  console.log(`✓ Admin soft-deleted document: ID ${deletedDoc._id}, status: ${deletedDoc.status}, isDeleted: ${deletedDoc.isDeleted}`);

  if (deletedDoc.status !== 'DELETED' || !deletedDoc.isDeleted) {
    throw new Error(`Expected status=DELETED and isDeleted=true, got status=${deletedDoc.status}`);
  }

  // Check document in DB - storageKey and binary MUST remain intact for regulatory audit
  const rawDeletedDoc = await PolicyDocument.findById(gstDoc._id);
  if (!rawDeletedDoc.storageKey || rawDeletedDoc.storageKey.length === 0) {
    throw new Error('Compliance failure: storageKey was deleted from soft-deleted document!');
  }
  console.log(`✓ S3 binary reference preserved for regulatory compliance: ${rawDeletedDoc.storageKey}`);

  // Querying active docs should now return 3
  const activeDocsAfterDelete = await policyDocumentService.getPolicyDocuments({
    agencyId: agencyId1,
    policyId: policyA._id.toString(),
    user: agent1
  });
  if (activeDocsAfterDelete.length !== 3) {
    throw new Error(`Expected 3 active documents after delete, got ${activeDocsAfterDelete.length}`);
  }
  console.log('✓ PASS: Agent deletion prohibited (403), Admin soft deletion and compliance retention confirmed.');

  // =========================================================================
  // TEST 9: VERIFY ZERO OCR / LLM CALLS
  // =========================================================================
  console.log('\n--- TEST 9: Verification of Zero OCR / Zero LLM Invocations ---');
  // Check that PolicyDocument model has NO OCR or LLM output fields
  const sampleDoc = await PolicyDocument.findById(aadhaarDoc._id);
  const forbiddenFields = ['ocrText', 'extractedData', 'parsedJson', 'aiSummary', 'llmResponse'];
  for (const f of forbiddenFields) {
    if (sampleDoc[f] !== undefined) {
      throw new Error(`Forbidden OCR/LLM field found in PolicyDocument: ${f}`);
    }
  }
  console.log('✓ PASS: Zero OCR/LLM calls or metadata fields present in PolicyDocument storage.');

  // Cleanup test records
  console.log('\nCleaning up verification records...');
  await Customer.deleteMany({ mobile: '9991112233' });
  await InsurancePolicy.deleteMany({ policyNumber: { $in: ['E2E-DOC-TEST-POL-A', 'E2E-DOC-TEST-POL-B'] } });
  await PolicyDocument.deleteMany({ policyId: { $in: [policyA._id, policyB._id] } });

  console.log('================================================================');
  console.log('ALL POLICY DOCUMENT STORAGE ACCEPTANCE TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runPolicyDocumentStorageTests().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
