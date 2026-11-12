# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Resttek: restaurant management platform. npm-workspaces monorepo (`packages/*`) with an Express 5 + TypeScript API (SQLite) and three Angular 21 apps plus a shared Angular library. Docs are in Spanish; see `docs/arquitectura/` and `docs/dominio/` for detail.

## Commands

Run from the repo root (Node 22+, npm 10+):

- `npm install` — installs all workspaces
- `npm run seed` — populate SQLite with test data (idempotent, `INSERT OR IGNORE`); test password = the user's own email (e.g. `admin@resttek.com`)
- `npm run dev:api` — API on :3000 (`tsx watch`); health check at `/health` (no `/api/v1` prefix)
- `npm run dev:admin` (:4200), `npm run dev:empleados` (:4201), `npm run dev:clientes` (:4202) — each proxies `/api` to :3000
- `npm test` — Vitest, API only
- Single test: `cd packages/api && npx vitest run path/to/file.test.ts` (or `-t "name"`); watch: `npm run test:watch` in `packages/api`
- Frontend build: `npm run build -w @resttek/web-admin` (same for the others). No frontend test or lint scripts exist.

## Architecture

### API (`packages/api/src`) has two coexisting styles

- **Hexagonal + DDD only for `contexts/employee`** (domain / application use cases / infrastructure incl. http). `Employee` is the only rich entity (private constructor + `create()` factory); only `Email` and `Role` are value-object classes. Interfaces use the `I` prefix (`IEmployeeRepository`). `contexts/shared` holds `Email`, middlewares and `errorHandler`.
- **Layered for `restaurant`, `dish`, `ingredient`, `order`**: `models/` (plain interfaces + `normalizeX()` functions instead of value objects), `repositories/` (interface + Sqlite impl in the same file, no `I` prefix), `services/`, `controllers/`, `routes/`. Don't introduce DDD entities/use-cases here.
- Dependency wiring happens in the route files (`routes/*.ts`); employee wiring is in `contexts/employee/infrastructure/http/dependencies.ts`. Routers under `/restaurants/:restaurantId/...` need `Router({ mergeParams: true })`.
- Path aliases (`@models/*`, `@services/*`, `@employee/*`, `@shared/*`, etc., base `src`) and imports must end in `.js` (ESM, `nodenext`).
- DB: `config/database.ts` exports a single `dbConfig`; `:memory:` when `NODE_ENV=test`, otherwise `packages/api/resttek.db`. Tables are created by `CREATE TABLE IF NOT EXISTS` on `initialize()`; no migration tool. SQL aliases snake_case → camelCase.
- Errors: `AppError` subclasses in `errors/DomainErrors.ts`; `errorHandler` maps by class **name** (404 for `*NotFoundError` of employee/restaurant/ingredient/dish, 401 `InvalidCredentialsError`, else 400). Quirks: `OrderNotFoundError` isn't in the 404 list, and `OrderController` does its own try/catch instead of `next(error)`. `authenticate`/`authorize` respond directly.
- Orders: creating an order expands `quantity: n` into n `order_items` rows with quantity 1. Order routes use no `authorize()` (any authenticated user can change item status). `GET /orders/active` requires `?restaurantId=`.
- Tests are colocated unit tests with hand-written mocks (`*/mocks/`); there are no HTTP integration tests (supertest is installed but unused).

### Frontends

- Angular standalone components, signals, zoneless, functional guards/interceptors, lazy-loaded routes.
- `web-admin` and `web-empleados`: feature folders (`models/pages/services/store`). Stores are `providedIn: 'root'` services with private signals exposed via `asReadonly()`, wrapping HTTP Observables with `firstValueFrom`, with `loading`/`error` state.
- `web-clientes` differs: models/services in `core/`, only `CartStore` (local, no HTTP); components call services directly with `.subscribe()` and use `setInterval` polling (orders list 10s, detail 5s). No wildcard route.
- `web-shared` (`@resttek/web-shared`) holds auth (AuthStore/AuthService/authGuard), interceptors, login/register components, and `styles/base.css`. It is consumed straight from source (`main: src/index.ts`, no build), so **restart the frontend dev server after changing it**.
- `API_URL` token is provided in all apps, but only `web-clientes` and web-shared's AuthService inject it; `web-admin`/`web-empleados` services import `environment.apiUrl` (`/api/v1`) directly.
- Manager role string is `'manager'` (not `'gerente'`); roles: admin, manager, camarero, cocinero, cliente. Role-based menu filtering in web-empleados is UI-only; real authorization is in the API.

## Other

- `scripts/seed-issues.sh` creates GitHub issues from `scripts/issues.json` (needs `gh` and `jq`; see `scripts/README.md`).
- The directory is a git repository (default branch `main`). CodeGraph init previously failed here ("not a recognized project"); there is no `.codegraph/` index yet.
