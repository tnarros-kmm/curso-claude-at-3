# Auditoria de seguridad de la API (OWASP Top 10 - 2021)

Alcance: `packages/api/src` (Express 5 + TypeScript + SQLite). Revision estatica de codigo, solo lectura. Fecha: 2026-11-12.

Nota: no existe indice CodeGraph (la inicializacion falla en este repo segun CLAUDE.md); se leyo el codigo directamente.

Puntos positivos: todas las consultas SQL usan parametros `?` (sin inyeccion SQL detectada); las contrasenas se hashean con bcrypt (10 rondas); el registro publico fuerza `role: 'cliente'`; las respuestas de empleados no exponen `passwordHash`; el 500 generico no filtra trazas.

---

## A01 - Control de acceso roto

### H-01 [CRITICA] IDOR / falta de aislamiento por restaurante (multi-tenant) en platos e ingredientes
- Archivos: `routes/dish.routes.ts:14-18`, `routes/ingredient.routes.ts:14-18`, `services/dish.service.ts:48-78`, `services/ingredient.service.ts:38-60`, `controllers/dish.controller.ts:35-66`
- Descripcion: `authorize()` solo comprueba el rol, nunca que `req.params.restaurantId` coincida con `req.user.restaurantId`. Ademas `findById/update/delete` buscan solo por `:id`, ignorando el `restaurantId` de la ruta.
- Impacto: un manager/camarero/cocinero del restaurante A puede listar, leer, modificar y borrar platos e ingredientes (precios, stock) del restaurante B, y crear platos en restaurantes ajenos.
- Recomendacion: middleware `authorizeRestaurant` que exija `user.role === 'admin' || user.restaurantId === req.params.restaurantId`; en servicios/repositorios filtrar con `WHERE id = ? AND restaurant_id = ?`.

### H-02 [CRITICA] Pedidos sin autorizacion ni propiedad del recurso
- Archivos: `routes/order.routes.ts:14-18`, `controllers/order.controller.ts:28-41, 57-68, 70-85`, `repositories/order.repository.ts:58-113`
- Descripcion: las rutas de pedidos solo usan `authenticate`. Cualquier usuario autenticado (incluido un `cliente` recien registrado) puede: `GET /orders/active?restaurantId=X` (todos los pedidos de cualquier restaurante), `GET /orders/:id` (pedido de cualquier cliente) y `PATCH /orders/:orderId/items/:itemId/status` (cambiar estado de cualquier item). No se comprueba `clientId` ni `restaurantId` del token.
- Impacto: fuga de datos de otros clientes (IDs, mesas, platos), manipulacion de la cocina/servicio, sabotaje de pedidos. Los IDs son UUID, pero `/active` los lista todos.
- Recomendacion: `authorize(['admin','manager','camarero','cocinero'])` en `/active` y `PATCH` con comprobacion de restaurante; en `GET /:id` permitir solo al `clientId` propietario o personal del mismo restaurante; en `PATCH` verificar que el item pertenece a un pedido del restaurante del usuario y restringir por rol/transicion de estado.

### H-03 [ALTA] Lectura de cualquier restaurante por cualquier usuario autenticado
- Archivo: `routes/restaurant.routes.ts:16`, `controllers/restaurant.controller.ts:25-32`
- Descripcion: `GET /restaurants/:id` solo requiere `authenticate`; no hay comprobacion de pertenencia (a diferencia de `getAll`, que si filtra).
- Impacto: inconsistencia de autorizacion; datos de contacto/propietario visibles. (Ya son publicos en `/public/restaurants`, ver H-12, por lo que el impacto adicional es bajo.)
- Recomendacion: aplicar la misma regla que `getAll` (admin o mismo `restaurantId`).

### H-04 [ALTA] Creacion de pedidos para restaurantes/mesas/platos arbitrarios sin validar pertenencia
- Archivos: `services/order.service.ts:21-51`, `repositories/order.repository.ts:44-56`
- Descripcion: `restaurantId`, `tableId` y `dishId` de los items se aceptan del cliente sin comprobar que existan, que el plato pertenezca al restaurante ni que este disponible (`available`). Solo la FK de SQLite frena parte de los casos (y devuelve 400 con el mensaje de error en bruto).
- Impacto: pedidos de platos no disponibles o de otro restaurante; datos incoherentes.
- Recomendacion: validar plato y restaurante en el servicio y usar el precio/estado del servidor.

### H-05 [BAJA] Empleados: rol/restaurante no restringidos para gerentes
- Archivos: `contexts/employee/infrastructure/http/employee.routes.ts:7-9`, `restaurant-employee.routes.ts:7`
- Descripcion: solo `admin` puede operar (correcto). Pero `listEmployeesByRestaurant` no verifica existencia del restaurante y `listEmployees` no limita `limit` (ver H-11). Sin hallazgo de escalada directa.
- Recomendacion: mantener restriccion; anadir limites de paginacion.

## A02 - Fallos criptograficos

### H-06 [CRITICA] Secreto JWT por defecto codificado en el codigo
- Archivos: `contexts/shared/infrastructure/http/middlewares.ts:4`, `contexts/employee/infrastructure/BcryptAuthService.ts:5`
- Descripcion: `process.env.JWT_SECRET || 'super-secret-resttek-key'`. Si la variable no esta definida (no hay `.env.example` ni validacion al arrancar) el servidor usa un secreto publico en el repositorio. El secreto esta duplicado en dos archivos.
- Impacto: cualquiera puede forjar un JWT `{id, role:'admin'}` y obtener control total de la API.
- Recomendacion: fallar al arrancar si `JWT_SECRET` falta o tiene menos de 32 bytes; centralizar la config en un unico modulo; fijar `algorithms: ['HS256']` en `jwt.verify` y anadir `issuer`/`audience`.

### H-07 [MEDIA] Tokens de 8 h sin revocacion ni refresh; rol embebido en el token
- Archivo: `BcryptAuthService.ts:17-19`, `middlewares.ts:25-26`
- Descripcion: el rol y `restaurantId` se confian del token sin consultar la BD; un empleado despedido o con rol cambiado mantiene acceso hasta 8 h. No hay logout ni lista de revocacion.
- Recomendacion: TTL corto (15-30 min) + refresh token rotatorio, o comprobar el empleado en BD en rutas sensibles.

### H-08 [BAJA] Sin cifrado en transito/cabeceras HSTS; BD SQLite sin cifrar en disco
- Archivos: `app.ts`, `config/database.ts:18`
- Descripcion: el servidor solo habla HTTP (se asume proxy TLS); `resttek.db` esta en texto plano (esta ignorada en `.gitignore`, bien).
- Recomendacion: documentar terminacion TLS obligatoria; HSTS via helmet.

## A03 - Inyeccion

### H-09 [INFO] Sin inyeccion SQL detectada
- Archivos: `repositories/*.ts`, `SqliteEmployeeRepository.ts`
- Todas las consultas usan placeholders. `findAll` construye SQL por concatenacion pero solo de fragmentos constantes (`WHERE role = ?`). Mantener la practica.

### H-10 [MEDIA] Falta de validacion de entrada (tipos, longitudes, rangos)
- Archivos: `controllers/*.ts`, `services/order.service.ts:27-29`, `services/dish.service.ts:100-108`, `EmployeeController.ts:38-39`
- Descripcion: se usa `req.body` sin esquema. Ejemplos: `quantity` en pedidos sin validar -> un valor como `1e9` genera un bucle que crea millones de filas (DoS) y valores negativos/no numericos producen 0 items; `price`/`currentStock` pueden ser strings/NaN; `logoUrl` acepta cualquier cadena (p. ej. `javascript:` o URL externa, riesgo de XSS almacenado en los frontends que la pinten en `src/href`); `notes`, `name`, `description` sin limite de longitud; contrasena sin politica de complejidad/longitud minima; el email no se normaliza (mayusculas -> cuentas duplicadas).
- Impacto: DoS, datos corruptos, XSS almacenado indirecto.
- Recomendacion: validar con zod/valibot en cada endpoint (tipos, enteros 1..N, longitudes maximas, `logoUrl` solo `https://`), limitar items por pedido, politica de contrasena (>=8-12 caracteres), `email.trim().toLowerCase()`.

### H-11 [MEDIA] Paginacion sin limite maximo
- Archivo: `EmployeeController.ts:38-39`
- Descripcion: `limit` arbitrario (`?limit=999999999`) y negativo (`-1` en SQLite = sin limite). Solo admin, por lo que el impacto es bajo-medio.
- Recomendacion: acotar `limit` a 1..100 y `offset >= 0`.

## A04 - Diseno inseguro

### H-12 [MEDIA] Endpoints publicos exponen datos de contacto y propietarios
- Archivos: `routes/restaurant.public.routes.ts:13-14`, `controllers/restaurant.controller.ts:54-61, 80-93`
- Descripcion: `/public/restaurants` y `/public/restaurants/:id` devuelven email, telefono, nombre y apellidos del propietario sin autenticacion.
- Impacto: recoleccion de datos personales (scraping, phishing, RGPD).
- Recomendacion: DTO publico reducido (id, nombre, direccion, logo).

### H-13 [MEDIA] Sin proteccion contra abuso/fuerza bruta (rate limiting)
- Archivos: `app.ts`, `auth.routes.ts:6-7`
- Descripcion: `/auth/login` y `/auth/register` sin limitador, sin bloqueo de cuentas ni CAPTCHA; contrasenas semilla iguales al email.
- Recomendacion: `express-rate-limit` (por IP y por email) en auth y en la creacion de pedidos; bloqueo progresivo.

### H-14 [MEDIA] Logica de negocio: cualquier usuario puede crear pedidos y la transicion de estados no se controla
- Archivos: `services/order.service.ts:69-84`, `models/order.model.ts:29-35`
- Descripcion: cualquier estado valido se acepta desde cualquier estado (p. ej. `entregado` -> `pendiente`) y por cualquier rol (cliente incluido). Sin limite de pedidos por cliente.
- Recomendacion: maquina de estados con transiciones permitidas por rol.

## A05 - Mala configuracion de seguridad

### H-15 [ALTA] CORS abierto a cualquier origen
- Archivo: `app.ts:16`
- Descripcion: `app.use(cors())` permite todos los origenes. La autenticacion es por cabecera Bearer (no cookies), lo que limita el riesgo CSRF, pero amplia la superficie si los tokens se exponen.
- Recomendacion: lista blanca de origenes via variable de entorno.

### H-16 [MEDIA] Sin cabeceras de seguridad (helmet), `x-powered-by` activo, sin limite de body explicito
- Archivo: `app.ts:14-17`
- Recomendacion: `helmet()`, `app.disable('x-powered-by')`, `express.json({ limit: '100kb' })`, `app.set('trust proxy', ...)` segun despliegue.

### H-17 [MEDIA] Credenciales de prueba predecibles y semilla con admin por defecto
- Archivo: `scripts/seed.ts:21-27, 51, 206-211`
- Descripcion: la contrasena de cada usuario es su email (`admin@resttek.com` / `admin@resttek.com`) y se imprime en consola. Nada impide ejecutar el seed en produccion.
- Recomendacion: bloquear el seed si `NODE_ENV=production`; contrasenas aleatorias o desde entorno.

### H-18 [BAJA] Mensajes de error internos devueltos al cliente en pedidos
- Archivo: `controllers/order.controller.ts:20-24, 78-84`
- Descripcion: se devuelve `error.message` de cualquier `Error` (incluidos errores SQLite como `SQLITE_CONSTRAINT: FOREIGN KEY...`) con 400. `OrderNotFoundError` no esta en la lista 404 del `errorHandler` (`errorHandler.ts:4-9`), y el controlador evita `next(error)`.
- Recomendacion: usar `next(error)`, mapear errores de dominio y devolver mensaje generico para errores no controlados.

## A06 - Componentes vulnerables y desactualizados

### H-19 [ALTA] Dependencias con vulnerabilidades conocidas (`npm audit --omit=dev`)
- Archivos: `packages/api/package.json`, `package-lock.json`
- Resultado: 18 vulnerabilidades (2 criticas, 11 altas). Relevantes para la API: `proxy-addr` (critica, transitiva de express), `body-parser` (alta, transitiva de express), `qs` (moderada), `sqlite3` y su cadena `tar`/`node-gyp`/`cacache` (critica/alta; afecta sobre todo a build-time). Los avisos de `@angular/*` corresponden a los frontends.
- Recomendacion: `npm audit fix` (revisar cambios), actualizar express a la ultima 5.x y sqlite3 (6.x, cambio mayor), anadir `npm audit` en CI y Dependabot.

## A07 - Fallos de identificacion y autenticacion

### H-20 [MEDIA] Enumeracion de usuarios y diferencia de tiempos en login/registro
- Archivos: `LoginUseCase.ts:28-38`, `RegisterClientUseCase.ts:33-36`, `errorHandler.ts`
- Descripcion: `/auth/register` revela si un email existe (`DuplicatedEmailError`). En `/auth/login` un email inexistente responde sin ejecutar bcrypt (mas rapido) -> enumeracion por tiempos.
- Recomendacion: comparar siempre contra un hash ficticio; respuesta generica en registro (o verificacion por email).

### H-21 [MEDIA] Sin politica de contrasenas, MFA ni cambio/recuperacion de contrasena
- Archivos: `RegisterClientUseCase.ts:38`, `CreateEmployeeUseCase.ts:28`
- Descripcion: cualquier contrasena (incluso vacia segun el cuerpo, o no-string -> excepcion) es aceptada; bcrypt con entradas no string da 500.
- Recomendacion: validar longitud minima/maxima (bcrypt trunca a 72 bytes), listas de contrasenas comunes, MFA para admin.

### H-22 [BAJA] `authenticate` acepta `req.user: any` sin validar la forma del payload
- Archivo: `middlewares.ts:6-8, 26`
- Recomendacion: tipar y validar (`id`, `role` dentro de los valores permitidos) tras `jwt.verify`.

## A08 - Fallos de integridad de software y datos

### H-23 [BAJA] Pipelines/CI y dependencias sin verificacion de integridad adicional; mass-assignment acotado
- Archivos: `.github/workflows` (Claude Code Review/PR Assistant segun historial), controllers
- Descripcion: los controladores copian campos explicitos (no hay mass-assignment general, bien). Se recomienda revisar permisos de los workflows de GitHub Actions y fijar acciones por SHA. No hay deserializacion insegura detectada.
- Recomendacion: pin de acciones, permisos minimos de `GITHUB_TOKEN`, `npm ci` en CI.

### H-24 [MEDIA] Integridad referencial y operaciones no atomicas
- Archivos: `dish.repository.ts:56-83`, `order.repository.ts:44-56`
- Descripcion: crear pedido/plato inserta cabecera e hijos en sentencias separadas sin transaccion; un fallo intermedio deja pedidos sin items o platos sin ingredientes. Un plato puede referenciar ingredientes de otro restaurante.
- Recomendacion: envolver en `BEGIN/COMMIT`; validar que los ingredientes pertenecen al mismo restaurante.

## A09 - Fallos de logging y monitorizacion

### H-25 [MEDIA] Sin registro de auditoria ni de eventos de seguridad
- Archivos: `app.ts`, `middlewares.ts:28-30`, `errorHandler.ts:15-33`
- Descripcion: no hay logger de peticiones; los login fallidos, 401/403, cambios de rol/creacion de empleados y errores 500 no se registran (el `errorHandler` traga el error original sin `console.error`). Los `catch` de `OrderController` descartan el error.
- Impacto: imposible detectar fuerza bruta, abuso o incidentes.
- Recomendacion: logger estructurado (pino) con request-id, registrar autenticacion fallida, denegaciones de autorizacion, acciones administrativas y excepciones (sin datos sensibles); alertas.

## A10 - SSRF

### H-26 [INFO/BAJA] Sin SSRF directo
- La API no realiza peticiones HTTP salientes con URLs del usuario. `logoUrl` solo se almacena (ver H-10 para XSS). Si en el futuro se descargan logos o se validan URLs en servidor, aplicar lista blanca y bloqueo de rangos internos.

---

## Resumen por severidad

| Severidad | Cantidad | Hallazgos |
|-----------|----------|-----------|
| Critica   | 3 | H-01 (IDOR platos/ingredientes), H-02 (pedidos sin autorizacion), H-06 (secreto JWT por defecto) |
| Alta      | 3 | H-03, H-04, H-15 (+ H-19 dependencias) -> total 4: H-03, H-04, H-15, H-19 |
| Media     | 11 | H-07, H-10, H-11, H-12, H-13, H-14, H-16, H-17, H-20, H-21, H-24, H-25 (12 en total) |
| Baja      | 6 | H-05, H-08, H-18, H-22, H-23, H-26 |
| Info      | 1 | H-09 (sin inyeccion SQL) |

Recuento corregido: Criticas 3, Altas 4, Medias 12, Bajas 6, Info 1 (26 hallazgos).

Prioridad sugerida: (1) H-06 secreto JWT obligatorio; (2) H-01/H-02/H-03/H-04 autorizacion por restaurante y propiedad; (3) H-10 validacion de entrada con esquema; (4) H-13/H-15/H-16 rate limit, CORS y helmet; (5) H-19 actualizar dependencias; (6) H-25 logging.
