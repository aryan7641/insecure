const Customer = require('../models/Customer');

exports.findDuplicates = async (agencyId, criteria) => {
  const { mobile, pan, email, name, dob } = criteria;
  
  if (!mobile && !pan && !email && (!name || !dob)) {
    return [];
  }

  const candidatesMap = new Map();
  const pushCandidate = (customer, score, field) => {
    const id = customer._id.toString();
    if (candidatesMap.has(id)) {
      const existing = candidatesMap.get(id);
      existing.matchScore += score;
      if (!existing.matchedFields.includes(field)) {
        existing.matchedFields.push(field);
      }
    } else {
      candidatesMap.set(id, {
        customer,
        matchScore: score,
        matchedFields: [field]
      });
    }
  };

  const queries = [];
  if (mobile) queries.push({ query: { agencyId, mobile, isDeleted: false }, score: 100, field: 'mobile' });
  if (pan) queries.push({ query: { agencyId, pan, isDeleted: false }, score: 90, field: 'pan' });
  if (email) queries.push({ query: { agencyId, email, isDeleted: false }, score: 80, field: 'email' });
  if (name && dob) queries.push({ query: { agencyId, name, dob, isDeleted: false }, score: 60, field: 'name_dob' });

  for (const { query, score, field } of queries) {
    const matches = await Customer.find(query);
    matches.forEach(m => pushCandidate(m, score, field));
  }

  const results = Array.from(candidatesMap.values());
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
};

exports.findImportDuplicates = async (agencyId, rows, identifierField = 'mobile') => {
  const duplicates = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const criteria = {
      mobile: row.mobile,
      pan: row.pan,
      email: row.email,
      name: row.name,
      dob: row.dob
    };
    
    const matches = await this.findDuplicates(agencyId, criteria);
    if (matches.length > 0) {
      duplicates.push({
        rowIndex: i,
        rowData: row,
        matches
      });
    }
  }
  return duplicates;
};
