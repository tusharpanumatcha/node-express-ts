# Product Catalog API

REST API for managing a product catalog (categories and products) with Express, TypeScript and MongoDB.

Full CRUD for **categories** and **products**, stored in MongoDB through Mongoose, with a built-in fake
(in-memory) MongoDB for local development.

## Requirements

- Node.js 20.12 or newer (`node -v`)
- A MongoDB database: local MongoDB, Docker (`docker run -d -p 27017:27017 mongo:7`), or a MongoDB Atlas cluster.
  **No MongoDB?** Use the built-in fake database below.

## Quick start with the fake (in-memory) database

```bash
npm install
npm run dev:memory
```

This starts a temporary MongoDB in memory (via `mongodb-memory-server`), fills it with the 7 categories and
23 products from `src/data/api-data.json`, and serves the API on http://localhost:3000. No `.env` needed.

- The first run downloads a MongoDB binary (~100 MB, cached in `~/.cache/mongodb-binaries`), so it needs internet once.
- Data **resets** every time the server restarts, including auto-restarts when you save a file.
- `npm run dev` / `npm run serve` also switch to this fake database **automatically** when `MONGODB_URI`
  points to a local MongoDB (localhost / 127.0.0.1) that isn't running. Remote databases (Atlas) never fall back.
- You can also set `MONGODB_URI=memory` in `.env` to always use it.

## Setup

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env and set MONGODB_URI to your database
npm run seed                # optional: loads src/data/api-data.json into MongoDB
npm run dev                 # starts the API with auto-reload on http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with auto-reload (nodemon), using `MONGODB_URI` (`npm run serve` does the same) |
| `npm run dev:memory` | Same, but always with the fake in-memory MongoDB, auto-seeded |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs the compiled build (`npm run build` first) |
| `npm run seed` | Adds/updates the sample categories and products (matched by name, safe to rerun) |
| `npm run seed -- --fresh` | **Deletes all** categories and products, then loads the sample data |
| `npm run typecheck` | Type-checks without building |

### Environment variables (`.env`)

| Name | Default |
| --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/product-catalog` (or `memory` for the fake database) |
| `PORT` | `3000` |

For Atlas, include the database name in the URI:
`mongodb+srv://user:pass@cluster.mongodb.net/product-catalog?retryWrites=true&w=majority`

### Auto-reload (nodemon)

`nodemon.json` watches `src/` for `.ts` and `.json` changes and restarts `tsx src/main.ts`.
Type `rs` + Enter in the terminal to restart manually.

## Endpoints

Base URL: `http://localhost:3000/api`. IDs are MongoDB ObjectIds (returned as `id`).

### Categories `/api/categories`

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/api/categories` | `?isActive=true\|false` (optional) | List, sorted by name |
| GET | `/api/categories/active` | | Active categories only |
| GET | `/api/categories/:id` | | One category |
| POST | `/api/categories` | `{ "category": "Name", "isActive": true }` | Create → **201**. Names are unique |
| PUT / PATCH | `/api/categories/:id` | any of `category`, `isActive` | Partial update. Renaming also updates its products |
| DELETE | `/api/categories/:id` | | **409** if products still use it |

### Products `/api/products`

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/api/products` | `?category=A&category=B` or `?category=A,B`, `?search=text` | List / filter |
| POST | `/api/products/search` | `{ "categories": ["Issuer Solutions"], "search": "card" }` | Filter by body. Empty `categories` returns `[]` |
| GET | `/api/products/:id` | | One product |
| POST | `/api/products` | `{ "productname", "category", "imageName", "productDescription" }` | Create → **201**. `category` must be an existing category name |
| PUT / PATCH | `/api/products/:id` | any product field | Partial update |
| DELETE | `/api/products/:id` | | Delete |

### Other

- `GET /` and `GET /api` → `{ "message": "Product Catalog API", "name", "version", "description", "endpoints": ["GET /api/products", ...] }` (name, version and description come from `package.json`; `endpoints` lists every route)
- On every start/restart the server also prints the full list of available APIs in the terminal.
- `GET /api/health` → `{ "status": "ok", "db": "connected" }`

### Example

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"category":"Payments","isActive":true}'

curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"productname":"Pay Gateway","category":"Payments","productDescription":"..."}'
```

### Errors

Every error is JSON: `{ "message": "...", "errors": ["..."] }`

| Status | When |
| --- | --- |
| 400 | Invalid id, malformed JSON, bad query value |
| 404 | Record or route not found |
| 409 | Duplicate category name, or deleting a category that still has products |
| 422 | Validation failed (missing/invalid fields, unknown category) |

## Changes from the previous version

- **Breaking:** the product filter moved from `POST /api/products` to **`POST /api/products/search`** (same body). `POST /api/products` now creates a product.
- IDs are MongoDB ObjectId strings (e.g. `"6ac8f3c6fb81da1eeef9df56"`) instead of numbers 1, 2, 3.
- Records now have `createdDate` and `updatedDate`, set automatically.
- Removed json-server, `request`, `lodash`, `body-parser`, `joi`, ts-node. Uses Express 5, Mongoose 9, TypeScript 5, nodemon 3 + tsx.

## Project structure

```
src/
  main.ts                    starts the server after connecting to MongoDB
  app.ts                     Express app, routes, 404 + error handling
  api.routing.ts             mounts the controllers
  config/env.ts, db.ts       .env loading and MongoDB connection
  config/memory-db.ts        fake in-memory MongoDB for development
  models/                    Mongoose schemas (Category, Product)
  data-manager/              database logic (CategoriesManager, ProductsManager)
  controller/                HTTP handlers and routes
  helper/api.ts              response helpers and HttpError
  scripts/seed.ts            npm run seed (uses seed-data.ts)
  scripts/seed-data.ts       loads src/data/api-data.json into the database
  data/api-data.json         sample data
```
