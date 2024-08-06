import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from "@langchain/groq";
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
import { agentStateChannelsNuestro, IState } from '../tools/router-node';




@Injectable()
export class Langchain2Service {
  // private llm: ChatGroq;
  private llm: ChatOpenAI;
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
    // this.llm = new ChatGroq({
    //   temperature: 0,
    //   maxTokens: 1000,
    //   verbose: false,
    //   modelName:"llama-3.1-70b-versatile"
    // })

  }

  onModuleInit() {
    this.productService = this.moduleRef.get(ProductService, { strict: false });
  }

 /**  --------------------------- TOOLS ------------------------  **/

  private toolRestaurantInfo() {
    return new DynamicTool({
      name: 'get_info_restaurant',
      description: 'Retorna un JSON con la información del restaurante, tal como: Nombre del local, descripción, especialidades, dirección e información sobre el dueño.',
      func: async (input: string) => {
        return `
      {
      "Nombre": "Restaurante Enrique Cavill",
      "Descripción":"Restaurante de comida argentina con más de 25 años de experiencia.",
      "Especialidades":"Milanesa y empanadas tucumanas",
      "Dueño": "Lionel Messi.",
      "Dirección":"Guasón 150 - Metrópolis."  
      }
        `;
      },
    });
  }

  private toolGetByIdProduct() {
    return new DynamicTool({
      name: 'get_product_by_id',
      description: 'Retorna un producto buscado en mongoDB a través de su ObjectId',
      func: async (input: string) => {
        const product = await this.productService.getProductById(input);
        if (!product) return null;
        return JSON.stringify(product);
      },
    });

  }

  private toolListProduct() {
    return new DynamicTool({
      name: 'list_products',
      description:'Retorna la lista de comidas disponibles en el menú del restarante.',
      func: async (input: string) => {
        const products = await this.productService.listProducts();
        if (products.length === 0) return 'No hay productos disponibles';
        return JSON.stringify(products);
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

    private toolEmpty() {
    return new DynamicTool({
      name: 'empty_tool',
      description:
        '',
      func: async (input: string) => {
        return "";
      },
    });
  }



  /**   AGENTES Y NODES   **/

  async Informer() {

    const researchAgent =  createAgent(
      this.llm,
      [this.toolRestaurantInfo()],
       `
        Eres parte de un grupo de agentes con acceso a la biografía del restaurante. Tu tarea es proporcionar información específica sobre el restaurante cuando te lo soliciten. Debes seguir estas directrices:
        1. Proporciona únicamente la información solicitada (por ejemplo, si te piden el nombre, solo da el nombre).
        2. No inventes información ni detalles que no estén explícitamente disponibles en tu base de datos.
        3. Responde de manera precisa y concisa.
        4. Si la solicitud del usuario no corresponde a la información que tienes, no respondas nada, otro agente se encargara de resolverlo
      `);
    
    return async function informerNode(state: IState, config?: RunnableConfig) {
     const result = await researchAgent.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "Informer" }),
        ],
        result:result.output
      };
    };
  }
  

  async ProductList() {
     const listProductAgent =  createAgent(
      this.llm,
      [this.toolListProduct()],
      `
     Eres parte de un grupo de agentes con acceso a la base de datos de platos del restaurante. Tu función principal es devolver información sobre los productos disponibles en el restaurante cuando te lo soliciten. Debes seguir estas directrices:

    1. **Búsqueda y Provisión de Información:**
      - Si se te solicita la lista completa de platos, proporciona únicamente la lista completa de los platos disponibles en la base de datos.
      - Si se te solicita información sobre un producto en particular, proporciona detalles específicos como el nombre y el precio del producto.
      - Si un producto solicitado no se encuentra en la base de datos, informa claramente que el restaurante no cuenta con ese producto.

    2. **Precisión:**
      - No inventes información adicional ni detalles sobre los platos.

    3. **Gestión de Solicitudes Inapropiadas:**
      - Si la solicitud del usuario no corresponde a la información que tienes, no respondas nada. Otro agente se encargará de resolverlo.

    Tu objetivo es asegurar que cualquier información sobre los productos del restaurante proporcionada al usuario sea precisa, completa y basada en los datos disponibles en la base de datos.

      `,
    );

    return async function productListerNode(state: IState, config?: RunnableConfig) {

     const result = await listProductAgent.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "ProductLister" }),
        ],
        result:result.output,
      };
    };
  }

  async FinishAgent() {
      const resultAgent =  createAgent(
      this.llm,
      [this.toolEmpty()],
       `
      Eres el agente "Finisher" responsable de sintetizar y presentar toda la información proporcionada por los otros agentes. Debes crear una respuesta completa y coherente basada en los datos entregados. Sigue estos pasos:

      1. **Recopilación de Información:**
        - Revisa toda la información y conclusiones proporcionadas por los otros agentes en el historial de mensajes. Asegúrate de tener acceso a todos los detalles relevantes.

      2. **Análisis:**
        - Analiza los datos para identificar los puntos principales y cómo se conectan entre sí. Resuelve posibles contradicciones.

      3. **Síntesis:**
        - Combina la información de manera lógica. Asegúrate de que tu respuesta sea clara, coherente y esté bien estructurada.

      4. **Redacción:**
        - Redacta la respuesta final utilizando la información combinada. Asegúrate de que:
          - Sea clara y específica en relación con la consulta original del comensal.
          - No incluya información no proporcionada por los otros agentes.
          - No tenga preámbulos innecesarios y se enfoque en responder directamente a la pregunta.

      Tu objetivo es asegurar que la respuesta final sea una síntesis clara y detallada de toda la información proporcionada, sin agregar ni omitir datos importantes. Responde de manera precisa y directa a la pregunta del comensal. Intenta que tu respuesta sea corta y directa, evita dar demasiado contexto en la respuesta, responde de forma directa. Recuerda que estas hablando con un comensal que necesita una simple respuesta a su pregunta.

       `,
    );

    return async function finisherNode(state: IState, config?: RunnableConfig) {

     const result = await resultAgent.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "Finisher" }),
        ],
        result: result.output,
      };
    };
  }
  
  async Supervisor() {
    const members = ["Informer", "ProductLister", "Finisher"];
  
  const supervisorMasterEmperador =  createAgent(
      this.llm,
    [this.toolEmpty()],
       `
     Eres el supervisor de un equipo de agentes encargados de gestionar tareas específicas en un contexto de restaurante. Tu tarea es recibir la solicitud del usuario: {input} y determinar qué agente debe actuar a continuación, basándote en la naturaleza de la solicitud y en el historial de mensajes del chat: {messages}.

    Los agentes que tienes a cargo son:
    - Informer: Brinda información relevante sobre el restaurante: nombre, dirección, especialidad, descripción e información sobre el dueño del local.
    - ProductLister: Brinda una lista de comidas/productos disponibles en el menú del restaurante y sus respectivos precios o puede brindar información sobre la disponibilidad de un determinado producto e indicar su precio si es lo que el cliente solicita.
    - Finisher: Este agente siempre debe ejecutarse al final del ciclo, es el que interactúa con el usuario brindando la respuesta a su pregunta o solicitud.

    Tu única tarea es determinar el siguiente agente que debe actuar y devolver solo su nombre sin ninguna explicación adicional. Asegúrate de:
    - Entender claramente la solicitud del usuario.
    - Seleccionar el agente adecuado para cada tarea.

    Responde solo con el nombre del siguiente agente: Informer, ProductLister, o Finisher.
    Si en caso el último agente en ejecutarse {next} fue Finisher, devuelve __end__
      `
      );

      return async function supervisorNode(state: IState, config?: RunnableConfig) {
        const result = await supervisorMasterEmperador.invoke(state, config);
      return {
        messages: [
          new AIMessage({ content: result.output, name: "Supervisor" }),
        ],
        next: result.output,
        result:state.result
      };
    };
  }

  async createGraph() {

    const members = ["Informer", "ProductLister", "Finisher"];
    
    const informerNode = await this.Informer();
    const productListerNoder = await this.ProductList();
    const finishResulterNode = await this.FinishAgent();
    const supervisor = await this.Supervisor();

    const workflow = new StateGraph<IState, unknown, string>({
      channels: agentStateChannelsNuestro,
    }) 
      .addNode("Informer", informerNode)
      .addNode("ProductLister", productListerNoder)
      .addNode("Supervisor", supervisor)
      .addNode("Finisher",finishResulterNode)

      members.forEach((member) => {
        workflow.addEdge(member, "Supervisor");
      });

      workflow.addConditionalEdges(
        "Supervisor",
        (x: AgentStateChannels) => x.next,
      );

    workflow.addEdge(START, "Supervisor");
    workflow.addEdge("Finisher", END);

    const graph = workflow.compile();
    return graph;

  }
  }

