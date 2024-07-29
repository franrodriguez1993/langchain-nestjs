import { BaseMessage } from '@langchain/core/messages';
import { StateGraphArgs } from '@langchain/langgraph';

// NOTA: Primero definimos el estado del gráfico. Esto será solo una lista de mensajes, junto con una clave para rastrear al remitente más reciente

export interface AgentStateChannels {
  messages: BaseMessage[];
  // The agent node that last performed work
  sender: string;
}

// This defines the object that is passed between each node
// in the graph. We will create different nodes for each agent and tool
export const agentStateChannels: StateGraphArgs<AgentStateChannels>['channels'] =
  {
    messages: {
      value: (x?: BaseMessage[], y?: BaseMessage[]) =>
        (x ?? []).concat(y ?? []),
      default: () => [],
    },
    sender: {
      value: (x?: string, y?: string) => y ?? x ?? 'user',
      default: () => 'user',
    },
  };
