/**
 * Metadata on response
 */
export interface ResponseMeta {
  count?: number;
}

/**
 * List Response for list, search and their equivalent query builder method (findAll, findWhere)
 */
export interface ListResponse<T> {
  data?: Array<T>;
  meta?: ResponseMeta;
}
