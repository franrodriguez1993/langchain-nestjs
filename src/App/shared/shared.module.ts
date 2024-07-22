import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { Auth0ClientService } from './services/auth0-client.service';
import { LangchainService } from './services/langchain.service';
import { MongoChatHistory } from './services/mongo-history.service';
import { NLPService } from './services/npl.service';
import { UtilService } from './services/util.service';

const SERVICES = [
  Auth0ClientService,
  LangchainService,
  MongoChatHistory,
  NLPService,
  UtilService,
];

@Module({
  imports: [HttpModule],
  providers: SERVICES,
  exports: SERVICES,
})
export class SharedModule {}
