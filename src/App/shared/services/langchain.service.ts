import { Injectable } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import {
  productArrayTemplate,
  structuredProductParser,
} from '../prompts/product-array.prompt';
import { searchAndListTemplate } from '../prompts/search-list.prompt';
import { intentQuestionPrompt } from '../prompts/intent.prompt';
import { BaseMessage } from '@langchain/core/messages';
import { Pinecone } from '@pinecone-database/pinecone';
import { UtilService } from './util.service';
import { loadQAStuffChain } from 'langchain/chains';
@Injectable()
export class LangchainService {
  private llm: ChatOpenAI;
  private pinecone: Pinecone;

  constructor(private utilService: UtilService) {
    this.llm = new ChatOpenAI({
      temperature: 0.1,
      maxTokens: 1000,
      verbose: false,
    });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  /** ~~~~~~~~~ AGENTS ~~~~~~~~~ **/

  // Genera un array de objetos (productos) en base al input del usuario.
  async productArrayAgent(products: string[], chatHistory: BaseMessage[]) {
    const prompt = productArrayTemplate(products);

    const chain = prompt.pipe(this.llm).pipe(structuredProductParser);

    const response = await chain.invoke({
      formattingInstruction: structuredProductParser.getFormatInstructions(),
      chat_history: chatHistory,
    });
    return response;
  }

  async searchAndListAgent(input: string, chatHistory: BaseMessage[]) {
    // Listar vectores de pinecone
    const products = await this.findPineconeDocuments(input);
    console.log(products);
    const prompt = searchAndListTemplate(products);

    const chain = prompt.pipe(this.llm);

    const response = await chain.invoke({ input, chat_history: chatHistory });

    return response;
  }

  async intentAgent(input: string, chat_history: BaseMessage[]) {
    
    const chain = intentQuestionPrompt.pipe(this.llm);
    const response = await chain.invoke({ input, chat_history });
    return response;
  }

  /** ~~~~~~~~~ PINECONE ~~~~~~~~~ **/

  async vectorizeData(data: string) {
    const indexName = 'frantest';
    const index = this.pinecone.index(indexName);

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      batchSize: 100,
      model: 'text-embedding-3-small',
    });

    const scheduleEmbeddings = await embeddings.embedDocuments([data]);

    const scheduleVectors = scheduleEmbeddings.map((d, i) => ({
      id: this.utilService.generateRandomID(10),
      values: d,
      metadata: {
        text: data,
      },
    }));
    await index.upsert(scheduleVectors);
  }

  async findPineconeDocuments(query: string) {
    const queryEmbedding = await new OpenAIEmbeddings().embedQuery(query);
    const indexName = 'frantest';

    const index = this.pinecone.index(indexName);

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

    const concatenatedText = queryResponse.matches
      .map((match) => match.metadata.text)
      .join(' ');

    return concatenatedText;
  }
}
