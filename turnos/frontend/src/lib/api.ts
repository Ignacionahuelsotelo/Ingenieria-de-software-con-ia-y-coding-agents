export interface ApiErrorShape {
  code: string
  message: string
  field: string | null
}

export class ApiError extends Error {
  code: string
  field: string | null
  status: number

  constructor(shape: ApiErrorShape, status: number) {
    super(shape.message)
    this.name = 'ApiError'
    this.code = shape.code
    this.field = shape.field
    this.status = status
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  ownerPassword?: string
}

export interface WeekdaySchedule {
  weekday: number
  isOpen: boolean
  startTime: string | null
  endTime: string | null
}

export interface ScheduleConfig {
  weeklySchedule: WeekdaySchedule[]
  slotDurationMinutes: number
}

export interface Block {
  id: number
  startsAt: string
  endsAt: string
  reason: string | null
}

export interface CreateBlockResult extends Block {
  cancelledBookings: string[]
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.ownerPassword) {
    headers['Authorization'] = `Bearer ${options.ownerPassword}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(data.error as ApiErrorShape, response.status)
  }

  return data as T
}

export interface AvailableSlot {
  start: string
  end: string
}

export interface AvailabilityDay {
  date: string
  slots: AvailableSlot[]
}

export interface CreatedBooking {
  bookingCode: string
  slotStart: string
  slotEnd: string
  status: string
}

export function getAvailability() {
  return apiFetch<{ days: AvailabilityDay[] }>('/api/availability')
}

export function createBooking(input: { slotStart: string; customerName: string; customerPhone: string }) {
  return apiFetch<CreatedBooking>('/api/bookings', { method: 'POST', body: input })
}

export interface BookingLookup {
  bookingCode: string
  slotStart: string
  slotEnd: string
  status: string
  canCancel: boolean
}

export function getBookingByCode(code: string) {
  return apiFetch<BookingLookup>(`/api/bookings/${encodeURIComponent(code)}`)
}

export function cancelBooking(code: string) {
  return apiFetch<{ bookingCode: string; status: string }>(`/api/bookings/${encodeURIComponent(code)}/cancel`, {
    method: 'POST',
  })
}

export interface AgendaBooking {
  bookingCode: string
  customerName: string
  customerPhone: string
  slotStart: string
  slotEnd: string
  status: string
}

export function getAgenda(ownerPassword: string, date: string) {
  return apiFetch<{ date: string; bookings: AgendaBooking[] }>(
    `/api/admin/agenda?date=${encodeURIComponent(date)}`,
    { ownerPassword }
  )
}

export function completeBooking(ownerPassword: string, code: string) {
  return apiFetch<{ bookingCode: string; status: string }>(`/api/admin/bookings/${code}/complete`, {
    method: 'POST',
    ownerPassword,
  })
}

export function markNoShow(ownerPassword: string, code: string) {
  return apiFetch<{ bookingCode: string; status: string }>(`/api/admin/bookings/${code}/no-show`, {
    method: 'POST',
    ownerPassword,
  })
}

export function cancelBookingAsOwner(ownerPassword: string, code: string) {
  return apiFetch<{ bookingCode: string; status: string }>(`/api/admin/bookings/${code}/cancel`, {
    method: 'POST',
    ownerPassword,
  })
}

export function getSchedule(ownerPassword: string) {
  return apiFetch<ScheduleConfig>('/api/admin/schedule', { ownerPassword })
}

export function putSchedule(ownerPassword: string, config: ScheduleConfig) {
  return apiFetch<ScheduleConfig>('/api/admin/schedule', { method: 'PUT', body: config, ownerPassword })
}

export function createBlock(
  ownerPassword: string,
  block: { startsAt: string; endsAt: string; reason?: string }
) {
  return apiFetch<CreateBlockResult>('/api/admin/blocks', { method: 'POST', body: block, ownerPassword })
}

export function deleteBlock(ownerPassword: string, id: number) {
  return apiFetch<{ id: number; deleted: boolean }>(`/api/admin/blocks/${id}`, {
    method: 'DELETE',
    ownerPassword,
  })
}
