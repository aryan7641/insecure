const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

class InsuranceExtractorProvider {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || (
      process.platform === 'win32'
        ? 'python'
        : (fs.existsSync('/app/docling-env/bin/python3') ? '/app/docling-env/bin/python3' : 'python3')
    );
    this.extractionModel = process.env.EXTRACTION_MODEL || 'gemini-3.5-flash-lite';
  }

  /**
   * Extract policy data using the insurance_extractor pipeline
   * @param {Buffer} pdfBuffer 
   * @param {string} originalName 
   * @param {string|null} requestedSubtype 
   * @returns {Promise<Object>}
   */
  async extractPolicy(pdfBuffer, originalName = 'policy.pdf', requestedSubtype = null) {
    const tempDir = os.tmpdir();
    const tempId = uuidv4();
    const tempPdfPath = path.join(tempDir, `ins_ext_${tempId}.pdf`);

    try {
      await fs.promises.writeFile(tempPdfPath, pdfBuffer);

      const resultJson = await this._runExtractor(tempPdfPath);
      return this._formatExtractionResult(resultJson, requestedSubtype);
    } finally {
      try {
        if (fs.existsSync(tempPdfPath)) {
          await fs.promises.unlink(tempPdfPath);
        }
      } catch (cleanupErr) {
        console.warn('[InsuranceExtractorProvider] Cleanup warning:', cleanupErr.message);
      }
    }
  }

  _runExtractor(pdfPath) {
    return new Promise((resolve, reject) => {
      const backendRoot = path.resolve(__dirname, '../../..');
      const args = [
        '-m',
        'insurance_extractor.app',
        pdfPath,
        '--model',
        this.extractionModel
      ];

      const env = {
        ...process.env,
        PYTHONPATH: backendRoot,
        EXTRACTION_MODEL: this.extractionModel
      };

      const proc = spawn(this.pythonPath, args, {
        cwd: backendRoot,
        env,
        timeout: 90000 // 90 second timeout for LLM structured parsing
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString('utf-8');
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString('utf-8');
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Extractor failed with exit code ${code}: ${stderr || stdout}`));
        }
        try {
          const jsonStart = stdout.indexOf('{');
          const jsonEnd = stdout.lastIndexOf('}');
          if (jsonStart === -1 || jsonEnd === -1) {
            return reject(new Error(`Extractor did not return valid JSON. Output: ${stdout}`));
          }
          const rawJson = stdout.slice(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(rawJson);
          resolve(parsed);
        } catch (jsonErr) {
          reject(new Error(`Failed to parse extractor JSON: ${jsonErr.message}. Output: ${stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to start extractor process: ${err.message}`));
      });
    });
  }

  /**
   * Helper to format an ExtractedField or primitive into standard envelope { value, state, confidence, source, ... }
   */
  _field(f, fallbackVal = null) {
    if (!f) {
      return {
        value: fallbackVal,
        rawValue: fallbackVal,
        source: fallbackVal !== null ? 'derived' : 'not_found',
        confidence: fallbackVal !== null ? 0.8 : 0.0,
        requiresReview: false,
        evidence: [],
        state: fallbackVal !== null ? 'extracted' : 'not_found'
      };
    }
    const val = f.value !== undefined ? f.value : (typeof f === 'object' ? f.rawValue : f);
    const hasValue = val !== null && val !== undefined && val !== '';
    return {
      value: hasValue ? val : fallbackVal,
      rawValue: f.raw_value !== undefined ? f.raw_value : (hasValue ? val : fallbackVal),
      source: f.source || (hasValue ? 'document' : 'not_found'),
      confidence: typeof f.confidence === 'number' ? f.confidence : (hasValue ? 0.95 : 0.0),
      requiresReview: !!f.requires_review,
      notes: f.notes || null,
      evidence: f.evidence || [],
      state: (hasValue || fallbackVal !== null) && f.source !== 'not_found' ? 'extracted' : 'not_found'
    };
  }

  /**
   * Format the ExtractionResponse into INSecure's exact internal extractionResult shape expected by PolicyPdfUploadModal.jsx
   */
  _formatExtractionResult(response, requestedSubtype) {
    const docType = response.result?.document_type || 'motor';
    const isHealth = docType === 'health';
    const ui = response.ui_payload || {};
    const result = response.result || {};

    const effectiveType = isHealth ? 'health' : 'motor';
    let effectiveSubtype = requestedSubtype;
    if (!effectiveSubtype) {
      if (isHealth) {
        effectiveSubtype = ui.health?.basic_details?.subLobCategory || 'family_floater';
      } else {
        effectiveSubtype = 'car';
      }
    }

    const resObj = isHealth ? (result.health || {}) : (result.motor || {});
    const uiObj = isHealth ? (ui.health || {}) : (ui.motor || {});

    const cust = resObj.insured_customer || {};
    const pol = resObj.policy || {};
    const prem = resObj.premium || {};
    const veh = !isHealth ? (resObj.vehicle || {}) : {};
    const bas = isHealth ? (resObj.basic_details || {}) : {};
    const nom = resObj.nominee || {};
    const pay = resObj.payment || {};

    const detectedInsurerVal = pol.insurer_name?.value || (isHealth ? 'Care / Star Health' : 'Tata AIG General Insurance');

    // Build structured extractedData with exact frontend keys
    const customer = {
      title: this._field(cust.title, ''),
      name: this._field(cust.name, ''),
      mobile: this._field(cust.mobile, ''),
      email: this._field(cust.email, ''),
      dob: this._field(cust.dob, ''),
      gender: this._field(cust.gender || (isHealth && resObj.members?.[0]?.gender ? resObj.members[0].gender : null), ''),
      pan: this._field(cust.pan, ''),
      aadhaar: this._field(cust.aadhaar, ''),
      gstNumber: this._field(cust.gst_number, ''),
      address: this._field(cust.address, ''),
      pincode: this._field(cust.pincode, ''),
      city: this._field(cust.city_district, ''),
      district: this._field(cust.city_district, ''),
      state: this._field(cust.state, ''),
      customerType: this._field(cust.customer_type, 'individual')
    };

    const policy = {
      insurer: this._field(pol.insurer_name, detectedInsurerVal),
      insurer_name: this._field(pol.insurer_name, detectedInsurerVal),
      policyNumber: this._field(pol.policy_number, ''),
      policy_number: this._field(pol.policy_number, ''),
      policyType: this._field(pol.policy_type, isHealth ? 'Family Floater' : 'Package Policy'),
      policy_type: this._field(pol.policy_type, isHealth ? 'Family Floater' : 'Package Policy'),
      productName: this._field(pol.plan_name || pol.insurer_name, ''),
      planName: this._field(pol.plan_name || pol.insurer_name, ''),
      issueDate: this._field(pol.policy_issue_date, ''),
      policy_issue_date: this._field(pol.policy_issue_date, ''),
      startDate: this._field(pol.policy_start_date, ''),
      policy_start_date: this._field(pol.policy_start_date, ''),
      endDate: this._field(pol.policy_end_date, ''),
      policy_end_date: this._field(pol.policy_end_date, ''),
      renewalDate: this._field(pol.policy_end_date, ''),
      tenureYears: this._field(pol.policy_tenure, '1'),
      sumAssured: this._field(isHealth ? (pol.total_sum_assured || pol.base_sum_assured) : pol.idv_sum_assured, ''),
      baseSumAssured: this._field(pol.base_sum_assured, ''),
      bonusSumAssured: this._field(pol.bonus_sum_assured, ''),
      totalSumAssured: this._field(pol.total_sum_assured, '')
    };

    const premium = {
      finalPremium: this._field(prem.final_premium, ''),
      final_premium: this._field(prem.final_premium, ''),
      basicPremium: this._field(isHealth ? prem.basic_premium : prem.net_premium, ''),
      basic_premium: this._field(isHealth ? prem.basic_premium : prem.net_premium, ''),
      netPremium: this._field(prem.net_premium, ''),
      net_premium: this._field(prem.net_premium, ''),
      gst: this._field(isHealth ? prem.gst_percent : prem.gst_cess, ''),
      gst_cess: this._field(prem.gst_cess, ''),
      ownDamagePremium: this._field(prem.od_premium, ''),
      od_premium: this._field(prem.od_premium, ''),
      installmentAmount: this._field(prem.installment_amount, ''),
      numberOfInstallment: this._field(prem.number_of_installment, '')
    };

    const motor = !isHealth ? {
      registrationNumber: this._field(veh.registration_no, ''),
      registration_no: this._field(veh.registration_no, ''),
      vehicleType: this._field(veh.type_of_vehicle, 'Private Car'),
      type_of_vehicle: this._field(veh.type_of_vehicle, 'Private Car'),
      vehicleCategory: this._field(veh.vehicle_category, 'Private Car'),
      vehicle_category: this._field(veh.vehicle_category, 'Private Car'),
      make: this._field(veh.make, ''),
      model: this._field(veh.model, ''),
      variant: this._field(veh.variant, ''),
      fuelType: this._field(veh.fuel_type, 'Petrol'),
      fuel_type: this._field(veh.fuel_type, 'Petrol'),
      cubicCapacity: this._field(veh.cubic_capacity, ''),
      cubic_capacity: this._field(veh.cubic_capacity, ''),
      seatingCapacity: this._field(veh.seats_including_driver, ''),
      seats_including_driver: this._field(veh.seats_including_driver, ''),
      zone: this._field(veh.zone, ''),
      registrationDate: this._field(veh.registration_date, ''),
      registration_date: this._field(veh.registration_date, ''),
      manufacturingMonth: this._field(veh.mfg_month, ''),
      manufacturingYear: this._field(veh.mfg_year, ''),
      engineNumber: this._field(veh.engine_no, ''),
      engine_no: this._field(veh.engine_no, ''),
      chassisNumber: this._field(veh.chassis_no, ''),
      chassis_no: this._field(veh.chassis_no, ''),
      vehicleColor: this._field(veh.vehicle_color, ''),
      numberOfTyres: this._field(veh.number_of_tire, ''),
      idv: this._field(pol.idv_sum_assured, ''),
      ncb: this._field(pol.current_ncb, '0'),
      ownDamagePremium: this._field(prem.od_premium, ''),
      thirdPartyPremium: this._field(pol.active_tp_policy_number ? pol.active_tp_policy_number : null, ''),
      activeTpInsurerName: this._field(pol.active_tp_insurer_name, ''),
      activeTpPolicyNumber: this._field(pol.active_tp_policy_number, ''),
      activeTpPolicyStartDate: this._field(pol.active_tp_policy_start_date, ''),
      activeTpPolicyEndDate: this._field(pol.active_tp_policy_end_date, ''),
      financierName: this._field(veh.financier || pol.financed_by, ''),
      financed: this._field(veh.financed, 'No'),
      previousPolicyAvailable: this._field(veh.previous_policy_available, 'No'),
      addons: pol.add_ons || []
    } : undefined;

    const healthDetails = isHealth ? {
      lobCategory: this._field(bas.lob_category, 'health'),
      subLobCategory: this._field(bas.sub_lob_category, 'family_floater'),
      businessType: this._field(bas.business_type, 'new'),
      policyType: this._field(bas.policy_type, 'Family Floater'),
      seniorCitizenPolicy: this._field(bas.senior_citizen_policy, 'No'),
      numberOfAdult: this._field(bas.number_of_adult, '1'),
      numberOfChild: this._field(bas.number_of_child, '0'),
      numberOfParent: this._field(bas.number_of_parent, '0'),
      eldestPersonAgeType: this._field(bas.eldest_person_age_type, 'DOB'),
      eldestPersonDob: this._field(bas.eldest_person_dob, ''),
      treatmentZone: this._field(bas.treatment_zone, ''),
      ped: this._field(bas.ped, 'No'),
      previousPolicyAvailable: this._field(bas.previous_policy_available, 'No'),
      baseSumAssured: this._field(pol.base_sum_assured, ''),
      bonusSumAssured: this._field(pol.bonus_sum_assured, ''),
      totalSumAssured: this._field(pol.total_sum_assured, ''),
      ppt: this._field(pol.ppt, '1'),
      ppmFrequency: this._field(pol.ppm_frequency, 'yearly'),
      members: uiObj.members || [],
      medicalQuestions: uiObj.medicalQuestions || [],
      optionalCovers: pol.optional_covers || [],
      riders: pol.riders || [],
      previousPolicies: pol.previous_policies || []
    } : undefined;

    const nominee = {
      name: this._field(nom.name, ''),
      dob: this._field(nom.dob, ''),
      relationship: this._field(nom.relationship, 'Spouse'),
      relation: this._field(nom.relationship, 'Spouse'),
      share: this._field(nom.share_percent, '100'),
      share_percent: this._field(nom.share_percent, '100'),
      address: this._field(nom.address, ''),
      mobile: this._field(nom.mobile, ''),
      email: this._field(nom.email, '')
    };

    const paymentDetails = {
      paymentStatus: this._field(pay.status, 'completed'),
      status: this._field(pay.status, 'completed'),
      paymentMethod: this._field(pay.mode, 'Online'),
      mode: this._field(pay.mode, 'Online'),
      payerName: this._field(pay.payer_name, ''),
      paymentAmount: this._field(pay.amount_paid, ''),
      receiptNumber: this._field(pay.receipt_number, ''),
      receiptDate: this._field(pay.receipt_date, '')
    };

    return {
      classification: {
        effectiveType,
        effectiveSubtype,
        detectedInsurer: detectedInsurerVal,
        confidence: response.result?.document_type_confidence || 0.95,
        isValid: true
      },
      reviewRequired: response.review_required || false,
      globalConflicts: response.result?.global_conflicts || [],
      extractedData: {
        customer,
        policy,
        premium,
        nominee,
        paymentDetails,
        motor,
        healthDetails
      },
      fields: uiObj.fields || {},
      rawExtraction: response
    };
  }
}

let instance = null;
const getInsuranceExtractorProvider = () => {
  if (!instance) {
    instance = new InsuranceExtractorProvider();
  }
  return instance;
};

module.exports = {
  InsuranceExtractorProvider,
  getInsuranceExtractorProvider
};
