import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  productArrayTemplate,
  structuredProductParser,
} from '../prompts/product-array.prompt';
import { productExistsTemplate } from '../prompts/product-exists.prompt';
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
  async productArrayAgent(products: string[], input: string) {
    const prompt = productArrayTemplate(products);

    const chain = prompt.pipe(this.llm).pipe(structuredProductParser);

    const response = await chain.invoke({
      formattingInstruction: structuredProductParser.getFormatInstructions(),
      input,
    });

    return response;
  }

  async productExistsAgent(product: string[], input: string) {
    const prompt = productExistsTemplate(product);

    const chain = prompt.pipe(this.llm);

    const response = await chain.invoke({ input });

    return response;
  }

  async intentAgent(input: string, chat_history: BaseMessage[]) {
    const chain = intentQuestionPrompt.pipe(this.llm);
    const response = await chain.invoke({ input, chat_history });
    return response;
  }
}
