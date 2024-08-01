import { Injectable } from '@nestjs/common';
import { LangchainService } from '../../shared/services/langchain.service';
import { ModuleRef } from '@nestjs/core';
import { ConversationDTO } from './conversation.dto';
import { MongoChatHistory } from '../../shared/services/mongo-history.service';
import { NLPService } from '../../shared/services/npl.service';
import { ProductService } from '../product/product.service';
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
    const graph = await this.langchainService.agentSupervisor()
    let streamResults = graph.stream(
      {
        messages: [
          new HumanMessage({
            content: dto.question,
          }),
        ],
      },
      { recursionLimit: 15},
    );

    for await (const output of await streamResults) {
      if (!output?.__end__) {
        console.log(output);
        console.log("----");
      }
    }
    return;
   
  }

}
