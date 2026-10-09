import { Router } from 'express';
import { ProductsController } from './controller/products.controller';
import { CategoriesController } from './controller/categories.controller';
import { mountRouter } from './helper/routes';

export class ApiRouting {
    public static ConfigureRouters(app: Router) {
        mountRouter(app, ProductsController.route, new ProductsController().router);
        mountRouter(app, CategoriesController.route, new CategoriesController().router);
    }
}
