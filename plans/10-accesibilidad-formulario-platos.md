# 10 - Accesibilizar el formulario de platos

- **Issue:** #10
- **Tipo:** Funcionalidad
- **Fecha:** 2026-11-05

## Objetivo

Que el formulario de creación/edición de platos de `web-admin` cumpla WCAG 2.2 nivel AA y pueda completarse y enviarse solo con el teclado, con orden de tabulación lógico, foco visible y errores anunciados a tecnologías de apoyo. La mejora queda demostrada con tests unitarios (Vitest), una validación automática con axe y un vídeo e2e (Playwright) navegando solo con teclado.

## Alcance

**Incluido**
- Marcado semántico del formulario `dish-form` (`<form>`, `<label for>`, `<h1>`, `<fieldset>/<legend>`, `<button>`, `aria-*`).
- Validación cliente mínima (nombre obligatorio, precio > 0) con mensajes de error accesibles y foco en el primer campo inválido.
- Foco visible (`:focus-visible`) en los controles del formulario.
- Configuración de Vitest (tests unitarios de Angular) en `web-admin`.
- Configuración de Playwright, test e2e con `@axe-core/playwright` y test e2e con grabación de vídeo guardado en `e2e-videos/`.

**Fuera de alcance**
- Accesibilizar `dish-list` y el resto de páginas de `web-admin`, `web-empleados` y `web-clientes`.
- Cambios en la API (la validación servidor ya existe).
- Tests unitarios del resto de componentes de `web-admin`.
- Integración de Playwright en CI.

## Archivos afectados

| Archivo | Acción | Motivo |
|---------|--------|--------|
| `packages/web-admin/package.json` | modificar | Dependencias `vitest`, `jsdom`, `@playwright/test`, `@axe-core/playwright`; scripts `test`, `test:coverage`, `e2e` |
| `packages/web-admin/angular.json` | modificar | Target `test` (`@angular/build:unit-test`, runner vitest) |
| `package.json` (raíz) | modificar | Scripts `test:admin` y `e2e:admin` (el `npm test` actual solo cubre la API) |
| `packages/web-admin/playwright.config.ts` | nuevo | Config Playwright: `webServer` (API + admin), vídeo, proyecto chromium |
| `packages/web-admin/e2e/dish-form.a11y.spec.ts` | nuevo | Validación axe del formulario |
| `packages/web-admin/e2e/dish-form.keyboard.spec.ts` | nuevo | Flujo solo teclado + grabación de vídeo |
| `packages/web-admin/e2e/helpers/login.ts` | nuevo | Login (storageState) con usuario seed `admin@resttek.com` |
| `packages/web-admin/e2e-videos/` | nuevo | Carpeta de salida del vídeo (`dish-form-keyboard.webm`) |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html` | modificar | Semántica y atributos ARIA |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` | modificar | Validación, errores, gestión de foco, mensajes en vivo |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.css` | modificar | Estilos de error y foco visible |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.spec.ts` | nuevo | Tests unitarios del componente |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.validation.ts` | nuevo | Función pura `validateDish()` |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.validation.spec.ts` | nuevo | Tests de la validación |
| `packages/web-admin/src/styles.css` | modificar | Foco visible global (hoy `.form-control:focus` quita el outline) |
| `.gitignore` / `packages/web-admin/.gitignore` | modificar | Ignorar `test-results/` y `playwright-report/` (no `e2e-videos/`) |

No aplica `src/docs/openapi.js`: no cambia ningún endpoint.

## Tareas

> Cada tarea debe poder completarse en 5-10 minutos. TDD: en cada tarea primero se escribe el test unitario (rojo), luego el código (verde). Los tests e2e (Playwright) no son unitarios y se listan aparte (tareas 15-17).

- [x] 1. Configurar Vitest en `web-admin`: añadir `vitest` y `jsdom` en `package.json`, target `test` en `angular.json` y script `npm run test -w @resttek/web-admin`. **Test:** spec de humo `src/app/smoke.spec.ts` (`expect(true).toBe(true)`) que ejecute en verde. (10 min)
- [x] 2. Crear el arnés de test de `DishFormComponent` en `dish-form.component.spec.ts`: `TestBed` con mocks de `DishStore`, `DishService`, `IngredientStore` y `ActivatedRoute` (`restaurantId = rest-1`), helper `render()`. **Test:** "se crea el componente y muestra 'Nuevo plato'". (10 min)
- [x] 3. Etiquetas asociadas a cada campo en `dish-form.component.html` (`<label for>` + `id` en nombre, precio, categoría, disponible, descripción, ingrediente y cantidad; sustituir `div.fake-label`). **Tests:** `getByLabelText`/`label[for]` resuelve cada control; cada control tiene `id` único. (10 min)
- [x] 4. Estructura de encabezados y agrupación: `div.fake-title` → `<h1>`, `div.fake-subtitle` → `<legend>` dentro de `<fieldset>` para ingredientes. **Tests:** existe un único `h1` con el texto del título (nuevo/editar); el fieldset de ingredientes tiene `legend` "Ingredientes del plato". (5 min)
- [x] 5. Enlace "volver" e iconos: `aria-label="Volver a la lista de platos"` en `.back-link` y `aria-hidden="true"` en los `lucide-icon` decorativos. **Tests:** el enlace tiene nombre accesible; ningún icono decorativo es accesible. (5 min)
- [x] 6. Acciones con elementos nativos: envolver en `<form (ngSubmit)="onSubmit()" novalidate>`, "Guardar" como `<button type="submit">` y "Cancelar" como `<a routerLink>` (no `div`). **Tests:** `form` presente; Guardar es `button[type=submit]`; submit del form llama a `onSubmit`; Cancelar es un `a` con `href` a la lista. (10 min)
- [x] 7. Añadir ingrediente accesible: `div.btn` → `<button type="button" aria-label="Añadir ingrediente">`, y Enter en cantidad ejecuta `addIngredient()` sin enviar el formulario. **Tests:** el botón es focusable y añade; Enter en cantidad añade y no dispara `onSubmit`; no duplica ingredientes. (10 min)
- [x] 8. Quitar ingrediente accesible: `div.chip-remove` → `<button type="button" aria-label="Quitar {{nombre}}">` y lista semántica (`ul/li`). **Tests:** cada chip tiene botón con nombre "Quitar X"; al pulsar Enter/Espacio/click se elimina. (10 min)
- [x] 9. Crear `dish-form.validation.ts` con `validateDish(form)` que devuelve `{ name?: string; price?: string }` (nombre vacío/espacios → "El nombre es obligatorio"; precio ≤ 0 o NaN → "El precio debe ser mayor que 0"). **Tests** en `dish-form.validation.spec.ts`: válido, nombre vacío, solo espacios, precio 0, precio negativo, precio nulo, ambos errores. (10 min)
- [x] 10. Integrar validación en `onSubmit()` (`dish-form.component.ts`): signal `fieldErrors`; si hay errores no se llama al store ni se navega. **Tests:** envío vacío no llama a `store.create`; con datos válidos sí y navega a la lista; los errores se limpian al corregir. (10 min)
- [x] 11. Mostrar errores por campo en el HTML: `<p id="name-error" class="field-error">`, `aria-invalid`, `aria-describedby` y marca de obligatorio (`aria-required` + texto "(obligatorio)"). **Tests:** tras envío incompleto `aria-invalid="true"` y `aria-describedby` apunta a un nodo con el mensaje; sin error no hay `aria-invalid`. (10 min)
- [x] 12. Resumen de errores y foco: contenedor `role="alert"` con enlaces a los campos inválidos y mover el foco al primer campo inválido tras un envío fallido. **Tests:** `document.activeElement` es el campo nombre cuando falta el nombre, o el precio si solo falta el precio; el resumen lista los errores; el `error()` de API se muestra con `role="alert"`. (10 min)
- [x] 13. Gestión de foco y anuncios en ingredientes: región `aria-live="polite"` ("Ingrediente X añadido/eliminado"); tras añadir el foco vuelve al select de ingrediente, tras quitar pasa al select (o al botón del siguiente chip). **Tests:** el texto de la región cambia al añadir/quitar; el foco queda en el elemento esperado. (10 min)
- [x] 14. Estado de guardado accesible: botón Guardar `disabled`/`aria-busy` mientras `loading()` y texto "Guardando..." en región `role="status"`; en edición, el botón no queda atascado. **Tests:** con `loading=true` el botón tiene `aria-busy="true"` y no admite doble envío; vuelve a habilitarse tras error de API. (5 min)
- [x] 15. Foco visible (WCAG 2.4.7/2.4.11): en `styles.css` y `dish-form.component.css`, `:focus-visible` con outline ≥ 2 px y contraste ≥ 3:1 en `.form-control`, botones y enlaces; eliminar `outline: none` sin sustituto. **Test unitario:** comprobar con `getComputedStyle` que el CSS del componente no deja `outline-style: none` en `:focus-visible` (si jsdom no lo soporta, se valida en axe/e2e y se documenta). (5 min)
- [x] 16. Playwright + axe: instalar `@playwright/test` y `@axe-core/playwright`, `npx playwright install chromium`, crear `playwright.config.ts` (`webServer` para API :3000 con seed y admin :4200, `use.video`, `outputDir`), `e2e/helpers/login.ts` y script `e2e`. Verificación: `npx playwright test --list` lista los tests. *(sin test unitario: es infraestructura e2e)* (10 min)
- [x] 17. E2E axe `e2e/dish-form.a11y.spec.ts`: abrir `/restaurants/rest-1/dishes/new`, `AxeBuilder.withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()` y esperar `violations` vacío; repetir con el formulario en estado de error y en edición. (10 min)
- [x] 18. E2E con vídeo `e2e/dish-form.keyboard.spec.ts` (contexto con `recordVideo`, `slowMo`/pausas cortas), **solo `keyboard.press/type`, sin ratón**: entrar al formulario con Tab/Enter desde la lista; rellenar y modificar datos; añadir y quitar ingredientes; Guardar incompleto → errores visibles; corregir; Guardar → vuelve a la lista y el plato aparece. Guardar el vídeo con `page.video().saveAs('e2e-videos/dish-form-keyboard.webm')` en `afterEach`. (10 min)
- [ ] 19. Scripts raíz `test:admin` (Vitest con cobertura) y `e2e:admin`, ignorar `test-results/` y `playwright-report/`, verificar que existe `e2e-videos/dish-form-keyboard.webm` y que se reproduce. (5 min)
- [ ] 20. Ejecutar `npm test` (API) y `npm run test:admin` y verificar cobertura ≥ 80 % en `dish-form.component.ts` y `dish-form.validation.ts`; ejecutar `npm run e2e:admin` y `npm run build -w @resttek/web-admin` para comprobar que no hay regresiones (10 min)

## Criterios de aceptación

- [ ] Dado el formulario de nuevo plato, cuando se recorre con Tab, entonces el orden es: volver → nombre → precio → categoría → disponible → descripción → ingrediente → cantidad → añadir → (quitar de cada chip) → Cancelar → Guardar, y cada elemento tiene foco visible.
- [ ] Dado un campo del formulario, cuando un lector de pantalla lo enfoca, entonces anuncia su etiqueta, si es obligatorio y su error asociado (`label for`, `aria-required`, `aria-describedby`).
- [ ] Dado un envío con nombre vacío o precio ≤ 0, cuando se pulsa Guardar (Enter/Espacio), entonces no se llama a la API, se muestran los errores (`role="alert"`) y el foco va al primer campo inválido.
- [ ] Dado un ingrediente en la lista, cuando se pulsa su botón "Quitar X" o "Añadir ingrediente" con teclado, entonces se actualiza la lista y se anuncia el cambio en una región `aria-live`.
- [ ] Dado el formulario (nuevo, con errores y edición), cuando se ejecuta axe con etiquetas `wcag2a`, `wcag2aa` y `wcag22aa`, entonces no hay violaciones.
- [ ] Dado el test e2e de teclado, cuando termina, entonces existe `e2e-videos/dish-form-keyboard.webm` donde se ve, sin usar el ratón: modificar datos, añadir y quitar un ingrediente, envío incompleto con errores, creación correcta y el plato en la lista.
- [ ] Los tests unitarios de cada tarea se escribieron antes del código y pasan con Vitest.
- [ ] `npm test` y `npm run test:admin` pasan con cobertura ≥ 80 % (líneas, ramas, funciones) en los ficheros modificados.
- [ ] `src/docs/openapi.js` actualizado si cambia algún endpoint o esquema (no aplica: no hay cambios de API).
- [ ] Sin regresiones en los tests existentes de la API ni en el build de `web-admin`.

## Notas y riesgos

- El `npm test` raíz solo ejecuta Vitest de la API y `web-admin` no tiene hoy tests ni target `test`; por eso se añade `test:admin`. La cobertura ≥ 80 % se mide sobre el formulario de platos, no sobre todo `web-admin`.
- Angular 21 usa el builder `@angular/build:unit-test` con Vitest; `jsdom` no calcula bien estilos/foco visible, así que el contraste y `:focus-visible` se validan realmente con axe y el e2e.
- Playwright necesita descargar Chromium (`npx playwright install chromium`) y que API y admin estén en marcha; el login usa el usuario seed `admin@resttek.com` (contraseña = email). Hay que sembrar la BBDD antes del e2e y limpiar el plato creado para que sea repetible (la issue "Seed no borra datos previos" sigue pendiente, así que el test debe usar un nombre único o borrar el plato al final).
- Suposición: `e2e-videos/` se crea en `packages/web-admin/` (junto a la config de Playwright); se puede mover a la raíz del repo si se prefiere. Decidir si el vídeo se versiona (se deja fuera de `.gitignore`).
- El directorio no es repositorio git y CodeGraph no se puede inicializar aquí; la exploración se hizo con lectura directa de ficheros.
- Se asume que el ámbito de la issue es solo el formulario; `dish-list` también tiene `div`/botones sin nombre accesible (toggle, editar, borrar), que se pasan por el e2e pero quedan fuera.
- El e2e y su vídeo cubren el criterio de teclado; si la lista (punto de entrada y de salida del flujo) tuviera violaciones axe, el spec sólo analiza el formulario (`include('form')`).
