import { Injectable } from '@nestjs/common';
import { LangchainService } from '../../shared/services/langchain.service';
import { ModuleRef } from '@nestjs/core';
import { ConversationDTO } from './conversation.dto';
import { MongoChatHistory } from '../../shared/services/mongo-history.service';
import { NLPService } from '../../shared/services/npl.service';
import { ProductService } from '../product/product.service';
import { IntentType } from '../../shared/enums/intent.enum';
import { BufferMemory } from 'langchain/memory';

@Injectable()
export class ConversationService {
  private langchainService: LangchainService;
  private mongoChatHistory: MongoChatHistory;
  private productService: ProductService;
  private nlpService: NLPService;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.langchainService = this.moduleRef.get(LangchainService, {
      strict: false,
    });
    this.mongoChatHistory = this.moduleRef.get(MongoChatHistory, {
      strict: false,
    });
    this.nlpService = this.moduleRef.get(NLPService, { strict: false });
    this.productService = this.moduleRef.get(ProductService, { strict: false });
  }

  async message(auth0Id: string, dto: ConversationDTO) {
    //TODO: Necesitamos manejar el historial del chat con esta nueva lógica de agentes.
    const { chatHistory, memoryClient } =
      await this.mongoChatHistory.getMongoChatHistory(auth0Id);

    // define intent:
    const intent = await this.langchainService.intentAgent(
      dto.question,
      chatHistory,
    );
    switch (intent.content) {
      case IntentType.SEARCH: {
        await this.searchIntentProcess(dto, memoryClient);
      }
      case IntentType.BUY: {
        return await this.buyIntentProcess(dto, memoryClient);
      }
      case IntentType.CONFIRM: {
        return await this.confirmIntentProcess(dto, memoryClient);
      }
      case IntentType.REJECT: {
        return await this.rejectIntentProcess(dto, memoryClient);
      }
    }
  }

  /** BUY INTENT **/
  async buyIntentProcess(dto: ConversationDTO, memoryClient: BufferMemory) {
    const products = await this.serializeProducts();
    const response = await this.langchainService.productArrayAgent(
      products,
      dto.question,
    );
    let totalPrice = 0;
    response.products.map((p) => {
      totalPrice += p.price * p.quantity;
    });

    const resChat = `¿Desea confirmar orden de compra por: ${totalPrice}?`;

    //save chat_history
    await memoryClient.chatHistory.addUserMessage(dto.question);
    await memoryClient.chatHistory.addAIChatMessage(resChat);
    return resChat;
  }

  /**  SEARCH INTENT **/
  async searchIntentProcess(dto: ConversationDTO, memoryClient: BufferMemory) {
    const products = await this.serializeProducts();
    const response = await this.langchainService.productExistsAgent(
      products,
      dto.question,
    );
    await memoryClient.chatHistory.addUserMessage(dto.question);
    await memoryClient.chatHistory.addAIChatMessage(
      response.content.toString(),
    );
    return response.content;
  }

  /** CONFIRM INTENT **/
  async confirmIntentProcess(dto: ConversationDTO, memoryClient: BufferMemory) {
    const resChat = `Gracias por concretar la compra.`;
    await memoryClient.chatHistory.addUserMessage(dto.question);
    await memoryClient.chatHistory.addAIChatMessage(resChat);
    return resChat; 
  }

  /** REJECT INTENT **/
  async rejectIntentProcess(dto: ConversationDTO, memoryClient: BufferMemory) {
    const resChat = `No hay problema. Orden cancelada.`;
    await memoryClient.chatHistory.addUserMessage(dto.question);
    await memoryClient.chatHistory.addAIChatMessage(resChat);
    return resChat;
  }

  /**  FUNCTIONS   **/

  async serializeProducts(): Promise<string[]> {
    const serialized = [];
    const products = await this.productService.listProducts();

    products.forEach((product) => {
      const s = `${product.name} | ${product.price}`;
      serialized.push(s);
    });
    return serialized;
  }
}
