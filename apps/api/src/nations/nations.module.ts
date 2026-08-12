import { Module } from '@nestjs/common';
import { PopulationModule } from '../population/population.module';
import { NationsController } from './nations.controller';
import { NationsService } from './nations.service';

@Module({
  imports: [PopulationModule],
  controllers: [NationsController],
  providers: [NationsService],
  exports: [NationsService],
})
export class NationsModule {}
