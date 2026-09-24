const xlsx = require('xlsx');
const Nav = require('../models/Nav');
const Import = require('../models/Import');

const importNav = async (fileBuffer, fileName, user) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const row of data) {
    try {
      const schemeCode = row.schemeCode || row['Scheme Code'];
      const navValue = row.nav || row['Net Asset Value'] || row['NAV'];
      const dateValue = row.date || row['Date'];

      if (!schemeCode || navValue === undefined || !dateValue) {
        throw new Error('Missing required fields: schemeCode, nav, or date');
      }

      const navNum = Number(navValue);
      if (isNaN(navNum)) {
        throw new Error('NAV must be a valid number');
      }

      const dateObj = new Date(dateValue);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }

      await Nav.updateOne(
        { schemeCode, date: dateObj },
        { 
          $set: { 
            schemeCode, 
            nav: navNum, 
            date: dateObj, 
            schemeName: row.schemeName || row['Scheme Name'] || '' 
          } 
        },
        { upsert: true }
      );
      successCount++;
    } catch (err) {
      errorCount++;
      errors.push({ row, error: err.message });
    }
  }

  const importRecord = await Import.create({
    type: 'nav',
    fileName,
    importedBy: user.userId,
    status: errorCount > 0 ? (successCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED') : 'SUCCESS',
    details: { totalRows: data.length, successCount, errorCount, errors }
  });

  return { totalRows: data.length, successCount, errorCount, errors, importId: importRecord._id };
};

const queryNav = async (filters, pagination = { limit: 10, skip: 0 }) => {
  const query = {};
  if (filters.schemeCode) query.schemeCode = filters.schemeCode;
  if (filters.schemeName) query.schemeName = new RegExp(filters.schemeName, 'i');
  
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  const [data, total] = await Promise.all([
    Nav.find(query)
      .sort({ date: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Nav.countDocuments(query)
  ]);

  return { data, total, page: pagination.page, limit: pagination.limit };
};

const getLatestNav = async (schemeCode) => {
  const navRecord = await Nav.findOne({ schemeCode }).sort({ date: -1 });
  if (!navRecord) return null;
  return { nav: navRecord.nav, date: navRecord.date };
};

const importHistory = async () => {
  return await Import.find({ type: 'nav' }).sort({ createdAt: -1 });
};

module.exports = {
  importNav,
  queryNav,
  getLatestNav,
  importHistory
};
