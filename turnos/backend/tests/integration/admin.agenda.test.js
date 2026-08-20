import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { startTestServer, stopTestServer } from '../helpers/testServer.js'
import { resetDb } from '../helpers/db.js'
import { pool } from '../../src/db/pool.js'

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

async function insertBooking(code, slotStart) {
  await pool.query(
    `insert into bookings (booking_code, slot_start, slot_end, customer_name, customer_phone, status)
     values ($1, $2, $2::timestamptz + interval '30 minutes', 'Ana', '1122334455', 'active')`,
    [code, slotStart]
  )
}

describe('GET /api/admin/agenda', () => {
  it('devuelve los turnos de un día pasado con clave correcta (historial no se oculta)', async () => {
    const past = new Date('2020-01-15T13:00:00Z')
    await insertBooking('AGEN2345', past)

    const res = await fetch(`${baseUrl}/api/admin/agenda?date=2020-01-15`, {
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bookings.some((b) => b.bookingCode === 'AGEN2345')).toBe(true)
  })

  it('rechaza sin clave con 401, sin exponer datos', async () => {
    const res = await fetch(`${baseUrl}/api/admin/agenda?date=2020-01-15`)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.bookings).toBeUndefined()
  })
})
