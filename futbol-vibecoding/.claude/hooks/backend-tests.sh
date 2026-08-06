#!/bin/bash

# Anti-loop: si ya estamos en una continuación disparada por este hook, salir.
input=$(cat)
echo "$input" | grep -q '"stop_hook_active":true' && exit 0

BACKEND="$CLAUDE_PROJECT_DIR/backend"
[ -d "$BACKEND" ] || exit 0

# Solo actuar si se tocó el backend en esta sesión
git -C "$CLAUDE_PROJECT_DIR" diff --quiet HEAD -- backend/ && exit 0

cd "$BACKEND" || exit 0

# 1. ¿Hay rutas sin test?
missing=""
for route in src/routes/*.js; do
  [ -e "$route" ] || continue
  name=$(basename "$route" .js)
  [ -f "tests/$name.test.js" ] || missing="$missing $name"
done

if [ -n "$missing" ]; then
  echo "Faltan tests unitarios para las rutas:$missing" >&2
  echo "Creá backend/tests/<ruta>.test.js para cada una, con Vitest, cubriendo el caso feliz y al menos un error." >&2
  exit 2
fi

# 2. Corren?
output=$(npm test --silent 2>&1)
if [ $? -ne 0 ]; then
  echo "Los tests del backend fallan. Arreglalos antes de terminar:" >&2
  echo "$output" >&2
  exit 2
fi

exit 0