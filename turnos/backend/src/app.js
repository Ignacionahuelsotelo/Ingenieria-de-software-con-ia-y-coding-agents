import express from 'express'
import { AppError } from './errors.js'
import { scheduleRouter } from './routes/admin/schedule.routes.js'
import { blocksRouter } from './routes/admin/blocks.routes.js'
import { availabilityRouter } from './routes/availability.routes.js'
import { bookingsRouter } from './routes/bookings.routes.js'
import { agendaRouter } from './routes/admin/agenda.routes.js'
import { adminBookingsRouter } from './routes/admin/bookings.routes.js'

export function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/admin', scheduleRouter)
  app.use('/api/admin', blocksRouter)
  app.use('/api/admin', agendaRouter)
  app.use('/api/admin', adminBookingsRouter)
  app.use('/api', availabilityRouter)
  app.use('/api', bookingsRouter)

  // Middleware final de manejo de errores: serializa AppError al formato
  // uniforme de contracts/api.md; cualquier otro error no esperado se
  // reporta como 500 genérico (nunca se filtra a un mensaje interno crudo).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json(err.toJSON())
    }
    console.error(err)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.',
        field: null,
      },
    })
  })

  return app
}
