import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProductDTO, UpdateProductDTO } from './product.dto';

@Controller('product')
@ApiTags('Products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new product' })
  async createProduct(@Body() dto: CreateProductDTO) {
    const data = await this.productService.createProduct(dto);

    return { statusCode: HttpStatus.CREATED, result: data };
  }

  @Get('/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'get product by id' })
  async getProductById(@Param('productId') productId: string) {
    const data = await this.productService.getProductById(productId);

    return { statusCode: HttpStatus.OK, result: data };
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'list products' })
  async listProducts() {
    const data = await this.productService.listProducts();

    return { statusCode: HttpStatus.OK, result: data };
  }

  @Patch('/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'update product' })
  async updateProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDTO,
  ) {
    const data = await this.productService.updateProduct(productId, dto);

    return { statusCode: HttpStatus.OK, result: data };
  }

  @Delete('/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'delete product' })
  async deleteProduct(@Param('productId') productId: string) {
    await this.productService.deleteProduct(productId);
    return { statusCode: HttpStatus.OK, result: 'Product deleted.' };
  }
}
