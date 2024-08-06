import { END, StateGraphArgs } from "@langchain/langgraph";
import { BaseMessage,  } from '@langchain/core/messages';

export interface IState {
  input?: string;
  messages: BaseMessage[];
  next?: string;
  result?: string;
}

export const agentStateChannelsNuestro: StateGraphArgs<IState>["channels"] = {
  messages: {
    value: (x?: BaseMessage[], y?: BaseMessage[]) => (x ?? []).concat(y ?? []),
    default: () => [],
  },
  next: {
    value: (x?: string, y?: string) => y ?? x ?? END,
    default: () => END,
  },
  result:{
    value: (x?: string, y?: string) => y ?? x ?? "",
    default: () => "",
  },
   input:{
    value: (x?: string, y?: string) => y ?? x ?? "",
    default: () => "",
  },
};