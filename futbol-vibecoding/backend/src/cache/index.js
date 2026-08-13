const store = new Map();

function makeKey(namespace, params = {}) {
  return `${namespace}:${JSON.stringify(params, Object.keys(params).sort())}`;
}

// wrap: devuelve el valor cacheado si sigue vigente, si no ejecuta `fn`,
// cachea el resultado por `ttlMs` y lo devuelve.
export async function wrap(namespace, params, ttlMs, fn) {
  const key = makeKey(namespace, params);
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearCache() {
  store.clear();
}

export const TTL = {
  SEASON: 12 * 60 * 60 * 1000,
  STANDINGS: 5 * 60 * 1000,
  MATCHES: 3 * 60 * 1000,
  TEAM: 5 * 60 * 1000,
};
