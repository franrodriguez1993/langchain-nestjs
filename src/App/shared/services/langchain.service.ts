import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import { BaseMessage } from '@langchain/core/messages';
import { Pinecone } from '@pinecone-database/pinecone';
import { UtilService } from './util.service';
import type { RunnableConfig } from '@langchain/core/runnables';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import { END, START, StateGraph } from '@langchain/langgraph';
import { DynamicTool } from '@langchain/core/tools';

import { ProductService } from '../../modules/product/product.service';
import { ModuleRef } from '@nestjs/core';
import { createAgent } from '../tools/create-agent';
import {
  agentStateChannels,
  AgentStateChannels,
} from '../tools/agent-state-channel';
import { runAgentNode } from '../tools/run-agent-node';
import { router } from '../tools/router-graph';
@Injectable()
export class LangchainService {
  private llm: ChatOpenAI;
  private pinecone: Pinecone;
  private productService: ProductService;

  constructor(
    private utilService: UtilService,
    private moduleRef: ModuleRef,
  ) {
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
    this.productService = this.moduleRef.get(ProductService, { strict: false });
  }



  /**  --------------------------- TOOLS ------------------------  **/

  private toolRestaurantInfo() {
    return new DynamicTool({
      name: 'get_info_restaurant',
      description: 'Retorma información del restaurante.',
      func: async (input: string) => {
        return 'nombre: Restaurant Enrique cavill | type: restaurant de comida argentina con más de 25 años de experiencia | Especialidades: milanesas y empanadas tucumanas';
      },
    });
  }

  private toolGetByIdProduct() {
    return new DynamicTool({
      name: 'get_product_by_id',
      description: 'Retorna un producto de mongo buscado por un objectId.',
      func: async (input: string) => {
        const product = await this.productService.getProductById(input);
        if (!product) return null;
        return `name: ${product.name} | price: ${product.price} | description: ${product.description}`;
      },
    });

  }

  private toolListProduct() {
    return new DynamicTool({
      name: 'list_products',
      description:
        'Retorna una lista de productos disponibles en el restaurant.',
      func: async (input: string) => {
        const products = await this.productService.listProducts();
        if (products.length === 0) return 'No hay productos disponibles';
        let listParset = '';
        products.forEach(
          (p) => (listParset += `name: ${p.name} price: ${p.price}}`),
        );
        return listParset;
      },
    });
  }

  /**  ------------------------ AGENTES  ------------------------  **/

  async agentInfoRestaurant() {
    // Research agent and node
    const researchAgent = await createAgent({
      llm: this.llm,
      tools: [this.toolRestaurantInfo()],
      systemMessage:
        'Tu única función es proporcionar información certera respecto al restaurante sin inventar nada. Si tienes la respuesta, devuelvela incluyendo el prefijo FINAL ANSWER.',
    });

    return async function InformerNode(
      state: AgentStateChannels,
      config?: RunnableConfig,
    ) {
      return runAgentNode({
        state: state,
        agent: researchAgent,
        name: 'Informer',
        config,
      });
    };
  }

  async agentListProducts() {
    const listProductAgent = await createAgent({
      llm: this.llm,
      tools: [this.toolListProduct()],
      systemMessage:
        'Tu única función es devolver una lista con todos los productos disponibles en el restaurant. Si tienes la respuesta, devuelvela incluyendo el prefijo FINAL ANSWER.',
    });

    return function productListerNode(
      state: AgentStateChannels,
      config?: RunnableConfig,
    ) {
      return runAgentNode({
        state: state,
        agent: listProductAgent,
        name: 'ProductLister',
      });
    };
  }

  /**  ------------------------ TOOL NODE  ------------------------  **/
  private toolNode() {
    const tools = [this.toolListProduct(), this.toolRestaurantInfo()];
    // This runs tools in the graph
    const toolNode = new ToolNode<{ messages: BaseMessage[] }>(tools);
    return toolNode;
  }

  async graphCreator() {
    // instanciar nodos:
    const InformerNode = await this.agentInfoRestaurant();
    const ProductListerNode = await this.agentListProducts();
    const toolNode = this.toolNode();

    // 1. Crear el graph
    const workflow = new StateGraph({
      channels: agentStateChannels,
    })

      // 2. Agregar los nodos; estos son los que hacen el trabajo.
      .addNode('Informer', InformerNode)
      .addNode('ProductLister', ProductListerNode)
      .addNode('call_tool', toolNode);

    // 3. Definir los edges (bordes). We will define both regular and conditional ones
    // After a worker completes, report to supervisor
    workflow.addConditionalEdges('Informer', router, {
      // We will transition to the other agent
      continue: 'ProductLister',
      call_tool: 'call_tool',
      end: END,
    });

    workflow.addConditionalEdges('ProductLister', router, {
      // We will transition to the other agent
      continue: 'Informer',
      call_tool: 'call_tool',
      end: END,
    });

    workflow.addConditionalEdges(
      'call_tool',
      // Each agent node updates the 'sender' field
      // the tool calling node does not, meaning
      // this edge will route back to the original agent
      // who invoked the tool
      (x) => x.sender,
      {
        ProductLister: 'ProductLister',
        Informer: 'Informer',
      },
    );

    workflow.addEdge(START, 'Informer');
    const graph = workflow.compile();
    return graph;
  }
}
