import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { ApiRouting } from './api.routing';
import { Api, HttpError, statusMessage } from './helper/api';
import { listRoutes } from './helper/routes';

/** Reads name/version/description from package.json (works from both src/ with tsx and dist/ after a build). */
function readPackageInfo(): { name: string; version: string; description: string } {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
        return {
            name: pkg.name ?? 'product-catalog-api',
            version: pkg.version ?? 'unknown',
            description: pkg.description ?? '',
        };
    } catch {
        return { name: 'product-catalog-api', version: 'unknown', description: '' };
    }
}

export function createApp(): express.Express {
    const pkg = readPackageInfo();
    const app = express();

    app.use(cors());
    app.use(express.json());

    // GET / and GET /api -> API info (version from package.json) and every available endpoint
    app.get(['/', '/api'], (_req, res) => {
        res.json({
            message: 'Product Catalog API',
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            endpoints: listRoutes(app).map((r) => `${r.method} ${r.path}`),
        });
    });

    app.get('/api/health', (_req, res) => {
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        const db = states[mongoose.connection.readyState] ?? 'unknown';
        res.status(db === 'connected' ? 200 : 503).json({ status: 'ok', db });
    });

    ApiRouting.ConfigureRouters(app);

    // Unknown routes -> JSON 404 (instead of Express's HTML page)
    app.use((req: Request, res: Response) => {
        Api.notFound(req, res, `Route not found: ${req.method} ${req.originalUrl}`);
    });

    // Central error handler. Express 5 forwards errors thrown in async handlers here automatically.
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof HttpError) {
            const errors = err.errors ?? (err.message !== statusMessage(err.status) ? [err.message] : undefined);
            return Api.error(req, res, err.status, errors);
        }
        // Malformed JSON body
        if (err?.type === 'entity.parse.failed') {
            return Api.badRequest(req, res, 'Request body is not valid JSON');
        }
        // Schema validation (required fields, max length, wrong types...)
        if (err instanceof mongoose.Error.ValidationError) {
            const messages = Object.values(err.errors).map((e) =>
                e instanceof mongoose.Error.CastError ? `${e.path} must be a valid ${e.kind.toLowerCase()}` : e.message
            );
            return Api.invalid(req, res, messages);
        }
        if (err instanceof mongoose.Error.CastError) {
            return Api.badRequest(req, res, `Invalid value for ${err.path}: ${JSON.stringify(err.value)}`);
        }
        // Unique index violation (e.g. duplicate category name)
        if (err?.code === 11000) {
            const fields = Object.entries(err.keyValue ?? {}).map(([k, v]) => `${k} "${v}"`);
            return Api.conflict(req, res, `Already exists: ${fields.join(', ') || 'duplicate value'}`);
        }
        console.error(err);
        return Api.serverError(req, res, err);
    });

    return app;
}

