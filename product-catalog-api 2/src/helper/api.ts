import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';

export const Status = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    UNSUPPORTED_ACTION: 405,
    CONFLICT: 409,
    VALIDATION_FAILED: 422,
    SERVER_ERROR: 500,
} as const;

const statusMessages: Record<number, string> = {
    [Status.OK]: 'OK',
    [Status.CREATED]: 'Created',
    [Status.BAD_REQUEST]: 'Bad Request',
    [Status.UNAUTHORIZED]: 'Unauthorized',
    [Status.FORBIDDEN]: 'Forbidden',
    [Status.NOT_FOUND]: 'Not Found',
    [Status.UNSUPPORTED_ACTION]: 'Unsupported Action',
    [Status.CONFLICT]: 'Conflict',
    [Status.VALIDATION_FAILED]: 'Validation Failed',
    [Status.SERVER_ERROR]: 'Internal Server Error',
};

export function statusMessage(status: number): string {
    return statusMessages[status] ?? 'Error';
}

/**
 * Throw this from managers/controllers to send a specific HTTP error.
 * The central error handler (see app.ts) turns it into a JSON response.
 */
export class HttpError extends Error {
    constructor(public status: number, message?: string, public errors?: string[]) {
        super(message ?? statusMessage(status));
        this.name = 'HttpError';
    }
}

/** Throws a 400 if `id` is not a valid MongoDB ObjectId. */
export function assertObjectId(id: string, name = 'id'): void {
    if (!isValidObjectId(id)) {
        throw new HttpError(Status.BAD_REQUEST, `Invalid ${name}: ${id}`);
    }
}

function send(res: Response, status: number, body: unknown) {
    return res.status(status).json(body ?? null);
}

function errorBody(status: number, errors?: string | string[]) {
    const body: { message: string; errors?: string[] } = { message: statusMessage(status) };
    if (errors !== undefined) body.errors = Array.isArray(errors) ? errors : [errors];
    return body;
}

export const Api = {
    ok: (_req: Request, res: Response, data: unknown) => send(res, Status.OK, data),
    created: (_req: Request, res: Response, data: unknown) => send(res, Status.CREATED, data),
    badRequest: (_req: Request, res: Response, errors?: string | string[]) =>
        send(res, Status.BAD_REQUEST, errorBody(Status.BAD_REQUEST, errors)),
    notFound: (_req: Request, res: Response, errors?: string | string[]) =>
        send(res, Status.NOT_FOUND, errorBody(Status.NOT_FOUND, errors)),
    conflict: (_req: Request, res: Response, errors?: string | string[]) =>
        send(res, Status.CONFLICT, errorBody(Status.CONFLICT, errors)),
    invalid: (_req: Request, res: Response, errors?: string | string[]) =>
        send(res, Status.VALIDATION_FAILED, errorBody(Status.VALIDATION_FAILED, errors)),
    serverError: (_req: Request, res: Response, error?: unknown) => {
        const body: Record<string, unknown> = { message: statusMessage(Status.SERVER_ERROR) };
        if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
            body.error = { message: error.message, stacktrace: error.stack };
        }
        return send(res, Status.SERVER_ERROR, body);
    },
    error: (_req: Request, res: Response, status: number, errors?: string | string[]) =>
        send(res, status, errorBody(status, errors)),
};

/** Copies only the allowed keys from a request body (ignores _id, id, timestamps, etc.). */
export function pick<T extends object, K extends string>(source: T, keys: readonly K[]): Partial<Record<K, unknown>> {
    const out: Partial<Record<K, unknown>> = {};
    if (!source || typeof source !== 'object') return out;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            out[key] = (source as Record<string, unknown>)[key];
        }
    }
    return out;
}
