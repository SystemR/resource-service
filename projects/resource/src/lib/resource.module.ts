import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { ResourceConfigService } from './resource-config.service';

@NgModule({
  imports: [HttpClientModule],
  providers: [ResourceConfigService],
  declarations: [],
  exports: [HttpClientModule]
})
export class ResourceModule {}
