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

function authHeaders() {
  return { Authorization: `Bearer ${OWNER_PASSWORD}` }
}

describe('POST /api/admin/bookings/:code/(complete|no-show|cancel)', () => {
  it('marca un turno activo como cumplido', async () => {
    await insertBooking('ADMN2345', new Date('2026-08-18T13:00:00Z'))
    const res = await fetch(`${baseUrl}/api/admin/bookings/ADMN2345/complete`, {
      method: 'POST',
      headers: authHeaders(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('completed')
  })

  it('marca un turno activo como ausente', async () => {
    await insertBooking('ADMN2346', new Date('2026-08-18T13:00:00Z'))
    const res = await fetch(`${baseUrl}/api/admin/bookings/ADMN2346/no-show`, {
      method: 'POST',
      headers: authHeaders(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('no_show')
  })

  it('cancela un turno activo sin ventana de 2h', async () => {
    await insertBooking('ADMN2347', new Date(Date.now() + 10 * 60 * 1000))
    const res = await fetch(`${baseUrl}/api/admin/bookings/ADMN2347/cancel`, {
      method: 'POST',
      headers: authHeaders(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('cancelled')
  })

  it('rechaza con 409 BOOKING_NOT_ACTIVE al repetir sobre un turno ya terminal', async () => {
    await insertBooking('ADMN2348', new Date('2026-08-18T13:00:00Z'))
    await fetch(`${baseUrl}/api/admin/bookings/ADMN2348/complete`, { method: 'POST', headers: authHeaders() })

    const res = await fetch(`${baseUrl}/api/admin/bookings/ADMN2348/complete`, {
      method: 'POST',
      headers: authHeaders(),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('BOOKING_NOT_ACTIVE')
  })
})
