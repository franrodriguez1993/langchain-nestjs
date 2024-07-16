import { ChatPromptTemplate } from '@langchain/core/prompts';

export function productExistsTemplate(products: string[]) {
  return ChatPromptTemplate.fromTemplate(`
      Dado el siguiente listado de productos: ${products}. Procesa la orden del usuario: {input}. Indicarle el precio de cada producto que desea comprar. Si en caso el producto no existe. Debes indicárselo de forma clara y breve. Ejemplo si el producto existe: "La milanesa cuesta $2500". Ejemplo si el producto no existe: "No tenemos guiso en nuestro catálogo".
      `)
}