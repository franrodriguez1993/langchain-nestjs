import { MongoDBChatMessageHistory } from "@langchain/mongodb";
import { Injectable } from "@nestjs/common";
import { BufferMemory } from "langchain/memory";
import { MongoClient } from "mongodb";

@Injectable()
export class MongoChatHistory{

  async getMongoChatHistory(auth0Id:string) {

  const client = new MongoClient(process.env.MONGO_URI || "", {
    driverInfo: { name: "langchainjs" },
  });
  await client.connect();
  const collection = client.db("langchain").collection("memory");

  const sessionId = auth0Id;

  const memoryClient = new BufferMemory({
  chatHistory: new MongoDBChatMessageHistory({
    collection,
    sessionId,
  }),
  });
    const chatHistory = await memoryClient.chatHistory.getMessages();
    
    return {chatHistory,memoryClient}

  }

}