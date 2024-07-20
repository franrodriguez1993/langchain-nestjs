import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { MessagesPlaceholder } from '@langchain/core/prompts';

export function productArrayTemplate(products: string[]) {
  return ChatPromptTemplate.fromMessages([["system",`
      Dado el siguiente listado de productos: ${products}. Procesa la orden del usuario: {chat_history}. Debes crear un array de objetos siguiendo la siguiente estructura: {formattingInstruction}.
      Debes buscar en la conversación los productos que el usuario haya confirmado que desea comprar e ignorar el resto.
      `],
        new MessagesPlaceholder('chat_history'),
  ]);
}

export const structuredProductParser = StructuredOutputParser.fromZodSchema(
  z.object({
    products: z
      .array(
        z.object({
          title: z.string().describe('Nombre del producto'),
          quantity: z.number().describe('Cantidad de unidades a comprar'),
          price: z.number().describe('Precio por unidad del producto'),
        }),
      )
      .describe('Array de productos que el usuario desea comprar.'),
  }),
);
