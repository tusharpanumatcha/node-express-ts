import fs from 'fs';
import path from 'path';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';

interface SeedData {
    categories: { category: string; isActive?: boolean }[];
    products: { productname: string; category: string; imageName?: string; productDescription?: string }[];
}

/**
 * Loads src/data/api-data.json into the connected database.
 * Records are matched by name, so running it again updates instead of duplicating.
 * With { fresh: true } all categories and products are deleted first.
 */
export async function seedDatabase(options: { fresh?: boolean } = {}) {
    const file = path.resolve(process.cwd(), 'src/data/api-data.json');
    const data: SeedData = JSON.parse(fs.readFileSync(file, 'utf8'));

    await Promise.all([CategoryModel.init(), ProductModel.init()]); // make sure indexes exist

    if (options.fresh) {
        await Promise.all([CategoryModel.deleteMany({}), ProductModel.deleteMany({})]);
    }

    for (const c of data.categories) {
        await CategoryModel.updateOne(
            { category: c.category },
            { $set: { category: c.category, isActive: c.isActive ?? true } },
            { upsert: true }
        );
    }
    for (const p of data.products) {
        await ProductModel.updateOne(
            { productname: p.productname },
            {
                $set: {
                    productname: p.productname,
                    category: p.category,
                    imageName: p.imageName ?? '',
                    productDescription: p.productDescription ?? '',
                },
            },
            { upsert: true }
        );
    }

    const [categories, products] = await Promise.all([
        CategoryModel.countDocuments(),
        ProductModel.countDocuments(),
    ]);
    return { categories, products };
}
