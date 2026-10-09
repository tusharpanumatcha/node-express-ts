import { Schema, model, HydratedDocument } from 'mongoose';
import { toJSONOptions } from './shared';

export interface IProduct {
    productname: string;
    category: string;
    imageName: string;
    productDescription: string;
    createdDate?: Date;
    updatedDate?: Date;
}

const productSchema = new Schema<IProduct>(
    {
        productname: {
            type: String,
            required: [true, 'productname is required'],
            trim: true,
            maxlength: [200, 'productname must be at most 200 characters'],
        },
        // Stores the category *name* (e.g. "Issuer Solutions"), same as the original data,
        // so existing clients that filter by category name keep working.
        category: {
            type: String,
            required: [true, 'category is required'],
            trim: true,
            index: true,
        },
        imageName: {
            type: String,
            trim: true,
            default: '',
        },
        productDescription: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
        toJSON: toJSONOptions,
    }
);

export type ProductDocument = HydratedDocument<IProduct>;
export const ProductModel = model<IProduct>('Product', productSchema);
