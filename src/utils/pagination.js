const parsePaginationParams = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = Math.min(parseInt(query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;
  const sort = query.sort || '-createdAt';
  
  return { page, limit, skip, sort };
};

const buildPaginationResponse = (total, page, limit) => {
  const pages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  parsePaginationParams,
  buildPaginationResponse
};
