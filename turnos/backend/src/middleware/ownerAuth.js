import { config } from '../config/env.js'
import { unauthorized } from '../errors.js'

/**
 * Middleware Express: exige `Authorization: Bearer <OWNER_PASSWORD>`. Ausente
 * o incorrecto → 401 UNAUTHORIZED, sin exponer datos (FR-016).
 */
export function ownerAuth(req, _res, next) {
  const header = req.headers['authorization'] || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token || token !== config.ownerPassword) {
    return next(unauthorized())
  }

  return next()
}
