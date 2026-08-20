import { pool } from './pool.js'

function toApiRow(row) {
  return {
    weekday: row.weekday,
    isOpen: row.is_open,
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    endTime: row.end_time ? row.end_time.slice(0, 5) : null,
  }
}

export async function getWeeklySchedule() {
  const { rows } = await pool.query('select weekday, is_open, start_time, end_time from weekly_schedule order by weekday')
  return rows.map(toApiRow)
}

export async function updateWeeklySchedule(weeklySchedule) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const day of weeklySchedule) {
      await client.query(
        `update weekly_schedule
           set is_open = $2, start_time = $3, end_time = $4, updated_at = now()
         where weekday = $1`,
        [day.weekday, day.isOpen, day.startTime, day.endTime]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  return getWeeklySchedule()
}

export async function getScheduleSettings() {
  const { rows } = await pool.query('select slot_duration_minutes from schedule_settings where id = 1')
  return rows[0].slot_duration_minutes
}

export async function updateScheduleSettings(minutes) {
  await pool.query('update schedule_settings set slot_duration_minutes = $1, updated_at = now() where id = 1', [
    minutes,
  ])
  return getScheduleSettings()
}
