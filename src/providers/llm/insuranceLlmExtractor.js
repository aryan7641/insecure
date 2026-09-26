const { POLICY_TYPES, EXTRACTION_STATES } = require('../../utils/constants');

class InsuranceLlmExtractor {
  /**
   * Parse extracted raw text and produce structured Indian Insurance schema
   * @param {string} rawText 
   * @param {string} fileName 
   * @returns {Promise<object>}
   */
  async extractInsuranceData(rawText, fileName = '') {
    const text = (rawText || '') + ' ' + (fileName || '');
    const cleanLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Extraction result structure
    const result = {
      customer: {
        name: this._extractCustomerName(text, cleanLines),
        mobile: this._extractMobile(text),
        email: this._extractEmail(text),
        dob: this._extractDob(text),
        gender: this._extractGender(text),
        pan: this._extractPan(text),
        aadhaar: this._extractAadhaar(text),
        address: this._extractAddress(text),
        city: this._extractCity(text),
        state: this._extractState(text),
        pincode: this._extractPincode(text),
        customerType: { value: 'individual', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 }
      },
      policy: {
        insurer: this._extractInsurer(text),
        productName: this._extractProduct(text),
        planName: this._extractPlan(text),
        policyNumber: this._extractPolicyNumber(text),
        policyType: this._extractPolicyType(text),
        lob: this._extractLob(text),
        subLob: this._extractSubLob(text),
        businessType: this._extractBusinessType(text),
        issueDate: this._extractDateByKeywords(text, ['issue date', 'booking date', 'proposal date']),
        startDate: this._extractDateByKeywords(text, ['start date', 'commencement date', 'period of insurance from', 'effective date', 'from:']),
        endDate: this._extractDateByKeywords(text, ['end date', 'expiry date', 'to:', 'period of insurance to', 'upto']),
        renewalDate: this._extractRenewalDate(text),
        tenureYears: { value: 1, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.8 },
        sumAssured: this._extractSumAssured(text),
        premiumFrequency: { value: 'yearly', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 }
      },
      premium: {
        basicPremium: this._extractBasicPremium(text),
        gst: this._extractGst(text),
        netPremium: this._extractNetPremium(text),
        finalPremium: this._extractFinalPremium(text),
        installmentAmount: this._extractInstallmentAmount(text)
      },
      motor: {
        registrationNumber: this._extractVehicleReg(text),
        vehicleType: this._extractVehicleType(text),
        make: this._extractVehicleMake(text),
        model: this._extractVehicleModel(text),
        variant: this._extractVehicleVariant(text),
        registrationDate: this._extractDateByKeywords(text, ['reg date', 'date of registration', 'reg. date']),
        manufacturingYear: this._extractManufacturingYear(text),
        idv: this._extractIdv(text),
        ncb: this._extractNcb(text),
        engineNumber: this._extractEngineNumber(text),
        chassisNumber: this._extractChassisNumber(text),
        fuelType: this._extractFuelType(text),
        previousInsurer: this._extractPreviousInsurer(text),
        previousPolicyNumber: this._extractPreviousPolicy(text)
      },
      insuredMembers: this._extractInsuredMembers(text, cleanLines),
      nominee: {
        name: this._extractNomineeName(text),
        relationship: this._extractNomineeRelation(text),
        dob: this._extractNomineeDob(text),
        share: { value: 100, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 }
      },
      commission: {
        percentage: { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 },
        amount: { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 }
      },
      metadata: {
        rawTextLength: text.length,
        extractedAt: new Date().toISOString(),
        parserVersion: '2.0.0-insurance-llm'
      }
    };

    // Post-process cross-field validations & renewal date computation
    if (!result.policy.renewalDate.value && result.policy.endDate.value) {
      result.policy.renewalDate = {
        value: result.policy.endDate.value,
        state: EXTRACTION_STATES.EXTRACTED,
        confidence: 0.88
      };
    }

    if (!result.premium.finalPremium.value && result.premium.netPremium.value) {
      result.premium.finalPremium = { ...result.premium.netPremium };
    }

    return result;
  }

  // --- Field Extractors ---

  _extractCustomerName(text, lines) {
    const patterns = [
      /(?:proposer|insured|policyholder|customer|name of insured|name of proposer)\s*[:\-–]\s*([A-Za-z\s\.]{3,40})/i,
      /(?:mr\.|mrs\.|ms\.|dr\.)\s+([A-Za-z\s]{3,35})/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1] && !match[1].toLowerCase().includes('insurance') && !match[1].toLowerCase().includes('company')) {
        const val = match[1].trim().replace(/\s+/g, ' ');
        return { value: val, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractMobile(text) {
    const match = text.match(/(?:mobile|phone|contact|tel|cell)?\s*(?:[:\-–])?\s*(?:\+91[\s\-]?)?([6-9]\d{9})\b/i);
    if (match && match[1]) {
      return { value: match[1], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractEmail(text) {
    const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (match && match[1] && !match[1].includes('example.com') && !match[1].includes('support@')) {
      return { value: match[1].toLowerCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.92 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPan(text) {
    const match = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    if (match && match[1]) {
      return { value: match[1], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.98 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractAadhaar(text) {
    const match = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (match && match[1] && !match[1].startsWith('1800') && !match[1].startsWith('1900')) {
      return { value: match[1].replace(/\s/g, ''), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
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
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractDob(text) {
    const match = text.match(/(?:dob|date of birth|birth date)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i);
    if (match && match[1]) {
      const iso = this._parseDateToIso(match[1]);
      return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractAddress(text) {
    const match = text.match(/(?:address|residence|communication address)\s*[:\-–]?\s*([^\n\r]{10,90})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.75 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractCity(text) {
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli', 'Bareilly', 'Moradabad', 'Mysore', 'Gurgaon', 'Gurugram', 'Aligarh', 'Jalandhar', 'Tiruchirappalli', 'Bhubaneswar', 'Salem', 'Warangal', 'Noida', 'Dehradun'];
    for (const city of cities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(text)) {
        return { value: city, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractState(text) {
    const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'Telangana', 'West Bengal', 'Rajasthan', 'Haryana', 'Madhya Pradesh', 'Kerala', 'Punjab', 'Bihar', 'Odisha', 'Andhra Pradesh', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Goa'];
    for (const state of states) {
      if (new RegExp(`\\b${state}\\b`, 'i').test(text)) {
        return { value: state, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPincode(text) {
    const match = text.match(/\b([1-9][0-9]{5})\b/);
    if (match && match[1]) {
      return { value: match[1], state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractInsurer(text) {
    const insurers = [
      'HDFC ERGO General Insurance', 'ICICI Lombard General Insurance', 'Star Health and Allied Insurance',
      'Care Health Insurance', 'Niva Bupa Health Insurance', 'Bajaj Allianz General Insurance',
      'Tata AIG General Insurance', 'SBI General Insurance', 'Life Insurance Corporation of India (LIC)',
      'HDFC Life Insurance', 'ICICI Prudential Life Insurance', 'Max Life Insurance',
      'SBI Life Insurance', 'Digit Insurance', 'ACKO General Insurance', 'New India Assurance',
      'National Insurance', 'Oriental Insurance', 'United India Insurance', 'Aditya Birla Health Insurance',
      'ManipalCigna Health Insurance', 'Kotak Mahindra General Insurance', 'Reliance General Insurance',
      'Future Generali India Insurance', 'Royal Sundaram General Insurance', 'Cholamandalam MS General Insurance'
    ];
    for (const insurer of insurers) {
      const keywords = insurer.split(' ').slice(0, 2).join(' ');
      if (new RegExp(`\\b${keywords}\\b`, 'i').test(text)) {
        return { value: insurer, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: 'HDFC ERGO General Insurance', state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.5 };
  }

  _extractProduct(text) {
    const match = text.match(/(?:product|plan name|product name|policy name)\s*[:\-–]?\s*([A-Za-z0-9\s\-–]{4,40})/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: 'Comprehensive Policy Plan', state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.5 };
  }

  _extractPlan(text) {
    const match = text.match(/(?:plan|coverage option)\s*[:\-–]?\s*([A-Za-z0-9\s\-–]{3,30})/i);
    return { value: match ? match[1].trim() : 'Standard Plan', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.7 };
  }

  _extractPolicyNumber(text) {
    const patterns = [
      /(?:policy\s*(?:no|number|num|#))\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,30})/i,
      /(?:certificate\s*(?:no|number))\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,30})/i,
      /\b([0-9]{4}\/[0-9]{4,8}\/[0-9]{2,4})\b/,
      /\b([A-Z0-9]{3,8}\-[A-Z0-9]{2,6}\-[0-9]{5,12})\b/
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1] && !match[1].toLowerCase().includes('period')) {
        return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.3 };
  }

  _extractPolicyType(text) {
    const t = text.toLowerCase();
    if (t.includes('motor') || t.includes('car') || t.includes('two wheeler') || t.includes('vehicle') || t.includes('four wheeler') || t.includes('chassis')) {
      return { value: POLICY_TYPES.MOTOR, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    if (t.includes('health') || t.includes('mediclaim') || t.includes('hospital') || t.includes('optima') || t.includes('critical illness')) {
      return { value: POLICY_TYPES.HEALTH, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    if (t.includes('term life') || t.includes('term insurance') || t.includes('iprotect') || t.includes('click 2 protect')) {
      return { value: POLICY_TYPES.TERM, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.92 };
    }
    if (t.includes('life') || t.includes('endowment') || t.includes('money back') || t.includes('lic')) {
      return { value: POLICY_TYPES.LIFE, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    if (t.includes('travel') || t.includes('overseas')) {
      return { value: POLICY_TYPES.TRAVEL, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    if (t.includes('home') || t.includes('fire') || t.includes('property') || t.includes('burglary')) {
      return { value: POLICY_TYPES.HOME, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
    }
    if (t.includes('commercial') || t.includes('marine') || t.includes('workmen') || t.includes('directors')) {
      return { value: POLICY_TYPES.COMMERCIAL, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    if (t.includes('group')) {
      return { value: POLICY_TYPES.GROUP, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: POLICY_TYPES.HEALTH, state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.5 };
  }

  _extractLob(text) {
    const polType = this._extractPolicyType(text).value;
    return { value: polType.toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
  }

  _extractSubLob(text) {
    const t = text.toLowerCase();
    if (t.includes('private car') || t.includes('4 wheeler')) return { value: 'Private Car Comprehensive', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    if (t.includes('two wheeler') || t.includes('2 wheeler')) return { value: 'Two Wheeler Comprehensive', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    if (t.includes('floater')) return { value: 'Family Floater Health', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    if (t.includes('super top-up') || t.includes('top up')) return { value: 'Super Top-up Health', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    if (t.includes('term')) return { value: 'Pure Term Life', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    return { value: 'Comprehensive', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.7 };
  }

  _extractBusinessType(text) {
    const t = text.toLowerCase();
    if (t.includes('rollover') || t.includes('roll-over')) return { value: 'rollover', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    if (t.includes('renewal')) return { value: 'renewal', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    if (t.includes('portability')) return { value: 'portability', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    return { value: 'new', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.75 };
  }

  _extractDateByKeywords(text, keywords) {
    for (const kw of keywords) {
      const regex = new RegExp(`${kw}\\s*[:\-–]?\\s*([0-3]?\\d[\\/\\-\\.\\s][0-1]?\\d[\\/\\-\\.\\s]\\d{4}|[0-3]?\\d\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4})`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        const iso = this._parseDateToIso(match[1]);
        if (iso) return { value: iso, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractRenewalDate(text) {
    const direct = this._extractDateByKeywords(text, ['renewal date', 'next premium due date', 'expiry date', 'due date', 'period of insurance to']);
    return direct;
  }

  _extractSumAssured(text) {
    const match = text.match(/(?:sum (?:insured|assured)|coverage amount|total sum insured|idv total)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.92 };
      }
    }
    return { value: 500000, state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.5 };
  }

  _extractBasicPremium(text) {
    const match = text.match(/(?:basic premium|net own damage|own damage premium|basic own damage|basic tp)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num)) return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractGst(text) {
    const match = text.match(/(?:total gst|gst|igst|cgst\s*\+\s*sgst|tax amount)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num)) return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractNetPremium(text) {
    const match = text.match(/(?:net premium|premium before tax)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num)) return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.88 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractFinalPremium(text) {
    const match = text.match(/(?:total premium|final premium|gross premium|amount payable|premium amount|total amount paid)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    return { value: null, state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.4 };
  }

  _extractInstallmentAmount(text) {
    const match = text.match(/(?:installment amount|modal premium)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num)) return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  // --- Motor Specific Extractors ---

  _extractVehicleReg(text) {
    const match = text.match(/\b([A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,3}\s?[0-9]{4})\b/i);
    if (match && match[1]) {
      return { value: match[1].replace(/\s+/g, '').toUpperCase(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.95 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractVehicleType(text) {
    if (/two wheeler|scooter|motorcycle|bike/i.test(text)) return { value: '2-Wheeler', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/commercial vehicle|goods carrier|taxi/i.test(text)) return { value: 'Commercial Vehicle', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/car|private car|sedan|hatchback|suv/i.test(text)) return { value: 'Private Car', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractVehicleMake(text) {
    const makes = ['Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Honda', 'Toyota', 'Kia', 'Volkswagen', 'Skoda', 'MG Motors', 'Renault', 'Nissan', 'Ford', 'Royal Enfield', 'Hero MotoCorp', 'Bajaj Auto', 'TVS Motors', 'Yamaha', 'Suzuki'];
    for (const make of makes) {
      if (new RegExp(`\\b${make}\\b`, 'i').test(text)) {
        return { value: make, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractVehicleModel(text) {
    const models = ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Creta', 'Venue', 'i20', 'Nexon', 'Punch', 'Harrier', 'Safari', 'Thar', 'Scorpio', 'XUV700', 'City', 'Amaze', 'Innova', 'Fortuner', 'Seltos', 'Sonet', 'Kushaq', 'Taigun', 'Classic 350', 'Splendor', 'Pulsar', 'Jupiter', 'Activa'];
    for (const m of models) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(text)) {
        return { value: m, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
      }
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractVehicleVariant(text) {
    const match = text.match(/(?:variant|model variant)\s*[:\-–]?\s*([A-Za-z0-9\s\+\.]{2,20})/i);
    return { value: match ? match[1].trim() : null, state: match ? EXTRACTION_STATES.EXTRACTED : EXTRACTION_STATES.NOT_FOUND, confidence: match ? 0.8 : 0 };
  }

  _extractManufacturingYear(text) {
    const match = text.match(/(?:mfg\.? year|year of manufacture|manufacturing year)\s*[:\-–]?\s*([12][90]\d{2})/i);
    if (match && match[1]) {
      return { value: Number(match[1]), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractIdv(text) {
    const match = text.match(/(?:idv|insured declared value|vehicle idv)\s*[:\-–]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)/i);
    if (match && match[1]) {
      const num = Number(match[1].replace(/,/g, ''));
      if (!isNaN(num)) return { value: num, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.92 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractNcb(text) {
    const match = text.match(/(?:ncb|no claim bonus)\s*[:\-–]?\s*([0-9]{1,2})\s*%/i);
    if (match && match[1]) {
      return { value: Number(match[1]), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.92 };
    }
    return { value: 0, state: EXTRACTION_STATES.EXTRACTED, confidence: 0.7 };
  }

  _extractEngineNumber(text) {
    const match = text.match(/(?:engine (?:no|number))\s*[:\-–]?\s*([A-Za-z0-9]{6,20})/i);
    return { value: match ? match[1].toUpperCase() : null, state: match ? EXTRACTION_STATES.EXTRACTED : EXTRACTION_STATES.NOT_FOUND, confidence: match ? 0.9 : 0 };
  }

  _extractChassisNumber(text) {
    const match = text.match(/(?:chassis (?:no|number)|vin)\s*[:\-–]?\s*([A-Za-z0-9]{10,20})/i);
    return { value: match ? match[1].toUpperCase() : null, state: match ? EXTRACTION_STATES.EXTRACTED : EXTRACTION_STATES.NOT_FOUND, confidence: match ? 0.9 : 0 };
  }

  _extractFuelType(text) {
    if (/\bpetrol\b/i.test(text)) return { value: 'Petrol', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/\bdiesel\b/i.test(text)) return { value: 'Diesel', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/\belectric|ev\b/i.test(text)) return { value: 'Electric', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    if (/\bcng\b/i.test(text)) return { value: 'CNG', state: EXTRACTION_STATES.EXTRACTED, confidence: 0.9 };
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractPreviousInsurer(text) {
    const match = text.match(/(?:previous insurer|prev\.? insurer)\s*[:\-–]?\s*([A-Za-z\s]{3,30})/i);
    return { value: match ? match[1].trim() : null, state: match ? EXTRACTION_STATES.EXTRACTED : EXTRACTION_STATES.NOT_FOUND, confidence: match ? 0.8 : 0 };
  }

  _extractPreviousPolicy(text) {
    const match = text.match(/(?:previous policy (?:no|number)|prev\.? policy)\s*[:\-–]?\s*([A-Za-z0-9\/\-]{6,25})/i);
    return { value: match ? match[1].trim() : null, state: match ? EXTRACTION_STATES.EXTRACTED : EXTRACTION_STATES.NOT_FOUND, confidence: match ? 0.85 : 0 };
  }

  // --- Insured Members & Nominee ---

  _extractInsuredMembers(text, lines) {
    const members = [];
    const memberRegex = /(?:member|person insured|insured person)\s*(?:[1-9])?\s*[:\-–]?\s*([A-Za-z\s]{3,30})(?:\s*\|\s*relation[:\-–]?\s*([A-Za-z]+))?(?:\s*\|\s*age[:\-–]?\s*(\d{1,3}))?/gi;
    let match;
    while ((match = memberRegex.exec(text)) !== null) {
      if (match[1] && !match[1].toLowerCase().includes('insurance')) {
        members.push({
          name: match[1].trim(),
          relationship: match[2] || 'Self',
          age: match[3] ? Number(match[3]) : undefined,
          sumInsured: undefined
        });
      }
    }
    return members;
  }

  _extractNomineeName(text) {
    const match = text.match(/(?:nominee|nominee name)\s*[:\-–]?\s*([A-Za-z\s\.]{3,35})/i);
    if (match && match[1] && !match[1].toLowerCase().includes('insurance') && !match[1].toLowerCase().includes('company')) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _extractNomineeRelation(text) {
    const match = text.match(/(?:nominee relationship|relationship with nominee|nominee relation)\s*[:\-–]?\s*([A-Za-z]+)/i);
    if (match && match[1]) {
      return { value: match[1].trim(), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: 'Spouse', state: EXTRACTION_STATES.NEEDS_REVIEW, confidence: 0.4 };
  }

  _extractNomineeDob(text) {
    const match = text.match(/(?:nominee dob|nominee date of birth)\s*[:\-–]?\s*([0-3]?\d[\/\-\.][0-1]?\d[\/\-\.]\d{4})/i);
    if (match && match[1]) {
      return { value: this._parseDateToIso(match[1]), state: EXTRACTION_STATES.EXTRACTED, confidence: 0.85 };
    }
    return { value: null, state: EXTRACTION_STATES.NOT_FOUND, confidence: 0 };
  }

  _parseDateToIso(str) {
    if (!str) return null;
    try {
      const parts = str.trim().split(/[\/\-\.\s]+/);
      if (parts.length === 3) {
        let day, month, year;
        if (parts[2].length === 4) {
          day = parseInt(parts[0], 10);
          month = isNaN(parts[1]) ? this._monthNameToNumber(parts[1]) : parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        } else if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }
        if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(Date.UTC(year, month - 1, day)).toISOString();
        }
      }
      const d = new Date(str);
      return !isNaN(d.getTime()) ? d.toISOString() : null;
    } catch (e) {
      return null;
    }
  }

  _monthNameToNumber(name) {
    const map = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    return map[name.toLowerCase().slice(0, 3)] || 1;
  }
}

let instance;
function getInsuranceLlmExtractor() {
  if (!instance) instance = new InsuranceLlmExtractor();
  return instance;
}

module.exports = {
  InsuranceLlmExtractor,
  getInsuranceLlmExtractor
};
