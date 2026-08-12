import { Module } from '@nestjs/common';
import { NationsController } from './nations.controller';
import { NationsService } from './nations.service';

@Module({
  controllers: [NationsController],
  providers: [NationsService],
  exports: [NationsService],
})
export class NationsModule {}
