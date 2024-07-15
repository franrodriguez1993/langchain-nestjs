import { Injectable } from '@nestjs/common';
import { WordTokenizer } from 'natural';
import { removeStopwords } from "stopword";

@Injectable()
export class NLPService {
  private tokenizer = new WordTokenizer();

  preprocess(question: string): string[] {
    const tokens = this.tokenizer.tokenize(question);
    return removeStopwords(tokens);
  }

   classify(tokens: string[]): string {
    const searchKeywords = ['buscar', 'encontrar', 'consulta','averiguar',"buscando","averiguando"];
    const payKeywords = ['comprar', 'compra', 'cuanto','valor','vale','sale','monto','dinero','plata'];

    if (tokens.some(token => searchKeywords.includes(token.toLowerCase()))) {
      return 'searchIntent';
    } else if (tokens.some(token => payKeywords.includes(token.toLowerCase()))) {
      return 'payIntent';
    } else {
      return 'defaultIntent';
    }
  }
}
