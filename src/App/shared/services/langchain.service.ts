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

@Injectable()
export class LangchainService {
  private llm: ChatGroq;
  // private llm: ChatOpenAI;
  private pinecone: Pinecone;
  private productService: ProductService;

  constructor(
    private utilService: UtilService,
    private moduleRef: ModuleRef,
  ) {
    // this.llm = new ChatOpenAI({
    //   temperature: 0,
    //   maxTokens: 1000,
    //   verbose: false,
    // });
    this.llm = new ChatGroq({
      temperature: 0,
      maxTokens: 1000,
      verbose: false,
      modelName:"llama-3.1-70b-versatile"
    })

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
        return 'Nombre: Restaurant Enrique cavill | Tipo: restaurant de comida argentina con más de 25 años de experiencia | Especialidades: milanesas y empanadas tucumanas';
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
      description:'Returns a mongo product searched by an objectId.',
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
       `
        Eres parte de un grupo de agentes con acceso a la biografía del restaurante. Tu tarea es proporcionar información específica sobre el restaurante cuando te lo soliciten. Debes seguir estas directrices:
        1. Proporciona únicamente la información solicitada (por ejemplo, si te piden el nombre, solo da el nombre).
        2. No inventes información ni detalles que no estén explícitamente disponibles en tu base de datos.
        3. Responde de manera precisa y concisa.
        4. Si la solicitud del usuario no corresponde a la información que tienes, no respondas nada, otro agente se encargara de resolverlo
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
      `
      Eres parte de un grupo de agentes con acceso a la base de datos de platos del restaurante. Tu única función es devolver una lista con todos los productos disponibles en el restaurante cuando te lo soliciten. Debes seguir estas directrices:
        1. Proporciona únicamente la lista completa de los platos disponibles en la base de datos.
        2. No inventes información adicional ni detalles sobre los platos.
        3. Asegúrate de que la lista esté actualizada y completa.
        4. Si la solicitud del usuario no corresponde a la información que tienes, no respondas nada, otro agente se encargara de resolverlo
      `,
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
       `
       Eres parte de un grupo de agentes con acceso a la base de datos de platos del restaurante. Tu única función es proporcionar la información de un plato específico cuando se te solicite, utilizando el identificador (ID) del plato. Debes seguir estas directrices:
        1. Cuando se te indique un ID de plato, devuelve únicamente la información de ese plato específico.
        2. Asegúrate de que la información proporcionada sea precisa y esté actualizada.
        3. No inventes ni agregues información adicional sobre el plato o el restaurante.
        4. Si la solicitud del usuario no corresponde a la información que tienes, no respondas nada, otro agente se encargara de resolverlo
       `,
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
       `
       Eres el agente integrador responsable de sintetizar y presentar toda la información proporcionada por los agentes menores. Debes crear una respuesta completa y coherente basada en los datos entregados. Sigue estos pasos:

        1. **Recopilación de Información:**
           - Revisa toda la información y conclusiones proporcionadas por los agentes menores. Asegúrate de tener acceso a todos los detalles relevantes.

        2. **Análisis:**
           - Analiza los datos para identificar los puntos principales y cómo se conectan entre sí. Busca posibles contradicciones y resuélvelas.

        3. **Síntesis:**
           - Combina la información de manera lógica. Asegúrate de que tu respuesta sea clara, coherente y esté bien estructurada.

        4. **Redacción:**
          - Redacta la respuesta final utilizando la información combinada. Asegúrate de que:
          - Sea clara y específica en relación con la consulta original.
          - No incluya información no proporcionada por los agentes menores.
          - No tenga preámbulos innecesarios y se enfoque en responder directamente a la pregunta.

        Tu objetivo es asegurar que la respuesta final sea una síntesis clara y detallada de toda la información proporcionada, sin agregar ni omitir datos importantes.
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
        Eres el supervisor de un equipo de agentes encargados de gestionar tareas específicas en un contexto de restaurante. Los agentes son: {members}. Tu tarea es recibir la solicitud del usuario y determinar qué agente debe actuar a continuación, basándote en la naturaleza de la solicitud. Cada agente realizará su tarea y responderá con sus resultados y estado. Al finalizar todas las tareas necesarias, debes responder con "FINISH" y activar el agente FinishResulter para compilar y entregar los resultados finales al usuario. Asegúrate de:
        - Entender claramente la solicitud del usuario.
        - Seleccionar el agente adecuado para cada tarea.
        - Coordinar a los agentes de manera eficiente.
        - Por ultimo ejecuta el agente FinishResulter.
        - Tienes que confirmar la finalización de todas las tareas con "FINISH", pero acuerdate de ejecuta el agente FinishResulter.
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
        `
        Basándote en la conversación anterior y la solicitud actual del usuario, determina cuál agente debe actuar a continuación. Considera todas las tareas pendientes y asegúrate de no omitir ningún agente que sea necesario para completar la solicitud del usuario. Si todas las tareas han sido completadas, responde con "FINISH" para activar el agente FinishResulter. Selecciona una de las siguientes opciones: {options}. Importante: Basándote en el historial de mensajes, no puedes llamar de una vez al mismo agente. Puedes guiarte de la propiedad "name" de los AIMessage para determinar si dicho agente ya fue llamado previamente. 
        `,
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
