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

import { ChatPromptTemplate } from '@langchain/core/prompts';

import { DynamicTool } from '@langchain/core/tools';
import { MessagesPlaceholder } from '@langchain/core/prompts';
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling';
import { RunnableSequence } from '@langchain/core/runnables';
import { AgentExecutor, type AgentStep } from 'langchain/agents';

import { formatToOpenAIFunctionMessages } from 'langchain/agents/format_scratchpad';
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser';
import { ProductService } from '../../modules/product/product.service';
import { ModuleRef } from '@nestjs/core';
@Injectable()
export class LangchainService {
  private llm: ChatOpenAI;
  private pinecone: Pinecone;
  private productService: ProductService;

  constructor(private utilService: UtilService,private moduleRef:ModuleRef) {
    this.llm = new ChatOpenAI({
      temperature: 0.1,
      maxTokens: 1000,
      verbose: false,
    });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  onModuleInit() {
    this.productService = this.moduleRef.get(ProductService,{strict:false})
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

  async companyAgent(input: string) {
    const customTool = new DynamicTool({
      name: 'get_info_company',
      description: 'Retorma información de la empresa.',
      func: async (input: string) => {
        return 'nombre: Restaurant Enrique cavill | descripción: restaurant de comida argentina con más de 25 años de experiencia | Especialidades: milanesas y empanadas tucumanas';
      },
    });

    /** Define your list of tools. */
    const tools = [customTool];
    const myPrompt = ChatPromptTemplate.fromMessages([
      ['system', `Eres una IA que responde las preguntas del usuario`],
      new MessagesPlaceholder('agent_scratchpad'),
      ['human', '{input}'],
    ]);

    const modelWithFunctions = this.llm.bind({
      functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });

    //Mi agente re piola:
    const runnableAgent = RunnableSequence.from([
      {
        input: (i: { input: string; steps: AgentStep[] }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
          formatToOpenAIFunctionMessages(i.steps),
      },
      myPrompt,
      modelWithFunctions,
      new OpenAIFunctionsAgentOutputParser(),
    ]);

    const executor = AgentExecutor.fromAgentAndTools({
      agent: runnableAgent,
      tools,
    });

    const response = await executor.invoke({ input });

    return response.output;
  }

  /**  ----- PRODUCT BY ID AGENT   **/
  async productByIdAgent(input: string) {
    const customTool = new DynamicTool({
      name: 'get_product_by_id',
      description: 'Retorna un producto de mongo buscado por un objectId.',
      func: async (input: string) => {
        const product = await this.productService.getProductById(input);
        if (!product) return null;
        return `name: ${product.name} | price: ${product.price} | description: ${product.description}`;
      },
    });

    /** Define your list of tools. */
    const tools = [customTool];
    const myPrompt = ChatPromptTemplate.fromMessages([
      ['system', `Tu misión es entregar información sobre el precio de un producto buscando en mongoDB mediante el id que te proporciona el usuario en el {input}. Debes hacer uso de la tool que tienes asignada que recibe un objectId para efectuar una búsqueda en la base de datos.`],
      new MessagesPlaceholder('agent_scratchpad'),
      ['human', '{input}'],
    ]);

    const modelWithFunctions = this.llm.bind({
      functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });

    //Mi agente re piola:
    const runnableAgent = RunnableSequence.from([
      {
        input: (i: { input: string; steps: AgentStep[] }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
          formatToOpenAIFunctionMessages(i.steps),
      },
      myPrompt,
      modelWithFunctions,
      new OpenAIFunctionsAgentOutputParser(),
    ]);

    //Executor: 
    const executor = AgentExecutor.fromAgentAndTools({
      agent: runnableAgent,
      tools,
    });

    const response = await executor.invoke({ input });

    return response.output;
  }

  async productListAgent(input: string) {
    const customTool = new DynamicTool({
      name: 'list_product_tool',
      description: 'Retorna una lista de productos disponibles en el restaurant.',
      func: async (input: string) => {
        const products = await this.productService.listProducts()
        if (products.length === 0) return "No hay productos disponibles";
        let listParset = ""
        products.forEach((p)=> listParset+= `name: ${p.name} price: ${p.price}}` )
        return listParset;
      },
    });

    /** Define your list of tools. */
    const tools = [customTool];
    const myPrompt = ChatPromptTemplate.fromMessages([
      ['system', `Tu misión es entregar información sobre los productos disponibles en el restaurant. Debes entregar una lista breve con todos los productos disponibles. Has uso de la herramienta que tienes asignada para buscar los productos en mongoDB.`],
      new MessagesPlaceholder('agent_scratchpad'),
      ['human', '{input}'],
    ]);

    const modelWithFunctions = this.llm.bind({
      functions: tools.map((tool) => convertToOpenAIFunction(tool)),
    });

    //Mi agente re piola:
    const runnableAgent = RunnableSequence.from([
      {
        input: (i: { input: string; steps: AgentStep[] }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
          formatToOpenAIFunctionMessages(i.steps),
      },
      myPrompt,
      modelWithFunctions,
      new OpenAIFunctionsAgentOutputParser(),
    ]);

    const executor = AgentExecutor.fromAgentAndTools({
      agent: runnableAgent,
      tools,
    });

    const response = await executor.invoke({ input });

    return response.output;
  }

}
