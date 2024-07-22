import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './product.schema';
import { Model } from 'mongoose';
import { CreateProductDTO, UpdateProductDTO } from './product.dto';
import { LangchainService } from '../../shared/services/langchain.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private langchainService: LangchainService,
  ) {}

  async createProduct(dto: CreateProductDTO): Promise<Product> {
    const product = await this.productModel.create(dto);
    const serialized = `title: ${product.name} | price: ${product.price}`;
    await this.langchainService.vectorizeData(serialized);

    return product;
  }

  getProductById(id: string): Promise<Product> {
    return this.productModel.findOne({ _id: id });
  }

  listProducts(): Promise<Product[]> {
    return this.productModel.find({ active: true });
  }

  updateProduct(id: string, dto: UpdateProductDTO): Promise<Product> {
    return this.productModel.findByIdAndUpdate(id, dto, { new: true });
  }

  deleteProduct(id: string) {
    return this.productModel.updateOne({ _id: id }, { active: false });
  }
}
