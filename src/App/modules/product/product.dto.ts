import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Description' })
  description: string;

  @IsNumber()
  @ApiProperty({ description: 'Price' })
  price: number;
}

export class UpdateProductDTO extends PartialType(CreateProductDTO) {}
