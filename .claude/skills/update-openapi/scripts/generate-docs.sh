#!/usr/bin/env bash
# Exporta la spec de src/docs/openapi.js a docs/openapi/openapi.yml,
# la valida con Redocly y genera docs/openapi/index.html.
# Uso: generate-docs.sh [--no-lint]
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUT_DIR="$ROOT/docs/openapi"
YML="$OUT_DIR/openapi.yml"
HTML="$OUT_DIR/index.html"
TMP_JSON="$(mktemp --suffix=.json)"
trap 'rm -f "$TMP_JSON"' EXIT

LINT=1
[[ "${1:-}" == "--no-lint" ]] && LINT=0

command -v node >/dev/null || { echo "ERROR: node no está instalado" >&2; exit 1; }
command -v npx >/dev/null || { echo "ERROR: npx no está instalado" >&2; exit 1; }

REDOCLY=(npx --yes @redocly/cli@latest)
mkdir -p "$OUT_DIR"
cd "$ROOT"

echo "==> 1/4 Exportando src/docs/openapi.js a JSON"
node -e "process.stdout.write(JSON.stringify(require('./src/docs/openapi'), null, 2))" > "$TMP_JSON"

echo "==> 2/4 Convirtiendo a $YML"
"${REDOCLY[@]}" bundle "$TMP_JSON" --output "$YML" >/dev/null

if [[ $LINT -eq 1 ]]; then
  echo "==> 3/4 Validando con Redocly"
  "${REDOCLY[@]}" lint "$YML" --extends minimal
else
  echo "==> 3/4 Validación omitida (--no-lint)"
fi

echo "==> 4/4 Generando HTML en $HTML"
"${REDOCLY[@]}" build-docs "$YML" --output "$HTML"

echo "Listo:"
echo "  $YML"
echo "  $HTML"
