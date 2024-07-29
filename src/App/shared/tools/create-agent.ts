import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { StructuredTool } from '@langchain/core/tools';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';
import { Runnable } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';

/**
 * Create an agent that can run a set of tools.
 */
export async function createAgent({
  llm,
  tools,
  systemMessage,
}: {
  llm: ChatOpenAI;
  tools: StructuredTool[];
  systemMessage: string;
}): Promise<Runnable> {
  const toolNames = tools.map((tool) => tool.name).join(', ');
  const formattedTools = tools.map((t) => convertToOpenAITool(t));

  let prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'Eres una IA asistente, colaborando con otros asistentes.' +
        ' Usa tu herramienta para completar tu tarea.' +
        ' Si no eres capaz de dar una respuesta completa, está bien, otros asistentes con diferentes herramientas ' +
        ' te ayudarán a seguir donde quedaste. Ejecuta lo que tu puedas procesar' +
        'Si tu u otro de los asistentes tiene la respuesta final,' +
        ' coloca el prefijo FINAL ANSWER en tu respuesta, así el equipo de asistentes sabrá cuando detenerse.' +
        ' Tienes acceso a las siguientes herramientas: {tool_names}.\n{system_message}',
    ],
    new MessagesPlaceholder('messages'),
  ]);
  prompt = await prompt.partial({
    system_message: systemMessage,
    tool_names: toolNames,
  });

  return prompt.pipe(llm.bind({ tools: formattedTools }));
}
