/**
 * INSecure Insurance Document Classifier
 * Classifies raw text into Type, Subtype, and Insurer with confidence score.
 */

class InsuranceClassifier {
  /**
   * Classify document text
   * @param {string} rawText 
   * @param {string} fileName 
   * @returns {{ isValid: boolean, type: string, subtype: string, insurer: string, confidence: number, reasoning: string[] }}
   */
  classify(rawText = '', fileName = '') {
    const text = (rawText + ' ' + fileName).toLowerCase();
    const reasoning = [];

    // 1. Validate if this is an Insurance Document
    const insuranceKeywords = [
      'policy', 'schedule', 'certificate of insurance', 'insured', 'premium',
      'sum insured', 'sum assured', 'underwriter', 'insurer', 'irdai', 'coverage',
      'health insurance', 'motor insurance', 'life insurance', 'general insurance'
    ];
    const matchCount = insuranceKeywords.filter(k => text.includes(k)).length;
    
    if (matchCount < 2 && !text.includes('tata aig') && !text.includes('hdfc ergo') && !text.includes('star health') && !text.includes('lic')) {
      return {
        isValid: false,
        type: 'health',
        subtype: 'individual_health',
        insurer: 'Unknown Insurer',
        confidence: 0.2,
        reasoning: ['Document does not contain sufficient insurance policy markers']
      };
    }

    // 2. Identify Insurer
    let insurer = 'General Insurance';
    if (text.includes('tata aig')) insurer = 'Tata AIG General Insurance Company Limited';
    else if (text.includes('hdfc ergo')) insurer = 'HDFC ERGO General Insurance Company Limited';
    else if (text.includes('star health')) insurer = 'Star Health and Allied Insurance Company Limited';
    else if (text.includes('icici lombard')) insurer = 'ICICI Lombard General Insurance';
    else if (text.includes('icici prudential') || text.includes('icici pru')) insurer = 'ICICI Prudential Life Insurance';
    else if (text.includes('care health') || text.includes('religare')) insurer = 'Care Health Insurance';
    else if (text.includes('niva bupa') || text.includes('max bupa')) insurer = 'Niva Bupa Health Insurance';
    else if (text.includes('bajaj allianz')) insurer = 'Bajaj Allianz General Insurance';
    else if (text.includes('life insurance corporation') || text.includes('lic of india') || text.includes(' lic ')) insurer = 'Life Insurance Corporation of India (LIC)';
    else if (text.includes('max life')) insurer = 'Max Life Insurance';
    else if (text.includes('sbi general')) insurer = 'SBI General Insurance';
    else if (text.includes('sbi life')) insurer = 'SBI Life Insurance';
    else if (text.includes('new india assurance')) insurer = 'The New India Assurance Co. Ltd.';
    else if (text.includes('national insurance')) insurer = 'National Insurance Company';
    else if (text.includes('oriental insurance')) insurer = 'The Oriental Insurance Company';
    else if (text.includes('united india')) insurer = 'United India Insurance Company';

    // 3. Classify Type & Subtype
    let type = 'health';
    let subtype = 'individual_health';
    let confidence = 0.85;

    // --- MOTOR CLASSIFICATION ---
    const isMotor = text.includes('registration no') || text.includes('engine no') || text.includes('chassis no') ||
      text.includes('idv') || text.includes('own damage') || text.includes('third party') || text.includes('private car') ||
      text.includes('two wheeler') || text.includes('commercial vehicle') || text.includes('cubic capacity') || text.includes('ncb');

    if (isMotor) {
      type = 'motor';
      reasoning.push('Detected motor vehicle registration / IDV / engine markers');

      if (text.includes('two wheeler') || text.includes('motorcycle') || text.includes('scooter') || text.includes('2-wheeler') || text.includes('bike')) {
        subtype = 'two_wheeler';
        reasoning.push('Identified Two-Wheeler policy terms');
      } else if (text.includes('commercial vehicle') || text.includes('goods carrying') || text.includes('gcv') || text.includes('pcv') || text.includes('passenger carrying') || text.includes('permit') || text.includes('gross vehicle weight')) {
        subtype = 'commercial_vehicle';
        reasoning.push('Identified Commercial Vehicle / Permit terms');
      } else {
        subtype = 'car';
        reasoning.push('Identified Private Car 4-Wheeler policy terms');
      }
      return { isValid: true, type, subtype, insurer, confidence: 0.95, reasoning };
    }

    // --- GENERAL (TRAVEL & PROPERTY) CLASSIFICATION ---
    if (text.includes('passport no') || text.includes('travel insurance') || text.includes('overseas travel') || text.includes('schengen') || text.includes('trip duration') || text.includes('destination country')) {
      type = 'general';
      subtype = 'travel';
      reasoning.push('Identified Travel Insurance / Passport / Trip destination markers');
      return { isValid: true, type, subtype, insurer, confidence: 0.92, reasoning };
    }

    if (text.includes('griha raksha') || text.includes('home insurance') || text.includes('property insurance') || text.includes('building structure') || text.includes('contents sum insured') || text.includes('built-up area') || text.includes('stfi')) {
      type = 'general';
      subtype = 'home_property';
      reasoning.push('Identified Home & Property / Building structure markers');
      return { isValid: true, type, subtype, insurer, confidence: 0.92, reasoning };
    }

    // --- LIFE INSURANCE CLASSIFICATION ---
    const isLife = text.includes('life assured') || text.includes('death benefit') || text.includes('sum assured') ||
      text.includes('policy term') || text.includes('premium payment term') || text.includes('uin') || text.includes('maturity date') ||
      text.includes('surrender value') || text.includes('annuity') || text.includes('fund value') || text.includes('money back');

    if (isLife && !text.includes('health insurance') && !text.includes('mediclaim') && !text.includes('medicare') && !text.includes('hospitalization') && !text.includes('ayush')) {
      type = 'life';
      reasoning.push('Detected Life Insurance / Death Benefit / Maturity terms');

      if (text.includes('ulip') || text.includes('unit linked') || text.includes('fund value') || text.includes('nav') || text.includes('units held')) {
        subtype = 'ulip';
        reasoning.push('Identified ULIP unit-linked fund markers');
      } else if (text.includes('annuity') || text.includes('pension') || text.includes('pensioner') || text.includes('annuitant') || text.includes('vesting date')) {
        subtype = 'pension_annuity';
        reasoning.push('Identified Pension & Annuity retirement markers');
      } else if (text.includes('child') || text.includes('education plan') || text.includes('future star') || text.includes('young star')) {
        subtype = 'child_insurance';
        reasoning.push('Identified Child Education Plan markers');
      } else if (text.includes('money back') || text.includes('moneyback') || text.includes('survival benefit') || text.includes('periodic payout')) {
        subtype = 'money_back';
        reasoning.push('Identified Money Back survival payout schedule markers');
      } else if (text.includes('return of premium') || text.includes('trop') || text.includes('refund of premium')) {
        subtype = 'term_return_of_premium';
        reasoning.push('Identified Term with Return of Premium (TROP) markers');
      } else if (text.includes('whole life') || text.includes('age 100') || text.includes('age 99')) {
        subtype = 'whole_life';
        reasoning.push('Identified Whole Life coverage markers');
      } else if (text.includes('endowment') || text.includes('guaranteed addition') || text.includes('bonus')) {
        subtype = 'endowment';
        reasoning.push('Identified Endowment savings plan markers');
      } else if (text.includes('group life') || text.includes('group term') || text.includes('gtl') || text.includes('employer')) {
        subtype = 'group_life';
        reasoning.push('Identified Group Term Life markers');
      } else {
        subtype = 'term';
        reasoning.push('Identified Pure Term Life protection markers');
      }
      return { isValid: true, type, subtype, insurer, confidence: 0.9, reasoning };
    }

    // --- HEALTH INSURANCE CLASSIFICATION ---
    type = 'health';
    reasoning.push('Detected Health / Mediclaim policy terms');

    if (text.includes('critical illness') || text.includes('36 illnesses') || text.includes('survival period')) {
      subtype = 'critical_illness';
      reasoning.push('Identified Critical Illness benefit schedule');
    } else if (text.includes('personal accident') || text.includes('accidental death') || text.includes('permanent total disability') || text.includes('ptd')) {
      subtype = 'personal_accident';
      reasoning.push('Identified Personal Accident & Disability schedule');
    } else if (text.includes('super top up') || text.includes('super top-up') || text.includes('aggregate deductible')) {
      subtype = 'super_top_up';
      reasoning.push('Identified Super Top-up with aggregate deductible');
    } else if (text.includes('top up') || text.includes('top-up') || text.includes('threshold deductible')) {
      subtype = 'top_up';
      reasoning.push('Identified Top-up with per-claim deductible');
    } else if (text.includes('senior citizen') || text.includes('red carpet') || text.includes('silver health') || text.includes('senior health')) {
      subtype = 'senior_citizen_health';
      reasoning.push('Identified Senior Citizen specific plan');
    } else if (text.includes('group health') || text.includes('gmc') || text.includes('group mediclaim') || text.includes('corporate buffer')) {
      subtype = 'group_health';
      reasoning.push('Identified Group Mediclaim policy');
    } else if (text.includes('floater') || text.includes('family') || text.includes('members insured') || text.includes('relation : spouse') || text.includes('relation : son') || text.includes('relation : daughter')) {
      subtype = 'family_floater';
      reasoning.push('Identified Family Floater with multiple insured members');
    } else {
      subtype = 'individual_health';
      reasoning.push('Identified Individual Health coverage');
    }

    return {
      isValid: true,
      type,
      subtype,
      insurer,
      confidence: 0.92,
      reasoning
    };
  }
}

let instance = null;
const getInsuranceClassifier = () => {
  if (!instance) {
    instance = new InsuranceClassifier();
  }
  return instance;
};

module.exports = {
  InsuranceClassifier,
  getInsuranceClassifier
};
