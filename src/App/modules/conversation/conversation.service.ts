import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConversationDTO } from './conversation.dto';
import { MongoChatHistory } from '../../shared/services/mongo-history.service';
import { NLPService } from '../../shared/services/npl.service';
import { ProductService } from '../product/product.service';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Langchain2Service } from '../../shared/services/langchain2.service';
@Injectable()
export class ConversationService {
  private langchain2Service: Langchain2Service;
  private mongoChatHistory: MongoChatHistory;
  private productService: ProductService;
  private nlpService: NLPService;

  constructor(private moduleRef: ModuleRef) {}
 
  onModuleInit() {
    this.langchain2Service = this.moduleRef.get(Langchain2Service, {
      strict: false,
    });
    this.mongoChatHistory = this.moduleRef.get(MongoChatHistory, {
      strict: false,
    });
    this.nlpService = this.moduleRef.get(NLPService, { strict: false });
    this.productService = this.moduleRef.get(ProductService, { strict: false });
  }

  async message( dto: ConversationDTO) {
    console.log("hola")
    const graph = await this.langchain2Service.createGraph()

    let streamResults = await  graph.stream(
      {
        messages: [
          new HumanMessage({
            content: dto.question,
          }),
        ],
        input:dto.question
      },
      { recursionLimit: 10},
    );
  
    let finalResult;
    for await (const output of streamResults) {

      if (!output?.__end__) {

        console.log(output);
        console.log("----");
        finalResult = output;
      }
     
    }

    const returnMessage = finalResult?.Supervisor.result;
    return returnMessage;
   
  }

}
