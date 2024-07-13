import { Injectable } from '@nestjs/common';
import { LangchainService } from '../../shared/services/langchain.service';
import { ModuleRef } from '@nestjs/core';
import { ChatService } from '../chat-history/chat.service';
import { ConversationDTO } from './conversation.dto';
// eslint-disable-next-line prettier/prettier
import {AIMessage, HumanMessage,SystemMessage} from '@langchain/core/messages';
import { Chat } from '../chat-history/chat.model';
import { MessageDTO, MessageType } from '../chat-history/chat.dto';

@Injectable()
export class ConversationService {
  private langchainService: LangchainService;
  private chatService: ChatService;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.langchainService = this.moduleRef.get(LangchainService, {
      strict: false,
    });
    this.chatService = this.moduleRef.get(ChatService, { strict: false });
  }

  async message(auth0Id: string, dto: ConversationDTO) {
    // Manage chat
    const chat = await this.manageChat(auth0Id);

    // Get executor:
    const executor = await this.langchainService.messageAgent();

    // Serialize history messages:
    const messages = this.serializeMessages(chat.messages);
    console.log(messages);
    // Invoke
    const response = await executor.invoke({
      input: dto.question,
      chat_history: messages,
    });

    //save chat
    await this.chatService.addMessage(auth0Id,{type:MessageType.HUMAN,text:dto.question} );
    await this.chatService.addMessage(auth0Id,{type:MessageType.AI,text:response.output} );
    return response.output;
  }

  private async manageChat(auth0Id: string): Promise<Chat> {
    let chat;
    chat = await this.chatService.getChat(auth0Id);
    if (!chat) {
      chat = await this.chatService.createChat(auth0Id);
    }
    return chat;
  }

  private serializeMessages(messages: MessageDTO[]) {
    if (messages.length === 0) return [];

    return messages.map((msg) => {
      if (msg.type === MessageType.HUMAN) return new HumanMessage(msg.text);
      else if (msg.type === MessageType.AI) return new AIMessage(msg.text);
      else if (msg.type === MessageType.SYSTEM) return new SystemMessage(msg.text);
    })
  }
  
}
