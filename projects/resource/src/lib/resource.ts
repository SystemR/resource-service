/**
 * Base class for a resource. This allows us to auto map a service to the resource's endpoint
 */
export abstract class Resource {
  static basePath = '';
  abstract id: number | string;
}

export interface Resource {
  onInstantiated?();
}
