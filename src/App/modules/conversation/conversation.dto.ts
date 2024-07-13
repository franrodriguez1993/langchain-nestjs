import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConversationDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'name' })
  question: string;
}
