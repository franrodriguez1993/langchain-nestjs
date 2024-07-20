import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  productArrayTemplate,
  structuredProductParser,
} from '../prompts/product-array.prompt';
import { searchAndListTemplate } from '../prompts/search-list.prompt';
import { intentQuestionPrompt } from '../prompts/intent.prompt';
import { BaseMessage } from '@langchain/core/messages';
@Injectable()
export class LangchainService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      temperature: 0.1,
      maxTokens: 1000,
      verbose: false,
    });
  }

  // Genera un array de objetos (productos) en base al input del usuario.
  async productArrayAgent(products: string[],chatHistory:BaseMessage[]) {
    const prompt = productArrayTemplate(products);

    const chain = prompt.pipe(this.llm).pipe(structuredProductParser);

    const response = await chain.invoke({
      formattingInstruction: structuredProductParser.getFormatInstructions(),
      chat_history:chatHistory,
    });
    return response;
  }

  async searchAndListTemplate(product: string[], input: string,chatHistory:BaseMessage[]) {
    const prompt = searchAndListTemplate(product);

    const chain = prompt.pipe(this.llm);

    const response = await chain.invoke({ input, chat_history:chatHistory });

    return response;
  }

  async intentAgent(input: string, chat_history: BaseMessage[]) {
    const chain = intentQuestionPrompt.pipe(this.llm);
    const response = await chain.invoke({ input, chat_history });
    return response;
  }
}
