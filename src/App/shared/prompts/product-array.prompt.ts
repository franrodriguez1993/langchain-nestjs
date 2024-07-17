import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';

export function productArrayTemplate(products: string[]) {
  return ChatPromptTemplate.fromTemplate(`
      Dado el siguiente listado de productos: ${products}. Procesa la orden del usuario: {input}. Debes crear un array de objetos siguiendo la siguiente estructura: {formattingInstruction}. Si en caso el usuario ordena un producto que no existe en la lista, no crees el array de objetos. En su lugar, devuelve un array vacío.
      `);
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
