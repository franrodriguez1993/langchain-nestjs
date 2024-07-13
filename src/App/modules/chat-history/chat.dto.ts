export enum MessageType{
  HUMAN = "human",
  SYSTEM = "system",
  AI = "ai"
}
export class MessageDTO {
  type: MessageType;
  text:string
}