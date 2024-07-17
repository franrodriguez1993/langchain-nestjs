import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './product.schema';
import { Model } from 'mongoose';
import { CreateProductDTO, UpdateProductDTO } from './product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  createProduct(dto: CreateProductDTO): Promise<Product> {
    return this.productModel.create(dto);
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
