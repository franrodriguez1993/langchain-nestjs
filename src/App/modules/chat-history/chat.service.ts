import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Chat, ChatDocument } from './chat.model';
import { Model } from 'mongoose';

@Injectable()
export class ChatService {
  constructor(@InjectModel(Chat.name) private chatModel: Model<ChatDocument>) {}

  createChat(auth0Id: string): Promise<Chat> {
    return this.chatModel.create({ auth0Id });
  }

  getChat(auth0Id: string): Promise<Chat> {
    return this.chatModel.findOne({ auth0Id, active: true });
  }

  addMessage(auth0Id: string, message: any) {
    return this.chatModel.updateOne(
      { auth0Id, active: true },
      { $addToSet: { messages: message } },
    );
  }

  closeChat(auth0Id: string) {
    return this.chatModel.updateOne(
      { auth0Id, active: true },
      { active: false },
    );
  }
}
