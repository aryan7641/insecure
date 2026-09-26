const { POLICY_TYPES, EXTRACTION_STATES } = require('../../utils/constants');
const { getInsuranceClassifier } = require('./insuranceClassifier');
const { getSubtypeSchema } = require('../../schemas/insuranceSubtypeSchemas');

class InsuranceLlmExtractor {
  /**
   * Parse extracted raw text and produce subtype-specific structured Indian Insurance schema
   * @param {string} rawText 
   * @param {string} fileName 
   * @param {string} [requestedSubtype] Optional explicit user-selected subtype
   * @returns {Promise<object>}
   */
  async extractInsuranceData(rawText, fileName = '', requestedSubtype = null) {
    const text = (rawText || '') + '\n' + (fileName || '');
    const cleanLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1. Run Classification
    const classifier = getInsuranceClassifier();
    const classification = classifier.classify(rawText, fileName);

    const effectiveType = classification.type || 'health';
    const effectiveSubtype = requestedSubtype || classification.subtype || 'individual_health';
    const subtypeSchema = getSubtypeSchema(effectiveSubtype);

    // 2. Base Customer Extraction
    const customer = {
      title: this._extractTitle(text),
      name: this._extractCustomerName(text, cleanLines),
      mobile: this._extractMobile(text),
      email: this._extractEmail(text),
      dob: this._extractDob(text),
      gender: this._extractGender(text),
      pan: this._extractPan(text),
      aadhaar: this._extractAadhaar(text),
      address: this._extractAddress(text),
      city: this._extractCity(text),
      district: this._extractDistrict(text),
      state: this._extractState(text),
      pincode: this._extractPincode(text),
      customerType: this._extractCustomerType(text)
    };

    // If city found in address, refine
    if (!customer.city.value && customer.address.value) {
      const cityRes = this._extractCity(customer.address.value);
      if (cityRes.value) customer.city = cityRes;
    }

    // 3. Base Policy Extraction
    const insurerExtracted = this._extractInsurer(text);
    const policy = {
      insurer: insurerExtracted.value ? insurerExtracted : (classification.detectedInsurer && classification.detectedInsurer !== 'General Insurance' ? { value: classification.detectedInsurer, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' } : { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0, source: 'document' }),
      productName: this._extractProduct(text),
      planName: this._extractPlan(text),
      policyNumber: this._extractPolicyNumber(text),
      policyType: this._extractMotorPolicyType(text, effectiveType),
      insuranceType: { value: effectiveType, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'classification' },
      insuranceSubtype: { value: effectiveSubtype, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'classification' },
      lob: { value: effectiveType.toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'classification' },
      subLob: { value: subtypeSchema?.name || effectiveSubtype, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'classification' },
      businessType: this._extractBusinessType(text),
      issueDate: this._extractDateByKeywords(text, ['issue date', 'booking date', 'proposal date', 'proposal signed on']),
      startDate: this._extractStartDate(text),
      endDate: this._extractEndDate(text),
      renewalDate: this._extractRenewalDate(text),
      tenureYears: this._extractTenureYears(text),
      sumAssured: this._extractSumAssured(text),
      premiumFrequency: { value: 'yearly', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' }
    };

    // Auto-compute renewal date from end date if missing
    if (!policy.renewalDate.value && policy.endDate.value) {
      policy.renewalDate = {
        value: policy.endDate.value,
        state: EXTRACTION_STATES.EXTRACTED,
        confidence: 0.88,
        source: 'calculated'
      };
    }

    // 4. Base Premium Extraction
    const basicPremium = this._extractBasicPremium(text);
    const gst = this._extractGst(text);
    const netPremium = this._extractNetPremium(text);
    let finalPremium = this._extractFinalPremium(text);

    if (!finalPremium.value && netPremium.value) {
      finalPremium = { ...netPremium };
    }

    const premium = {
      basicPremium,
      gst,
      gstPercentage: this._extractGstPercentage(text),
      cess: this._extractCess(text),
      netPremium,
      finalPremium,
      discount: this._extractDiscount(text),
      loading: this._extractLoading(text),
      installmentAmount: this._extractInstallmentAmount(text),
      premiumFrequency: { value: 'yearly', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' }
    };

    // 5. Nominee Extraction
    const nominee = {
      name: this._extractNomineeName(text),
      relationship: this._extractNomineeRelation(text),
      dob: this._extractNomineeDob(text),
      share: this._extractNomineeShare(text)
    };

    // 6. Subtype-Specific Extractions
    let motor = undefined;
    let insuredMembers = [];
    let lifeDetails = undefined;
    let travelDetails = undefined;
    let propertyDetails = undefined;
    let healthDetails = undefined;
    let brokerDetails = this._extractBrokerDetails(text);
    let paymentDetails = this._extractPaymentDetails(text);

    // Motor Subtypes Specifics (Comprehensive Schema)
    if (effectiveType === 'motor') {
      const regObj = this._extractVehicleReg(text);
      const rtoInfo = this._extractRtoDetails(text, regObj.value);

      motor = {
        // Vehicle Details
        vehicleType: this._extractVehicleType(text, effectiveSubtype),
        vehicleCategory: this._extractVehicleCategory(text),
        make: this._extractVehicleMake(text),
        model: this._extractVehicleModel(text),
        variant: this._extractVehicleVariant(text),
        subModel: this._extractVehicleSubModel(text),
        fuelType: this._extractFuelType(text),
        cubicCapacity: this._extractCubicCapacity(text),
        seatingCapacity: this._extractSeatingCapacity(text),
        numberOfTyres: this._extractNumberOfTyres(text),
        vehicleColor: this._extractVehicleColor(text),
        businessType: policy.businessType,

        // Registration Details
        registrationNumber: regObj,
        registrationDate: this._extractDateByKeywords(text, ['reg date', 'date of registration', 'reg. date', 'registration date']),
        registrationState: this._extractRegistrationState(text, rtoInfo),
        registrationCity: this._extractRegistrationCity(text, rtoInfo),
        rtoCode: rtoInfo.rtoCode,
        rtoName: rtoInfo.rtoName,
        zone: this._extractZone(text),

        // Manufacturing Details
        manufacturingMonth: this._extractManufacturingMonth(text),
        manufacturingYear: this._extractManufacturingYear(text),
        manufacturingDate: this._extractManufacturingDate(text),

        // Vehicle Identification Numbers
        engineNumber: this._extractEngineNumber(text),
        chassisNumber: this._extractChassisNumber(text),
        vinNumber: this._extractVinNumber(text),
        identificationNumber: this._extractIdentificationNumber(text),

        // Valuation & NCB
        idv: this._extractIdv(text),
        vehicleValue: this._extractVehicleValue(text),
        currentNcbPercentage: this._extractNcb(text),
        previousNcbPercentage: this._extractPreviousNcb(text),
        ncb: this._extractNcb(text),

        // Previous Policy Details
        previousPolicyAvailable: this._extractPreviousPolicyAvailable(text),
        previousInsurer: this._extractPreviousInsurer(text),
        previousPolicyNumber: this._extractPreviousPolicy(text),
        previousPolicyStartDate: this._extractDateByKeywords(text, ['prev policy start', 'previous policy from', 'previous start date']),
        previousPolicyEndDate: this._extractDateByKeywords(text, ['prev policy end', 'previous policy to', 'previous expiry date']),
        previousPolicyType: this._extractPreviousPolicyType(text),
        previousNcb: this._extractPreviousNcb(text),
        previousIdv: this._extractPreviousIdv(text),

        // Third Party Policy Details
        activeTpInsurerName: this._extractFieldRegex(text, /(?:TP Insurer|Active TP Insurer|TP Company|Liability Insurer)\s*[:\-–]?\s*([A-Za-z\s\.]{3,40})/i, 'activeTpInsurerName'),
        activeTpPolicyNumber: this._extractFieldRegex(text, /(?:TP Policy No\.?|Active TP Policy No\.?|Liability Policy No\.?)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,30})/i, 'activeTpPolicyNumber'),
        activeTpPolicyStartDate: this._extractDateByKeywords(text, ['tp start date', 'tp policy start', 'tp inception', 'liability from']),
        activeTpPolicyEndDate: this._extractDateByKeywords(text, ['tp end date', 'tp policy end', 'tp expiry', 'liability to', 'tp valid up to']),
        tpPremium: this._extractFieldRegex(text, /(?:Basic TP|Total TP Premium|Third Party Premium|TP Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i, 'tpPremium'),

        // Financing Details
        financed: this._extractFinanced(text),
        financierName: this._extractFinancierName(text),
        hypothecation: this._extractHypothecation(text),
        loanProvider: this._extractLoanProvider(text),

        // Premium Details Breakdown
        ownDamagePremium: this._extractFieldRegex(text, /(?:Total OD Premium|Own Damage Premium|Basic OD|OD Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i, 'ownDamagePremium'),
        thirdPartyPremium: this._extractFieldRegex(text, /(?:Total TP Premium|Third Party Premium|Basic TP|TP Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i, 'thirdPartyPremium'),
        personalAccidentPremium: this._extractFieldRegex(text, /(?:Compulsory PA|PA Cover for Owner Driver|PA to Owner Driver|PA Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i, 'personalAccidentPremium'),
        addonPremium: this._extractFieldRegex(text, /(?:Total Add-on Premium|Add-on Premium|Addon Premium|Total Endorsement Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i, 'addonPremium'),

        // Motor Add-ons & Coverages with Status & Premium
        addons: this._extractMotorAddons(text),
        zeroDepreciation: this._extractAddonFlag(text, /zero dep|bumper to bumper|nil dep|depreciation reimbursement|dep shield/i),
        engineProtection: this._extractAddonFlag(text, /engine protect|hydrostatic lock|engine and gearbox|engine shield/i),
        roadsideAssistance: this._extractAddonFlag(text, /roadside assist|rsa|24x7 spot assist|breakdown assistance/i),
        consumables: this._extractAddonFlag(text, /consumable|cost of consumables/i),
        returnToInvoice: this._extractAddonFlag(text, /return to invoice|rti|invoice price cover/i),
        ncbProtector: this._extractAddonFlag(text, /ncb protect|ncb shield|bonus protector/i),
        tyreProtector: this._extractAddonFlag(text, /tyre protect|tyre cover|tyre secure/i),
        keyReplacement: this._extractAddonFlag(text, /key replace|key protect|loss of key/i),
        personalBelongings: this._extractAddonFlag(text, /personal belonging|loss of baggage|baggage cover/i),
        personalAccidentCover: this._extractAddonFlag(text, /owner driver pa|compulsory pa|cpa cover/i)
      };
    }

    // Health Subtypes Specifics
    if (effectiveType === 'health') {
      insuredMembers = this._extractInsuredMembers(text, cleanLines);
      healthDetails = {
        roomRentLimit: this._extractFieldRegex(text, /(?:Room Rent|Room Category|Daily Room Rent)\s*[:\-–]?\s*([^\n\r,]+)/i, 'roomRentLimit'),
        icuLimit: this._extractFieldRegex(text, /(?:ICU Rent|ICU Charges|ICU Limit)\s*[:\-–]?\s*([^\n\r,]+)/i, 'icuLimit'),
        coPayment: this._extractFieldRegex(text, /(?:Co-Payment|Co-pay|Copay)\s*[:\-–]?\s*([^\n\r,]+)/i, 'coPayment'),
        deductible: this._extractDeductible(text),
        aggregateDeductible: effectiveSubtype === 'super_top_up' ? this._extractAggregateDeductible(text) : undefined,
        preExistingWaitingPeriod: this._extractFieldRegex(text, /(?:PED Waiting Period|Pre-existing Waiting Period)\s*[:\-–]?\s*(\d+\s*(?:Months|Years)?)/i, 'preExistingWaitingPeriod'),
        cumulativeBonus: this._extractFieldRegex(text, /(?:Cumulative Bonus|NCB|No Claim Bonus)\s*[:\-–]?\s*([₹\d,\.]+)/i, 'cumulativeBonus'),
        restorationBenefit: this._extractFieldRegex(text, /(?:Restoration|Recharge Benefit)\s*[:\-–]?\s*([^\n\r,]+)/i, 'restorationBenefit')
      };
    }

    // Life Subtypes Specifics
    if (effectiveType === 'life') {
      lifeDetails = {
        uin: this._extractFieldRegex(text, /(?:UIN|IRDAI UIN|IRDA\/UIN)\s*[:\-–]?\s*([0-9A-Z]+)/i, 'uin'),
        policyTermYears: this._extractFieldRegex(text, /(?:Policy Term|PT)\s*[:\-–]?\s*(\d{1,2})\s*(?:Years)?/i, 'policyTermYears'),
        premiumPaymentTermYears: this._extractFieldRegex(text, /(?:Premium Payment Term|PPT|Paying Term)\s*[:\-–]?\s*(\d{1,2})\s*(?:Years)?/i, 'premiumPaymentTermYears'),
        deathBenefit: this._extractFieldRegex(text, /(?:Death Benefit|Sum Assured on Death)\s*[:\-–]?\s*([₹Rs\d,\.]+)/i, 'deathBenefit'),
        maturityDate: this._extractDateByKeywords(text, ['maturity date', 'date of maturity', 'end date']),
        maturityBenefit: this._extractFieldRegex(text, /(?:Maturity Benefit|Sum Assured on Maturity)\s*[:\-–]?\s*([₹Rs\d,\.]+)/i, 'maturityBenefit'),
        smokerStatus: { value: /non[\s\-]smoker/i.test(text) ? 'non_smoker' : (/smoker/i.test(text) ? 'smoker' : 'non_smoker'), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 },
        accidentalDeathRider: this._extractFieldRegex(text, /(?:Accidental Death Benefit|ADB Rider)\s*[:\-–]?\s*([₹Rs\d,\.]+)/i, 'accidentalDeathRider'),
        criticalIllnessRider: this._extractFieldRegex(text, /(?:Critical Illness Rider|CI Rider)\s*[:\-–]?\s*([₹Rs\d,\.]+)/i, 'criticalIllnessRider'),
        waiverOfPremium: { value: /waiver of premium|wop/i.test(text), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 }
      };
    }

    // Travel Subtype Specifics
    if (effectiveSubtype === 'travel') {
      travelDetails = {
        passportNumber: this._extractFieldRegex(text, /(?:Passport Number|Passport No)\s*[:\-–]?\s*([A-Z0-9]{7,9})/i, 'passportNumber'),
        nationality: { value: 'Indian', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 },
        destinationCountry: this._extractFieldRegex(text, /(?:Destination Country|Country Visited|Geographical Zone)\s*[:\-–]?\s*([^\n\r,]+)/i, 'destinationCountry'),
        tripDurationDays: this._extractFieldRegex(text, /(?:Trip Duration|Duration of Travel|No\. of Days)\s*[:\-–]?\s*(\d{1,3})\s*Days?/i, 'tripDurationDays'),
        medicalExpensesLimit: this._extractFieldRegex(text, /(?:Medical Expense|Emergency Medical Evacuation)\s*[:\-–]?\s*([$\d,\.]+)/i, 'medicalExpensesLimit')
      };
    }

    // Property Subtype Specifics
    if (effectiveSubtype === 'home_property') {
      propertyDetails = {
        propertyAddress: this._extractFieldRegex(text, /(?:Risk Location|Property Address|Insured Location)\s*[:\-–]\s*([^\n\r]+(?:\n[^\n\r]+)?)/i, 'propertyAddress'),
        buildingSumInsured: this._extractFieldRegex(text, /(?:Building Structure Sum Insured|Structure SI)\s*[:\-–]?\s*([₹Rs\d,\.]+)/i, 'buildingSumInsured'),
        contentsSumInsured: this._extractFieldRegex(text, /(?:Contents Sum Insured|General Contents)\s*[:\-–]?\s*([₹Rs\d,\.]+)/i, 'contentsSumInsured'),
        builtUpAreaSqFt: this._extractFieldRegex(text, /(?:Built-up Area|Carpet Area)\s*[:\-–]?\s*(\d+)\s*(?:Sq\.?\s*Ft|sqft)?/i, 'builtUpAreaSqFt')
      };
    }

    return {
      classification: {
        isValid: classification.isValid,
        detectedType: classification.type,
        detectedSubtype: classification.subtype,
        effectiveType,
        effectiveSubtype,
        subtypeName: subtypeSchema?.name || effectiveSubtype,
        detectedInsurer: classification.insurer,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      },
      customer,
      policy,
      premium,
      nominee,
      motor,
      insuredMembers,
      healthDetails,
      lifeDetails,
      travelDetails,
      propertyDetails,
      brokerDetails,
      paymentDetails,
      metadata: {
        rawTextLength: text.length,
        extractedAt: new Date().toISOString(),
        parserVersion: '3.1.0-comprehensive-motor-schema'
      }
    };
  }


  // --- Common Helper Matchers with Strict Null/Not-Found Semantics ---

  _extractFieldRegex(text, regex, fieldName = '') {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = match[1].trim().replace(/\s+/g, ' ');
      if (val.length > 0) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractDeductible(text) {
    const match = text.match(/(?:Deductible|Threshold Deductible)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractAggregateDeductible(text) {
    const match = text.match(/(?:Annual Aggregate Deductible|Aggregate Deductible)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractCustomerName(text, lines) {
    const patterns = [
      /(?:Policyholder[\u02BC\u2019's\s]*Name|Policy\s*Holder[\u02BC\u2019's\s]*Name)\s*[:\-–]\s*([A-Za-z\s\.]{2,40})/i,
      /(?:Hi|Dear)\s+([A-Za-z\s]{2,40}),\s+(?:Welcome|Thank you)/i,
      /(?:Name of (?:the\s+)?Insured|Name of (?:the\s+)?Proposer|Insured Person[\u02BC\u2019's\s]*Name)\s*[:\-–]\s*([A-Za-z\s\.]{2,40})/i,
      /(?:Proposer|Insured|Customer)\s*Name\s*[:\-–]\s*([A-Za-z\s\.]{2,40})/i,
      /(?:mr\.|mrs\.|ms\.|dr\.)\s+([A-Za-z\s]{3,35})/i
    ];

    const invalidWords = ['nominee', 'insured', 'details', 'person', 'table', 'schedule', 'insurance', 'company', 'address', 'total', 'policy', 'select', 'medicare'];

    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        let val = match[1].trim();
        val = val.replace(/\s+(?:Mobile|Phone|Email|Address|Contact|DOB|Pan|City|Pin).*$/i, '').trim();
        val = val.replace(/\s+/g, ' ');

        const isInvalid = invalidWords.some(w => val.toLowerCase() === w || val.toLowerCase().startsWith(w + ' '));
        if (!isInvalid && val.length >= 3 && !/\d/.test(val)) {
          return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractMobile(text) {
    const match = text.match(/(?:Mobile\s*(?:Number|No)?|Phone\s*(?:No)?|Contact\s*(?:No)?)\s*[:\-–]?\s*(?:\+91[\s\-]?)?([6-9]\d{9})\b/i);
    if (match && match[1]) {
      return { value: match[1], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }

    const allMobiles = text.match(/\b([6-9]\d{9})\b/g);
    if (allMobiles) {
      for (const m of allMobiles) {
        if (!m.startsWith('1800') && !m.startsWith('022')) {
          return { value: m, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractEmail(text) {
    const emailMatches = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    if (emailMatches) {
      const excludedDomains = ['tataaig.com', 'hdfcergo.com', 'starhealth.in', 'icicilombard.com', 'careinsurance.com', 'example.com'];
      for (const em of emailMatches) {
        const lower = em.toLowerCase();
        const isExcluded = excludedDomains.some(dom => lower.includes(dom)) || lower.startsWith('support') || lower.startsWith('customercare') || lower.startsWith('customersupport') || lower.startsWith('info@');
        if (!isExcluded) {
          return { value: lower, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPan(text) {
    const labelMatch = text.match(/(?:PAN\s*(?:No|Number)?)\s*[:\-–]?\s*([A-Z]{5}[0-9]{4}[A-Z])/i);
    if (labelMatch && labelMatch[1]) {
      return { value: labelMatch[1].toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98 };
    }

    const match = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    if (match && match[1]) {
      return { value: match[1].toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractAadhaar(text) {
    const match = text.match(/(?:Aadhaar|Aadhar|UIDAI)\s*(?:No|Number)?\s*[:\-–]?\s*(\d{4}\s?\d{4}\s?\d{4})/i);
    if (match && match[1]) {
      return { value: match[1].replace(/\s/g, ''), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractGender(text) {
    if (/\b(?:gender|sex)\s*[:\-–]?\s*(male|m)\b/i.test(text) || /\bmr\.\s+/i.test(text)) {
      return { value: 'male', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    if (/\b(?:gender|sex)\s*[:\-–]?\s*(female|f)\b/i.test(text) || /\b(?:mrs\.|ms\.)\s+/i.test(text)) {
      return { value: 'female', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: 'male', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.7 };
  }

  _extractDob(text) {
    const patterns = [
      /(?:Date of Birth|DOB|Birth Date)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i,
      /(?:Self\s*[-–]?\s*|\bAge\s*\(\w+\)\s*)(\d{2}\/\d{2}\/\d{4})/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const iso = this._parseDateToIso(match[1]);
        if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractAddress(text) {
    const patterns = [
      /(?:Policyholder[\u02BC\u2019's\s]*Permanent Address[^:]*|Communication Address|Permanent Address|Residential Address)\s*[:\-–]\s*([^\n\r]+(?:\n[^\n\r]+)?)/i,
      /(?:Address)\s*[:\-–]\s*([^\n\r]+(?:\n[^\n\r]+)?)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        let val = match[1].trim().replace(/\s+/g, ' ');
        if (val.length > 8 && !val.toLowerCase().includes('website') && !val.toLowerCase().includes('company')) {
          return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractCity(text) {
    const directMatch = text.match(/(?:City|Town)\s*[:\-–]?\s*([A-Za-z\s]{3,30})/i);
    if (directMatch && directMatch[1]) {
      const c = directMatch[1].trim();
      if (!['state', 'pin', 'pincode', 'india'].includes(c.toLowerCase())) {
        return { value: c, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }

    const majorCities = ['Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli', 'Dharwad', 'Bareilly', 'Moradabad', 'Mysore', 'Gurgaon', 'Gurugram', 'Aligarh', 'Jalandhar', 'Tiruchirappalli', 'Bhubaneswar', 'Salem', 'Warangal', 'Mira-Bhayandar', 'Thiruvananthapuram', 'Bhiwandi', 'Saharanpur', 'Guntur', 'Amravati', 'Bikaner', 'Noida', 'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Rourkela', 'Nanded', 'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar', 'Jammu', 'Sangli-Miraj', 'Mangalore', 'Erode', 'Belgaum', 'Ambattur', 'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur', 'Maheshtala'];
    
    for (const city of majorCities) {
      const reg = new RegExp(`\\b${city}\\b`, 'i');
      if (reg.test(text)) {
        return { value: city, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractState(text) {
    const directMatch = text.match(/(?:State)\s*[:\-–]?\s*([A-Za-z\s]{3,30})/i);
    if (directMatch && directMatch[1]) {
      const s = directMatch[1].trim();
      if (!['pin', 'pincode', 'india', 'country'].includes(s.toLowerCase())) {
        return { value: s, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }

    const indianStates = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry'];

    for (const state of indianStates) {
      const reg = new RegExp(`\\b${state}\\b`, 'i');
      if (reg.test(text)) {
        return { value: state, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPincode(text) {
    const match = text.match(/(?:Pin|Pincode|Postal Code|PIN Code)\s*[:\-–]?\s*(\d{6})\b/i);
    if (match && match[1]) {
      return { value: match[1], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98 };
    }

    const pinMatches = text.match(/\b([1-9][0-9]{5})\b/g);
    if (pinMatches) {
      for (const p of pinMatches) {
        if (!p.startsWith('1800') && !p.startsWith('1900') && !p.startsWith('2024') && !p.startsWith('2025') && !p.startsWith('2026')) {
          return { value: p, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractInsurer(text) {
    if (text.includes('tata aig')) return { value: 'Tata AIG General Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('hdfc ergo')) return { value: 'HDFC ERGO General Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('star health')) return { value: 'Star Health and Allied Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('icici lombard')) return { value: 'ICICI Lombard General Insurance Co. Ltd.', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('icici prudential') || text.includes('icici pru')) return { value: 'ICICI Prudential Life Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('care health') || text.includes('religare')) return { value: 'Care Health Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('niva bupa') || text.includes('max bupa')) return { value: 'Niva Bupa Health Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('bajaj allianz')) return { value: 'Bajaj Allianz General Insurance Co. Ltd.', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('life insurance corporation') || text.includes('lic of india') || text.includes(' lic ')) return { value: 'Life Insurance Corporation of India (LIC)', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('max life')) return { value: 'Max Life Insurance Co. Ltd.', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('sbi general')) return { value: 'SBI General Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('sbi life')) return { value: 'SBI Life Insurance Company Limited', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };
    if (text.includes('new india assurance')) return { value: 'The New India Assurance Co. Ltd.', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.99 };

    const match = text.match(/(?:Insurer|Insurance Company|Underwritten by)\s*[:\-–]?\s*([A-Za-z\s\.]{4,50}(?:Insurance|Assurance)[A-Za-z\s\.]*)/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }

    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPolicyNumber(text) {
    const patterns = [
      /(?:Policy\s*(?:Number|No\.?)|Certificate\s*(?:No\.?|Number)|Policy\s*#)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,30})/i,
      /(?:Policy\/Certificate\s*No\.?)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,30})/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        let val = match[1].trim();
        if (!val.toLowerCase().includes('date') && !val.toLowerCase().includes('type') && val.length >= 6) {
          return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractProduct(text) {
    const patterns = [
      /(?:Product\s*Name|Plan\s*Name|Policy\s*Name)\s*[:\-–]?\s*([A-Za-z0-9\s\-\(\)\.]{3,40})/i,
      /(?:Tata AIG|HDFC ERGO|Star Health|Care|ICICI Lombard)\s+([A-Za-z0-9\s\-]{3,35}\s+(?:Premier|Plus|Optima|MediCare|Health|Advantage|Shield|Raksha|Suraksha))/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        let val = match[1].trim().replace(/\s+/g, ' ');
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    if (text.includes('medicare premier')) return { value: 'Tata AIG MediCare Premier', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    if (text.includes('optima secure')) return { value: 'HDFC ERGO Optima Secure', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPlan(text) {
    const match = text.match(/(?:Plan|Variant|Option)\s*[:\-–]?\s*([A-Za-z0-9\s\-]{3,30})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractBusinessType(text) {
    if (/\b(?:rollover|roll\s*over)\b/i.test(text)) return { value: 'rollover', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/\b(?:renewal|renewed)\b/i.test(text)) return { value: 'renewal', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/\b(?:portability|ported)\b/i.test(text)) return { value: 'portability', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    return { value: 'new', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
  }

  _extractStartDate(text) {
    const patterns = [
      /(?:Period of Insurance|Policy Period)[^:]*From\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i,
      /(?:Risk Start Date|Policy Start Date|Inception Date|Start Date|Effective Date)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i,
      /(?:From\s*[:\-–]?\s*)([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})(?:\s*To\s*|\s*until\s*)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const iso = this._parseDateToIso(match[1]);
        if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractEndDate(text) {
    const patterns = [
      /(?:Period of Insurance|Policy Period)[^:]*To\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i,
      /(?:Risk End Date|Policy Expiry Date|Expiry Date|End Date|Valid Upto|Valid Till)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i,
      /(?:To\s*[:\-–]?\s*)([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const iso = this._parseDateToIso(match[1]);
        if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractRenewalDate(text) {
    const match = text.match(/(?:Renewal Date|Next Renewal Due Date|Renewal Due Date)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i);
    if (match && match[1]) {
      const iso = this._parseDateToIso(match[1]);
      if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractDateByKeywords(text, keywords) {
    for (const kw of keywords) {
      const reg = new RegExp(`(?:${kw})\\s*[:\\-–]?\\s*([0-3]?\\d[\\/\\-\\.] [0-1]?\\d[\\/\\-\\.]\\d{4}|[0-3]?\\d[\\/\\-\\.] [0-1]?\\d[\\/\\-\\.]\\d{4})`, 'i');
      const match = text.match(new RegExp(`(?:${kw})\\s*[:\\-–]?\\s*([0-3]?\\d[\\/\\-\\._][0-1]?\\d[\\/\\-\\._]\\d{4})`, 'i'));
      if (match && match[1]) {
        const iso = this._parseDateToIso(match[1]);
        if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractSumAssured(text) {
    const patterns = [
      /(?:Sum Insured|Sum Assured|Coverage Amount|Base Sum Insured)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:Sum Insured \(Rs\.\))\s*[:\-–]?\s*([\d,]+(?:\.\d{2})?)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const cleaned = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(cleaned) && cleaned >= 10000) {
          return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractBasicPremium(text) {
    const patterns = [
      /(?:Basic Premium|Net Premium|Base Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const cleaned = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(cleaned) && cleaned > 0) {
          return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractGst(text) {
    const patterns = [
      /(?:Total GST|GST \(18%\)|IGST|CGST\s*\+\s*SGST|Goods & Services Tax|Tax Amount)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const cleaned = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(cleaned) && cleaned > 0) {
          return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractNetPremium(text) {
    const match = text.match(/(?:Net Premium|Premium before Tax)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned) && cleaned > 0) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractFinalPremium(text) {
    const patterns = [
      /(?:Total Premium|Gross Premium|Total Amount Payable|Final Premium|Amount Paid|Premium Amount)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:Total\s*\(INR\)|Total Amount)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const cleaned = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(cleaned) && cleaned > 0) {
          return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractInstallmentAmount(text) {
    const match = text.match(/(?:Installment Amount|Monthly Premium|Quarterly Premium)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractInsuredMembers(text, lines) {
    const members = [];
    const memberRegex = /(?:(\d{1,2})\s*[\.\)]\s*)?([A-Za-z\s\.]{3,35})\s*(?:\|\s*|–\s*|-|\s+)(?:DOB\s*[:\-]?\s*)?([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})?\s*(?:\|\s*|–\s*|-|\s+)?(?:Age\s*[:\-]?\s*)?(\d{1,2})?\s*(?:\|\s*|–\s*|-|\s+)?(Male|Female|M|F)?\s*(?:\|\s*|–\s*|-|\s+)?(?:Relation\s*[:\-]?\s*)?(Self|Spouse|Wife|Husband|Son|Daughter|Father|Mother|Child|Dependent)?/gi;

    const sections = text.split(/(?:Details of Persons? Insured|Insured Person Details|Member Details|Insured Members)/i);
    const targetSection = sections.length > 1 ? sections[1].slice(0, 1500) : text;

    let m;
    while ((m = memberRegex.exec(targetSection)) !== null) {
      const rawName = m[2]?.trim();
      const rawDob = m[3];
      const rawAge = m[4] ? parseInt(m[4], 10) : undefined;
      const rawGender = m[5] ? (m[5].toUpperCase().startsWith('F') ? 'female' : 'male') : 'male';
      const rawRelation = m[6] ? m[6].trim() : (members.length === 0 ? 'Self' : 'Dependent');

      if (rawName && rawName.length >= 3 && !['details', 'insured', 'relationship', 'relation', 'gender', 'name'].includes(rawName.toLowerCase())) {
        if (!members.find(existing => existing.name.toLowerCase() === rawName.toLowerCase())) {
          members.push({
            name: rawName,
            dob: rawDob ? this._parseDateToIso(rawDob) : undefined,
            age: rawAge,
            gender: rawGender,
            relationship: rawRelation,
            memberId: `MEM-${members.length + 1}`
          });
        }
      }
    }

    // Default primary customer as Self if no members discovered
    if (members.length === 0) {
      const custName = this._extractCustomerName(text, lines);
      if (custName.value) {
        members.push({
          name: custName.value,
          gender: 'male',
          relationship: 'Self',
          memberId: 'MEM-1'
        });
      }
    }

    return members;
  }

  _extractNomineeName(text) {
    const patterns = [
      /(?:Nominee[\u02BC\u2019's\s]*Name|Name of Nominee|Nominee)\s*[:\-–]\s*([A-Za-z\s\.]{2,40})/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        let val = match[1].trim();
        val = val.replace(/\s+(?:Relationship|Relation|DOB|Age|Share).*$/i, '').trim();
        if (val.length >= 2 && !val.toLowerCase().includes('not applicable') && !val.toLowerCase().includes('na')) {
          return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractNomineeRelation(text) {
    const match = text.match(/(?:Nominee Relationship|Nominee Relation|Relationship with Nominee|Relation)\s*[:\-–]?\s*([A-Za-z]{3,20})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractNomineeDob(text) {
    const match = text.match(/(?:Nominee DOB|Nominee Date of Birth)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i);
    if (match && match[1]) {
      const iso = this._parseDateToIso(match[1]);
      if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  // --- Motor Vehicle & Policy Extractors (Comprehensive Schema) ---

  _extractTitle(text) {
    const match = text.match(/\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|M\/s\.?|Prof\.?|Shri\.?|Smt\.?)\s+/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractCustomerType(text) {
    if (/\b(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|Ltd\.?|LLP|Enterprises|Corporation|Solutions|Services|Motors|Logistics|Industries|Infotech|Hospitality)\b/i.test(text) || /\bM\/s\b/i.test(text)) {
      return { value: 'company', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    if (/\b(?:individual|proposer\s*name|insured\s*person)\b/i.test(text)) {
      return { value: 'individual', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: 'individual', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.75, source: 'document' };
  }

  _extractDistrict(text) {
    const match = text.match(/(?:District|Dist\.?)\s*[:\-–]?\s*([A-Za-z\s]{3,30})/i);
    if (match && match[1]) {
      const val = match[1].trim();
      if (!['state', 'pin', 'pincode', 'india'].includes(val.toLowerCase())) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractMotorPolicyType(text, effectiveType) {
    if (effectiveType === 'motor') {
      if (/\b(?:standalone\s*od|own\s*damage\s*only|od\s*only)\b/i.test(text)) {
        return { value: 'OD Only Policy', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
      if (/\b(?:liability\s*only|act\s*only|third\s*party\s*only|tp\s*only)\b/i.test(text)) {
        return { value: 'TP Only Policy', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
      if (/\b(?:package|comprehensive|bundled|annual\s*package)\b/i.test(text)) {
        return { value: 'Package Policy', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
      return { value: 'Package Policy', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.8, source: 'document' };
    }
    return { value: effectiveType, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
  }

  _extractTenureYears(text) {
    const match = text.match(/(?:Tenure|Period of Insurance)\s*[:\-–]?\s*(\d+)\s*(?:Years?|Yr)/i);
    if (match && match[1]) {
      return { value: parseInt(match[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: 1, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.8, source: 'document' };
  }

  _extractGstPercentage(text) {
    const match = text.match(/(?:GST|IGST|CGST\s*\+\s*SGST)\s*(?:@|\()\s*(\d{1,2}(?:\.\d{1,2})?)\s*%/i);
    if (match && match[1]) {
      return { value: parseFloat(match[1]), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractCess(text) {
    const match = text.match(/(?:Cess|Kerala Flood Cess|KFC)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractDiscount(text) {
    const match = text.match(/(?:Special Discount|Total Discount|Discount Amount|OD Discount)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractLoading(text) {
    const match = text.match(/(?:Loading|Underwriter Loading|Total Loading)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractNomineeShare(text) {
    const match = text.match(/(?:Nominee Share|Share\s*%|Entitlement)\s*[:\-–]?\s*(\d{1,3})\s*%/i);
    if (match && match[1]) {
      return { value: parseInt(match[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: 100, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.8, source: 'document' };
  }

  _extractBrokerDetails(text) {
    const brokerAgency = this._extractFieldRegex(text, /(?:Broker Name|Agency Name|Broker\/Agent Name|Intermediary Name|Agent Name)\s*[:\-–]?\s*([A-Za-z0-9\s\.\-]{3,40})/i, 'brokerAgency');
    const agentName = this._extractFieldRegex(text, /(?:POSP Name|Agent Name|Advisor Name|Sales Manager)\s*[:\-–]?\s*([A-Za-z\s\.]{3,35})/i, 'agentName');
    const subAgent = this._extractFieldRegex(text, /(?:Sub[- ]?Agent|Channel Partner|SP Name)\s*[:\-–]?\s*([A-Za-z\s\.]{3,35})/i, 'subAgent');
    const brokerCode = this._extractFieldRegex(text, /(?:Broker Code|Intermediary Code|Agency Code)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{4,25})/i, 'brokerCode');
    const agentCode = this._extractFieldRegex(text, /(?:Agent Code|POSP Code|Advisor Code)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{4,25})/i, 'agentCode');

    return {
      brokerAgency,
      agentName,
      subAgent,
      brokerCode,
      agentCode
    };
  }

  _extractPaymentDetails(text) {
    const paymentStatus = /\b(?:payment\s*success|paid|payment\s*received|transaction\s*successful)\b/i.test(text)
      ? { value: 'completed', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' }
      : { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };

    let paymentMethod = { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
    if (/\b(?:online|netbanking|gateway|razorpay|billdesk|ccavenue)\b/i.test(text)) {
      paymentMethod = { value: 'Online', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    } else if (/\b(?:credit\s*card|debit\s*card)\b/i.test(text)) {
      paymentMethod = { value: 'Credit', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    } else if (/\b(?:upi|gpay|phonepe|paytm)\b/i.test(text)) {
      paymentMethod = { value: 'UPI/NEFT', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    } else if (/\b(?:cheque|dd|demand\s*draft)\b/i.test(text)) {
      paymentMethod = { value: 'Cheque', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    } else if (/\b(?:cash)\b/i.test(text)) {
      paymentMethod = { value: 'Cash', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }

    const transactionReference = this._extractFieldRegex(text, /(?:Txn\s*ID|Transaction\s*(?:No\.?|Ref\.?|ID)|UTR\s*No\.?|Payment\s*Ref\.?)\s*[:\-–]?\s*([A-Za-z0-9\-_]{6,35})/i, 'transactionReference');
    const receiptNumber = this._extractFieldRegex(text, /(?:Receipt\s*(?:No\.?|Number)|Collection\s*No\.?)\s*[:\-–]?\s*([A-Za-z0-9\-_]{6,30})/i, 'receiptNumber');
    const paymentDate = this._extractDateByKeywords(text, ['payment date', 'receipt date', 'collection date', 'transaction date']);

    return {
      paymentStatus,
      paymentMethod,
      paymentDate,
      paymentAmount: this._extractFieldRegex(text, /(?:Payment Amount|Amount Received|Total Paid)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i, 'paymentAmount'),
      transactionReference,
      receiptNumber
    };
  }

  // --- Motor Vehicle Details ---

  _extractVehicleReg(text) {
    const patterns = [
      /(?:Registration\s*(?:Number|No\.?)|Vehicle\s*(?:Number|No\.?)|Regn?\s*No\.?)\s*[:\-–]?\s*([A-Z]{2}\s*[0-9]{1,2}\s*[A-Z]{0,3}\s*[0-9]{4})/i,
      /\b([A-Z]{2}\s*[0-9]{2}\s*[A-Z]{1,2}\s*[0-9]{4})\b/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        // Normalize: RJ60 CE 5618 -> RJ60CE5618
        const normalized = match[1].replace(/\s+/g, '').toUpperCase();
        if (normalized.length >= 7 && normalized.length <= 11) {
          return { value: normalized, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98, source: 'document' };
        }
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleType(text, subtype) {
    if (subtype === 'two_wheeler' || text.includes('two wheeler') || text.includes('motorcycle') || text.includes('scooter') || text.includes('bike') || text.includes('2-wheeler')) {
      return { value: 'Two-Wheeler', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    if (subtype === 'commercial_vehicle' || text.includes('commercial vehicle') || text.includes('goods carrying') || text.includes('gcv') || text.includes('pcv') || text.includes('passenger carrying')) {
      return { value: 'Commercial Vehicle', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: 'Private Car', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
  }

  _extractVehicleCategory(text) {
    if (/\b(?:two wheeler|2-wheeler|motorcycle|scooter|moped)\b/i.test(text)) {
      return { value: 'Two Wheeler', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    if (/\b(?:goods carrier|goods carrying|gcv|truck|lorry|tipper)\b/i.test(text)) {
      return { value: 'Goods Carrier', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    if (/\b(?:passenger carrier|passenger carrying|pcv|bus|taxi|auto rickshaw|maxi cab)\b/i.test(text)) {
      return { value: 'Passenger Carrier', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    if (/\b(?:miscellaneous|tractor|crane|ambulance|harvester)\b/i.test(text)) {
      return { value: 'Miscellaneous', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    if (/\b(?:private car|4-wheeler|car|sedan|suv|hatchback)\b/i.test(text)) {
      return { value: 'Private Car', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleMake(text) {
    const makes = [
      'Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Honda', 'Toyota', 'Kia', 'Volkswagen',
      'Skoda', 'MG Motor', 'Renault', 'Nissan', 'Hero MotoCorp', 'Bajaj Auto', 'TVS', 'Royal Enfield',
      'Yamaha', 'Suzuki', 'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'Jeep', 'Ford', 'Fiat', 'Chevrolet',
      'Eicher', 'Ashok Leyland', 'BharatBenz', 'Force Motors', 'Piaggio', 'Ather', 'Ola Electric'
    ];
    for (const m of makes) {
      const reg = new RegExp(`\\b${m}\\b`, 'i');
      if (reg.test(text)) {
        return { value: m, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
    }
    const match = text.match(/(?:Make|Manufacturer)\s*[:\-–]?\s*([A-Za-z\s]{3,25})/i);
    if (match && match[1]) {
      const val = match[1].trim();
      if (!['model', 'variant', 'year', 'type'].includes(val.toLowerCase())) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleModel(text) {
    const match = text.match(/(?:Model)\s*[:\-–]?\s*([A-Za-z0-9\s\-]{2,30})/i);
    if (match && match[1]) {
      let val = match[1].trim();
      val = val.replace(/\s+(?:Variant|Year|Fuel|Type|CC|Seating).*$/i, '').trim();
      if (val.length >= 2) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleVariant(text) {
    const match = text.match(/(?:Variant|Sub-type|Trim)\s*[:\-–]?\s*([A-Za-z0-9\s\-\.()]{2,35})/i);
    if (match && match[1]) {
      let val = match[1].trim();
      val = val.replace(/\s+(?:Year|Fuel|Engine|Chassis).*$/i, '').trim();
      if (val.length >= 2) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleSubModel(text) {
    const match = text.match(/(?:Sub[- ]?Model)\s*[:\-–]?\s*([A-Za-z0-9\s\-\.]{2,30})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractFuelType(text) {
    if (/\b(?:cng\s*\+\s*petrol|petrol\s*\+\s*cng|cng)\b/i.test(text)) return { value: 'CNG', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    if (/\b(?:diesel)\b/i.test(text)) return { value: 'Diesel', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    if (/\b(?:electric|battery\s*operated|ev)\b/i.test(text)) return { value: 'Electric', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    if (/\b(?:hybrid)\b/i.test(text)) return { value: 'Hybrid', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    if (/\b(?:lpg)\b/i.test(text)) return { value: 'LPG', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    if (/\b(?:petrol)\b/i.test(text)) return { value: 'Petrol', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractCubicCapacity(text) {
    const match = text.match(/(?:Cubic Capacity|C\.?C\.?|CC|Engine Capacity)\s*[:\-–]?\s*(\d{2,5})\s*(?:cc)?/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (val >= 50 && val <= 16000) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractSeatingCapacity(text) {
    const match = text.match(/(?:Seating Capacity|Carrying Capacity \(Persons\)|Seats|No\. of Seats)\s*[:\-–]?\s*(\d{1,3})/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (val >= 1 && val <= 120) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractNumberOfTyres(text) {
    const match = text.match(/(?:No\. of Tyres|Number of Tyres|Wheels)\s*[:\-–]?\s*(\d{1,2})/i);
    if (match && match[1]) {
      return { value: parseInt(match[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleColor(text) {
    const colors = ['White', 'Black', 'Silver', 'Grey', 'Gray', 'Red', 'Blue', 'Brown', 'Beige', 'Green', 'Yellow', 'Orange', 'Maroon', 'Gold', 'Bronze'];
    for (const c of colors) {
      const reg = new RegExp(`(?:Color|Colour)\\s*[:\\-–]?\\s*${c}\\b|\\b${c}\\b.*(?:Color|Colour)`, 'i');
      if (reg.test(text)) {
        return { value: c, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    const match = text.match(/(?:Color|Colour)\s*[:\-–]?\s*([A-Za-z]{3,20})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractRtoDetails(text, regNum) {
    let rtoCode = { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
    let rtoName = { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };

    const match = text.match(/(?:RTO|Registering Authority|Registration Authority)\s*[:\-–]?\s*([A-Z]{2}[0-9]{1,2})\s*[-–]?\s*([A-Za-z\s,]{2,30})?/i);
    if (match && match[1]) {
      rtoCode = { value: match[1].toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      if (match[2] && match[2].trim().length >= 2) {
        rtoName = { value: match[2].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    } else if (regNum && regNum.length >= 4) {
      // Derive RTO code from registration number prefix e.g. RJ60CE5618 -> RJ60
      const prefix = regNum.slice(0, 4);
      if (/^[A-Z]{2}\d{2}$/.test(prefix)) {
        rtoCode = { value: prefix, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'derived' };
      }
    }

    return { rtoCode, rtoName };
  }

  _extractRegistrationState(text, rtoInfo) {
    const match = text.match(/(?:Registration State|State of Registration)\s*[:\-–]?\s*([A-Za-z\s]{3,25})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    // Infer state from RTO code prefix if available (e.g. RJ -> Rajasthan, MH -> Maharashtra, DL -> Delhi)
    const stateMap = {
      'RJ': 'Rajasthan', 'MH': 'Maharashtra', 'DL': 'Delhi', 'HR': 'Haryana', 'UP': 'Uttar Pradesh',
      'KA': 'Karnataka', 'TN': 'Tamil Nadu', 'GJ': 'Gujarat', 'WB': 'West Bengal', 'MP': 'Madhya Pradesh',
      'AP': 'Andhra Pradesh', 'TS': 'Telangana', 'KL': 'Kerala', 'PB': 'Punjab', 'CH': 'Chandigarh',
      'BR': 'Bihar', 'JH': 'Jharkhand', 'OD': 'Odisha', 'UK': 'Uttarakhand', 'HP': 'Himachal Pradesh',
      'GA': 'Goa', 'AS': 'Assam', 'TR': 'Tripura', 'ML': 'Meghalaya', 'MN': 'Manipur', 'JK': 'Jammu & Kashmir'
    };
    if (rtoInfo?.rtoCode?.value) {
      const code = rtoInfo.rtoCode.value.slice(0, 2);
      if (stateMap[code]) {
        return { value: stateMap[code], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'derived' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractRegistrationCity(text, rtoInfo) {
    if (rtoInfo?.rtoName?.value) {
      return { ...rtoInfo.rtoName };
    }
    const match = text.match(/(?:Registration City|RTO Location)\s*[:\-–]?\s*([A-Za-z\s]{3,25})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractZone(text) {
    const match = text.match(/(?:Zone|Tariff Zone)\s*[:\-–]?\s*(Zone\s*[A-Z]|[A-Z])/i);
    if (match && match[1]) {
      return { value: match[1].trim().toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractManufacturingMonth(text) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (const m of months) {
      const reg = new RegExp(`(?:Mfg\\.?\\s*Month|Month of Mfg|Manufacturing Month)\\s*[:\\-–]?\\s*${m}\\b`, 'i');
      if (reg.test(text)) {
        return { value: m, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
      }
    }
    const match = text.match(/(?:Mfg\\.?\\s*Date|Manufacturing)\\s*[:\\-–]?\\s*([0-1]?\\d)\\s*[\\/\\-](?:19\\d{2}|20\\d{2})/i);
    if (match && match[1]) {
      const mNum = parseInt(match[1], 10);
      if (mNum >= 1 && mNum <= 12) {
        return { value: months[mNum - 1], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractManufacturingYear(text) {
    const match = text.match(/(?:Manufacturing Year|Year of Manufacture|Mfg\.?\s*Year|Mfg\s*Yr|Year of Mfg)\s*[:\-–]?\s*(19\d{2}|20\d{2})/i);
    if (match && match[1]) {
      return { value: parseInt(match[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractManufacturingDate(text) {
    const match = text.match(/(?:Manufacturing Date|Date of Mfg|Mfg\.?\s*Date)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i);
    if (match && match[1]) {
      const iso = this._parseDateToIso(match[1]);
      if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractEngineNumber(text) {
    const match = text.match(/(?:Engine\s*(?:Number|No\.?))\s*[:\-–]?\s*([A-Za-z0-9]{6,25})/i);
    if (match && match[1]) {
      return { value: match[1].trim().toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractChassisNumber(text) {
    const match = text.match(/(?:Chassis\s*(?:Number|No\.?)|VIN\s*(?:No\.?|Number)?)\s*[:\-–]?\s*([A-Za-z0-9]{8,25})/i);
    if (match && match[1]) {
      return { value: match[1].trim().toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVinNumber(text) {
    const match = text.match(/(?:VIN|Vehicle Identification Number)\s*[:\-–]?\s*([A-Za-z0-9]{17})/i);
    if (match && match[1]) {
      return { value: match[1].trim().toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractIdentificationNumber(text) {
    const match = text.match(/(?:Identification\s*(?:Number|No\.?))\s*[:\-–]?\s*([A-Za-z0-9\-]{6,25})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractIdv(text) {
    const match = text.match(/(?:IDV|Insured Declared Value|Total IDV)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned) && cleaned > 1000) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractVehicleValue(text) {
    const match = text.match(/(?:Vehicle Value|Ex-Showroom Price|Invoice Value)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned) && cleaned > 1000) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractNcb(text) {
    const match = text.match(/(?:Current NCB|NCB\s*\(%\)|No Claim Bonus|NCB Entitlement|NCB Applicable)\s*[:\-–]?\s*(\d{1,2})\s*%/i);
    if (match && match[1]) {
      return { value: parseInt(match[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    const genericNcb = text.match(/(?:NCB|No Claim Bonus)\s*[:\-–]?\s*(\d{1,2})\s*%/i);
    if (genericNcb && genericNcb[1]) {
      return { value: parseInt(genericNcb[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractPreviousNcb(text) {
    const match = text.match(/(?:Previous NCB|Prev\.?\s*NCB|Expiring Policy NCB)\s*[:\-–]?\s*(\d{1,2})\s*%/i);
    if (match && match[1]) {
      return { value: parseInt(match[1], 10), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractPreviousPolicyAvailable(text) {
    if (/\b(?:previous policy|prev\.?\s*policy|previous insurer|expiring policy)\b/i.test(text)) {
      return { value: true, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractPreviousInsurer(text) {
    const match = text.match(/(?:Previous Insurer|Prev\.?\s*Insurer|Expiring Insurer)\s*[:\-–]?\s*([A-Za-z\s\.]{4,40})/i);
    if (match && match[1]) {
      const val = match[1].trim();
      if (!['policy', 'number', 'date', 'ncb'].includes(val.toLowerCase())) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractPreviousPolicy(text) {
    const match = text.match(/(?:Previous Policy No\.?|Prev\.?\s*Policy No\.?|Expiring Policy No\.?)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,30})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractPreviousPolicyType(text) {
    const match = text.match(/(?:Previous Policy Type|Expiring Policy Type)\s*[:\-–]?\s*([A-Za-z\s]{3,25})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractPreviousIdv(text) {
    const match = text.match(/(?:Previous IDV|Prev\.?\s*IDV|Expiring IDV)\s*[:\-–]?\s*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const cleaned = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleaned)) {
        return { value: cleaned, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractFinanced(text) {
    if (/\b(?:hypothecated to|hypothecation\s*with|financed\s*by|loan\s*from|hpa\s*with)\b/i.test(text)) {
      return { value: true, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    if (/\b(?:not\s*hypothecated|not\s*financed|hypothecation\s*:\s*no)\b/i.test(text)) {
      return { value: false, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractFinancierName(text) {
    const match = text.match(/(?:Hypothecated to|Financed by|Financier Name|HPA with|Bank Name|Loan Provider)\s*[:\-–]?\s*([A-Za-z0-9\s\.\-&]{3,40})/i);
    if (match && match[1]) {
      const val = match[1].trim();
      if (!['none', 'nil', 'na', 'not applicable'].includes(val.toLowerCase())) {
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9, source: 'document' };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractHypothecation(text) {
    const match = text.match(/(?:Hypothecation Details|Hypothecation City|HPA Details)\s*[:\-–]?\s*([A-Za-z0-9\s,\.\-]{3,40})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractLoanProvider(text) {
    const match = text.match(/(?:Loan Provider|Financing Entity)\s*[:\-–]?\s*([A-Za-z0-9\s\.\-]{3,40})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractAddonFlag(text, regex) {
    if (regex.test(text)) {
      return { value: true, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.92, source: 'document' };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: null, source: 'document' };
  }

  _extractMotorAddons(text) {
    const addonCatalog = [
      { name: 'Zero Depreciation', regex: /zero dep|bumper to bumper|nil dep|depreciation reimbursement/i },
      { name: 'Engine Protector', regex: /engine protect|hydrostatic lock|engine and gearbox/i },
      { name: 'Road Side Assistance', regex: /roadside assist|rsa|24x7 spot assist|breakdown assist/i },
      { name: 'Consumables', regex: /consumable|cost of consumables/i },
      { name: 'Return to Invoice', regex: /return to invoice|rti|invoice price cover/i },
      { name: 'NCB Protector', regex: /ncb protect|ncb shield|bonus protector/i },
      { name: 'Tyre Protector', regex: /tyre protect|tyre cover|tyre secure/i },
      { name: 'Key Replacement', regex: /key replace|key protect|loss of key/i },
      { name: 'Personal Belongings', regex: /personal belonging|loss of baggage|baggage cover/i },
      { name: 'Personal Accident Cover', regex: /owner driver pa|compulsory pa|cpa cover/i }
    ];

    const detectedAddons = [];
    for (const addon of addonCatalog) {
      if (addon.regex.test(text)) {
        // Try extracting specific premium for this addon
        const premRegex = new RegExp(`(?:${addon.name})\\s*[:\\-–]?\\s*[₹Rs\\.]*\\s*([\\d,]+(?:\\.\\d{2})?)`, 'i');
        const pMatch = text.match(premRegex);
        const premium = pMatch && pMatch[1] ? parseFloat(pMatch[1].replace(/,/g, '')) : null;

        detectedAddons.push({
          name: addon.name,
          status: 'included',
          selected: true,
          premium: premium,
          source: 'document'
        });
      }
    }
    return detectedAddons;
  }

  // Helper date normalizer
  _parseDateToIso(dateStr) {
    if (!dateStr) return null;
    const cleaned = dateStr.trim().replace(/[\._]/g, '-').replace(/\//g, '-');
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
    return null;
  }
}


let instance = null;
const getInsuranceLlmExtractor = () => {
  if (!instance) {
    instance = new InsuranceLlmExtractor();
  }
  return instance;
};

module.exports = {
  InsuranceLlmExtractor,
  getInsuranceLlmExtractor
};
