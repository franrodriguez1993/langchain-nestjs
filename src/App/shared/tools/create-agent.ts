import { AgentExecutor, createOpenAIToolsAgent, createToolCallingAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { Runnable } from "@langchain/core/runnables";
import { ChatGroq } from "@langchain/groq";

export  function createAgent(
  llm: ChatOpenAI,
  // llm:ChatGroq,
  tools: any[],
  systemPrompt: string
){
  // Each worker node will be given a name and some tools.
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);
  
  const agent = createToolCallingAgent({ llm, tools, prompt });
  return new AgentExecutor({ agent, tools });
}