import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import { BaseMessage,HumanMessage,AIMessage } from '@langchain/core/messages';
import { Pinecone } from '@pinecone-database/pinecone';
import { UtilService } from './util.service';
import type { RunnableConfig } from '@langchain/core/runnables';
import { JsonOutputToolsParser } from "langchain/output_parsers";
import { END, START, StateGraph } from '@langchain/langgraph';
import { DynamicTool } from '@langchain/core/tools';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import { ProductService } from '../../modules/product/product.service';
import { ModuleRef } from '@nestjs/core';
import { createAgent } from '../tools/create-agent';
import {
  agentStateChannels,
  AgentStateChannels,
} from '../tools/agent-state-channel';
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
      temperature: 0,
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
      description: 'Return info about restaurant.',
      func: async (input: string) => {
        return 'Name: Restaurant Enrique cavill | Type: restaurant de comida argentina con más de 25 años de experiencia | Specialty: milanesas y empanadas tucumanas';
      },
    });
  }

  private toolGetByIdProduct() {
    return new DynamicTool({
      name: 'get_product_by_id',
      description: 'Returns a mongo product searched by an objectId.',
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
        'Returns a list of products available in the restaurant searched in mongoDB.',
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

  private toolFinish() {
    return new DynamicTool({
      name: 'finish_tool',
      description:
        '',
      func: async (input: string) => {
        return "";
      },
    });
  }

  /**  ------------------------ AGENTES  ------------------------  **/

  async agentInfoRestaurant() {
    // Research agent and node
    const researchAgent = await createAgent(
      this.llm,
      [this.toolRestaurantInfo()],
       `Your role is a waiter on a restaurant. Your goal is to provide info regarding the restaurant. Do not make anything up.Do not include additional info. The answer must be clear and precise. If you can't answer the entire question, it doesn't matter. Another assistant will pick up where you left off.
      `);

/*

Eres parte de un grupo de agentes. Tu función es proporcionar información respecto al restaurante siempre y cuando te lo soliciten. Tu límite es no inventar información como platos, precios de productos o buscar productos por id en mongoDB.

     
*/

      const researcherNode = async (
      state: AgentStateChannels,
      config?: RunnableConfig,
      ) => {
      console.log("ESTADO:")
      console.log(state)
      const result = await researchAgent.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "Informer" }),
        ],
      };
    };
    return researcherNode;

  }

  async agentListProducts() {
    const listProductAgent = await createAgent(
      this.llm,
      [this.toolListProduct()],
      `Your role is a waiter on a restaurant. Your goal is to return a list of all the products available in the restaurant if requested. Your limit is not to invent info about the restaurant. If you can't answer the entire question, it doesn't matter. Another assistant will pick up where you left off.`,
    );

    /*
    Eres parte de un grupo de agentes. Tu única función es devolver una lista con todos los productos disponibles en el restaurant si te lo solicitan. Tu límite es no inventar información sobre el restaurante.
    
    */
   const ListerNode = async (
  state: AgentStateChannels,
  config?: RunnableConfig,
   ) => {
     console.log("ESTADO:")
     console.log(state)
     const result = await listProductAgent.invoke(state, config);

      return {
        messages: [
          new AIMessage({ content: result.output, name: "ProductLister" }),
        ],
      };
    };
    
    return ListerNode;
  }


  async agentMongoId() {

     const mongoIdAgent = await createAgent(
      this.llm,
      [this.toolGetByIdProduct()],
       `You're a database expert. Your goal is to return a product from the database searched by id if the input requests it. Without inventing anything. If you can't answer the entire question, it doesn't matter. Another assistant will pick up where you left off.
       Your limit is not to make up information about the restaurant.`,
    );

    /*
    Eres parte de un grupo de agentes. Tu única función es devolver un producto de la base de datos buscado por id si es que el input lo solicita. Sin inventar nada. Si no tienes la respuesta a algo, otro agente se encargará.
       Tu límite es no inventar información sobre el restaurante
    */

    const MongoSearcherNode = async (
      state: AgentStateChannels,
      config?: RunnableConfig,
    ) => {
      console.log("ESTADO:")
      console.log(state)
      const result = await mongoIdAgent.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "MongoSearcher" }),
        ],
      };
        };
    
    return MongoSearcherNode;

  }

  async agentFinishResult() {

     const resultAgent = await createAgent(
      this.llm,
      [this.toolFinish()],
       `You're the integrating agent responsible for synthesizing and presenting all the info provided by the minor agents. You must create a complete and coherent response based on the delivered data. Follow these steps:
        1) Info Gathering:
        - Review all the info and conclusions provided by the minor agents. Ensure you have access to all relevant details.
        2) Analysis:
        - Analyze the data to identify the main points and how they connect. Look for possible contradictions and resolve them.
        3) Synthesis:
        - Combine the info logically. Ensure your response is clear, coherent, and well-structured.
        4) Writing:
        -Draft the final response using the combined info. Make sure that:
        -It is clear and specific in relation to the original query.
        -It does not include info not provided by the minor agents.
        -It does not have unnecessary preambles and focuses directly on answering the question.
        5) You must translate the response to spanish. You'll never response in english.
        Your goal is to ensure that the final response is a clear and detailed synthesis of all the provided info, without adding or omitting important data.
       `,

       /*
       Eres parte de un grupo de agentes. Eres el agente integrador, responsable de recopilar, analizar y sintetizar toda la información proporcionada por los demás agentes especializados. Tu objetivo es formular una respuesta coherente, detallada y precisa basada en los datos y conclusiones que cada agente menor te ha entregado. Tu respuesta debe ser:
       - Clara y al grano
       - No inventar nada
       - No incluir ningún preambulo.
       - Debe integrar toda la información proporcionada en una respuesta completa y coherente.
       - Debe responder específicamente a la consulta original con toda la información relevante proporcionada.
       */
    );

    const FinishResulterNode = async (
      state: AgentStateChannels,
      config?: RunnableConfig,
      ) => {
        console.log("ESTADO:")
        console.log(state)
        const result = await resultAgent.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "FinishResulter" }),
        ],
    };
      };
    
    return FinishResulterNode;

  }


  /**  ------------------------ SUPERVISOR ------------------------  **/
  async agentSupervisor() {

    // instanciamos los miembros del graph:
    const members = ["Informer", "ProductLister","MongoSearcher","FinishResulter"];

    // prompt del supervisor:
    const systemPrompt =
      `
    You're a supervisor in charge of managing a conversation between the
    following agents: {members}. Given the following user request, 
    respond with the agent that should act next. Each agent will perform a
    specific task and will respond with its results and status. When you finish,
    respond with FINISH and run the FinishResulter agent;
      `;
    
   /*
       "Eres un supervisor encargado de gestionar una conversación entre los" +
    " siguientes agentes: {members}. Dada la siguiente petición del usuario," +
    "  responde con el agente que debe actuar a continuación. Cada agente realizará una" +
    " tarea específica y responderá con sus resultados y estado. Cuando termine," +
        " responde con FINISH y ejecuta el agente FinishResulter";
   
   */ 
    
    
    const options = [END, ...members];


    // Define the routing function
    const functionDef = {
      name: "route",
      description: "Selecciona el siguiente rol.",
      parameters: {
        title: "routeSchema",
        type: "object",
        properties: {
          next: {
            title: "Next",
            anyOf: [
              { enum: options },
            ],
          },
        },
        required: ["next"],
      },
    };

    const toolDef = {
      type: "function",
      function: functionDef,
    } as const;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("messages"),
      [
        "system",
        "Dada la conversación anterior, ¿quién debería actuar a continuación?" +
        "¿O debemos FINISH? Selecciona una de: {options}",
      ],
    ]);


    const formattedPrompt = await prompt.partial({
    options: options.join(", "),
    members: members.join(", "),
    });
    
    const supervisorChain = formattedPrompt
    .pipe(this.llm.bindTools(
      [toolDef],
      {
        tool_choice: { "type": "function", "function": { "name": "route" } },
      },
    ))
    .pipe(new JsonOutputToolsParser())
    // select the first one
      .pipe((x) => (x[0].args));
    
    const informerNode = await this.agentInfoRestaurant();
    const productListerNoder = await this.agentListProducts();
    const mongoSearcherNode = await this.agentMongoId();
    const finishResulterNode = await this.agentFinishResult();
    
    
    // 1. Create the graph
    const workflow = new StateGraph<AgentStateChannels, unknown, string>({
      channels: agentStateChannels,
    }) // 2. Add the nodes; these will do the work
      .addNode("Informer", informerNode)
      .addNode("ProductLister", productListerNoder)
      .addNode("supervisor", supervisorChain)
      .addNode("MongoSearcher", mongoSearcherNode)
      .addNode("FinishResulter",finishResulterNode)
      // 3. Define the edges. We will define both regular and conditional ones
      // After a worker completes, report to supervisor
      members.forEach((member) => {
        workflow.addEdge(member, "supervisor");
      });

      workflow.addConditionalEdges(
        "supervisor",
        (x: AgentStateChannels) => x.next,
      );

      workflow.addEdge(START, "supervisor");

    const graph = workflow.compile();
    return graph;

  }
}
