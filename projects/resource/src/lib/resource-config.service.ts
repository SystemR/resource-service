import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResourceConfigService {
  url = '';
  constructor() {}

  setBaseUrl(url: string) {
    this.url = url;
  }

  getBaseUrl() {
    return this.url;
  }
}
