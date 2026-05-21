/**
 * paginate.js — Reusable pagination utility for Mongoose queries
 *
 * Usage:
 *   const result = await paginate(Movie, { title: /avenger/i }, req.query, {
 *     sort: { createdAt: -1 },
 *     populate: ['genres'],
 *   });
 *   res.json(result);
 *
 * Query params supported:
 *   ?page=1&limit=10&search=keyword&sort=createdAt&order=desc
 */

/**
 * Parse and validate pagination query params.
 * @param {Object} query - req.query
 * @returns {{ page: number, limit: number, sort: string, order: string, search: string }}
 */
export const parseQueryParams = (query = {}) => {
  let page  = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Validate & clamp
  if (!page || page < 1)    page  = 1;
  if (!limit || limit < 1)  limit = 10;
  if (limit > 1000)          limit = 1000; // hard cap

  const sort   = query.sort  || 'createdAt';
  const order  = query.order === 'asc' ? 1 : -1;
  const search = (query.search || '').trim();

  return { page, limit, sort, order, search };
};

/**
 * Execute paginated query on a Mongoose model.
 *
 * @param {import('mongoose').Model} Model   - Mongoose model
 * @param {Object}                   filter  - Mongoose filter object
 * @param {Object}                   query   - req.query (page, limit, sort, order, search)
 * @param {Object}                   [opts]  - Extra options
 * @param {Object}                   [opts.defaultSort]  - Default sort (e.g. { createdAt: -1 })
 * @param {Array|string}             [opts.populate]     - Populate config(s)
 * @param {string}                   [opts.select]       - Select fields
 * @param {string[]}                 [opts.searchFields] - Fields to apply text search on
 * @returns {Promise<{ data: any[], pagination: Object }>}
 */
export const paginate = async (Model, filter = {}, query = {}, opts = {}) => {
  const { page, limit, sort, order, search } = parseQueryParams(query);

  // Build search filter
  const searchFilter = {};
  if (search && opts.searchFields && opts.searchFields.length > 0) {
    searchFilter.$or = opts.searchFields.map((field) => ({
      [field]: { $regex: search, $options: 'i' },
    }));
  }

  // Merge filters
  const finalFilter = { ...filter, ...searchFilter };

  // Sort
  const sortObj = opts.defaultSort && !query.sort
    ? opts.defaultSort
    : { [sort]: order };

  // Count total
  const totalItems = await Model.countDocuments(finalFilter);
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const skip       = (page - 1) * limit;

  // Query
  let dbQuery = Model.find(finalFilter)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Select
  if (opts.select) {
    dbQuery = dbQuery.select(opts.select);
  }

  // Populate
  if (opts.populate) {
    const pops = Array.isArray(opts.populate) ? opts.populate : [opts.populate];
    for (const pop of pops) {
      dbQuery = dbQuery.populate(pop);
    }
  }

  const data = await dbQuery.lean();

  return {
    data,
    pagination: {
      currentPage:  page,
      totalPages,
      totalItems,
      limit,
      hasNextPage:  page < totalPages,
      hasPrevPage:  page > 1,
    },
  };
};

/**
 * Paginate an already-built Mongoose Query (for complex pipelines).
 * Use when you need to build the query externally.
 *
 * @param {import('mongoose').Model} Model
 * @param {Object}                   filter     - The same filter used for the query
 * @param {import('mongoose').Query}  dbQuery   - Pre-built query (before skip/limit)
 * @param {Object}                   query      - req.query
 * @returns {Promise<{ data: any[], pagination: Object }>}
 */
export const paginateQuery = async (Model, filter, dbQuery, query = {}) => {
  const { page, limit } = parseQueryParams(query);

  const totalItems = await Model.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const skip       = (page - 1) * limit;

  const data = await dbQuery.skip(skip).limit(limit).lean();

  return {
    data,
    pagination: {
      currentPage:  page,
      totalPages,
      totalItems,
      limit,
      hasNextPage:  page < totalPages,
      hasPrevPage:  page > 1,
    },
  };
};

export default paginate;
