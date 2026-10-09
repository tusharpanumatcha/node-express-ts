import { Schema, model, HydratedDocument } from 'mongoose';
import { toJSONOptions } from './shared';

export interface ICategory {
    category: string;
    isActive: boolean;
    createdDate?: Date;
    updatedDate?: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        category: {
            type: String,
            required: [true, 'category is required'],
            trim: true,
            unique: true,
            maxlength: [100, 'category must be at most 100 characters'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
        toJSON: toJSONOptions,
    }
);

export type CategoryDocument = HydratedDocument<ICategory>;
export const CategoryModel = model<ICategory>('Category', categorySchema);
