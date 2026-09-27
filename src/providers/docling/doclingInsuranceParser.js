/**
 * Docling Insurance Parser for INSecure CRM
 * Mines IBM Docling structured outputs (2D tables, section headings, paragraphs, key-values)
 * and runs validation, normalization, and consistency checks via InsuranceFieldValidator.
 */

const { getInsuranceClassifier } = require('../llm/insuranceClassifier');
const { getSubtypeSchema } = require('../../schemas/insuranceSubtypeSchemas');
const { getInsuranceFieldValidator, FIELD_STATUSES } = require('../../services/insuranceFieldValidator');

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

    // 1. Classification
    const classifier = getInsuranceClassifier();
    const classification = classifier.classify(rawText, fileName);

    const effectiveType = classification.type || 'motor';
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
            if (val && String(val).trim()) {
              return {
                value: String(val).trim(),
                page: vObj.page || 1,
                source: 'docling_kv',
                confidence: 0.96
              };
            }
          }
        }
      }
      return null;
    };

    // 3. Scan Tables for specific 2D tabular schedules
    const tableData = this._scanTables(tables);

    // 4. Build Raw Candidate Objects
    const rawCustomer = this._extractRawCustomer(rawText, tableData, getKv);
    const rawPolicy = this._extractRawPolicy(rawText, tableData, getKv, classification, effectiveType, effectiveSubtype, subtypeSchema);
    const rawMotor = effectiveType === 'motor' ? this._extractRawMotor(rawText, tableData, getKv) : null;
    const rawPremium = this._extractRawPremium(rawText, tableData, getKv);
    const rawNominee = this._extractRawNominee(rawText, tableData, getKv);
    const rawBroker = this._extractRawBroker(rawText, tableData, getKv);
    const rawPayment = this._extractRawPayment(rawText, tableData, getKv);

    const rawPayload = {
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
      customer: rawCustomer,
      policy: rawPolicy,
      motor: rawMotor,
      premium: rawPremium,
      nominee: rawNominee,
      brokerDetails: rawBroker,
      paymentDetails: rawPayment,
      insuredMembers: effectiveType === 'health' ? (tableData.members || []) : []
    };

    // 5. Run Field-Level Validation, Normalization, and Cross-Field Consistency Checks
    const validator = getInsuranceFieldValidator();
    const validatedResult = validator.validateAndNormalize(rawPayload, rawText);

    return {
      ...validatedResult,
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
          if (cellKey.includes('variant') && !findings.motorSpecs.variant) {
            findings.motorSpecs.variant = cellVal;
          }
          if (cellKey.includes('fuel') && !findings.motorSpecs.fuelType) {
            findings.motorSpecs.fuelType = cellVal;
          }
          if ((cellKey.includes('cubic capacity') || cellKey.includes('cc')) && !findings.motorSpecs.cubicCapacity) {
            findings.motorSpecs.cubicCapacity = cellVal.replace(/\D/g, '');
          }
          if ((cellKey.includes('seating capacity') || cellKey.includes('seats')) && !findings.motorSpecs.seatingCapacity) {
            findings.motorSpecs.seatingCapacity = cellVal.replace(/\D/g, '');
          }
          if ((cellKey.includes('mfg year') || cellKey.includes('year of mfg') || cellKey.includes('year of manufacture')) && !findings.motorSpecs.manufacturingYear) {
            findings.motorSpecs.manufacturingYear = cellVal.replace(/\D/g, '');
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
          if (cellKey.includes('total premium') || cellKey.includes('final premium') || cellKey.includes('gross premium') || cellKey.includes('total amount payable')) {
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

  _extractRawCustomer(text, tableData, getKv) {
    const nameKv = getKv(['proposer name', 'insured name', 'customer name', 'name of the insured', 'policyholder name', 'name of insured']);
    const titleKv = getKv(['title', 'salutation']);
    const mobileKv = getKv(['mobile no', 'mobile number', 'contact no', 'phone no', 'telephone no']);
    const emailKv = getKv(['email id', 'email address', 'email']);
    const panKv = getKv(['pan no', 'pan card', 'pan number', 'pan']);
    const dobKv = getKv(['date of birth', 'dob', 'birth date']);
    const addressKv = getKv(['address', 'communication address', 'residence address', 'postal address', 'permanent address']);
    const pincodeKv = getKv(['pincode', 'pin code', 'pin', 'postal code']);
    const genderKv = getKv(['gender', 'sex']);

    // Regex Fallbacks if not in Key-Values
    const nameRegex = /(?:Name of (?:the )?Insured|Proposer Name|Insured Name|Customer Name)\s*[:\-–]\s*([A-Za-z\s.]{3,50})/i;
    const mobileRegex = /(?:Mobile|Phone|Contact)\s*(?:No|Number)?\s*[:\-–]?\s*([6-9]\d{9})\b/i;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/;
    const dobRegex = /(?:DOB|Date of Birth)\s*[:\-–]\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/;

    const extractVal = (kv, regex) => {
      if (kv && kv.value) return kv.value;
      if (regex) {
        const m = text.match(regex);
        if (m && m[1]) return m[1].trim();
      }
      return null;
    };

    return {
      name: extractVal(nameKv, nameRegex),
      title: titleKv?.value || (text.match(/\b(Mr\.|Mrs\.|Ms\.|Dr\.|M\/s)\b/i)?.[1] || null),
      mobile: extractVal(mobileKv, mobileRegex),
      email: extractVal(emailKv, emailRegex),
      pan: extractVal(panKv, panRegex),
      dob: extractVal(dobKv, dobRegex),
      gender: genderKv?.value || null, // Never default
      address: addressKv?.value || null,
      pincode: pincodeKv?.value || (text.match(/\b([1-9][0-9]{5})\b/)?.[1] || null)
    };
  }

  _extractRawPolicy(text, tableData, getKv, classification, effectiveType, effectiveSubtype, subtypeSchema) {
    const polKv = getKv(['policy no', 'policy number', 'certificate no', 'e policy no', 'document no']);
    const startKv = getKv(['period of insurance from', 'policy start date', 'effective date', 'start date', 'from date', 'inception date']);
    const endKv = getKv(['period of insurance to', 'policy end date', 'expiry date', 'end date', 'to date']);
    const issueKv = getKv(['policy issue date', 'issue date', 'date of issue', 'created date']);
    const siKv = getKv(['sum insured', 'sum assured', 'total sum insured', 'idv']);

    const polNum = polKv?.value || tableData.policyNumber || (text.match(/(?:Policy|Certificate)\s*(?:No|Number)\s*[:\-–]\s*([A-Za-z0-9\/-]{7,35})/i)?.[1]?.trim()) || null;

    return {
      insurer: classification.detectedInsurer || null,
      productName: classification.detectedProduct || subtypeSchema?.name || effectiveSubtype,
      policyNumber: polNum,
      policyType: effectiveType === 'motor' ? 'comprehensive' : 'standard',
      businessType: /new\s*vehicle|new\s*business/i.test(text) ? 'new' : 'renewal',
      startDate: startKv?.value || null,
      endDate: endKv?.value || null,
      issueDate: issueKv?.value || null,
      renewalDate: endKv?.value || null,
      sumAssured: siKv?.value || tableData.idvValues.idv || null
    };
  }

  _extractRawMotor(text, tableData, getKv) {
    const regKv = getKv(['registration no', 'reg no', 'vehicle no', 'regn no']);
    const engKv = getKv(['engine no', 'engine number']);
    const chasKv = getKv(['chassis no', 'chassis number', 'vin']);
    const makeKv = getKv(['make', 'vehicle make', 'manufacturer']);
    const modelKv = getKv(['model', 'vehicle model']);
    const variantKv = getKv(['variant', 'sub model', 'model variant']);
    const fuelKv = getKv(['fuel type', 'fuel']);
    const ccKv = getKv(['cubic capacity', 'cc', 'engine capacity']);
    const seatsKv = getKv(['seating capacity', 'seating', 'carrying capacity']);
    const yearKv = getKv(['year of mfg', 'manufacturing year', 'mfg year', 'year of manufacture']);
    const idvKv = getKv(['idv', 'insured declared value', 'vehicle idv', 'total idv']);
    const ncbKv = getKv(['ncb', 'no claim bonus', 'ncb percentage', 'ncb discount']);
    const prevPolKv = getKv(['previous policy no', 'previous policy number', 'prior policy no']);
    const prevInsKv = getKv(['previous insurer', 'previous insurance company']);

    const regNo = regKv?.value || tableData.motorSpecs.registrationNumber || (text.match(/(?:Registration|Vehicle|Regn)\s*(?:No|Number)\s*[:\-–]?\s*([A-Z]{2}\s?\d{1,3}\s?[A-Z]{0,3}\s?\d{4})/i)?.[1]?.trim()) || null;
    const engineNo = engKv?.value || tableData.motorSpecs.engineNumber || (text.match(/(?:Engine)\s*(?:No|Number)\s*[:\-–]?\s*([A-Za-z0-9]{5,25})/i)?.[1]?.trim()) || null;
    const chassisNo = chasKv?.value || tableData.motorSpecs.chassisNumber || (text.match(/(?:Chassis|VIN)\s*(?:No|Number)?\s*[:\-–]?\s*([A-Za-z0-9]{17})/i)?.[1]?.trim()) || null;
    const idv = idvKv?.value || tableData.idvValues.idv || null;

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
      registrationNumber: regNo,
      make: makeKv?.value || tableData.motorSpecs.make || null,
      model: modelKv?.value || tableData.motorSpecs.model || null,
      variant: variantKv?.value || tableData.motorSpecs.variant || null,
      engineNumber: engineNo,
      chassisNumber: chassisNo,
      fuelType: fuelKv?.value || tableData.motorSpecs.fuelType || null,
      cubicCapacity: ccKv?.value || tableData.motorSpecs.cubicCapacity || null,
      seatingCapacity: seatsKv?.value || tableData.motorSpecs.seatingCapacity || null,
      manufacturingYear: yearKv?.value || tableData.motorSpecs.manufacturingYear || null,
      idv: idv,
      ncbPercentage: ncbKv?.value || null,
      zeroDepreciation: hasZeroDep ? true : null,
      roadsideAssistance: hasRsa ? true : null,
      engineProtection: hasEngineProt ? true : null,
      returnToInvoice: hasRti ? true : null,
      consumables: hasConsumables ? true : null,
      ncbProtector: hasNcbProt ? true : null,
      tyreProtector: hasTyreProt ? true : null,
      keyReplacement: hasKeyReplacement ? true : null,
      personalBelongings: hasPersonalBelongings ? true : null,
      personalAccidentCover: hasPaCover ? true : null,
      previousPolicyNumber: prevPolKv?.value || null,
      previousInsurer: prevInsKv?.value || null
    };
  }

  _extractRawPremium(text, tableData, getKv) {
    const basicKv = getKv(['basic premium', 'net premium', 'od premium', 'own damage premium', 'basic od']);
    const finalKv = getKv(['total premium', 'gross premium', 'final premium', 'total amount payable', 'total payable']);
    const gstKv = getKv(['gst', 'cgst', 'sgst', 'igst', 'total tax']);

    return {
      basicPremium: basicKv?.value || tableData.premiums.basicPremium || null,
      netPremium: basicKv?.value || tableData.premiums.basicPremium || null,
      finalPremium: finalKv?.value || tableData.premiums.finalPremium || null,
      gst: gstKv?.value || null
    };
  }

  _extractRawNominee(text, tableData, getKv) {
    const nomKv = getKv(['nominee name', 'name of nominee', 'nominee']);
    const relKv = getKv(['nominee relationship', 'relation with insured', 'nominee relation', 'relation']);
    return {
      name: nomKv?.value || null,
      relationship: relKv?.value || null,
      share: 100
    };
  }

  _extractRawBroker(text, tableData, getKv) {
    const brokerKv = getKv(['broker name', 'agency name', 'intermediary name', 'agent name', 'posp name']);
    const codeKv = getKv(['broker code', 'agent code', 'intermediary code', 'posp code']);
    return {
      brokerAgency: brokerKv?.value || null,
      agentName: brokerKv?.value || null,
      agentCode: codeKv?.value || null
    };
  }

  _extractRawPayment(text, tableData, getKv) {
    const refKv = getKv(['receipt no', 'transaction no', 'payment ref', 'utr no', 'cheque no']);
    return {
      paymentStatus: 'completed',
      paymentMethod: /cheque/i.test(text) ? 'Cheque' : 'Online',
      transactionReference: refKv?.value || null
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
