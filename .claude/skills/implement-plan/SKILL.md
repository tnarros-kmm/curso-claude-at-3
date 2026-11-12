---
name: implement-plan
description: Dado el número o URL de una issue de GitHub, obtiene con gh el plan publicado como comentario (generado por plan-feature), crea un git worktree en .claude/worktrees (varios si trabajan varios agentes) con la rama issue/<num>-<breve-descripcion>, lo implementa con TDD estricto tarea a tarea (un commit por tarea con convcommit) y deja la PR creada para revisión. Úsala cuando el usuario pida implementar, ejecutar o desarrollar el plan de una issue.
argument-hint: <num-issue | url-issue>
disable-model-invocation: true
---

# implement-plan

Implementa, tarea a tarea, el plan que está como comentario de la issue indicada en `$ARGUMENTS` (número `42`, `#42` o URL `https://github.com/<owner>/<repo>/issues/42`), trabajando en un worktree aislado, y deja una PR lista para revisión.

## 1. Localizar el plan en la issue

- El usuario debe indicar el número o la URL de la issue. Si no lo ha hecho, pídeselo; no lo deduzcas. Con URL de otro repositorio, usa `--repo <owner>/<repo>` en todos los comandos `gh`.
- Comprueba `gh auth status`. Si falla, díselo al usuario y detente.
- Lee la issue y sus comentarios: `gh issue view <num-o-url> --json number,title,body,url,state,comments`.
- Identifica el comentario del plan: el que sigue la plantilla de `plan-feature` (secciones objetivo, alcance, archivos afectados, tareas `- [ ]` y criterios de aceptación). Si hay varios, usa el más reciente y menciónalo; si no hay ninguno, informa al usuario (sugiere ejecutar `plan-feature`) y detente. No inventes un plan.
- Extrae `<num-issue>`, el título y el plan. Lee también el `CLAUDE.md` del proyecto: respeta la arquitectura, los convenios de nombres y el estilo.
- Las tareas ya marcadas (`- [x]`) se saltan, de modo que el trabajo puede reanudarse.

## 2. Crear worktree(s) y rama

La rama es `issue/<num-issue>-<breve-descripcion>`, con `<breve-descripcion>` en kebab-case, minúsculas, sin tildes, 2-5 palabras derivadas del título de la issue (ej.: `issue/42-paginar-listado-platos`).

1. Comprueba `git status`; si hay cambios sin commitear relevantes, avisa al usuario. El árbol principal no se toca: todo el trabajo va en worktrees.
2. Elige la base: `develop` si existe (`git rev-parse --verify develop`), si no `main`. Haz `git fetch origin` antes.
3. Los worktrees viven en `.claude/worktrees/` (comprueba que está ignorado en `.gitignore`; si no, añádelo). Crea el principal:
   `git worktree add .claude/worktrees/issue-<num>-<desc> -b issue/<num>-<desc> <base>`
   Si la rama ya existe, usa `git worktree add .claude/worktrees/issue-<num>-<desc> issue/<num>-<desc>` y continúa (reanudar).
4. **Varios agentes**: si el plan tiene bloques de tareas independientes (archivos distintos, sin dependencias entre sí) y vas a repartirlos entre agentes, crea un worktree por agente con su propia rama derivada: `git worktree add .claude/worktrees/issue-<num>-<desc>-<parte> -b issue/<num>-<desc>-<parte> issue/<num>-<desc>`. Cada agente trabaja solo en su worktree; al terminar, integra sus ramas en `issue/<num>-<desc>` (merge, resolviendo conflictos) y elimina los worktrees auxiliares (`git worktree remove`). Si las tareas dependen unas de otras, usa un único worktree.
5. Dentro del worktree instala dependencias si hace falta (`npm install`) y trabaja siempre desde su ruta. Informa al usuario de las rutas, ramas y base.
6. Guarda el plan en el worktree como `plans/<num>-<desc>.md` (copia del comentario) para ir marcando tareas.

## 3. Implementar cada tarea con TDD estricto

Procesa las tareas pendientes **en orden, de una en una**. Para cada una:

1. **Rojo** — escribe primero el test (o los tests) que describe el comportamiento de la tarea, siguiendo la convención de `test/` del proyecto (`test/*.test.js`, `test/helpers.js`). Ejecútalo y **comprueba que falla por la razón correcta** (aserción no cumplida, no un error de sintaxis o import). No escribas código de producción antes de ver el test en rojo.
2. **Verde** — escribe el código mínimo necesario en `src/` para que el test pase, en la capa que indica el plan. Ejecuta el test y confirma que pasa.
3. **Refactor** — limpia sin cambiar el comportamiento y vuelve a ejecutar los tests.
4. Si la tarea no tiene comportamiento comprobable con un test (p. ej. actualizar `src/docs/openapi.js`), usa el test que la cubra (`test/openapi.test.js`): amplíalo primero para que falle y luego haz el cambio.
5. Ejecuta la suite completa (`npm test`) para detectar regresiones. Para iterar rápido usa un solo archivo: `DB_PATH=:memory: node --test test/<archivo>.test.js`.

Reglas:
- Nunca escribas código de producción sin un test fallido previo.
- Si un test pasa a la primera sin código nuevo, el test es insuficiente: corrígelo hasta que falle.
- No avances a la siguiente tarea mientras los tests de la actual no pasen. Si no logras que pasen tras un esfuerzo razonable, detente y explica el bloqueo al usuario; no marques la tarea ni hagas commit.
- No implementes nada fuera del alcance del plan.

## 4. Cerrar la tarea

Solo cuando los tests pasen:

1. **Documentación OpenAPI**: si la tarea ha cambiado algo de la API (endpoint, parámetro, body, respuesta, código de estado, esquema, categoría o rol), invoca la skill `update-openapi` para actualizar `src/docs/openapi.js` y regenerar `docs/openapi/openapi.yml` e `index.html`. Si la tarea solo actualiza `openapi.js`, ejecuta igualmente la skill para regenerar los archivos. Vuelve a ejecutar los tests tras el cambio.
2. Marca la tarea en el archivo del plan del worktree cambiando `- [ ]` por `- [x]` en esa tarea (y solo en esa).
3. Haz un commit para esta tarea invocando la skill `convcommit` (slash command `/convcommit`). El commit debe incluir el código, los tests, la documentación OpenAPI regenerada (si aplica) y el plan actualizado de esa tarea, y su mensaje debe describir la tarea (tipo adecuado: `feat`, `fix`, `test`, `docs`, `refactor`…).
4. Un commit por tarea: no agrupes varias tareas en un mismo commit.
5. Pasa a la siguiente tarea.

## 5. Finalizar

- Ejecuta `npm test` y confirma que todo pasa y la cobertura es ≥ 80 %.
- Ejecuta la skill `update-openapi` una última vez para garantizar que `docs/openapi/` está sincronizado con la API. Si genera cambios pendientes, haz un commit adicional con `convcommit` (`docs(openapi): ...`).
- Revisa los criterios de aceptación del plan y verifica cada uno.

## 5b. Publicar y dejar la PR creada

1. Comprueba que el árbol del worktree está limpio y haz `git push -u origin issue/<num>-<desc>`.
2. Crea la PR **sin mergearla**, contra la base elegida:
   `gh pr create --base <base> --head issue/<num>-<desc> --title "<tipo>(<ámbito>): <descripción>" --body-file <archivo>`
   El cuerpo (en español) incluye: resumen, lista de tareas completadas, resultado de `npm test`, desviaciones o dudas abiertas, `Closes #<num>` y el pie `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Si procede, añádela como borrador con `--draft` solo si quedan tareas pendientes.
3. No uses `gh pr merge` ni actives auto-merge: la PR debe revisarla otra persona antes de mergearse. Si se puede, solicita revisión (`--reviewer`) solo si el usuario indicó a quién.
4. Deja el worktree en su sitio hasta que se mergee la PR; no lo borres.
5. Responde con: URL de la PR, rama y worktree(s), tareas completadas, resultado de `npm test` y cualquier pendiente o desviación del plan.

## 6. Notificar en Slack

Siempre al terminar (también si te has detenido por un bloqueo), envía un informe resumido al canal `curso-claude-ed3` (ID `C0CGZ01R9M2`) con la herramienta MCP `slack_post_message` (cárgala con ToolSearch si hace falta). Usa directamente ese ID como `channel_id`: no llames a `slack_list_channels` ni hagas consultas previas, para ahorrar llamadas a la API de Slack.

- El mensaje debe resaltar el autor en negrita de Slack: `*tnarros*`.
- Contenido (breve, en español): autor (`*tnarros*`), skill ejecutada (`implement-plan`), issue y plan implementado, rama utilizada, URL de la PR, tareas completadas / total, resultado de `npm test` (pasa o falla, cobertura) y tareas pendientes o desviaciones.
- Ejemplo: `✅ *tnarros* ha implementado *#15 middleware errores* en issue/15-middleware-errores: 8/8 tareas, npm test OK (cobertura 91 %), PR <url>. Sin pendientes.`
- Si el envío falla, indícalo al usuario en la respuesta; no reintentes en bucle.
