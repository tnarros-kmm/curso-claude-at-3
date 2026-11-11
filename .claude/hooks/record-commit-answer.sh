#!/usr/bin/env bash
# PostToolUse (AskUserQuestion): registra la respuesta del usuario a la pregunta
# con header "Commit" para que confirm-commit.sh la consulte.

input=$(cat)
session=$(printf '%s' "$input" | jq -r '.session_id // "nosession"')
state="${TMPDIR:-/tmp}/claude-commit-gate/$session"
mkdir -p "$state"
approved="$state/approved"
touch "$approved"

ACCEPT='Sí, es válido'
REJECT='No, cancelar'

answers=$(printf '%s' "$input" | jq -r '
  .tool_response as $r
  | [$r.questions[]? | select(.header == "Commit") | .question] as $qs
  | ($r.answers // {}) | to_entries[]
  | select(.key as $k | $qs | index($k))
  | .value')

[ -z "$answers" ] && exit 0

while IFS= read -r answer; do
  answer="${answer#"${answer%%[![:space:]]*}"}"
  answer="${answer%"${answer##*[![:space:]]}"}"
  if [ "$answer" = "$ACCEPT" ]; then
    if [ -s "$state/pending" ]; then
      echo "CMD $(cat "$state/pending")" >> "$approved"
    fi
  elif [ "$answer" = "$REJECT" ]; then
    : # rechazado sin alternativa: no se aprueba nada
  elif [ "${#answer}" -ge 5 ]; then
    # otro mensaje propuesto por el usuario (saltos de línea escapados)
    echo "MSG ${answer//$'\n'/\\n}" >> "$approved"
  fi
done <<< "$answers"

rm -f "$state/pending"
exit 0
