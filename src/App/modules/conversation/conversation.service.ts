import { Injectable } from '@nestjs/common';
import { LangchainService } from '../../shared/services/langchain.service';
import { ModuleRef } from '@nestjs/core';
import { ConversationDTO } from './conversation.dto';
import { MongoChatHistory } from '../../shared/services/mongo-history.service';
import { NLPService } from '../../shared/services/npl.service';
import { ProductService } from '../product/product.service';
import { IntentType } from '../../shared/enums/intent.enum';
import { BufferMemory } from 'langchain/memory';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
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
    return await this.langchainService.companyAgent(dto.question);

  }

  /**  SEARCH INTENT **/
  async searchIntentProcess(
    dto: ConversationDTO,
    memoryClient: BufferMemory,
    chatHistory: BaseMessage[],
  ) {
    const response = await this.langchainService.searchAndListAgent(
      dto.question,
      chatHistory,
    );
    await memoryClient.chatHistory.addUserMessage(dto.question);
    await memoryClient.chatHistory.addAIChatMessage(
      response.content.toString(),
    );
    return response.content.toString();
  }

  /** CONFIRM INTENT **/
  async confirmIntentProcess(
    dto: ConversationDTO,
    memoryClient: BufferMemory,
    chatHistory: BaseMessage[],
  ) {
    const products = await this.serializeProducts();
    //TODO: Probar si funciona pasándole solo el chat, sin la lista de productos.
    const productList = await this.langchainService.productArrayAgent(
      products,
      chatHistory,
    );
    console.log(productList);

    const resChat = 'Orden confirmada.';
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
