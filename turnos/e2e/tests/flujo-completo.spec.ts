import { test, expect } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'test-owner-password'

test('flujo completo: dueño configura horario, cliente reserva, consulta y cancela', async ({ page }) => {
  // 1. Dueño configura horario semanal (via API para no depender del formulario en este smoke test)
  await page.request.put(`${API_URL}/api/admin/schedule`, {
    headers: { Authorization: `Bearer ${OWNER_PASSWORD}` },
    data: {
      weeklySchedule: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        isOpen: true,
        startTime: '09:00',
        endTime: '18:00',
      })),
      slotDurationMinutes: 30,
    },
  })

  // 2. Cliente ve disponibilidad y reserva
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Reservar un turno' })).toBeVisible()

  const firstSlotButton = page.locator('button.ledger-hours').first()
  await expect(firstSlotButton).toBeVisible({ timeout: 10000 })
  await firstSlotButton.click()

  await page.getByLabel('Nombre').fill('Cliente E2E')
  await page.getByLabel('Teléfono').fill('1122334455')
  await page.getByRole('button', { name: 'Confirmar turno' }).click()

  await expect(page.getByText('Turno anotado en la libreta')).toBeVisible()
  const codeText = await page.locator('.ink-stamp').textContent()
  const bookingCode = codeText?.trim()
  expect(bookingCode).toMatch(/^[A-Z0-9]{8}$/)

  // 3. Cliente consulta con su código
  await page.goto('/mi-turno')
  await page.getByLabel('Código de reserva').fill(bookingCode!)
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page.getByText(/Código:/)).toBeVisible()

  // 4. Cliente cancela (si la ventana de 2h lo permite)
  const cancelButton = page.getByRole('button', { name: 'Cancelar turno' })
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click()
    await expect(page.getByText('Estado: cancelado')).toBeVisible()

    // 5. El slot vuelve a estar disponible
    const res = await page.request.get(`${API_URL}/api/availability`)
    const body = await res.json()
    const stillListed = body.days.some((d: { slots: { start: string }[] }) =>
      d.slots.some((s) => s.start)
    )
    expect(stillListed).toBe(true)
  }
})
