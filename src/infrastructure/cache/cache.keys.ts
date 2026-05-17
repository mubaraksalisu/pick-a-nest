export const PropertiesCacheKeys = {
  propertyById: (id: string) => `property:${id}`,
  listVersion: 'properties:list:version',
  featured: (version: number, page: number, limit: number) =>
    `properties:featured:${version}:${page}:${limit}`,
  latest: (version: number, page: number, limit: number) =>
    `properties:latest:${version}:${page}:${limit}`,
  queryList: (version: number, query: string) =>
    `properties:query:${version}:${query}`,
};
