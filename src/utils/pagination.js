const parsePaginationParams = (query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
  const skip = (page - 1) * limit;
  const sort = query.sort || '-createdAt';
  
  return { page, limit, skip, sort };
};

const buildPaginationResponse = (data, total, page, limit) => {
  if (Array.isArray(data)) {
    const realTotal = typeof total === 'number' ? total : data.length;
    const realPage = typeof page === 'number' ? page : 1;
    const realLimit = typeof limit === 'number' ? limit : 50;
    const pages = Math.ceil(realTotal / realLimit) || 1;

    return {
      data,
      customers: data,
      policies: data,
      followUps: data,
      total: realTotal,
      page: realPage,
      limit: realLimit,
      pages,
      hasNextPage: realPage < pages,
      hasPrevPage: realPage > 1
    };
  }
  
  const legacyTotal = data || 0;
  const legacyPage = total || 1;
  const legacyLimit = page || 50;
  const pages = Math.ceil(legacyTotal / legacyLimit) || 1;

  return {
    total: legacyTotal,
    page: legacyPage,
    limit: legacyLimit,
    pages,
    hasNextPage: legacyPage < pages,
    hasPrevPage: legacyPage > 1
  };
};

module.exports = {
  parsePaginationParams,
  buildPaginationResponse
};
