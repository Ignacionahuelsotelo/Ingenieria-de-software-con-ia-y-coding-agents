import { pool } from '../../src/db/pool.js'

export async function resetDb() {
  await pool.query("truncate bookings restart identity")
  await pool.query("truncate blocks restart identity")
  await pool.query('update weekly_schedule set is_open = false, start_time = null, end_time = null')
  await pool.query('update schedule_settings set slot_duration_minutes = 30 where id = 1')
}
