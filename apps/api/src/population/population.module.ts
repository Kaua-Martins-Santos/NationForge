import { Module } from '@nestjs/common';
import { PopulationService } from './population.service';

@Module({
  providers: [PopulationService],
  exports: [PopulationService],
})
export class PopulationModule {}
