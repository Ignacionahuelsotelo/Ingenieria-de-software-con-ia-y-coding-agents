import { config } from './config/env.js'
import { pool } from './db/pool.js'
import { createApp } from './app.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`turnos-backend escuchando en http://localhost:${config.port}`)
})

process.on('SIGTERM', async () => {
  await pool.end()
  process.exit(0)
})
