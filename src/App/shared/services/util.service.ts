import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilService {
  generateRandomID(length: number, type: string = null): string {
    let id = '';
    let characters: string;

    if (type === 'onlyNumeric') {
      characters = '0123456789';
    } else {
      characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }

    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return id;
  }
}
