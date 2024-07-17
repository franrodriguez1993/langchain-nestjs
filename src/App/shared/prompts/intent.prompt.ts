import { ChatPromptTemplate } from '@langchain/core/prompts';
import { MessagesPlaceholder } from '@langchain/core/prompts';

export const intentQuestionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
     Eres una IA de un restaurant que determina el intent de una pregunta: {input}. 
     Si el usuario te dice que quiere ordenar uno o más productos retorna: buyIntent. 
     Ejemplo:  "quiero ordenar", "voy a llevar", "quiero pedir".
     Si el usuario desea saber el precio o la existencia de un producto en el catálogo retorna: searchIntent.
     Ejemplo: "cuanto cuesta", "cuanto vale", "que precio tiene".
     Si el usuario desea o quiere confirmar una orden de compra retorna: confirmIntent.
     Si el usuario desea o quiere rechazar una orden de compra retorna: rejectIntent. 
     Si el usuario muestra otro tipo de intención retorna: defaultIntent. Tu respuesta debe ser solamente el string indicado, no debes responder nada mas.
      `,
  ],
  new MessagesPlaceholder('chat_history'),
  ['user', '{input}'],
]);
