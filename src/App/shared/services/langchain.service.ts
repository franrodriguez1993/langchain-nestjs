import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import { BaseMessage,HumanMessage,AIMessage } from '@langchain/core/messages';
import { Pinecone } from '@pinecone-database/pinecone';
import { UtilService } from './util.service';
import type { RunnableConfig } from '@langchain/core/runnables';
import { ToolNode } from '@langchain/langgraph/prebuilt';
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
      verbose: false
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
        'Tu única función es proporcionar información certera respecto al restaurante sin inventar nada.',
    );

    // Si tienes la respuesta definitiva al input, devuelve FINISH al final de tu respuesta, si tienes parte de la información necesaria, compártela con el siguiente agente, caso contrario no respondas, pasa el input al siguiente agente.

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
        'Tu única función es devolver una lista con todos los productos disponibles en el restaurant. Si no puedes responder la totalidad del input, pasale tu respuesta al siguiente agente.',
    );

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
        'Tu única función es devolver un producto de la base de datos buscado por id.',
    );

    const MongoSearcherNode = async (
  state: AgentStateChannels,
  config?: RunnableConfig,
) => {
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
       `Eres el agente integrador, responsable de recopilar, analizar y sintetizar toda la información proporcionada por los demás agentes especializados. Tu objetivo es formular una respuesta coherente, detallada y precisa basada en los datos y conclusiones que cada agente menor te ha entregado. Sigue estas instrucciones para generar la respuesta final 
       - Combina la información de manera lógica y coherente, destacando las conclusiones más importantes.
       - Revisa la respuesta final para asegurarte de que sea completa y esté libre de errores.
       - Asegúrate de que la respuesta sea coherente y alineada con los objetivos y el contexto de la tarea.
       Recuerda que tu papel es crucial para garantizar que la información combinada de los agentes menores se presente de manera clara y útil. Tu capacidad para integrar y comunicar esta información es esencial para el éxito de nuestra misión.
       `,
    );
//  'Eres parte de un grupo de agentes AI y tu función es formular la respuesta al input inicial del usuario en base a la información dada por los demás agentes AI a la cuál tienes acceso a través del historial de mensajes. Tu respuesta debe ser clara y concisa. '
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
    "Eres un supervisor encargado de gestionar una conversación entre los" +
    " siguientes agentes: {members}. Dada la siguiente petición del usuario," +
    "  responde con el agente que debe actuar a continuación. Cada agente realizará una" +
    " tarea específica y responderá con sus resultados y estado. Cuando termine," +
        " responderá con FINISH.";
    
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
