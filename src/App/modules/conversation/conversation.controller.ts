import { Controller } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Auth0ClientService } from '../../shared/services/auth0-client.service';

@Controller()
export class ConversationController {
  constructor(
    private conversationService: ConversationService,
    private auth0ClientService: Auth0ClientService,
  ) {}
}
