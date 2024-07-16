import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { productArrayTemplate,structuredProductParser } from '../prompts/product-array.prompt';
import { productExistsTemplate } from '../prompts/product-exists.prompt';
@Injectable()
export class LangchainService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      temperature: 0.3,
      maxTokens: 1000,
      verbose: false,
    });
  }

  async createVectorStorageForCheerio(url: string) {
    const loader = new CheerioWebBaseLoader(url);

    const docs = await loader.load(); //Document[]

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 20,
    });

    const splittedDocs = await splitter.splitDocuments(docs);

    const enbedding = new OpenAIEmbeddings();

    const vectorMemory = await MemoryVectorStore.fromDocuments(
      splittedDocs,
      enbedding,
    );

    return vectorMemory;
  }

  // Genera un array de objetos (productos) en base al input del usuario.
  async productArrayAgent(products:string[],input:string) {
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

  
}
