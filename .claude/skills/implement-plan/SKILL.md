---
name: implement-plan
description: Implementa un plan de usuario guardado en plans/ (generado por plan-feature) en una rama feature/<nombre-del-plan> creada desde develop (o main si no existe), aplicando TDD estricto tarea a tarea, marcando cada tarea como hecha en el plan y haciendo un commit por tarea con convcommit. Úsala cuando el usuario pida implementar, ejecutar o desarrollar un plan.
argument-hint: <ruta-o-nombre-del-plan>
disable-model-invocation: true
---

# implement-plan

Implementa, tarea a tarea, el plan indicado en `$ARGUMENTS` (ruta como `plans/JIRA-12-gremios-vendehumos.md`, o solo el nombre/número de issue).

## 1. Localizar el plan

- Resuelve `$ARGUMENTS` a un archivo de `plans/`. Si es un número de issue o un nombre parcial, busca `plans/*<valor>*.md`.
- Si no hay coincidencia o hay varias, pregunta al usuario cuál usar. No continúes sin un plan único.
- Lee el plan completo (objetivo, alcance, archivos afectados, tareas, criterios de aceptación) y el `CLAUDE.md` del proyecto: respeta la arquitectura por capas, los convenios de nombres y el estilo.
- Identifica las tareas pendientes (`- [ ]`). Las ya marcadas (`- [x]`) se saltan, de modo que el plan puede reanudarse.

## 2. Crear la rama

El nombre de la rama es `feature/<nombre-del-plan>`, donde `<nombre-del-plan>` es el nombre del archivo sin carpeta ni extensión `.md` (ej.: `plans/JIRA-12-gremios-vendehumos.md` → `feature/JIRA-12-gremios-vendehumos`).

1. Comprueba el estado con `git status`. Si hay cambios sin commitear que no sean el propio plan o archivos no relacionados, avisa al usuario antes de cambiar de rama.
2. Si la rama ya existe (`git rev-parse --verify feature/<nombre>`), haz checkout a ella y continúa; no la recrees.
3. Si no existe, elige la base:
   - Si existe `develop` (`git rev-parse --verify develop`), crea la rama desde `develop`.
   - Si no, créala desde `main`.
   - Comando: `git checkout -b feature/<nombre> <base>`.
4. Informa al usuario de la rama creada y de su base.

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
2. Marca la tarea en el archivo del plan cambiando `- [ ]` por `- [x]` en esa tarea (y solo en esa).
3. Haz un commit para esta tarea invocando la skill `convcommit` (slash command `/convcommit`). El commit debe incluir el código, los tests, la documentación OpenAPI regenerada (si aplica) y el plan actualizado de esa tarea, y su mensaje debe describir la tarea (tipo adecuado: `feat`, `fix`, `test`, `docs`, `refactor`…).
4. Un commit por tarea: no agrupes varias tareas en un mismo commit.
5. Pasa a la siguiente tarea.

## 5. Finalizar

- Ejecuta `npm test` y confirma que todo pasa y la cobertura es ≥ 80 %.
- Ejecuta la skill `update-openapi` una última vez para garantizar que `docs/openapi/` está sincronizado con la API. Si genera cambios pendientes, haz un commit adicional con `convcommit` (`docs(openapi): ...`).
- Revisa los criterios de aceptación del plan y verifica cada uno.
- Responde con: rama utilizada, tareas completadas, resultado de `npm test` y cualquier tarea pendiente o desviación del plan.
- No hagas push ni abras PR salvo que el usuario lo pida.

## 6. Notificar en Slack

Siempre al terminar (también si te has detenido por un bloqueo), envía un informe resumido al canal `curso-claude-ed3` (ID `C0CGZ01R9M2`) con la herramienta MCP `slack_post_message` (cárgala con ToolSearch si hace falta). Usa directamente ese ID como `channel_id`: no llames a `slack_list_channels` ni hagas consultas previas, para ahorrar llamadas a la API de Slack.

- El mensaje debe resaltar el autor en negrita de Slack: `*tnarros*`.
- Contenido (breve, en español): autor (`*tnarros*`), skill ejecutada (`implement-plan`), plan implementado, rama utilizada, tareas completadas / total, resultado de `npm test` (pasa o falla, cobertura) y tareas pendientes o desviaciones.
- Ejemplo: `✅ *tnarros* ha implementado *JIRA-15-middleware-errores* en feature/JIRA-15-middleware-errores: 8/8 tareas, npm test OK (cobertura 91 %). Sin pendientes.`
- Si el envío falla, indícalo al usuario en la respuesta; no reintentes en bucle.
