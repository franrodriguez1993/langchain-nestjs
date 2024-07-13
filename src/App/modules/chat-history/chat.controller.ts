import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { Request } from 'express';
import { AuthenticationGuard } from '../../shared/guards/authentication.guard';
import { Auth0ClientService } from '../../shared/services/auth0-client.service';

@Controller('chat')
@ApiTags('chat')
@UseGuards(AuthenticationGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private auth0ClientService: Auth0ClientService,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create chat' })
  async createChat(@Req() request: Request) {
    const auth0Id = this.auth0ClientService.getAuth0Id(request);
    const chat = await this.chatService.getChat(auth0Id);
    if (chat) throw new BadRequestException('User has an open chat');
    const data = await this.chatService.createChat(auth0Id);
    return { statusCode: HttpStatus.CREATED, result: data };
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'get chat' })
  async getChat(@Req() request: Request) {
    const auth0Id = this.auth0ClientService.getAuth0Id(request);
    const chat = await this.chatService.getChat(auth0Id);
    if (!chat) throw new NotFoundException('Chat not found');
    return { statusCode: HttpStatus.OK, result: chat };
  }
}
