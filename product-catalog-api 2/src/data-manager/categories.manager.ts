import { CategoryModel, CategoryDocument, ICategory } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { HttpError, Status, assertObjectId, pick } from '../helper/api';

const CATEGORY_FIELDS = ['category', 'isActive'] as const;

export class CategoriesManager {
    public async getAllCategories(filter: { isActive?: boolean } = {}): Promise<CategoryDocument[]> {
        const query: { isActive?: boolean } = {};
        if (typeof filter.isActive === 'boolean') query.isActive = filter.isActive;
        return CategoryModel.find(query).sort({ category: 1 });
    }

    public async getActiveCategories(): Promise<CategoryDocument[]> {
        return this.getAllCategories({ isActive: true });
    }

    public async getCategoryById(id: string): Promise<CategoryDocument> {
        assertObjectId(id);
        const category = await CategoryModel.findById(id);
        if (!category) throw new HttpError(Status.NOT_FOUND, `Category not found: ${id}`);
        return category;
    }

    public async createCategory(payload: object): Promise<CategoryDocument> {
        // Values are type-checked by the schema; bad input becomes a 422 response.
        const data = pick(payload, CATEGORY_FIELDS) as Partial<ICategory>;
        await this.assertNameAvailable(data.category);
        return CategoryModel.create(data);
    }

    /** Category names are unique (also enforced by a unique index on the collection). */
    private async assertNameAvailable(name: unknown, excludeId?: string): Promise<void> {
        if (typeof name !== 'string' || !name.trim()) return; // schema validation reports "required"
        const filter: { category: string; _id?: { $ne: string } } = { category: name.trim() };
        if (excludeId) filter._id = { $ne: excludeId };
        if (await CategoryModel.exists(filter)) {
            throw new HttpError(Status.CONFLICT, `Category "${name.trim()}" already exists`);
        }
    }

    /**
     * Partial update: only the fields sent are changed.
     * If the category is renamed, products that use the old name are moved to the new name.
     */
    public async updateCategory(id: string, payload: object): Promise<CategoryDocument> {
        const category = await this.getCategoryById(id);
        const oldName = category.category;

        const data = pick(payload, CATEGORY_FIELDS);
        await this.assertNameAvailable(data.category, id);
        category.set(data);
        await category.save();

        if (category.category !== oldName) {
            await ProductModel.updateMany({ category: oldName }, { $set: { category: category.category } });
        }
        return category;
    }

    /** Refuses to delete a category that still has products, so no product is left orphaned. */
    public async deleteCategory(id: string): Promise<CategoryDocument> {
        const category = await this.getCategoryById(id);
        const productCount = await ProductModel.countDocuments({ category: category.category });
        if (productCount > 0) {
            throw new HttpError(
                Status.CONFLICT,
                `Category "${category.category}" still has ${productCount} product(s). ` +
                    'Delete or move them first, or set isActive to false instead.'
            );
        }
        await category.deleteOne();
        return category;
    }
}
