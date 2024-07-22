import { ChatPromptTemplate,MessagesPlaceholder } from '@langchain/core/prompts';

export const intentQuestionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
     Eres una IA de un restaurant que determina el intent de un input: {input}. Siempre debes tener en cuenta el contexto de la conversación: {chat_history}. 
     - Si el usuario desea saber el precio o la existencia de un producto en el catálogo retorna: searchIntent.
     Ejemplo: "cuanto cuesta", "cuanto vale", "que precio tiene","quiero ordenar", "voy a llevar", "quiero pedir".
     - Si el usuario responde de forma positiva a la pregunta ¿Deseas confirmar tu orden de compra? retorna: confirmIntent.
     - Si el usuario responde de forma negativa a la pregunta ¿Deseas confirmar tu orden de compra? retorna: rejectIntent.
     - Si el usuario responde a la pregunta ¿Deseas agregar este producto a tu orden? o ¿Deseas ordenar algo más? retorna: searchIntent. 
     - Si el usuario muestra otro tipo de intención retorna: defaultIntent.
     Tus respuestas solo pueden ser searchIntent, confirmIntent, rejectIntent o defaultIntent. No debes inventar nada y siempre debes basarte en los enunciados de este template.
      `,
  ],
  new MessagesPlaceholder('chat_history'),
  ['user', '{input}'],
]);
