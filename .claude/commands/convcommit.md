---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [tipo(ámbito)] [descripción opcional]
allowed-tools: Bash(git rev-parse:*), Bash(git init:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

# Commit con Conventional Commits

Crea un commit que siga la especificación [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

Argumentos del usuario (opcionales): $ARGUMENTS

## Contexto

Todos los comandos llevan un valor de respaldo para que el contexto no falle si no hay repositorio o si aún no hay commits.

- ¿Es un repositorio git?: !`git rev-parse --is-inside-work-tree 2>/dev/null || echo "NO_GIT_REPO"`
- Estado del repositorio: !`git status --short 2>/dev/null || echo "(sin repositorio)"`
- Cambios en staging: !`git diff --cached 2>/dev/null || echo "(sin repositorio)"`
- Cambios sin stage: !`git diff 2>/dev/null || echo "(sin repositorio)"`
- Últimos commits (para seguir el estilo): !`git log --oneline -10 2>/dev/null || echo "(sin commits todavía)"`

## Formato

```
<tipo>[ámbito opcional][!]: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Tipos permitidos

- `feat`: nueva funcionalidad (MINOR en SemVer)
- `fix`: corrección de un error (PATCH en SemVer)
- `docs`: solo documentación
- `style`: formato, sin cambios de lógica (espacios, punto y coma, etc.)
- `refactor`: cambio de código que no corrige un error ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: sistema de build o dependencias (npm, etc.)
- `ci`: configuración de integración continua
- `chore`: tareas de mantenimiento que no tocan `src` ni tests
- `revert`: revierte un commit anterior

### Reglas

1. La descripción va en **minúsculas**, en imperativo, sin punto final y de **72 caracteres como máximo** en la primera línea.
2. El ámbito (opcional) es un sustantivo entre paréntesis que indica la zona afectada, p. ej. `feat(vendehumos):`, `fix(openapi):`, `test(categorias):`. Usa nombres de la arquitectura del proyecto (`routes`, `controllers`, `services`, `repositories`, `models`, `db`, `openapi`) o del recurso de dominio.
3. El cuerpo (opcional) se separa con una línea en blanco y explica el **qué y el porqué**, no el cómo.
4. Los cambios incompatibles se marcan con `!` tras el tipo/ámbito (`feat(api)!: ...`) y/o con un pie `BREAKING CHANGE: <descripción>`.
5. Los pies usan formato `Clave: valor` (p. ej. `Refs: #123`, `Closes: #45`).
6. Un commit = un cambio lógico. Si los cambios mezclan varios propósitos, propón dividirlos en varios commits.

## Pasos

0. **Comprobación del repositorio.** Si el contexto indica `NO_GIT_REPO`:
   1. Inicializa el repositorio con `git init` en la raíz del proyecto e informa al usuario.
   2. Vuelve a obtener el estado con `git status --short`, porque el contexto anterior ya no es válido.
   3. Antes de añadir nada, comprueba que existe un `.gitignore` que excluya al menos `node_modules/`, `data/*.db` y `.env`. Si falta, avisa al usuario y propón crearlo antes del primer commit.
   4. El primer commit de un repositorio nuevo suele ser `chore: commit inicial` (o `feat: ...` si describe una funcionalidad concreta).
1. Analiza el contexto. Si no hay cambios (ni en staging ni en el árbol de trabajo), informa al usuario y detente.
2. Si hay cambios en staging, commitea **solo** eso. Si no hay nada en staging, decide qué archivos relacionados añadir con `git add <archivos>` (nunca `git add -A` a ciegas; no incluyas secretos como `.env`, ni `data/*.db`).
3. Si el usuario indicó tipo/ámbito/descripción en `$ARGUMENTS`, respétalos; si no, infiérelos del diff.
4. Redacta el mensaje siguiendo el formato. Idioma: español, salvo que el historial reciente use inglés de forma consistente.
5. Crea el commit con `git commit` pasando el mensaje mediante HEREDOC y termina siempre el mensaje con la línea de atribución indicada en las instrucciones del sistema:

   ```bash
   git commit -m "$(cat <<'EOF'
   feat(vendehumos): añadir filtrado por categoría

   Permite filtrar el listado por el parámetro `categoria`.

   Co-Authored-By: <línea de atribución indicada en las instrucciones del sistema>
   EOF
   )"
   ```

6. Muestra el resultado con `git log -1 --stat` y resume al usuario el mensaje usado.

## Restricciones

- No hagas `git push`, no cambies la configuración de git y no uses `--no-verify` ni `--amend` salvo petición explícita.
- Si un hook de pre-commit falla, corrige el problema y crea un **nuevo** commit; no lo saltes.
- Si el tipo no está claro, elige el más específico; usa `chore` solo como último recurso.
