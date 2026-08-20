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

async function insertActiveBooking(slotStart, slotEnd) {
  const { rows } = await pool.query(
    `insert into bookings (booking_code, slot_start, slot_end, customer_name, customer_phone, status)
     values ($1, $2, $3, 'Juan Test', '111222333', 'active')
     returning booking_code`,
    ['TESTCODE', slotStart, slotEnd]
  )
  return rows[0].booking_code
}

describe('POST/DELETE /api/admin/blocks', () => {
  it('crea un bloqueo con clave correcta y cancela reservas activas superpuestas', async () => {
    const slotStart = new Date('2026-08-18T14:00:00Z')
    const slotEnd = new Date('2026-08-18T14:30:00Z')
    const code = await insertActiveBooking(slotStart, slotEnd)

    const res = await fetch(`${baseUrl}/api/admin/blocks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startsAt: '2026-08-18T13:00:00Z',
        endsAt: '2026-08-18T16:00:00Z',
        reason: 'vacaciones',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeTypeOf('number')
    expect(body.cancelledBookings).toContain(code)

    const { rows } = await pool.query('select status from bookings where booking_code = $1', [code])
    expect(rows[0].status).toBe('cancelled')
  })

  it('rechaza sin Authorization', async () => {
    const res = await fetch(`${baseUrl}/api/admin/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startsAt: '2026-08-18T13:00:00Z', endsAt: '2026-08-18T16:00:00Z' }),
    })
    expect(res.status).toBe(401)
  })

  it('elimina un bloqueo existente', async () => {
    const createRes = await fetch(`${baseUrl}/api/admin/blocks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startsAt: '2026-08-19T13:00:00Z', endsAt: '2026-08-19T16:00:00Z' }),
    })
    const created = await createRes.json()

    const deleteRes = await fetch(`${baseUrl}/api/admin/blocks/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}` },
    })
    expect(deleteRes.status).toBe(200)
    const deleteBody = await deleteRes.json()
    expect(deleteBody.deleted).toBe(true)
  })

  it('devuelve 404 BLOCK_NOT_FOUND al eliminar un id inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/admin/blocks/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}` },
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BLOCK_NOT_FOUND')
  })
})
