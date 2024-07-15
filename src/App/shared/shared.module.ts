import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { Auth0ClientService } from './services/auth0-client.service';
import { LangchainService } from './services/langchain.service';
import { MongoChatHistory } from './services/mongo-history.service';

const SERVICES = [Auth0ClientService, LangchainService,MongoChatHistory];

@Module({
  imports: [HttpModule],
  providers: SERVICES,
  exports: SERVICES,
})
export class SharedModule {}
