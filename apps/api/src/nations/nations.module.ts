import { Module } from '@nestjs/common';
import { EconomyModule } from '../economy/economy.module';
import { PopulationModule } from '../population/population.module';
import { ResourcesModule } from '../resources/resources.module';
import { SimulationModule } from '../simulation/simulation.module';
import { NationsController } from './nations.controller';
import { NationsService } from './nations.service';

@Module({
  imports: [PopulationModule, EconomyModule, ResourcesModule, SimulationModule],
  controllers: [NationsController],
  providers: [NationsService],
  exports: [NationsService],
})
export class NationsModule {}
