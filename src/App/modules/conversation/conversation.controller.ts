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
import { AuthenticationGuard } from '../../shared/guards/authentication.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('conversation')
@UseGuards(AuthenticationGuard)
export class ConversationController {
  constructor(
    private conversationService: ConversationService,
    private auth0ClientService: Auth0ClientService,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiTags('Langchain - Chat')
  @ApiOperation({ summary: 'Message with AI' })
  async message(@Req() req: Request, @Body() dto: ConversationDTO) {
    const auth0Id = this.auth0ClientService.getAuth0Id(req);
    const data = await this.conversationService.message(auth0Id, dto);
    return { statusCode: HttpStatus.OK, result: data };
  }
}
