---
name: update-openapi
description: Mantiene sincronizada la documentación OpenAPI con la API y genera con Redocly el openapi.yml y la documentación HTML. Úsala cada vez que se añada, cambie o elimine un endpoint, parámetro, esquema, código de respuesta, categoría o rol, o cuando el usuario pida regenerar la documentación de la API.
---

# update-openapi

La spec `src/docs/openapi.js` se escribe **a mano** (no se genera de las rutas), así que hay que mantenerla alineada con el código. De ella se derivan `docs/openapi/openapi.yml` y `docs/openapi/index.html`.

## Pasos

1. **Detectar qué cambió en la API**: revisa `git diff` / `git status` de `src/routes/`, `src/controllers/`, `src/services/` y `src/models/` (rutas, métodos, params, query, body, validaciones, códigos de estado, DTOs).
2. **Actualizar `src/docs/openapi.js`** para reflejar cada cambio:
   - Paths y operaciones (`tags`, `summary`, `parameters`, `requestBody`, `responses` con `Error` para 400/401/403/404/409).
   - Esquemas en `components/schemas`; reutiliza `CATEGORIAS` y `ROLES` en vez de duplicar enums.
   - Nombres en snake_case en la API (propiedades, query params); la spec debe coincidir con los DTOs reales.
   - Elimina lo que ya no exista.
3. **Verificar la spec**: `DB_PATH=:memory: node --test test/openapi.test.js`. Si falla, corrige la spec (o el test si el cambio es legítimo).
4. **Generar la documentación**: ejecuta `bash .claude/skills/update-openapi/scripts/generate-docs.sh` (admite `--no-lint` para omitir la validación). El script:
   - exporta la spec de `openapi.js` a JSON temporal,
   - la convierte a `docs/openapi/openapi.yml` con `redocly bundle`,
   - la valida con `redocly lint`,
   - genera `docs/openapi/index.html` con `redocly build-docs`.
   Requiere `node` y acceso a red la primera vez (usa `npx @redocly/cli`). No edites `openapi.yml` ni `index.html` a mano: se sobrescriben.
5. **Si el lint da errores**, corrígelos en `openapi.js` y repite el paso 4. Los warnings se mencionan al usuario.
6. **Responder** con los endpoints/esquemas modificados en la spec y las rutas de los archivos generados. No hagas commit salvo que el usuario lo pida (usa entonces `convcommit`, p. ej. `docs(openapi): ...`).
