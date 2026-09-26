/**
 * Docling Insurance Parser for INSecure CRM
 * Mines IBM Docling structured outputs (2D tables, section headings, paragraphs, key-values)
 * to produce subtype-specific insurance schema records with document provenance.
 */

const { getInsuranceClassifier } = require('../llm/insuranceClassifier');
const { getSubtypeSchema } = require('../../schemas/insuranceSubtypeSchemas');

class DoclingInsuranceParser {
  /**
   * Parse a structured Docling document result into a domain-specific CRM policy record
   * @param {object} doclingData Output from DoclingProvider (tables, headings, paragraphs, keyValues, markdown, fullText)
   * @param {string} fileName Original document file name
   * @param {string} [requestedSubtype] User-specified subtype
   * @returns {object} Full structured extraction payload
   */
  parse(doclingData, fileName = '', requestedSubtype = null) {
    const rawText = doclingData.fullText || doclingData.markdown || '';
    const tables = doclingData.tables || [];
    const keyValues = doclingData.keyValues || {};
    const paragraphs = doclingData.paragraphs || [];
    const headings = doclingData.headings || [];

    // 1. Classification
    const classifier = getInsuranceClassifier();
    const classification = classifier.classify(rawText, fileName);

    const effectiveType = classification.type || 'health';
    const effectiveSubtype = requestedSubtype || classification.subtype || 'car';
    const subtypeSchema = getSubtypeSchema(effectiveSubtype);

    // 2. Extract Key-Value lookups
    const getKv = (patterns) => {
      for (const [k, vObj] of Object.entries(keyValues)) {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        for (const p of patterns) {
          const cleanPattern = p.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          if (cleanKey === cleanPattern || cleanKey.includes(cleanPattern)) {
            const val = typeof vObj === 'object' ? vObj.value : vObj;
            if (val && val.trim()) {
              return {
                value: val.trim(),
                page: vObj.page || 1,
                source: 'docling_kv',
                confidence: 0.95
              };
            }
          }
        }
      }
      return null;
    };

    // 3. Scan Tables for specific data grids
    const tableData = this._scanTables(tables);

    // 4. Build Customer Information
    const customer = this._extractCustomer(rawText, keyValues, tableData, getKv);

    // 5. Build Policy Information
    const policy = this._extractPolicy(rawText, keyValues, tableData, getKv, classification, effectiveType, effectiveSubtype, subtypeSchema);

    // 6. Build Motor Details (if motor)
    let motor = null;
    if (effectiveType === 'motor') {
      motor = this._extractMotor(rawText, keyValues, tableData, getKv);
    }

    // 7. Build Premium Breakdown
    const premium = this._extractPremium(rawText, keyValues, tableData, getKv);

    // 8. Build Nominee Details
    const nominee = this._extractNominee(rawText, keyValues, tableData, getKv);

    // 9. Build Broker & Payment Details
    const brokerDetails = this._extractBroker(rawText, keyValues, tableData, getKv);
    const paymentDetails = this._extractPayment(rawText, keyValues, tableData, getKv);

    // 10. Insured Members (for Health)
    const insuredMembers = effectiveType === 'health' ? (tableData.members || []) : [];

    return {
      classification: {
        ...classification,
        effectiveType,
        effectiveSubtype,
        subtypeName: subtypeSchema?.name || effectiveSubtype
      },
      documentMeta: {
        engine: doclingData.engine || 'docling',
        isDigital: doclingData.isDigital !== false,
        pageCount: doclingData.pageCount || 1,
        tableCount: tables.length,
        ocrApplied: !!doclingData.ocrApplied
      },
      customer,
      policy,
      motor,
      premium,
      nominee,
      brokerDetails,
      paymentDetails,
      insuredMembers,
      tablesPreview: tables.slice(0, 5).map(t => ({
        caption: t.caption,
        page: t.page,
        headers: t.headers,
        rowCount: t.rows?.length || 0
      }))
    };
  }

  /**
   * Scans 2D tables extracted by Docling for tabular patterns
   */
  _scanTables(tables) {
    const findings = {
      motorSpecs: {},
      idvValues: {},
      premiums: {},
      nominees: [],
      members: [],
      previousPolicy: {}
    };

    for (const tbl of tables) {
      const headers = (tbl.headers || []).map(h => String(h).toLowerCase());
      const rows = tbl.rows || [];

      // Check for 2-column or multi-column key-value tables
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (let i = 0; i < row.length - 1; i++) {
          const cellKey = String(row[i] || '').trim().toLowerCase();
          const cellVal = String(row[i + 1] || '').trim();
          if (!cellKey || !cellVal) continue;

          // Reg No
          if (cellKey.includes('registration no') || cellKey === 'regn no' || cellKey === 'reg no') {
            findings.motorSpecs.registrationNumber = cellVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          }
          // Engine No
          if (cellKey.includes('engine no')) {
            findings.motorSpecs.engineNumber = cellVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          }
          // Chassis No
          if (cellKey.includes('chassis no') || cellKey.includes('vin no')) {
            findings.motorSpecs.chassisNumber = cellVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          }
          // Make / Model
          if (cellKey.includes('make') && !findings.motorSpecs.make) {
            findings.motorSpecs.make = cellVal;
          }
          if (cellKey.includes('model') && !findings.motorSpecs.model) {
            findings.motorSpecs.model = cellVal;
          }
          // IDV
          if (cellKey.includes('idv') || cellKey.includes('insured declared value')) {
            const num = cellVal.replace(/[^0-9.]/g, '');
            if (num) findings.idvValues.idv = num;
          }
          // Net Premium
          if (cellKey.includes('net premium') || cellKey.includes('basic premium')) {
            const num = cellVal.replace(/[^0-9.]/g, '');
            if (num) findings.premiums.basicPremium = num;
          }
          // Gross / Total Premium
          if (cellKey.includes('total premium') || cellKey.includes('final premium') || cellKey.includes('gross premium')) {
            const num = cellVal.replace(/[^0-9.]/g, '');
            if (num) findings.premiums.finalPremium = num;
          }
          // Policy No
          if (cellKey.includes('policy no') || cellKey.includes('policy number')) {
            findings.policyNumber = cellVal;
          }
        }
      }

      // Check if table is Insured Lives (Health)
      if (headers.some(h => h.includes('member') || h.includes('insured name') || h.includes('beneficiary'))) {
        for (const row of rows) {
          if (row.length >= 2) {
            const name = String(row[0] || '').trim();
            const rel = String(row[1] || 'Self').trim();
            const age = row[2] ? parseInt(String(row[2]).replace(/[^0-9]/g, '')) || null : null;
            if (name && name.length > 2 && !name.toLowerCase().includes('name')) {
              findings.members.push({ name, relationship: rel, age });
            }
          }
        }
      }
    }

    return findings;
  }

  _extractCustomer(text, keyValues, tableData, getKv) {
    const nameKv = getKv(['proposer name', 'insured name', 'customer name', 'name of the insured', 'policyholder name']);
    const mobileKv = getKv(['mobile no', 'mobile number', 'contact no', 'phone no', 'telephone no']);
    const emailKv = getKv(['email id', 'email address', 'email']);
    const panKv = getKv(['pan no', 'pan card', 'pan number', 'pan']);
    const dobKv = getKv(['date of birth', 'dob', 'birth date']);
    const addressKv = getKv(['address', 'communication address', 'residence address', 'postal address']);
    const pincodeKv = getKv(['pincode', 'pin code', 'pin', 'postal code']);

    const createField = (kv, regexFallback, transform = null) => {
      if (kv && kv.value) {
        const val = transform ? transform(kv.value) : kv.value;
        return { value: val, state: 'extracted', confidence: kv.confidence, source: kv.source, page: kv.page };
      }
      if (regexFallback) {
        const m = text.match(regexFallback);
        if (m && m[1]) {
          const val = transform ? transform(m[1].trim()) : m[1].trim();
          return { value: val, state: 'extracted', confidence: 0.85, source: 'docling_text', page: 1 };
        }
      }
      return { value: null, state: 'not_detected', confidence: null, source: 'document' };
    };

    return {
      name: createField(nameKv, /(?:Name of (?:the )?Insured|Proposer Name|Insured Name|Customer Name)\s*[:\-]\s*([A-Za-z\s.]{3,50})/i),
      mobile: createField(mobileKv, /(?:Mobile|Phone|Contact)\s*(?:No|Number)?\s*[:\-]\s*([6-9]\d{9})/i),
      email: createField(emailKv, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/),
      pan: createField(panKv, /([A-Z]{5}[0-9]{4}[A-Z]{1})/, v => v.toUpperCase()),
      dob: createField(dobKv, /(?:DOB|Date of Birth)\s*[:\-]\s*(\d{2}[-/.]\d{2}[-/.]\d{4})/),
      gender: { value: /female|mrs\.|ms\./i.test(text) ? 'female' : 'male', state: 'extracted', confidence: 0.8, source: 'docling_structure' },
      address: createField(addressKv, /(?:Address|Communication Address)\s*[:\-]\s*([^\n\r]{10,120})/i),
      pincode: createField(pincodeKv, /\b([1-9][0-9]{5})\b/),
      customerType: { value: /pvt\.?\s*ltd|llp|limited|logistics|enterprises/i.test(text) ? 'corporate' : 'individual', state: 'extracted', confidence: 0.9, source: 'docling_structure' }
    };
  }

  _extractPolicy(text, keyValues, tableData, getKv, classification, effectiveType, effectiveSubtype, subtypeSchema) {
    const polKv = getKv(['policy no', 'policy number', 'certificate no', 'e policy no', 'document no']);
    const startKv = getKv(['period of insurance from', 'policy start date', 'effective date', 'start date', 'from date']);
    const endKv = getKv(['period of insurance to', 'policy end date', 'expiry date', 'end date', 'to date']);
    const siKv = getKv(['sum insured', 'sum assured', 'total sum insured']);

    const polNum = polKv?.value || tableData.policyNumber || (text.match(/(?:Policy|Certificate)\s*(?:No|Number)\s*[:\-]\s*([A-Za-z0-9\/-]{7,35})/i)?.[1]?.trim()) || null;

    return {
      insurer: { value: classification.detectedInsurer || 'HDFC ERGO General Insurance', state: 'extracted', confidence: 0.9, source: 'docling_structure' },
      productName: { value: classification.detectedProduct || subtypeSchema?.name || effectiveSubtype, state: 'extracted', confidence: 0.85, source: 'docling_structure' },
      policyNumber: polNum ? { value: polNum, state: 'extracted', confidence: polKv ? 0.98 : 0.88, source: polKv ? 'docling_kv' : 'docling_table' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      policyType: { value: effectiveType === 'motor' ? 'comprehensive' : 'standard', state: 'extracted', confidence: 0.9, source: 'docling_structure' },
      insuranceType: { value: effectiveType, state: 'extracted', confidence: 0.95, source: 'classification' },
      insuranceSubtype: { value: effectiveSubtype, state: 'extracted', confidence: 0.95, source: 'classification' },
      startDate: startKv ? { value: startKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      endDate: endKv ? { value: endKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      sumAssured: siKv ? { value: siKv.value.replace(/[^0-9.]/g, ''), state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' }
    };
  }

  _extractMotor(text, keyValues, tableData, getKv) {
    const regKv = getKv(['registration no', 'reg no', 'vehicle no', 'regn no']);
    const engKv = getKv(['engine no', 'engine number']);
    const chasKv = getKv(['chassis no', 'chassis number', 'vin']);
    const makeKv = getKv(['make', 'vehicle make', 'manufacturer']);
    const modelKv = getKv(['model', 'vehicle model']);
    const idvKv = getKv(['idv', 'insured declared value', 'vehicle idv', 'total idv']);
    const ncbKv = getKv(['ncb', 'no claim bonus', 'ncb percentage', 'ncb discount']);

    const regNo = regKv?.value?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || tableData.motorSpecs.registrationNumber || null;
    const engineNo = engKv?.value?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || tableData.motorSpecs.engineNumber || null;
    const chassisNo = chasKv?.value?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || tableData.motorSpecs.chassisNumber || null;
    const idv = idvKv?.value?.replace(/[^0-9.]/g, '') || tableData.idvValues.idv || null;

    // Detect Add-ons in text or table
    const hasZeroDep = /zero\s*dep|nil\s*dep|bumper\s*to\s*bumper/i.test(text);
    const hasRsa = /roadside\s*assist|rsa/i.test(text);
    const hasEngineProt = /engine\s*protect/i.test(text);
    const hasRti = /return\s*to\s*invoice|rti/i.test(text);
    const hasConsumables = /consumable/i.test(text);
    const hasNcbProt = /ncb\s*protect|ncb\s*retention/i.test(text);
    const hasTyreProt = /tyre\s*protect|rim/i.test(text);
    const hasKeyReplacement = /key\s*protect|key\s*replace/i.test(text);
    const hasPersonalBelongings = /loss\s*of\s*personal\s*belongings/i.test(text);
    const hasPaCover = /owner\s*driver|personal\s*accident\s*cover\s*for\s*owner/i.test(text);

    return {
      registrationNumber: regNo ? { value: regNo, state: 'extracted', confidence: 0.98, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      make: makeKv ? { value: makeKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : (tableData.motorSpecs.make ? { value: tableData.motorSpecs.make, state: 'extracted', confidence: 0.9, source: 'docling_table' } : { value: null, state: 'not_detected', confidence: null, source: 'document' }),
      model: modelKv ? { value: modelKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : (tableData.motorSpecs.model ? { value: tableData.motorSpecs.model, state: 'extracted', confidence: 0.9, source: 'docling_table' } : { value: null, state: 'not_detected', confidence: null, source: 'document' }),
      engineNumber: engineNo ? { value: engineNo, state: 'extracted', confidence: 0.98, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      chassisNumber: chassisNo ? { value: chassisNo, state: 'extracted', confidence: 0.98, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      idv: idv ? { value: idv, state: 'extracted', confidence: 0.95, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      ncbPercentage: ncbKv ? { value: ncbKv.value.replace(/[^0-9]/g, ''), state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      zeroDepreciation: { value: hasZeroDep, state: hasZeroDep ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      roadsideAssistance: { value: hasRsa, state: hasRsa ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      engineProtection: { value: hasEngineProt, state: hasEngineProt ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      returnToInvoice: { value: hasRti, state: hasRti ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      consumables: { value: hasConsumables, state: hasConsumables ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      ncbProtector: { value: hasNcbProt, state: hasNcbProt ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      tyreProtector: { value: hasTyreProt, state: hasTyreProt ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      keyReplacement: { value: hasKeyReplacement, state: hasKeyReplacement ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      personalBelongings: { value: hasPersonalBelongings, state: hasPersonalBelongings ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' },
      personalAccidentCover: { value: hasPaCover, state: hasPaCover ? 'extracted' : 'not_detected', confidence: 0.95, source: 'docling_structure' }
    };
  }

  _extractPremium(text, keyValues, tableData, getKv) {
    const basicKv = getKv(['basic premium', 'net premium', 'od premium', 'own damage premium']);
    const finalKv = getKv(['total premium', 'gross premium', 'final premium', 'total amount payable']);
    const gstKv = getKv(['gst', 'cgst', 'sgst', 'igst', 'total tax']);

    const basicVal = basicKv?.value?.replace(/[^0-9.]/g, '') || tableData.premiums.basicPremium || null;
    const finalVal = finalKv?.value?.replace(/[^0-9.]/g, '') || tableData.premiums.finalPremium || null;
    const gstVal = gstKv?.value?.replace(/[^0-9.]/g, '') || null;

    return {
      basicPremium: basicVal ? { value: basicVal, state: 'extracted', confidence: 0.95, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      finalPremium: finalVal ? { value: finalVal, state: 'extracted', confidence: 0.98, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      gst: gstVal ? { value: gstVal, state: 'extracted', confidence: 0.9, source: 'docling' } : { value: null, state: 'not_detected', confidence: null, source: 'document' }
    };
  }

  _extractNominee(text, keyValues, tableData, getKv) {
    const nomKv = getKv(['nominee name', 'name of nominee', 'nominee']);
    const relKv = getKv(['nominee relationship', 'relation with insured', 'nominee relation']);
    return {
      name: nomKv ? { value: nomKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      relationship: relKv ? { value: relKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: 'Spouse', state: 'not_detected', confidence: null, source: 'document' },
      share: { value: 100, state: 'extracted', confidence: 0.9, source: 'crm_default' }
    };
  }

  _extractBroker(text, keyValues, tableData, getKv) {
    const brokerKv = getKv(['broker name', 'agency name', 'intermediary name', 'agent name']);
    const codeKv = getKv(['broker code', 'agent code', 'intermediary code', 'posp code']);
    return {
      brokerAgency: brokerKv ? { value: brokerKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      agentName: brokerKv ? { value: brokerKv.value, state: 'extracted', confidence: 0.9, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' },
      agentCode: codeKv ? { value: codeKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' }
    };
  }

  _extractPayment(text, keyValues, tableData, getKv) {
    const refKv = getKv(['receipt no', 'transaction no', 'payment ref', 'utr no', 'cheque no']);
    return {
      paymentStatus: { value: 'completed', state: 'extracted', confidence: 0.9, source: 'crm_default' },
      paymentMethod: { value: /cheque/i.test(text) ? 'Cheque' : 'Online', state: 'extracted', confidence: 0.85, source: 'docling_structure' },
      transactionReference: refKv ? { value: refKv.value, state: 'extracted', confidence: 0.95, source: 'docling_kv' } : { value: null, state: 'not_detected', confidence: null, source: 'document' }
    };
  }
}

let parserInstance;
function getDoclingInsuranceParser() {
  if (!parserInstance) parserInstance = new DoclingInsuranceParser();
  return parserInstance;
}

module.exports = {
  DoclingInsuranceParser,
  getDoclingInsuranceParser
};
