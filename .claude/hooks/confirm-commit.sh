#!/usr/bin/env bash
# PreToolUse (Bash): bloqueo duro de `git commit` hasta que el usuario valide el
# mensaje con AskUserQuestion. El veredicto lo registra record-commit-answer.sh
# (PostToolUse de AskUserQuestion), no Claude. Sin aprobación -> exit 2.

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
session=$(printf '%s' "$input" | jq -r '.session_id // "nosession"')
state="${TMPDIR:-/tmp}/claude-commit-gate/$session"

# Impedir que Claude falsifique la aprobación escribiendo en el estado
if printf '%s' "$command" | grep -q 'claude-commit-gate'; then
  echo 'Bloqueado: no se puede tocar el estado de aprobación de commits.' >&2
  exit 2
fi

# Solo actuar sobre `git commit` (también dentro de cadenas con && ; |)
if ! printf '%s' "$command" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(-[^[:space:]]+[[:space:]]+)*commit([[:space:]]|$)'; then
  exit 0
fi

mkdir -p "$state"
approved="$state/approved"
touch "$approved"
sha=$(printf '%s' "$command" | sha256sum | cut -d' ' -f1)

consume() { # $1 = línea exacta a borrar de approved
  grep -vxF -- "$1" "$approved" > "$approved.tmp"; mv "$approved.tmp" "$approved"
}

# 1) El usuario aceptó el mensaje de ESTE comando
if grep -qxF "CMD $sha" "$approved"; then
  consume "CMD $sha"
  exit 0
fi

# 2) El usuario propuso otro mensaje y el comando lo usa literalmente
while IFS= read -r line; do
  case "$line" in
    "MSG "*)
      text="${line#MSG }"
      text="${text//\\n/$'\n'}"
      if [ -n "$text" ] && printf '%s' "$command" | grep -qF -- "$text"; then
        consume "$line"
        exit 0
      fi ;;
  esac
done < "$approved"

# 3) Sin aprobación: registrar como pendiente y bloquear
printf '%s' "$sha" > "$state/pending"
cat >&2 <<'MSG'
COMMIT BLOQUEADO: el usuario aún no ha validado el mensaje.
1. Pregunta con la herramienta AskUserQuestion, con header "Commit", mostrando el mensaje completo y exactamente estas dos opciones: "Sí, es válido" y "No, cancelar" (el usuario puede además escribir otro mensaje con "Other").
2. Si acepta, repite EXACTAMENTE el mismo comando.
3. Si escribe otro mensaje, haz el commit con ese mensaje literal.
4. Si rechaza y no propone otro mensaje, NO hagas el commit.
MSG
exit 2
