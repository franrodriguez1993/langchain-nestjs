import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createOpenAIFunctionsAgent, AgentExecutor } from 'langchain/agents';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { messageAgentPrompt } from '../prompts/messageAgent.prompt';

@Injectable()
export class LangchainService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      temperature: 0.7,
      maxTokens: 1000,
      verbose: false,
    });
  }

  async createVectorStorageForCheerio(url: string) {
    const loader = new CheerioWebBaseLoader(url);

    const docs = await loader.load(); //Document[]

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 20,
    });

    const splittedDocs = await splitter.splitDocuments(docs);

    const enbedding = new OpenAIEmbeddings();

    const vectorMemory = await MemoryVectorStore.fromDocuments(
      splittedDocs,
      enbedding,
    );

    return vectorMemory;
  }

  async messageAgent(): Promise<AgentExecutor> {
    //tools:
    const tavilySearchTool = new TavilySearchResults();
    const tools = [tavilySearchTool];

    // agent
    const messageAgent = await createOpenAIFunctionsAgent({
      llm: this.llm,
      prompt: messageAgentPrompt,
      tools,
    });

    // executor
    const agentExecutor = new AgentExecutor({ agent: messageAgent, tools });

    return agentExecutor;
  }
}
