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

function validSchedule() {
  return {
    weeklySchedule: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isOpen: weekday >= 1 && weekday <= 5,
      startTime: weekday >= 1 && weekday <= 5 ? '09:00' : null,
      endTime: weekday >= 1 && weekday <= 5 ? '18:00' : null,
    })),
    slotDurationMinutes: 30,
  }
}

describe('PUT/GET /api/admin/schedule', () => {
  it('rechaza sin Authorization con 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/admin/schedule`)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('rechaza con clave incorrecta con 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/schedule`, {
      headers: { Authorization: 'Bearer clave-incorrecta' },
    })
    expect(res.status).toBe(401)
  })

  it('guarda y luego lee el horario semanal + duración con clave correcta', async () => {
    const putRes = await fetch(`${baseUrl}/api/admin/schedule`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(validSchedule()),
    })
    expect(putRes.status).toBe(200)
    const putBody = await putRes.json()
    expect(putBody.slotDurationMinutes).toBe(30)
    expect(putBody.weeklySchedule).toHaveLength(7)

    const getRes = await fetch(`${baseUrl}/api/admin/schedule`, {
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}` },
    })
    expect(getRes.status).toBe(200)
    const getBody = await getRes.json()
    expect(getBody.slotDurationMinutes).toBe(30)
    const monday = getBody.weeklySchedule.find((d) => d.weekday === 1)
    expect(monday.isOpen).toBe(true)
    expect(monday.startTime).toBe('09:00')
    expect(monday.endTime).toBe('18:00')
  })

  it('rechaza un horario inválido con 400 INVALID_SCHEDULE', async () => {
    const body = validSchedule()
    body.weeklySchedule[1] = { weekday: 1, isOpen: true, startTime: '18:00', endTime: '09:00' }

    const res = await fetch(`${baseUrl}/api/admin/schedule`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${OWNER_PASSWORD}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(res.status).toBe(400)
    const responseBody = await res.json()
    expect(responseBody.error.code).toBe('INVALID_SCHEDULE')
  })
})
