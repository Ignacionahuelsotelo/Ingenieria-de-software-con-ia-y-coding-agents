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

async function insertActiveBooking(code, slotStart) {
  await pool.query(
    `insert into bookings (booking_code, slot_start, slot_end, customer_name, customer_phone, status)
     values ($1, $2, $2::timestamptz + interval '30 minutes', 'Ana', '1122334455', 'active')`,
    [code, slotStart]
  )
}

describe('GET /api/bookings/:code', () => {
  it('devuelve el turno con código válido, incluyendo canCancel', async () => {
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000)
    await insertActiveBooking('ABCD2345', future)

    const res = await fetch(`${baseUrl}/api/bookings/ABCD2345`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('active')
    expect(body.canCancel).toBe(true)
  })

  it('devuelve 404 genérico BOOKING_NOT_FOUND para un código inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/ZZZZZZZZ`)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BOOKING_NOT_FOUND')
  })

  it('devuelve 404 para un código mal formado', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/short`)
    expect(res.status).toBe(404)
  })
})
