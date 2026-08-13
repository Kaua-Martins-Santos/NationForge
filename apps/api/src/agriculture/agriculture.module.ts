import { Module } from '@nestjs/common';
import { AgricultureService } from './agriculture.service';

@Module({
  providers: [AgricultureService],
  exports: [AgricultureService],
})
export class AgricultureModule {}
