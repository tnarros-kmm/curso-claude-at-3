---
name: plan-feature
description: Planifica una nueva funcionalidad o el arreglo de un error usando una plantilla común (objetivo, alcance, archivos afectados, tareas de 5-10 min y criterios de aceptación) y guarda el plan en plans/<num-issue>-<breve-descripcion>.md. Úsala cuando el usuario pida planificar, diseñar o preparar una feature, un bug o una issue antes de implementarla.
argument-hint: <num-issue> <descripción de la funcionalidad o error>
---

# plan-feature

Genera un plan de implementación con un formato uniforme para todo el equipo. **Solo planifica: no modifiques código de `src/` ni de `test/`.**

## Pasos

1. **Obtener datos de entrada** a partir de `$ARGUMENTS` o de la conversación:
   - Número de issue (`<num-issue>`). Si no se ha indicado, pregúntalo al usuario antes de continuar.
   - Descripción de la funcionalidad o del error. Si es un error, pide o localiza los pasos para reproducirlo y el comportamiento esperado.
2. **Explorar el código** antes de planificar:
   - Usa CodeGraph (`codegraph_explore`, o el CLI de solo lectura) antes que búsquedas amplias con Read/Glob/Grep, siguiendo las reglas de CodeGraph del `CLAUDE.md` global.
   - Lee `CLAUDE.md` del proyecto y respeta la arquitectura por capas (`routes → controllers → services → repositories → db`), los convenios de nombres (snake_case en la API, camelCase en funciones/parámetros) y el estilo.
   - Si la funcionalidad es un endpoint GET que devuelve listas, consulta `docs/api/api-pagination.md`.
   - Recuerda que `src/docs/openapi.js` se escribe a mano: si cambia un endpoint o esquema, debe aparecer como archivo afectado y tarea.
3. **Rellenar la plantilla** de [template.md](assets/template.md) respetando todas sus secciones y su orden. No añadas ni quites secciones.
4. **Guardar el plan** en `plans/<num-issue>-<breve-descripcion>.md`:
   - Crea la carpeta `plans/` si no existe.
   - `<breve-descripcion>` en minúsculas, kebab-case, sin tildes ni caracteres especiales, 2-5 palabras (ej.: `plans/42-paginar-listado-vendehumos.md`).
   - Si el archivo ya existe, muéstralo al usuario y pregunta antes de sobrescribirlo.
5. **Responder** con la ruta del archivo creado y un resumen de 2-3 líneas. Señala cualquier suposición o duda abierta.
6. **Notificar en Slack** (siempre, al terminar): envía un informe resumido al canal `curso-claude-ed3` (ID `C0CGZ01R9M2`) con la herramienta MCP `slack_post_message` (cárgala con ToolSearch si hace falta). Usa directamente ese ID como `channel_id`: no llames a `slack_list_channels` ni hagas consultas previas, para ahorrar llamadas a la API de Slack.
   - El mensaje debe resaltar el autor en negrita de Slack: `*tnarros*`.
   - Contenido (breve, en español): autor (`*tnarros*`), skill ejecutada (`plan-feature`), número de issue y título, ruta del plan creado, resumen de 2-3 líneas (objetivo y nº de tareas) y suposiciones o dudas abiertas, si las hay.
   - Ejemplo: `📝 *tnarros* ha planificado *JIRA-16 · paginar listado* → plans/JIRA-16-paginar-listado.md (8 tareas). Dudas abiertas: ninguna.`
   - Si el envío falla (canal no encontrado, error de la herramienta), indícalo al usuario en la respuesta; no reintentes en bucle.

## Reglas de calidad

- **Objetivo**: 1-3 frases, orientado al resultado de negocio/usuario, no a la implementación.
- **Alcance**: separa explícitamente lo que *entra* y lo que *queda fuera*.
- **Archivos afectados**: rutas reales del repositorio, indicando si se crean (`nuevo`), modifican (`modificar`) o eliminan, y un motivo breve. Incluye tests y OpenAPI cuando proceda.
- **Tareas**:
  - Checklist (`- [ ]`) numerada, en orden de ejecución.
  - Cada tarea es **independiente y abarcable en 5-10 minutos**; si es mayor, divídela. Indica la estimación entre paréntesis, p. ej. `(5 min)`.
  - Respeta el orden por capas y escribe los tests junto a cada cambio o inmediatamente después.
  - Incluye una tarea final para ejecutar `npm test` (cobertura ≥ 80 %).
  - Una tarea = una acción verificable, con el archivo concreto implicado.
- **Criterios de aceptación**: condiciones comprobables (idealmente formato Dado/Cuando/Entonces) que definen cuándo se da por terminado el trabajo. Incluye siempre: tests pasando con cobertura ≥ 80 %, OpenAPI actualizado si aplica y ausencia de regresiones.
- Escribe el plan en español.
