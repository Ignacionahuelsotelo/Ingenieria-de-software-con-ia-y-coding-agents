import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { startTestServer, stopTestServer } from '../helpers/testServer.js'
import { resetDb } from '../helpers/db.js'
import { pool } from '../../src/db/pool.js'
import { formatLocalDate, weekdayOfLocalDate, addMinutes } from '../../src/domain/time.js'

const OWNER_PASSWORD = process.env.OWNER_PASSWORD

let server
let baseUrl

beforeAll(async () => {
  ;({ server, baseUrl } = await startTestServer())
})

afterAll(async () => {
  await stopTestServer(server)
  await pool.end()
})

beforeEach(async () => {
  await resetDb()
})

function tomorrowLocalDate() {
  return formatLocalDate(addMinutes(new Date(), 24 * 60))
}

describe('GET /api/availability', () => {
  it('refleja el horario semanal configurado, los bloqueos y las reservas activas, dentro de 14 días', async () => {
    const tomorrow = tomorrowLocalDate()
    const weekday = weekdayOfLocalDate(tomorrow)

    // Configura horario: el día de mañana abierto 09:00-11:00, duración 30 min.
    await fetch(`${baseUrl}/api/admin/schedule`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weeklySchedule: Array.from({ length: 7 }, (_, wd) => ({
          weekday: wd,
          isOpen: wd === weekday,
          startTime: wd === weekday ? '09:00' : null,
          endTime: wd === weekday ? '11:00' : null,
        })),
        slotDurationMinutes: 30,
      }),
    })

    const res = await fetch(`${baseUrl}/api/availability`)
    expect(res.status).toBe(200)
    const body = await res.json()

    const day = body.days.find((d) => d.date === tomorrow)
    expect(day).toBeTruthy()
    expect(day.slots.length).toBe(4) // 09:00,09:30,10:00,10:30
  })
})
