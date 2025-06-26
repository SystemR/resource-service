import { provideHttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { ResourceConfigService } from './resource-config.service';

@NgModule({
  imports: [],
  providers: [ResourceConfigService, provideHttpClient()],
  declarations: [],
  exports: []
})
export class ResourceModule {}
