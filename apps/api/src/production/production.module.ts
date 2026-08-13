import { Module } from '@nestjs/common';
import { ProductionService } from './production.service';

@Module({
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
