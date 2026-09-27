/**
 * Insurance Field Validator & Consistency Engine for INSecure CRM
 * Strictly enforces anti-hallucination rules, field-level validators,
 * cross-field consistency checks, and normalized status tagging.
 */

const FIELD_STATUSES = {
  EXPLICITLY_EXTRACTED: 'EXPLICITLY_EXTRACTED',
  VALIDATED: 'VALIDATED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  NOT_DETECTED: 'NOT_DETECTED',
  INVALID_VALUE: 'INVALID_VALUE',
  CONFLICT: 'CONFLICT'
};

class InsuranceFieldValidator {
  /**
   * Validates and normalizes an entire extracted insurance payload
   * @param {object} rawExtraction Extracted document object from Docling/Regex
   * @param {string} fullText Document raw text for cross-validation
   * @returns {object} Normalized and validated schema payload with explicit field statuses
   */
  validateAndNormalize(rawExtraction, fullText = '') {
    const text = (fullText || '').toLowerCase();
    
    // 1. Customer Validation
    const rawCust = rawExtraction.customer || {};
    const titleVal = this._cleanString(rawCust.title?.value || rawCust.title);
    const rawGenderVal = this._cleanString(rawCust.gender?.value || rawCust.gender);
    
    // Anti-hallucination rule: DO NOT infer gender from title.
    // Only accept gender if document explicitly contains 'gender' or 'sex' keywords.
    const hasExplicitGenderInDoc = /\b(?:gender|sex)\s*[:\-–]?\s*(male|female|other|m|f)\b/i.test(fullText);
    let validatedGender = { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    
    if (rawGenderVal && hasExplicitGenderInDoc) {
      const gLower = rawGenderVal.toLowerCase();
      if (gLower === 'female' || gLower === 'f') {
        validatedGender = { value: 'female', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
      } else if (gLower === 'male' || gLower === 'm') {
        validatedGender = { value: 'male', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
      } else if (gLower === 'other') {
        validatedGender = { value: 'other', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
      }
    }

    // Cross-field conflict check: Title vs Gender
    if (titleVal && validatedGender.value) {
      const tLower = titleVal.toLowerCase();
      if ((tLower === 'mr.' || tLower === 'mr') && validatedGender.value === 'female') {
        // Conflict! Clear gender to null with NOT_DETECTED / CONFLICT unless explicitly stated
        if (!hasExplicitGenderInDoc) {
          validatedGender = { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
        } else {
          validatedGender.status = FIELD_STATUSES.CONFLICT;
        }
      }
    }

    // Customer Name
    const validatedName = this._validateName(rawCust.name?.value || rawCust.name);

    // Mobile Validation
    const validatedMobile = this._validateMobile(rawCust.mobile?.value || rawCust.mobile);

    // Email Validation (Reject numeric-only or invalid emails)
    const validatedEmail = this._validateEmail(rawCust.email?.value || rawCust.email);

    // PAN Validation
    const validatedPan = this._validatePan(rawCust.pan?.value || rawCust.pan);

    // Aadhaar Validation
    const validatedAadhaar = this._validateAadhaar(rawCust.aadhaar?.value || rawCust.aadhaar, fullText);

    // DOB Validation
    const validatedDob = this._validateDate(rawCust.dob?.value || rawCust.dob);

    // Customer Type
    const custType = this._validateCustomerType(rawCust.customerType?.value || rawCust.customerType, fullText);

    // Single Full Address Reconstruction
    const validatedAddress = this._reconstructFullAddress(rawCust, fullText);

    const customer = {
      name: validatedName,
      title: titleVal ? { value: titleVal, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 } : { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null },
      mobile: validatedMobile,
      email: validatedEmail,
      dob: validatedDob,
      gender: validatedGender,
      pan: validatedPan,
      aadhaar: validatedAadhaar,
      customerType: custType,
      address: validatedAddress,
      city: this._validateSimpleText(rawCust.city?.value || rawCust.city),
      district: this._validateSimpleText(rawCust.district?.value || rawCust.district),
      state: this._validateSimpleText(rawCust.state?.value || rawCust.state),
      pincode: this._validatePincode(rawCust.pincode?.value || rawCust.pincode)
    };

    // 2. Policy Validation
    const rawPol = rawExtraction.policy || {};
    const validatedPolicyNumber = this._validatePolicyNumber(rawPol.policyNumber?.value || rawPol.policyNumber);
    const validatedInsurer = this._validateSimpleText(rawPol.insurer?.value || rawPol.insurer, 3);
    const validatedProductName = this._validateSimpleText(rawPol.productName?.value || rawPol.productName, 3);
    const validatedStartDate = this._validateDate(rawPol.startDate?.value || rawPol.startDate);
    const validatedEndDate = this._validateDate(rawPol.endDate?.value || rawPol.endDate);
    const validatedIssueDate = this._validateDate(rawPol.issueDate?.value || rawPol.issueDate);
    const validatedRenewalDate = this._validateDate(rawPol.renewalDate?.value || rawPol.renewalDate) || validatedEndDate;

    const policy = {
      insurer: validatedInsurer,
      policyNumber: validatedPolicyNumber,
      productName: validatedProductName,
      planName: this._validateSimpleText(rawPol.planName?.value || rawPol.planName),
      policyType: this._validateSimpleText(rawPol.policyType?.value || rawPol.policyType) || { value: 'comprehensive', status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.8 },
      businessType: this._validateSimpleText(rawPol.businessType?.value || rawPol.businessType) || { value: 'rollover', status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.8 },
      startDate: validatedStartDate,
      endDate: validatedEndDate,
      issueDate: validatedIssueDate,
      renewalDate: validatedRenewalDate,
      sumAssured: this._validateNumeric(rawPol.sumAssured?.value || rawPol.sumAssured || rawExtraction.motor?.idv?.value || rawExtraction.motor?.idv)
    };

    // 3. Motor Vehicle Validation (if motor)
    let motor = null;
    if (rawExtraction.motor || rawExtraction.classification?.effectiveType === 'motor' || rawExtraction.classification?.type === 'motor') {
      const rawMot = rawExtraction.motor || {};
      motor = {
        registrationNumber: this._validateRegistrationNumber(rawMot.registrationNumber?.value || rawMot.registrationNumber),
        make: this._validateSimpleText(rawMot.make?.value || rawMot.make),
        model: this._validateSimpleText(rawMot.model?.value || rawMot.model),
        variant: this._validateSimpleText(rawMot.variant?.value || rawMot.variant),
        subModel: this._validateSimpleText(rawMot.subModel?.value || rawMot.subModel),
        vehicleType: this._validateSimpleText(rawMot.vehicleType?.value || rawMot.vehicleType || rawMot.vehicleCategory?.value || rawMot.vehicleCategory),
        vehicleCategory: this._validateSimpleText(rawMot.vehicleCategory?.value || rawMot.vehicleCategory || rawMot.vehicleType?.value || rawMot.vehicleType),
        fuelType: this._validateFuelType(rawMot.fuelType?.value || rawMot.fuelType, fullText),
        cubicCapacity: this._validateNumeric(rawMot.cubicCapacity?.value || rawMot.cubicCapacity),
        seatingCapacity: this._validateNumeric(rawMot.seatingCapacity?.value || rawMot.seatingCapacity),
        numberOfTyres: this._validateNumeric(rawMot.numberOfTyres?.value || rawMot.numberOfTyres),
        vehicleColor: this._validateSimpleText(rawMot.vehicleColor?.value || rawMot.vehicleColor),
        registrationDate: this._validateDate(rawMot.registrationDate?.value || rawMot.registrationDate),
        registrationState: this._validateSimpleText(rawMot.registrationState?.value || rawMot.registrationState),
        rtoCode: this._validateRtoCode(rawMot.rtoCode?.value || rawMot.rtoCode),
        rtoName: this._validateSimpleText(rawMot.rtoName?.value || rawMot.rtoName),
        zone: this._validateSimpleText(rawMot.zone?.value || rawMot.zone),
        manufacturingMonth: this._validateSimpleText(rawMot.manufacturingMonth?.value || rawMot.manufacturingMonth),
        manufacturingYear: this._validateManufacturingYear(rawMot.manufacturingYear?.value || rawMot.manufacturingYear),
        engineNumber: this._validateEngineNumber(rawMot.engineNumber?.value || rawMot.engineNumber),
        chassisNumber: this._validateChassisNumber(rawMot.chassisNumber?.value || rawMot.chassisNumber),
        vinNumber: this._validateChassisNumber(rawMot.vinNumber?.value || rawMot.vinNumber || rawMot.chassisNumber?.value || rawMot.chassisNumber),
        idv: this._validateNumeric(rawMot.idv?.value || rawMot.idv),
        vehicleValue: this._validateNumeric(rawMot.vehicleValue?.value || rawMot.vehicleValue),
        ncbPercentage: this._validatePercentage(rawMot.ncbPercentage?.value || rawMot.ncbPercentage || rawMot.currentNcbPercentage?.value || rawMot.currentNcbPercentage),
        previousNcbPercentage: this._validatePercentage(rawMot.previousNcbPercentage?.value || rawMot.previousNcbPercentage || rawMot.previousNcb?.value || rawMot.previousNcb),
        
        // Add-ons (strictly true/false/null without defaulting to false if not mentioned)
        zeroDepreciation: this._validateAddon(rawMot.zeroDepreciation?.value !== undefined ? rawMot.zeroDepreciation.value : rawMot.zeroDepreciation, fullText, /zero dep|nil dep|bumper to bumper/i),
        roadsideAssistance: this._validateAddon(rawMot.roadsideAssistance?.value !== undefined ? rawMot.roadsideAssistance.value : rawMot.roadsideAssistance, fullText, /roadside assist|rsa/i),
        engineProtection: this._validateAddon(rawMot.engineProtection?.value !== undefined ? rawMot.engineProtection.value : rawMot.engineProtection, fullText, /engine protect/i),
        consumables: this._validateAddon(rawMot.consumables?.value !== undefined ? rawMot.consumables.value : rawMot.consumables, fullText, /consumable/i),
        returnToInvoice: this._validateAddon(rawMot.returnToInvoice?.value !== undefined ? rawMot.returnToInvoice.value : rawMot.returnToInvoice, fullText, /return to invoice|rti/i),
        ncbProtector: this._validateAddon(rawMot.ncbProtector?.value !== undefined ? rawMot.ncbProtector.value : rawMot.ncbProtector, fullText, /ncb protect|ncb retention/i),
        tyreProtector: this._validateAddon(rawMot.tyreProtector?.value !== undefined ? rawMot.tyreProtector.value : rawMot.tyreProtector, fullText, /tyre protect|tyre secure/i),
        keyReplacement: this._validateAddon(rawMot.keyReplacement?.value !== undefined ? rawMot.keyReplacement.value : rawMot.keyReplacement, fullText, /key replace|key protect/i),
        personalBelongings: this._validateAddon(rawMot.personalBelongings?.value !== undefined ? rawMot.personalBelongings.value : rawMot.personalBelongings, fullText, /personal belonging|loss of baggage/i),
        personalAccidentCover: this._validateAddon(rawMot.personalAccidentCover?.value !== undefined ? rawMot.personalAccidentCover.value : rawMot.personalAccidentCover, fullText, /personal accident cover for owner driver|cpa cover|owner driver pa/i),
        
        // Premiums breakdown
        ownDamagePremium: this._validateNumeric(rawMot.ownDamagePremium?.value || rawMot.ownDamagePremium),
        thirdPartyPremium: this._validateNumeric(rawMot.thirdPartyPremium?.value || rawMot.thirdPartyPremium),
        personalAccidentPremium: this._validateNumeric(rawMot.personalAccidentPremium?.value || rawMot.personalAccidentPremium),
        addonPremium: this._validateNumeric(rawMot.addonPremium?.value || rawMot.addonPremium),
        discount: this._validateNumeric(rawMot.discount?.value || rawMot.discount),
        loading: this._validateNumeric(rawMot.loading?.value || rawMot.loading),
        cess: this._validateNumeric(rawMot.cess?.value || rawMot.cess),

        // Financing & Previous policy
        financed: rawMot.financed !== undefined ? rawMot.financed : (fullText.includes('hypothecat') || fullText.includes('financed by') ? true : null),
        financierName: this._validateSimpleText(rawMot.financierName?.value || rawMot.financierName || rawMot.loanProvider?.value || rawMot.loanProvider),
        hypothecation: this._validateSimpleText(rawMot.hypothecation?.value || rawMot.hypothecation),
        previousInsurer: this._validateSimpleText(rawMot.previousInsurer?.value || rawMot.previousInsurer || rawPol.previousInsurer?.value || rawPol.previousInsurer),
        previousPolicyNumber: this._validatePolicyNumber(rawMot.previousPolicyNumber?.value || rawMot.previousPolicyNumber || rawPol.previousPolicyNumber?.value || rawPol.previousPolicyNumber),
        previousPolicyStartDate: this._validateDate(rawMot.previousPolicyStartDate?.value || rawMot.previousPolicyStartDate),
        previousPolicyEndDate: this._validateDate(rawMot.previousPolicyEndDate?.value || rawMot.previousPolicyEndDate),
        previousPolicyType: this._validateSimpleText(rawMot.previousPolicyType?.value || rawMot.previousPolicyType)
      };
    }

    // 4. Premium Validation
    const rawPrem = rawExtraction.premium || {};
    const premium = {
      basicPremium: this._validateNumeric(rawPrem.basicPremium?.value || rawPrem.basicPremium || motor?.ownDamagePremium?.value),
      netPremium: this._validateNumeric(rawPrem.netPremium?.value || rawPrem.netPremium || rawPrem.basicPremium?.value || rawPrem.basicPremium),
      gst: this._validateNumeric(rawPrem.gst?.value || rawPrem.gst || rawPrem.taxAmount?.value || rawPrem.taxAmount),
      finalPremium: this._validateNumeric(rawPrem.finalPremium?.value || rawPrem.finalPremium || rawPrem.grossPremium?.value || rawPrem.grossPremium),
      paymentFrequency: { value: 'yearly', status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 }
    };

    // 5. Nominee Validation
    const rawNom = rawExtraction.nominee || {};
    const nominee = {
      name: this._validateSimpleText(rawNom.name?.value || rawNom.name),
      relationship: this._validateSimpleText(rawNom.relationship?.value || rawNom.relationship || rawNom.relation?.value || rawNom.relation),
      dob: this._validateDate(rawNom.dob?.value || rawNom.dob),
      share: this._validatePercentage(rawNom.share?.value || rawNom.share) || { value: 100, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 }
    };

    // 6. Broker & Payment Validation
    const rawBroker = rawExtraction.brokerDetails || {};
    const brokerDetails = {
      brokerAgency: this._validateSimpleText(rawBroker.brokerAgency?.value || rawBroker.brokerAgency),
      agentName: this._validateSimpleText(rawBroker.agentName?.value || rawBroker.agentName),
      subAgent: this._validateSimpleText(rawBroker.subAgent?.value || rawBroker.subAgent),
      brokerCode: this._validateSimpleText(rawBroker.brokerCode?.value || rawBroker.brokerCode),
      agentCode: this._validateSimpleText(rawBroker.agentCode?.value || rawBroker.agentCode)
    };

    const rawPay = rawExtraction.paymentDetails || {};
    const paymentDetails = {
      paymentStatus: this._validateSimpleText(rawPay.paymentStatus?.value || rawPay.paymentStatus) || { value: 'completed', status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 },
      paymentMethod: this._validateSimpleText(rawPay.paymentMethod?.value || rawPay.paymentMethod) || { value: 'Online', status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 },
      paymentDate: this._validateDate(rawPay.paymentDate?.value || rawPay.paymentDate),
      paymentAmount: this._validateNumeric(rawPay.paymentAmount?.value || rawPay.paymentAmount || premium.finalPremium?.value),
      transactionReference: this._validateSimpleText(rawPay.transactionReference?.value || rawPay.transactionReference),
      receiptNumber: this._validateSimpleText(rawPay.receiptNumber?.value || rawPay.receiptNumber)
    };

    return {
      classification: rawExtraction.classification || {},
      documentMeta: rawExtraction.documentMeta || {},
      customer,
      policy,
      motor,
      premium,
      nominee,
      brokerDetails,
      paymentDetails,
      insuredMembers: rawExtraction.insuredMembers || []
    };
  }

  // --- Field-Specific Validators ---

  _validateEmail(val) {
    if (!val || typeof val !== 'string') {
      return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    }
    const clean = val.trim().toLowerCase();
    
    // Numeric-only check
    if (/^\d+$/.test(clean)) {
      return { value: null, status: FIELD_STATUSES.INVALID_VALUE, confidence: null };
    }

    // Standard RFC-compliant email pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(clean)) {
      // Exclude generic insurer customer care emails
      const genericDomains = ['customercare', 'support@', 'info@', 'grievance@', 'nodal@'];
      if (genericDomains.some(d => clean.includes(d))) {
        return { value: null, status: FIELD_STATUSES.INVALID_VALUE, confidence: null };
      }
      return { value: clean, status: FIELD_STATUSES.VALIDATED, confidence: 0.98 };
    }

    return { value: null, status: FIELD_STATUSES.INVALID_VALUE, confidence: null };
  }

  _validateMobile(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const digitsOnly = String(val).replace(/\D/g, '');
    
    // Indian 10-digit mobile check (strip optional +91 or 0 prefix)
    let mobile10 = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      mobile10 = digitsOnly.slice(2);
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      mobile10 = digitsOnly.slice(1);
    }

    if (/^[6-9]\d{9}$/.test(mobile10)) {
      return { value: mobile10, status: FIELD_STATUSES.VALIDATED, confidence: 0.98 };
    }

    return { value: null, status: FIELD_STATUSES.INVALID_VALUE, confidence: null };
  }

  _validatePan(val) {
    if (!val || typeof val !== 'string') return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) {
      return { value: clean, status: FIELD_STATUSES.VALIDATED, confidence: 0.99 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateAadhaar(val, fullText = '') {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const digits = String(val).replace(/\D/g, '');
    const isExplicitAadhaar = /\b(?:aadhaar|aadhar|uidai)\b/i.test(fullText);
    
    if (digits.length === 12 && isExplicitAadhaar) {
      return { value: digits, status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validatePincode(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const digits = String(val).replace(/\D/g, '');
    if (/^[1-9][0-9]{5}$/.test(digits)) {
      return { value: digits, status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateDate(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const str = String(val).trim();
    
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { value: str, status: FIELD_STATUSES.VALIDATED, confidence: 0.98 };
      }
    }

    // Try parsing DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^([0-3]?\d)[\/\-\.]([0-1]?\d)[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { value: iso, status: FIELD_STATUSES.VALIDATED, confidence: 0.98 };
      }
    }

    // Try native Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const iso = parsed.toISOString().slice(0, 10);
      return { value: iso, status: FIELD_STATUSES.VALIDATED, confidence: 0.9 };
    }

    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateRegistrationNumber(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Standard Indian Reg No: e.g. RJ60CE5618, DL01AB1234, MH02EK4921, BH series
    if (/^[A-Z]{2}\d{1,3}[A-Z]{0,3}\d{4}$/.test(clean) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(clean)) {
      return { value: clean, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.98 };
    }
    if (clean.length >= 6 && clean.length <= 11) {
      return { value: clean, status: FIELD_STATUSES.LOW_CONFIDENCE, confidence: 0.8 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateEngineNumber(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length >= 5 && clean.length <= 25) {
      return { value: clean, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateChassisNumber(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length === 17) {
      return { value: clean, status: FIELD_STATUSES.VALIDATED, confidence: 0.99 };
    }
    if (clean.length >= 6 && clean.length <= 25) {
      return { value: clean, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validatePolicyNumber(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = String(val).trim().replace(/[\s]/g, '');
    if (clean.length >= 6 && clean.length <= 35) {
      return { value: clean, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.98 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateManufacturingYear(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    const currentYear = new Date().getFullYear();
    if (num >= 1980 && num <= currentYear + 1) {
      return { value: num, status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateFuelType(val, fullText = '') {
    const text = (String(val || '') + ' ' + fullText).toLowerCase();
    if (/\b(?:petrol\s*hybrid|hybrid)\b/i.test(text)) return { value: 'hybrid', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    if (/\b(?:electric|ev|battery)\b/i.test(text)) return { value: 'electric', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    if (/\bcng\b/i.test(text)) return { value: 'cng', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    if (/\bdiesel\b/i.test(text)) return { value: 'diesel', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    if (/\bpetrol\b/i.test(text)) return { value: 'petrol', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    if (/\blpg\b/i.test(text)) return { value: 'lpg', status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateAddon(rawVal, fullText, regexPattern) {
    if (rawVal === true) return { value: true, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.95 };
    if (rawVal === false) return { value: false, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.95 };
    
    // Check if regex explicitly matches in document text
    if (regexPattern && regexPattern.test(fullText)) {
      return { value: true, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.92 };
    }

    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateNumeric(val) {
    if (val === null || val === undefined || val === '') {
      return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    }
    const clean = String(val).replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      return { value: num, status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validatePercentage(val) {
    if (val === null || val === undefined || val === '') {
      return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    }
    const clean = String(val).replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return { value: num, status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateName(val) {
    if (!val || typeof val !== 'string') return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    let clean = val.trim().replace(/\s+/g, ' ');
    // Remove unwanted prefixes like "Name:", "Insured:", "Proposer:"
    clean = clean.replace(/^(?:Name\s*of\s*(?:the\s*)?(?:Insured|Proposer)|Insured\s*Name|Proposer\s*Name|Customer\s*Name)\s*[:\-–]?\s*/i, '');
    if (clean.length >= 2 && !/^\d+$/.test(clean) && !clean.toLowerCase().includes('insurance')) {
      return { value: clean, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateRtoCode(val) {
    if (!val) return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z]{2}\d{1,2}$/.test(clean)) {
      return { value: clean, status: FIELD_STATUSES.VALIDATED, confidence: 0.95 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _validateCustomerType(val, fullText = '') {
    if (val === 'corporate' || /pvt\.?\s*ltd|limited|logistics|transports|enterprises|corporation/i.test(fullText)) {
      return { value: 'corporate', status: FIELD_STATUSES.VALIDATED, confidence: 0.9 };
    }
    return { value: 'individual', status: FIELD_STATUSES.VALIDATED, confidence: 0.9 };
  }

  _validateSimpleText(val, minLen = 1) {
    if (!val || typeof val !== 'string') return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    const clean = val.trim().replace(/\s+/g, ' ');
    if (clean.length >= minLen) {
      return { value: clean, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.9 };
    }
    return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
  }

  _cleanString(val) {
    if (!val || typeof val !== 'string') return null;
    const clean = val.trim().replace(/\s+/g, ' ');
    return clean.length > 0 ? clean : null;
  }

  /**
   * Reconstructs full logical address into ONE compact string without duplicating tokens
   */
  _reconstructFullAddress(rawCust, fullText) {
    const candidateParts = [];
    
    if (rawCust.address?.value && typeof rawCust.address.value === 'string') {
      candidateParts.push(rawCust.address.value.trim());
    } else if (typeof rawCust.address === 'string' && rawCust.address.trim()) {
      candidateParts.push(rawCust.address.trim());
    }

    if (rawCust.fullAddress?.value) candidateParts.push(rawCust.fullAddress.value.trim());
    if (rawCust.street?.value) candidateParts.push(rawCust.street.value.trim());

    // If candidate has full address already
    let combined = candidateParts.join(', ');

    // If no address was extracted from KV, regex scan for address block in document
    if (!combined || combined.length < 8) {
      const match = fullText.match(/(?:Communication Address|Permanent Address|Residential Address|Postal Address|Address)\s*[:\-–]\s*([^\n\r]+(?:\n[^\n\r]+)?)/i);
      if (match && match[1]) {
        combined = match[1].trim().replace(/\s+/g, ' ');
      }
    }

    if (!combined || combined.length < 5) {
      return { value: null, status: FIELD_STATUSES.NOT_DETECTED, confidence: null };
    }

    // Clean address of noise text and repeated commas
    combined = combined.replace(/^(?:Address|Communication Address|Permanent Address)\s*[:\-–]?\s*/i, '');
    combined = combined.replace(/\s+(?:Toll Free|Website|Email|CIN|GSTIN|IRDAI|Policy No).*$/i, '');
    combined = combined.replace(/,\s*,/g, ',');
    combined = combined.trim().replace(/^,|,$/g, '');

    return { value: combined, status: FIELD_STATUSES.EXPLICITLY_EXTRACTED, confidence: 0.92 };
  }
}

let validatorInstance;
function getInsuranceFieldValidator() {
  if (!validatorInstance) validatorInstance = new InsuranceFieldValidator();
  return validatorInstance;
}

module.exports = {
  FIELD_STATUSES,
  InsuranceFieldValidator,
  getInsuranceFieldValidator
};
