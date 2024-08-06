import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { Auth0ClientService } from './services/auth0-client.service';
import { MongoChatHistory } from './services/mongo-history.service';
import { NLPService } from './services/npl.service';
import { UtilService } from './services/util.service';
import { ConfigModule } from '@nestjs/config';
import { Langchain2Service } from './services/langchain2.service';

const SERVICES = [
  Auth0ClientService,
  MongoChatHistory,
  NLPService,
  UtilService,
  Langchain2Service
];

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule],
  providers: SERVICES,
  exports: SERVICES,
})
export class SharedModule {}
