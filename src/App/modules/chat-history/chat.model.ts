import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MessageDTO } from './chat.dto';
export type ChatDocument = Chat & Document;

@Schema({
  versionKey: false,
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class Chat {
  @Prop({ required: true })
  auth0Id: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: [] })
  messages: MessageDTO[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
