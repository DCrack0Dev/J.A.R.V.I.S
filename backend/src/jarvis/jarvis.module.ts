import { Module } from '@nestjs/common';
import { JarvisService } from './jarvis.service';
import { JarvisController } from './jarvis.controller';
import { ContextModule } from '../context/context.module';
import { RealTimeModule } from '../realtime/realtime.module';
import { StyleModule } from '../style/style.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';

@Module({
  imports: [
    ContextModule, 
    RealTimeModule, 
    StyleModule, 
    IntelligenceModule,
  ],
  controllers: [JarvisController],
  providers: [JarvisService],
})
export class JarvisModule {}
