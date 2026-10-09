import { ToObjectOptions } from 'mongoose';

/**
 * JSON shape sent to clients: exposes `id` (string) instead of `_id`, and hides `__v`.
 * This keeps the `id` field the original json-server API returned.
 */
export const toJSONOptions: ToObjectOptions = {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
    },
};
