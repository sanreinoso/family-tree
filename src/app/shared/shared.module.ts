import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

const SHARED_IMPORTS = [CommonModule];

@NgModule({
  imports: SHARED_IMPORTS,
  exports: SHARED_IMPORTS,
})
export class SharedModule {}
