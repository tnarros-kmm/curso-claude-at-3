# 5 - Gestión de mesas

- **Issue:** #5
- **Tipo:** Funcionalidad
- **Fecha:** 2026-11-12

## Objetivo

Que cada restaurante tenga sus mesas modeladas (número, descripción, capacidad y estado) para que el administrador las gestione, los empleados controlen la ocupación de la sala y vean los pedidos de cada mesa ocupada, y el cliente, antes de pedir, elija una mesa libre adecuada a su número de comensales y quede sentado en ella.

## Alcance

**Incluido**
- API (estilo por capas, como `ingredient`): tabla `tables`, modelo + `normalizeTable()`, repositorio, servicio, controlador y rutas bajo `/api/v1/restaurants/:restaurantId/tables`.
  - CRUD para `admin` (`POST`, `PUT`, `DELETE`); lectura para `admin`, `manager`, `camarero`, `cocinero`.
  - `PATCH /:id/status` para empleados (`admin`, `manager`, `camarero`) con estados `libre | ocupada | reservada`.
  - `GET /available?people=n` (cualquier usuario autenticado, incl. `cliente`): mesas `libre` con `capacity >= n`, ordenadas por capacidad.
  - `POST /:id/occupy` (rol `cliente`): pasa la mesa de `libre` a `ocupada` de forma atómica (`UPDATE ... WHERE status = 'libre'`); error si ya no está libre.
  - Errores nuevos (`TableNotFoundError` → 404, `TableNumberRequiredError`, `InvalidCapacityError`, `InvalidTableStatusError`, `DuplicatedTableNumberError`, `TableNotAvailableError` → 400).
  - Número de mesa único por restaurante.
- Seed: varias mesas de distintas capacidades por restaurante.
- web-admin: feature `tables` (listado, formulario crear/editar, borrar) enlazada desde el dashboard del restaurante.
- web-empleados: página `mesas` con el estado de cada mesa, selector para cambiarlo y, para las ocupadas, sus pedidos activos (reutilizando `GET /orders/active` agrupado por `tableId`). Entrada en el menú.
- web-clientes: tras elegir restaurante, pantalla de selección (nº de personas → mesas disponibles → "Continuar") que ocupa la mesa, la guarda en `CartStore` y navega a la carta; el pedido se envía con ese `tableId`.

**Fuera de alcance**
- Gestión de reservas con fecha/hora (solo existe el estado `reservada`, fijado manualmente).
- Liberación automática de la mesa al pagar/cerrar el pedido (la liberan los empleados cambiando el estado).
- Unir mesas o asignar varias mesas a un grupo grande.
- Plano visual de la sala, WebSockets/tiempo real (se mantiene polling).
- Tests de frontend (no existe infraestructura) y tests HTTP de integración.

## Archivos afectados

| Archivo | Acción | Motivo |
|---------|--------|--------|
| `packages/api/src/config/database.ts` | modificar | `CREATE TABLE IF NOT EXISTS tables` (+ `UNIQUE(restaurant_id, number)`) |
| `packages/api/src/models/table.model.ts` | nuevo | Interfaz `Table`, tipo `TableStatus`, `normalizeTable()` |
| `packages/api/src/models/table.model.test.ts` | nuevo | Tests de validación |
| `packages/api/src/errors/DomainErrors.ts` | modificar | Errores de mesa |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | modificar | `TableNotFoundError` → 404 |
| `packages/api/src/repositories/table.repository.ts` | nuevo | `TableRepository` + `SqliteTableRepository` |
| `packages/api/src/repositories/table.repository.test.ts` | nuevo | Tests contra SQLite `:memory:` |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | nuevo | Mock para tests del servicio |
| `packages/api/src/services/table.service.ts` | nuevo | Reglas: CRUD, cambio de estado, disponibles, ocupar |
| `packages/api/src/services/table.service.test.ts` | nuevo | Tests del servicio |
| `packages/api/src/controllers/table.controller.ts` | nuevo | Handlers + `toJSON` |
| `packages/api/src/routes/table.routes.ts` | nuevo | Wiring y `authorize()` por rol, `mergeParams: true` |
| `packages/api/src/app.ts` | modificar | Montar `/api/v1/restaurants/:restaurantId/tables` |
| `packages/api/src/scripts/seed.ts` | modificar | Mesas de prueba |
| `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md` | modificar | Documentar entidad Mesa |
| `packages/web-admin/src/app/features/tables/**` | nuevo | models, service, store, pages (list, form), `tables.routes.ts` |
| `packages/web-admin/src/app/app.routes.ts` | modificar | Ruta `restaurants/:restaurantId/tables` |
| `packages/web-admin/src/app/features/restaurants/pages/restaurant-dashboard/*` | modificar | Enlace a "Mesas" |
| `packages/web-empleados/src/app/features/tables/**` | nuevo | model, service, store, página `mesas` |
| `packages/web-empleados/src/app/app.routes.ts` | modificar | Ruta `mesas` |
| `packages/web-empleados/src/app/core/layout/shell.component.html` | modificar | Entrada de menú "Mesas" |
| `packages/web-clientes/src/app/core/models/table.model.ts` | nuevo | Interfaz `Table` |
| `packages/web-clientes/src/app/core/services/table.service.ts` | nuevo | `getAvailable()`, `occupy()` |
| `packages/web-clientes/src/app/features/tables/table-selection.component.ts` | nuevo | Nº de personas + selección de mesa |
| `packages/web-clientes/src/app/app.routes.ts` | modificar | Ruta `restaurants/:id/table` |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | modificar | Enlazar a la selección de mesa en vez de a la carta |
| `packages/web-clientes/src/app/core/store/cart.store.ts` | modificar | Guardar `tableId` seleccionado |
| `packages/web-clientes/src/app/core/services/order.service.ts` | modificar | Enviar `tableId` real |
| `packages/web-clientes/src/app/features/cart/cart.component.ts` | modificar | Pasar `tableId` al crear pedido |

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos.

**API**
- [x] 1. Añadir `CREATE TABLE IF NOT EXISTS tables (id, restaurant_id, number INTEGER, description, capacity INTEGER, status TEXT DEFAULT 'libre', created_at, updated_at, UNIQUE(restaurant_id, number), FK restaurants)` en `config/database.ts` (5 min)
- [x] 2. Crear errores de mesa en `errors/DomainErrors.ts` y añadir `TableNotFoundError` a `NOT_FOUND_ERRORS` en `errorHandler.ts` (5 min)
- [x] 3. Crear `models/table.model.ts` con `Table`, `TableStatus`, `TABLE_STATUSES` y `normalizeTable()` (número > 0, capacidad entera > 0, estado válido, `restaurantId` requerido) (10 min)
- [x] 4. Tests de `normalizeTable()` en `models/table.model.test.ts` (5 min)
- [x] 5. `repositories/table.repository.ts`: interfaz `TableRepository` y `SqliteTableRepository` con `create`, `findById`, `findByRestaurantId` (alias snake_case → camelCase) (10 min)
- [x] 6. Añadir `update`, `delete`, `updateStatus`, `findAvailable(restaurantId, people)` y `occupyIfFree(id)` (devuelve `changes === 1`) al repositorio (10 min)
- [x] 7. Tests de `table.repository.test.ts` con `:memory:` (incluye número duplicado y `occupyIfFree` sobre mesa ya ocupada) (10 min)
- [x] 8. Crear `repositories/mocks/MockTableRepository.ts` (5 min)
- [x] 9. `services/table.service.ts`: `create`, `findByRestaurantId`, `findById`, `update`, `delete` (comprobando que la mesa pertenece al restaurante, duplicados → `DuplicatedTableNumberError`) (10 min)
- [x] 10. Añadir al servicio `changeStatus`, `findAvailable` (valida `people` entero > 0) y `occupy` (lanza `TableNotAvailableError` si no estaba libre) (10 min)
- [x] 11. Tests de `services/table.service.test.ts` (10 min)
- [x] 12. `controllers/table.controller.ts` con handlers flecha, `next(error)` y `toJSON` (10 min)
- [x] 13. `routes/table.routes.ts` (`Router({ mergeParams: true })`, `/available` y `/:id/occupy` antes de `/:id`, `authorize()` por rol) y montarlo en `app.ts` (5 min)
- [x] 14. Añadir mesas al seed en `scripts/seed.ts` (`INSERT OR IGNORE`) y probar manualmente con `curl` los endpoints (10 min)
- [x] 15. Actualizar `docs/dominio/modelo-datos.md` y `glosario.md` (5 min)

**web-admin**
- [x] 16. Crear `features/tables/models/table.model.ts` y `services/table.service.ts` (`environment.apiUrl`) (5 min)
- [x] 17. Crear `features/tables/store/table.store.ts` (signals, `loading`/`error`, `firstValueFrom`) (10 min)
- [x] 18. Crear `pages/table-list` (tabla con número, descripción, capacidad, estado y botones editar/borrar) (10 min)
- [x] 19. Crear `pages/table-form` (crear/editar con validación) (10 min)
- [x] 20. Crear `tables.routes.ts`, registrarlo en `app.routes.ts` y añadir enlace en el dashboard del restaurante; verificar con `npm run build -w @resttek/web-admin` (5 min)

**web-empleados**
- [x] 21. Crear `features/tables` (model, service con `getAll` y `updateStatus`, store con polling) (10 min)
- [x] 22. Crear página `mesas` con tarjetas por mesa coloreadas por estado y selector de estado (10 min)
- [x] 23. Mostrar en cada mesa ocupada sus pedidos activos usando `OrderStore` filtrado por `tableId` (10 min)
- [x] 24. Añadir ruta `mesas` en `app.routes.ts` y entrada en `shell.component.html`; `npm run build -w @resttek/web-empleados` (5 min)

**web-clientes**
- [x] 25. Crear `core/models/table.model.ts` y `core/services/table.service.ts` (`getAvailable`, `occupy`) (5 min)
- [x] 26. Añadir `tableId`/`restaurantId` seleccionados a `CartStore` (5 min)
- [x] 27. Crear `features/tables/table-selection.component.ts`: input nº de personas, lista de mesas disponibles, botón "Continuar" que ocupa la mesa y navega a `/restaurants/:id`; manejo de error si la mesa deja de estar libre (10 min)
- [x] 28. Añadir ruta `restaurants/:id/table`, cambiar el enlace de `restaurant-list.component.ts` y redirigir a la selección si se entra a la carta sin mesa (5 min)
- [x] 29. Enviar `tableId` del `CartStore` en `order.service.ts`/`cart.component.ts`; `npm run build -w @resttek/web-clientes` (5 min)

**Cierre**
- [ ] 30. Ejecutar `npm test` y verificar cobertura ≥ 80 % (5 min)

## Criterios de aceptación

- [ ] Dado un admin, cuando crea/edita/borra una mesa en web-admin, entonces el cambio se refleja en el listado y la API valida número único por restaurante, capacidad > 0 y estado válido.
- [ ] Dado un usuario sin rol admin, cuando intenta `POST/PUT/DELETE` sobre mesas, entonces recibe 403.
- [ ] Dado un cliente que elige restaurante e indica 4 personas, cuando se cargan las mesas, entonces solo ve mesas `libre` con capacidad ≥ 4.
- [ ] Dado un cliente que elige una mesa y pulsa "Continuar", entonces la mesa pasa a `ocupada`, se le lleva a la carta y su pedido se crea con ese `tableId`.
- [ ] Dado que otra persona ocupó la mesa entre medias, cuando el cliente pulsa "Continuar", entonces recibe un error (400 `TableNotAvailableError`) y se refresca la lista.
- [ ] Dado un empleado (camarero/manager), cuando abre "Mesas" en web-empleados, entonces ve el estado de todas las mesas, puede cambiarlo y ve los pedidos activos de las ocupadas.
- [ ] `GET` de una mesa inexistente devuelve 404.
- [ ] `npm test` pasa con cobertura ≥ 80 % (líneas, ramas, funciones).
- [ ] Documentación OpenAPI actualizada si existe en el repositorio (actualmente no hay `src/docs/openapi.js`).
- [ ] Los tres frontends compilan (`npm run build -w ...`) y no hay regresiones en los tests existentes.

## Notas y riesgos

- **Suposición:** el estado de la mesa lo libera manualmente un empleado; no hay vínculo automático pedido↔cierre de mesa.
- **Suposición:** la selección de mesa la hace el cliente desde la app (sin QR); `reservada` es un estado manual sin fecha.
- **Resuelto (comentario en la issue):** pueden cambiar el estado `admin`, `manager` y `camarero` (el `cocinero` solo lectura).
- **Riesgo:** condición de carrera al ocupar; se mitiga con `UPDATE ... WHERE status = 'libre'` comprobando `changes`.
- **Riesgo:** `orders.table_id` no tiene FK hacia `tables`; añadirla requiere recrear la tabla (no hay migraciones), por lo que se deja sin FK. La BD local existente no se ve afectada por el `CREATE TABLE IF NOT EXISTS` nuevo.
- `OrderController` hace su propio try/catch y `GET /orders/active` no filtra por mesa: el agrupado por mesa se hace en el frontend de empleados.
- No existe `src/docs/openapi.js` ni `docs/api/api-pagination.md` en el repo; si se adopta la skill `update-openapi`, ejecutarla tras la tarea 13.
