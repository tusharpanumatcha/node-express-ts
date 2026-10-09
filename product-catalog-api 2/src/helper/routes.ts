import type { Express, Router } from 'express';

export interface RouteInfo {
    method: string;
    path: string;
}

// Express does not keep a readable mount path for sub-routers, so we remember it when mounting.
const mountPaths = new WeakMap<object, string>();

/** Mounts a router and remembers its base path so it can be listed later. */
export function mountRouter(app: Router, basePath: string, router: Router): void {
    mountPaths.set(router, basePath);
    app.use(basePath, router);
}

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Collects every registered route (method + full path) from the app, including mounted routers. */
export function listRoutes(app: Express): RouteInfo[] {
    const routes: RouteInfo[] = [];

    const walk = (stack: any[], prefix: string) => {
        for (const layer of stack ?? []) {
            if (layer.route) {
                const paths: string[] = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
                const methods = Object.keys(layer.route.methods ?? {})
                    .filter((m) => layer.route.methods[m] && m !== '_all')
                    .map((m) => m.toUpperCase());
                for (const p of paths) {
                    const full = (prefix + (p === '/' && prefix ? '' : p)) || '/';
                    for (const method of methods) routes.push({ method, path: full });
                }
            } else if (layer.handle?.stack && mountPaths.has(layer.handle)) {
                walk(layer.handle.stack, prefix + mountPaths.get(layer.handle));
            }
        }
    };
    walk((app as any).router?.stack, '');

    // Unique, grouped by path then method
    const seen = new Set<string>();
    return routes
        .filter((r) => (seen.has(r.method + r.path) ? false : (seen.add(r.method + r.path), true)))
        .sort((a, b) => {
            const base = (p: string) => p.replace(/\/:.*$/, '');
            return (
                base(a.path).localeCompare(base(b.path)) ||
                a.path.length - b.path.length ||
                METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method)
            );
        });
}

/** Prints the route list as an aligned table to the console. */
export function printRoutes(app: Express, baseUrl: string): void {
    const routes = listRoutes(app);
    console.log(`\nAvailable APIs (${routes.length}):`);
    for (const r of routes) {
        console.log(`  ${r.method.padEnd(7)} ${baseUrl}${r.path}`);
    }
    console.log('');
}
