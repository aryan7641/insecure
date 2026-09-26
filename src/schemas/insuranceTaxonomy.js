/**
 * INSecure Insurance Taxonomy - Controlled Phase 1 Definitions
 * 4 Main Types, 22 Subtypes with stable internal codes.
 */

const INSURANCE_TYPES = Object.freeze({
  LIFE: 'life',
  HEALTH: 'health',
  MOTOR: 'motor',
  GENERAL: 'general'
});

const INSURANCE_TAXONOMY = Object.freeze([
  {
    code: INSURANCE_TYPES.LIFE,
    name: 'Life Insurance',
    description: 'Term, Endowment, ULIP, Whole Life, Money Back, Pension & Child Plans',
    subtypes: [
      { code: 'term', name: 'Term Insurance', category: 'Protection' },
      { code: 'term_return_of_premium', name: 'Term with Return of Premium (TROP)', category: 'Protection' },
      { code: 'whole_life', name: 'Whole Life Insurance', category: 'Savings & Protection' },
      { code: 'endowment', name: 'Endowment Plan', category: 'Savings' },
      { code: 'money_back', name: 'Money Back Plan', category: 'Savings' },
      { code: 'ulip', name: 'Unit Linked Insurance Plan (ULIP)', category: 'Investment' },
      { code: 'child_insurance', name: 'Child Insurance Plan', category: 'Savings & Protection' },
      { code: 'pension_annuity', name: 'Pension / Annuity Plan', category: 'Retirement' },
      { code: 'group_life', name: 'Group Life / Group Term', category: 'Group' }
    ]
  },
  {
    code: INSURANCE_TYPES.HEALTH,
    name: 'Health Insurance',
    description: 'Individual, Family Floater, Senior Citizen, Critical Illness & Top-up Plans',
    subtypes: [
      { code: 'individual_health', name: 'Individual Health', category: 'Retail' },
      { code: 'family_floater', name: 'Family Floater', category: 'Retail' },
      { code: 'senior_citizen_health', name: 'Senior Citizen Health', category: 'Specialized' },
      { code: 'group_health', name: 'Group Health (GMC)', category: 'Corporate' },
      { code: 'critical_illness', name: 'Critical Illness Cover', category: 'Benefit' },
      { code: 'top_up', name: 'Top-up Health', category: 'Supplemental' },
      { code: 'super_top_up', name: 'Super Top-up (Aggregate Deductible)', category: 'Supplemental' },
      { code: 'personal_accident', name: 'Personal Accident Cover', category: 'Benefit' }
    ]
  },
  {
    code: INSURANCE_TYPES.MOTOR,
    name: 'Motor Insurance',
    description: 'Comprehensive, Own Damage and Third Party Vehicle Covers',
    subtypes: [
      { code: 'car', name: 'Car Insurance (Private 4-Wheeler)', category: 'Private Vehicle' },
      { code: 'two_wheeler', name: 'Two-Wheeler Insurance', category: 'Private Vehicle' },
      { code: 'commercial_vehicle', name: 'Commercial Vehicle Insurance', category: 'Commercial' }
    ]
  },
  {
    code: INSURANCE_TYPES.GENERAL,
    name: 'General & Property Insurance',
    description: 'Travel, Home and Property Risk Protection',
    subtypes: [
      { code: 'travel', name: 'Travel Insurance', category: 'Travel' },
      { code: 'home_property', name: 'Home / Property Insurance', category: 'Property' }
    ]
  }
]);

// Helper to look up subtype metadata
const getSubtypeConfig = (subtypeCode) => {
  if (!subtypeCode) return null;
  const normalized = subtypeCode.toLowerCase().trim();
  for (const t of INSURANCE_TAXONOMY) {
    const found = t.subtypes.find(st => st.code === normalized);
    if (found) {
      return {
        type: t.code,
        typeName: t.name,
        subtype: found.code,
        subtypeName: found.name,
        category: found.category
      };
    }
  }
  return null;
};

// Map legacy LOB string to new type and subtype
const normalizeLegacyLob = (lob, policyType, subLob) => {
  const combined = `${lob || ''} ${policyType || ''} ${subLob || ''}`.toLowerCase();
  
  if (combined.includes('car') || combined.includes('motor') || combined.includes('4-wheeler')) {
    return { type: 'motor', subtype: 'car' };
  }
  if (combined.includes('two') || combined.includes('bike') || combined.includes('scooter')) {
    return { type: 'motor', subtype: 'two_wheeler' };
  }
  if (combined.includes('commercial vehicle') || combined.includes('truck') || combined.includes('gcv') || combined.includes('pcv')) {
    return { type: 'motor', subtype: 'commercial_vehicle' };
  }
  if (combined.includes('floater') || combined.includes('family')) {
    return { type: 'health', subtype: 'family_floater' };
  }
  if (combined.includes('senior')) {
    return { type: 'health', subtype: 'senior_citizen_health' };
  }
  if (combined.includes('critical')) {
    return { type: 'health', subtype: 'critical_illness' };
  }
  if (combined.includes('super top') || combined.includes('super-top')) {
    return { type: 'health', subtype: 'super_top_up' };
  }
  if (combined.includes('top up') || combined.includes('top-up')) {
    return { type: 'health', subtype: 'top_up' };
  }
  if (combined.includes('accident') || combined.includes('pa cover')) {
    return { type: 'health', subtype: 'personal_accident' };
  }
  if (combined.includes('health')) {
    return { type: 'health', subtype: 'individual_health' };
  }
  if (combined.includes('term') || combined.includes('pure protection')) {
    return { type: 'life', subtype: 'term' };
  }
  if (combined.includes('ulip') || combined.includes('unit linked')) {
    return { type: 'life', subtype: 'ulip' };
  }
  if (combined.includes('money back') || combined.includes('moneyback')) {
    return { type: 'life', subtype: 'money_back' };
  }
  if (combined.includes('endowment')) {
    return { type: 'life', subtype: 'endowment' };
  }
  if (combined.includes('annuity') || combined.includes('pension')) {
    return { type: 'life', subtype: 'pension_annuity' };
  }
  if (combined.includes('child')) {
    return { type: 'life', subtype: 'child_insurance' };
  }
  if (combined.includes('life')) {
    return { type: 'life', subtype: 'term' };
  }
  if (combined.includes('travel')) {
    return { type: 'general', subtype: 'travel' };
  }
  if (combined.includes('home') || combined.includes('property') || combined.includes('fire')) {
    return { type: 'general', subtype: 'home_property' };
  }

  // Default fallback
  return { type: 'health', subtype: 'individual_health' };
};

module.exports = {
  INSURANCE_TYPES,
  INSURANCE_TAXONOMY,
  getSubtypeConfig,
  normalizeLegacyLob
};
