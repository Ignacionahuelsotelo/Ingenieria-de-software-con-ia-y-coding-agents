import { tooManyRequests } from '../errors.js'

/**
 * Rate limiting simple por IP, ventana fija en memoria (FR-028). Sin
 * dependencia externa (Principio VI): el volumen esperado (negocio de
 * barrio) no justifica un store distribuido.
 */
export function createRateLimit({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map() // ip -> { count, windowStart }

  return function rateLimit(req, _res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const now = Date.now()
    const entry = hits.get(ip)

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(ip, { count: 1, windowStart: now })
      return next()
    }

    entry.count += 1
    if (entry.count > max) {
      return next(tooManyRequests())
    }

    return next()
  }
}
