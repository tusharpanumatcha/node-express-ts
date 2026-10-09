import { ProductModel, ProductDocument, IProduct } from '../models/product.model';
import { CategoryModel } from '../models/category.model';
import { HttpError, Status, assertObjectId, pick } from '../helper/api';

const PRODUCT_FIELDS = ['productname', 'category', 'imageName', 'productDescription'] as const;

export interface ProductFilter {
    categories?: string[];
    search?: string;
}

function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ProductsManager {
    /** Lists products, optionally filtered by category names and/or a product-name search. */
    public async getAllProducts(filter: ProductFilter = {}): Promise<ProductDocument[]> {
        const query: {
            category?: { $in: string[] };
            productname?: { $regex: string; $options: string };
        } = {};
        const categories = (filter.categories ?? []).map((c) => String(c).trim()).filter(Boolean);
        if (categories.length > 0) query.category = { $in: categories };
        if (filter.search && filter.search.trim()) {
            query.productname = { $regex: escapeRegex(filter.search.trim()), $options: 'i' };
        }
        return ProductModel.find(query).sort({ createdDate: 1 });
    }

    public async getProductById(id: string): Promise<ProductDocument> {
        assertObjectId(id);
        const product = await ProductModel.findById(id);
        if (!product) throw new HttpError(Status.NOT_FOUND, `Product not found: ${id}`);
        return product;
    }

    public async createProduct(payload: object): Promise<ProductDocument> {
        const data = pick(payload, PRODUCT_FIELDS);
        await this.assertCategoryExists(data.category);
        // Values are type-checked by the schema; bad input becomes a 422 response.
        return ProductModel.create(data as Partial<IProduct>);
    }

    /** Partial update: only the fields sent are changed. */
    public async updateProduct(id: string, payload: object): Promise<ProductDocument> {
        const product = await this.getProductById(id);
        const data = pick(payload, PRODUCT_FIELDS);
        if (data.category !== undefined) await this.assertCategoryExists(data.category);
        product.set(data);
        await product.save();
        return product;
    }

    public async deleteProduct(id: string): Promise<ProductDocument> {
        const product = await this.getProductById(id);
        await product.deleteOne();
        return product;
    }

    /** A product's category must match an existing category name. */
    private async assertCategoryExists(category: unknown): Promise<void> {
        if (typeof category !== 'string' || !category.trim()) return; // schema validation reports "required"
        const exists = await CategoryModel.exists({ category: category.trim() });
        if (!exists) {
            throw new HttpError(Status.VALIDATION_FAILED, undefined, [
                `category "${category}" does not exist. Create it first via POST /api/categories.`,
            ]);
        }
    }
}
