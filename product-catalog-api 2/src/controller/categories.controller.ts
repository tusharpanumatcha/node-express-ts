import { Router, Request, Response } from 'express';
import { CategoriesManager } from '../data-manager/categories.manager';
import { Api, HttpError, Status } from '../helper/api';

const manager = new CategoriesManager();

/** Parses ?isActive=true|false. Returns undefined when the parameter is absent. */
function parseBoolean(value: unknown, name: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new HttpError(Status.BAD_REQUEST, `${name} must be "true" or "false"`);
}

export class CategoriesController {
    public static route = '/api/categories';
    public router: Router = Router();

    constructor() {
        this.router.get('/', this.getAllCategories);
        this.router.get('/active', this.getActiveCategories);
        this.router.get('/:id', this.getCategoryById);
        this.router.post('/', this.createCategory);
        this.router.put('/:id', this.updateCategory);
        this.router.patch('/:id', this.updateCategory);
        this.router.delete('/:id', this.deleteCategory);
    }

    // GET /api/categories            (optional ?isActive=true|false)
    public async getAllCategories(req: Request, res: Response) {
        const isActive = parseBoolean(req.query.isActive, 'isActive');
        return Api.ok(req, res, await manager.getAllCategories({ isActive }));
    }

    // GET /api/categories/active
    public async getActiveCategories(req: Request, res: Response) {
        return Api.ok(req, res, await manager.getActiveCategories());
    }

    // GET /api/categories/:id
    public async getCategoryById(req: Request<{ id: string }>, res: Response) {
        return Api.ok(req, res, await manager.getCategoryById(req.params.id));
    }

    // POST /api/categories           body: { category, isActive? }
    public async createCategory(req: Request, res: Response) {
        return Api.created(req, res, await manager.createCategory(req.body ?? {}));
    }

    // PUT|PATCH /api/categories/:id  body: any of { category, isActive }
    public async updateCategory(req: Request<{ id: string }>, res: Response) {
        return Api.ok(req, res, await manager.updateCategory(req.params.id, req.body ?? {}));
    }

    // DELETE /api/categories/:id
    public async deleteCategory(req: Request<{ id: string }>, res: Response) {
        const deleted = await manager.deleteCategory(req.params.id);
        return Api.ok(req, res, { message: 'Category deleted', category: deleted });
    }
}
