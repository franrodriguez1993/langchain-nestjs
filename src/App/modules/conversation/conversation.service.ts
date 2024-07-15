import { Injectable } from '@nestjs/common';
import { LangchainService } from '../../shared/services/langchain.service';
import { ModuleRef } from '@nestjs/core';
import { ConversationDTO } from './conversation.dto';
import { MongoChatHistory } from '../../shared/services/mongo-history.service';

@Injectable()
export class ConversationService {
  private langchainService: LangchainService;
  private mongoChatHistory: MongoChatHistory;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.langchainService = this.moduleRef.get(LangchainService, {
      strict: false,
    });
    this.mongoChatHistory = this.moduleRef.get(MongoChatHistory,{strict:false})
  }

  async message(auth0Id: string, dto: ConversationDTO) {

    const {chatHistory,memoryClient} = await this.mongoChatHistory.getMongoChatHistory(auth0Id);

    // Get agent Executor:
    const executor = await this.langchainService.createDefaultAgent();

    // Invoke
    const response = await executor.invoke({
      input: dto.question,
      chat_history:chatHistory
    });

    //save chat
    await memoryClient.chatHistory.addUserMessage(dto.question);
    await memoryClient.chatHistory.addAIChatMessage(response.output);

    return response.output;
  }
  
}
