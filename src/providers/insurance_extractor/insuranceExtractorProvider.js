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
    this.extractionModel = process.env.EXTRACTION_MODEL || 'gpt-4o-mini';
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
          // stdout might contain log lines before the JSON object
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
   * Format the ExtractionResponse into INSecure's internal extractionResult shape
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

    return {
      classification: {
        effectiveType,
        effectiveSubtype,
        detectedInsurer: isHealth ? resObj.policy?.insurer_name?.value : resObj.policy?.insurer_name?.value,
        confidence: response.result?.document_type_confidence || 0.95,
        isValid: true
      },
      reviewRequired: response.review_required || false,
      globalConflicts: response.result?.global_conflicts || [],
      extractedData: {
        customer: this._formatFields(resObj.insured_customer),
        policy: this._formatFields(resObj.policy),
        premium: this._formatFields(resObj.premium),
        nominee: this._formatFields(resObj.nominee),
        paymentDetails: this._formatFields(resObj.payment),
        motor: !isHealth ? {
          ...this._formatFields(resObj.vehicle),
          ...this._formatFields(resObj.policy),
          ...this._formatFields(resObj.premium),
          addons: resObj.policy?.add_ons || []
        } : undefined,
        healthDetails: isHealth ? {
          ...this._formatFields(resObj.basic_details),
          ...this._formatFields(resObj.policy),
          members: uiObj.members || [],
          medicalQuestions: uiObj.medicalQuestions || [],
          optionalCovers: resObj.policy?.optional_covers || [],
          riders: resObj.policy?.riders || []
        } : undefined
      },
      fields: uiObj.fields || {},
      rawExtraction: response
    };
  }

  _formatFields(modelObj) {
    if (!modelObj) return {};
    const res = {};
    for (const [key, val] of Object.entries(modelObj)) {
      if (val && typeof val === 'object' && ('value' in val || 'raw_value' in val)) {
        res[key] = {
          value: val.value !== undefined ? val.value : null,
          rawValue: val.raw_value,
          source: val.source || 'not_found',
          confidence: val.confidence || 0.0,
          requiresReview: val.requires_review || false,
          notes: val.notes,
          evidence: val.evidence || [],
          state: val.value !== null && val.value !== '' && val.source !== 'not_found' ? 'extracted' : 'not_found'
        };
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        res[key] = this._formatFields(val);
      } else {
        res[key] = val;
      }
    }
    return res;
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
