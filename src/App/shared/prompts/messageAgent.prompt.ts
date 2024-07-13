import { ChatPromptTemplate } from '@langchain/core/prompts';
import { MessagesPlaceholder } from '@langchain/core/prompts';

export const messageAgentPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres una asistente IA que responde preguntas del usuario. Ten en cuenta que la fecha actual es ${new Date(
      Date.now(),
    )}`,
  ],
  new MessagesPlaceholder('agent_scratchpad'),
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);
