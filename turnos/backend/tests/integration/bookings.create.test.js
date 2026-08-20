import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { startTestServer, stopTestServer } from '../helpers/testServer.js'
import { resetDb } from '../helpers/db.js'
import { pool } from '../../src/db/pool.js'
import { formatLocalDate, weekdayOfLocalDate, addMinutes, localDateToUtcInstant } from '../../src/domain/time.js'

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

async function configureOpenTomorrow() {
  const tomorrow = formatLocalDate(addMinutes(new Date(), 24 * 60))
  const weekday = weekdayOfLocalDate(tomorrow)
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
  return localDateToUtcInstant(tomorrow, '09:00')
}

describe('POST /api/bookings', () => {
  it('crea una reserva exitosa y devuelve un código de 8 caracteres', async () => {
    const slotStart = await configureOpenTomorrow()

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotStart: slotStart.toISOString(),
        customerName: 'Ana',
        customerPhone: '1122334455',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bookingCode).toHaveLength(8)
    expect(body.status).toBe('active')
  })

  it('rechaza con 400 MISSING_FIELD si falta el nombre', async () => {
    const slotStart = await configureOpenTomorrow()
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotStart: slotStart.toISOString(), customerPhone: '1122334455' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('MISSING_FIELD')
    expect(body.error.field).toBe('customerName')
  })

  it('rechaza un slot que ya pasó con 400 INVALID_SLOT', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotStart: new Date('2020-01-01T09:00:00Z').toISOString(),
        customerName: 'Ana',
        customerPhone: '1122334455',
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_SLOT')
  })

  it('dos inserciones concurrentes sobre el mismo slotStart: solo una gana (201), la otra 409', async () => {
    const slotStart = await configureOpenTomorrow()

    const payload = () =>
      JSON.stringify({ slotStart: slotStart.toISOString(), customerName: 'Ana', customerPhone: '1122334455' })

    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload(),
      }),
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload(),
      }),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([201, 409])

    const loser = resA.status === 409 ? resA : resB
    const loserBody = await loser.json()
    expect(loserBody.error.code).toBe('SLOT_ALREADY_BOOKED')
  })
})
