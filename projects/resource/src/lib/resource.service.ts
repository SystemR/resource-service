import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injector } from '@angular/core';

import { Resource } from './resource';
import { GetQuery, SearchQuery } from './resource-builders';
import { ResourceConfigService } from './resource-config.service';
import { ListResponse } from './resource-interfaces';

/**
 * Base ResourceService. This allows us to map the following functions to an api endpoint
 * list() to GET /resource
 * get(id) to GET /resource/id
 * create(resource) to POST /resource
 * update(resource) to PUT /resource/id
 * delete(resource) to DELETE /resource/id
 *
 * Requires ResourceConfigService for getting the api base url
 */
export class ResourceService {
  public apiUrl: string;
  private http: HttpClient;

  constructor(injector: Injector, private modelClass: any) {
    this.http = injector.get(HttpClient);
    this.apiUrl = injector
      .get(ResourceConfigService)
      .getBaseUrl()
      .concat(modelClass.basePath);
  }

  /**
   * Utilities
   */
  generateIndex<T extends Resource>(
    entries: Array<T>
  ): { [id: number]: T } | { [id: string]: T } {
    const index: { [id: number]: T } | { [id: string]: T } = {};
    for (let i = 0, len = entries.length; i < len; i++) {
      const item = entries[i];
      index[item.id] = item;
    }
    return index;
  }

  /**
   * Maps to GET /resource
   * @param params other http params
   * @param headers optional HTTP headers
   */
  list<T extends Resource>(
    params?: HttpParams,
    headers?: HttpHeaders
  ): Promise<ListResponse<T>> {
    return new Promise((res, rej) => {
      this.http.get(this.apiUrl, { params, headers }).subscribe(
        (result: ListResponse<T>) => {
          res(this.generateListResponse(result));
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * Maps to GET on /resource
   * @returns GetQuery instance
   */
  findAll<T extends Resource>(): GetQuery<T> {
    return new GetQuery<T>(this.list.bind(this));
  }

  /**
   * Maps to GET /resource/:id
   * @param id resource's id
   * @param params other http params
   * @param headers optional HTTP headers
   */
  get<T extends Resource>(
    id: number | string,
    params?: HttpParams,
    headers?: HttpHeaders
  ): Promise<T> {
    return new Promise((res, rej) => {
      this.http.get(this.apiUrl + '/' + id, { params, headers }).subscribe(
        (data: T) => {
          const item = new this.modelClass();
          Object.assign(item, data);
          if (item.onInstantiated) {
            item.onInstantiated();
          }
          res(item);
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * Maps to GET /resource/:id
   * @param id resource's id
   * @returns GetQuery
   */
  findById<T extends Resource>(id: number | string): GetQuery<T> {
    return new GetQuery<T>(this.get.bind(this), id);
  }

  /**
   * Maps to POST /resource
   * @param resource an instance of type Resource to be created on the back-end
   * @param headers optional HTTP headers
   */
  create<T extends Resource>(resource: T, headers?: HttpHeaders): Promise<T> {
    return new Promise((res, rej) => {
      this.http.post(this.apiUrl, resource).subscribe(
        (data: T) => {
          Object.assign(resource, data);
          res(resource);
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * Maps to PUT on /resource/:id
   * @param resource an instance of type Resource to be updated on the back-end
   * @param headers optional HTTP headers
   */
  update<T extends Resource>(resource: T, headers?: HttpHeaders): Promise<T> {
    return new Promise((res, rej) => {
      this.http.put(this.apiUrl + '/' + resource.id, resource).subscribe(
        (data: T) => {
          if (data) {
            Object.assign(resource, data);
          }
          res(resource);
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * Maps to PATCH /resource/:id
   * @param resource a partial instance of type Resource to be updated on the back-end
   * @param headers optional HTTP headers
   */
  patch<T extends Resource>(resource: T, headers?: HttpHeaders): Promise<T> {
    return new Promise((res, rej) => {
      this.http.patch(this.apiUrl + '/' + resource.id, resource).subscribe(
        (data: T) => {
          if (data) {
            Object.assign(resource, data);
          }
          res(resource);
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * Maps to DELETE /resource/:id
   * @param resource an instance of type Resource to delete
   * @param headers optional HTTP headers
   */
  remove<T extends Resource>(resource: T, headers?: HttpHeaders): Promise<T> {
    return new Promise((res, rej) => {
      this.http.delete(this.apiUrl + '/' + resource.id).subscribe(
        (data: T) => {
          res(resource);
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * Search API. Maps to (GET | PATCH | DELETE) /resource/search?field=value using HttpParams
   * @param searchParams Query parameters
   * @param method HTTP method to use (only get, patch, delete)
   * @param headers optional HTTP headers
   * @param resource optional partial instance of type Resource to send (when updating multiple for example)
   */
  search<T extends Resource>(
    searchParams: HttpParams,
    method: 'get' | 'patch' | 'delete' = 'get',
    resource?: T,
    headers?: HttpHeaders
  ): Promise<ListResponse<T> | undefined> {
    return new Promise((res, rej) => {
      let httpRequest = null;

      const opts = { params: searchParams, headers };

      if (method === 'patch') {
        httpRequest = this.http[method](
          this.apiUrl + '/search',
          resource,
          opts
        );
      } else {
        // get || delete
        httpRequest = this.http[method](this.apiUrl + '/search', opts);
      }

      if (method === 'get') {
        /**
         * get returns search results
         */
        httpRequest.subscribe(
          (result: ListResponse<T>) => {
            res(this.generateListResponse(result));
          },
          err => {
            rej(err);
          }
        );
      } else {
        /**
         * patch and delete only return 203 for successful patch or delete
         */
        httpRequest.subscribe(
          result => {
            res();
          },
          err => {
            rej(err);
          }
        );
      }
    });
  }

  /**
   * Maps to GET /resource/search?field=value
   * @param field the fieldname to search
   * @param value the value of the field to search
   * @returns SearchQuery instance
   */
  findWhere<T extends Resource>(
    field: string,
    value: number | string | Array<number | string>
  ): SearchQuery<T> {
    return new SearchQuery<T>(field, value, this.search.bind(this));
  }

  /**
   * Maps to POST to resource/upload with FormData
   * @param formData formData to upload
   * @param headers optional HTTP headers
   */
  upload<K>(
    formData: FormData,
    headers?: HttpHeaders
  ): Promise<K | ListResponse<K>> {
    return new Promise((res, rej) => {
      this.http.post(this.apiUrl + '/upload', formData, { headers }).subscribe(
        (data: K | ListResponse<K>) => {
          res(data);
        },
        err => {
          rej(err);
        }
      );
    });
  }

  /**
   * uploadFor does a POST to resource/:id/upload with FormData
   * @param resource resource to attach files to
   * @param formData formData to upload
   */
  uploadFor<T extends Resource, K>(
    resource: T,
    formData: FormData,
    headers?: HttpHeaders
  ): Promise<K | ListResponse<K>> {
    return new Promise((res, rej) => {
      this.http
        .post(this.apiUrl + '/' + resource.id + '/upload', formData, {
          headers
        })
        .subscribe(
          (data: K | ListResponse<K>) => {
            res(data);
          },
          err => {
            rej(err);
          }
        );
    });
  }

  private generateListResponse<T extends Resource>(result): ListResponse<T> {
    if (result.data) {
      const items: Array<T> = [];
      for (const row of result.data) {
        const item = new this.modelClass();
        Object.assign(item, row);
        if (item.onInstantiated) {
          item.onInstantiated();
        }
        items.push(item);
      }
      result.data = items;
    }
    return result;
  }
}
