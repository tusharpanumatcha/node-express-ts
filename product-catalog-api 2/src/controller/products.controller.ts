import { Router, Request, Response } from 'express';
import { ProductsManager } from '../data-manager/products.manager';
import { Api, HttpError, Status } from '../helper/api';

const manager = new ProductsManager();

/** Accepts ?category=A&category=B or ?category=A,B and returns ['A', 'B']. */
function toList(value: unknown): string[] {
    if (value === undefined) return [];
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
}

export class ProductsController {
    public static route = '/api/products';
    public router: Router = Router();

    constructor() {
        this.router.get('/', this.getProducts);
        this.router.post('/search', this.searchProducts);
        this.router.get('/:id', this.getProductById);
        this.router.post('/', this.createProduct);
        this.router.put('/:id', this.updateProduct);
        this.router.patch('/:id', this.updateProduct);
        this.router.delete('/:id', this.deleteProduct);
    }

    // GET /api/products              (optional ?category=A&category=B  and/or  ?search=text)
    public async getProducts(req: Request, res: Response) {
        const products = await manager.getAllProducts({
            categories: toList(req.query.category),
            search: typeof req.query.search === 'string' ? req.query.search : undefined,
        });
        return Api.ok(req, res, products);
    }

    // POST /api/products/search      body: { categories: ["Issuer Solutions", ...], search?: "text" }
    // (Replaces the old "POST /api/products" filter; POST /api/products now creates a product.)
    // Like the old endpoint, an empty or missing categories list returns [].
    public async searchProducts(req: Request, res: Response) {
        const body = req.body ?? {};
        if (body.categories !== undefined && !Array.isArray(body.categories)) {
            throw new HttpError(Status.BAD_REQUEST, 'categories must be an array of category names');
        }
        const categories = toList(body.categories);
        if (categories.length === 0) return Api.ok(req, res, []);
        const search = typeof body.search === 'string' ? body.search : undefined;
        return Api.ok(req, res, await manager.getAllProducts({ categories, search }));
    }

    // GET /api/products/:id
    public async getProductById(req: Request<{ id: string }>, res: Response) {
        return Api.ok(req, res, await manager.getProductById(req.params.id));
    }

    // POST /api/products             body: { productname, category, imageName?, productDescription? }
    public async createProduct(req: Request, res: Response) {
        return Api.created(req, res, await manager.createProduct(req.body ?? {}));
    }

    // PUT|PATCH /api/products/:id    body: any of the product fields
    public async updateProduct(req: Request<{ id: string }>, res: Response) {
        return Api.ok(req, res, await manager.updateProduct(req.params.id, req.body ?? {}));
    }

    // DELETE /api/products/:id
    public async deleteProduct(req: Request<{ id: string }>, res: Response) {
        const deleted = await manager.deleteProduct(req.params.id);
        return Api.ok(req, res, { message: 'Product deleted', product: deleted });
    }
}
