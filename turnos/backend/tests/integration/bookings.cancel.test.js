import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { startTestServer, stopTestServer } from '../helpers/testServer.js'
import { resetDb } from '../helpers/db.js'
import { pool } from '../../src/db/pool.js'

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

async function insertBooking(code, slotStart, status = 'active') {
  await pool.query(
    `insert into bookings (booking_code, slot_start, slot_end, customer_name, customer_phone, status, cancelled_reason)
     values ($1, $2, $2::timestamptz + interval '30 minutes', 'Ana', '1122334455', $3, $4)`,
    [code, slotStart, status, status === 'cancelled' ? 'owner' : null]
  )
}

describe('POST /api/bookings/:code/cancel', () => {
  it('cancela exitosamente un turno a más de 2h', async () => {
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000)
    await insertBooking('CANC2345', future)

    const res = await fetch(`${baseUrl}/api/bookings/CANC2345/cancel`, { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('cancelled')
  })

  it('rechaza con 403 CANCELLATION_WINDOW_CLOSED a menos de 2h', async () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000)
    await insertBooking('CANC2346', soon)

    const res = await fetch(`${baseUrl}/api/bookings/CANC2346/cancel`, { method: 'POST' })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('CANCELLATION_WINDOW_CLOSED')
  })

  it('rechaza con 409 BOOKING_NOT_ACTIVE sobre un turno ya cancelado', async () => {
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000)
    await insertBooking('CANC2347', future, 'cancelled')

    const res = await fetch(`${baseUrl}/api/bookings/CANC2347/cancel`, { method: 'POST' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('BOOKING_NOT_ACTIVE')
  })

  it('aplica rate limiting: responde 429 tras exceder el umbral', async () => {
    const attempts = []
    for (let i = 0; i < 40; i++) {
      attempts.push(fetch(`${baseUrl}/api/bookings/NOPE2345`))
    }
    const results = await Promise.all(attempts)
    const statuses = results.map((r) => r.status)
    expect(statuses).toContain(429)
  })
})
