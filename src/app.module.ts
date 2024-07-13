import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import helmet from 'helmet';
import { ConfigModule } from '@nestjs/config';
import { MongoConfigModule } from './database/MongoConfig.module';
import { SharedModule } from './App/shared/shared.module';
import { ChatModule } from './App/modules/chat-history/chat.module';
import { ConversationModule } from './App/modules/conversation/conversation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongoConfigModule,
    SharedModule,
    ChatModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(helmet()).forRoutes('*');
  }
}
