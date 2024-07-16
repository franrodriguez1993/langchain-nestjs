import { Injectable } from '@nestjs/common';
import { LangchainService } from '../../shared/services/langchain.service';
import { ModuleRef } from '@nestjs/core';
import { ConversationDTO } from './conversation.dto';
import { MongoChatHistory } from '../../shared/services/mongo-history.service';
import { NLPService } from '../../shared/services/npl.service';

@Injectable()
export class ConversationService {
  private langchainService: LangchainService;
  private mongoChatHistory: MongoChatHistory;
  private nlpService: NLPService;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.langchainService = this.moduleRef.get(LangchainService, {
      strict: false,
    });
    this.mongoChatHistory = this.moduleRef.get(MongoChatHistory, { strict: false });
    this.nlpService = this.moduleRef.get(NLPService, { strict: false });
  }

  async message(auth0Id: string, dto: ConversationDTO) {

    //TODO: Necesitamos manejar el historial del chat con esta nueva lógica de agentes.
    // const {chatHistory,memoryClient} = await this.mongoChatHistory.getMongoChatHistory(auth0Id);

    //TODO: Crear lógica para seleccionar el agente en función del intent.
    const tokens = this.nlpService.preprocess(dto.question);
    const intent = this.nlpService.classify(tokens);


    const products = ["milanesa | 2500", "pollo al horno | 6000", "ensalada cesar | 3200", "empanada | 750"]
    
    // const response = await this.langchainService.productArrayAgent(products, dto.question);
    const response = await this.langchainService.productExistsAgent(products, dto.question);

    //save chat
    // await memoryClient.chatHistory.addUserMessage(dto.question);
    // await memoryClient.chatHistory.addAIChatMessage(response.output);

    return response.content;
  }
  
}
