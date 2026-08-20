import { pool } from './pool.js'
import { generateBookingCode } from '../domain/bookingCode.js'
import { slotAlreadyBooked } from '../errors.js'

const UNIQUE_VIOLATION = '23505'
const MAX_CODE_RETRIES = 5

function toApiBooking(row) {
  return {
    bookingCode: row.booking_code,
    slotStart: row.slot_start.toISOString(),
    slotEnd: row.slot_end.toISOString(),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status,
  }
}

/**
 * Inserta una reserva. Genera el código de reserva (con reintento en
 * colisión de UNIQUE de `booking_code`) y traduce la violación del índice
 * parcial `bookings_one_active_per_slot` a un error de dominio
 * SLOT_ALREADY_BOOKED (Principio IV: la garantía real vive en Postgres).
 */
export async function createBooking({ slotStart, slotEnd, customerName, customerPhone }) {
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const bookingCode = generateBookingCode()
    try {
      const { rows } = await pool.query(
        `insert into bookings (booking_code, slot_start, slot_end, customer_name, customer_phone, status)
         values ($1, $2, $3, $4, $5, 'active')
         returning booking_code, slot_start, slot_end, customer_name, customer_phone, status`,
        [bookingCode, slotStart, slotEnd, customerName, customerPhone]
      )
      return toApiBooking(rows[0])
    } catch (err) {
      if (err.code === UNIQUE_VIOLATION) {
        if (err.constraint === 'bookings_one_active_per_slot') {
          throw slotAlreadyBooked()
        }
        if (err.constraint === 'bookings_booking_code_key') {
          continue // colisión de código, reintentar con otro
        }
      }
      throw err
    }
  }
  throw new Error('No se pudo generar un código de reserva único tras varios intentos.')
}

export async function findByCode(code) {
  const { rows } = await pool.query(
    `select booking_code, slot_start, slot_end, customer_name, customer_phone, status
       from bookings
      where booking_code = $1`,
    [code]
  )
  return rows[0] ? toApiBooking(rows[0]) : null
}

export async function cancelByCode(code, cancelledReason) {
  const { rows } = await pool.query(
    `update bookings
        set status = 'cancelled', cancelled_reason = $2, updated_at = now()
      where booking_code = $1 and status = 'active'
      returning booking_code, slot_start, slot_end, customer_name, customer_phone, status`,
    [code, cancelledReason]
  )
  if (rows[0]) {
    return { updated: true, booking: toApiBooking(rows[0]) }
  }
  const existing = await findByCode(code)
  return { updated: false, booking: existing }
}

export async function findByDate(dateFrom, dateTo) {
  const { rows } = await pool.query(
    `select booking_code, slot_start, slot_end, customer_name, customer_phone, status
       from bookings
      where slot_start >= $1 and slot_start < $2
      order by slot_start`,
    [dateFrom, dateTo]
  )
  return rows.map(toApiBooking)
}

export async function updateStatus(code, newStatus) {
  const { rows } = await pool.query(
    `update bookings
        set status = $2, updated_at = now()
      where booking_code = $1 and status = 'active'
      returning booking_code, slot_start, slot_end, customer_name, customer_phone, status`,
    [code, newStatus]
  )
  if (rows[0]) {
    return { updated: true, booking: toApiBooking(rows[0]) }
  }
  const existing = await findByCode(code)
  return { updated: false, booking: existing }
}
