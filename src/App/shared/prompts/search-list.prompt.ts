import { ChatPromptTemplate } from '@langchain/core/prompts';
import { MessagesPlaceholder } from '@langchain/core/prompts';

export function searchAndListTemplate(products: string[]) {
  return ChatPromptTemplate.fromMessages([["system",`
      Dado el siguiente listado de productos: ${products}. Procesa la orden del usuario: {input}. 
      Indicarle el precio del producto que desea comprar y si desea agregarlo a la orden de compra.
      Si el usuario indica que desea agregarlo a la orden de compra debes preguntarle si desea ordenar algo más listandole todos los productos que va ordenando hasta el momento y la cantidad de cada uno de ellos.
      Si en caso el producto no existe. Debes indicárselo de forma clara y breve.
      Si el usuario ya no quiere agregar más productos a su lista responde: ¿Deseas confirmar tu orden de compra? 
      Ejemplo 1:
      usuario: Quiero una milanesa
      ia: La milanesa cuesta $2500. ¿Deseas agregar este producto a tu orden?
      usuario: Si
      ia: Perfecto! ¿Deseas ordenar algo más?
      Ejemplo 2:
      usuario: Quiero pasta
      ia: Lo siento, no tenemos pasta en nuestro catálogo. ¿Quieres ordenar otra cosa?
      Ejemplo 3:
      ia: ¿Deseas ordenar algo más?
      usuario: no
      ia: Okay, ¿Deseas confirmar tu orden de compra?
      `],
      new MessagesPlaceholder('chat_history'),
    ["human", "{input}"]]);
}
