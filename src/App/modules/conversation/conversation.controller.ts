import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Auth0ClientService } from '../../shared/services/auth0-client.service';
import { Request } from 'express';
import { ConversationDTO } from './conversation.dto';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('conversation')
export class ConversationController {
  constructor(
    private conversationService: ConversationService,
    private auth0ClientService: Auth0ClientService,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Langchain - Chat')
  @ApiOperation({ summary: 'Message with AI' })
  async message(@Req() req: Request, @Body() dto: ConversationDTO) {

    const data = await this.conversationService.message( dto);
    return { statusCode: HttpStatus.OK, result: data };
  }
}
