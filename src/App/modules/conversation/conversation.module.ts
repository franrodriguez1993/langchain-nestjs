import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

@Module({
  imports: [ConfigModule.forRoot(), SharedModule],
  providers: [ConversationService],
  controllers: [ConversationController],
  exports: [],
})
export class ConversationModule {}
