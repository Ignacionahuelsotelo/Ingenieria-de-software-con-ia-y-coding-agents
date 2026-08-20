import { useState } from 'react'
import { getBookingByCode, cancelBooking, ApiError } from '../../lib/api.ts'
import type { BookingLookup } from '../../lib/api.ts'

const STATUS_LABEL: Record<string, string> = {
  active: 'activo',
  completed: 'cumplido',
  no_show: 'ausente',
  cancelled: 'cancelado',
}

export default function MiTurno() {
  const [code, setCode] = useState('')
  const [booking, setBooking] = useState<BookingLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setBooking(null)
    try {
      const result = await getBookingByCode(code.trim().toUpperCase())
      setBooking(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos buscar el turno.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!booking) return
    setCancelling(true)
    setError(null)
    try {
      const result = await cancelBooking(booking.bookingCode)
      setBooking({ ...booking, status: result.status, canCancel: false })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cancelar el turno.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl">Mi turno</h1>

      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <label className="flex flex-col text-sm">
          Código de reserva
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="3F7K9RTQ"
            className="ledger-hours bg-transparent border-b border-ink-faint py-1 uppercase tracking-widest"
          />
        </label>
        <button type="submit" disabled={loading} className="ink-stamp">
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && <p className="margin-note">{error}</p>}

      {booking && (
        <div className="border-t border-ink pt-4 space-y-2">
          <p className="ledger-hours text-sm">
            Código: <strong>{booking.bookingCode}</strong>
          </p>
          <p>
            {new Date(booking.slotStart).toLocaleString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className={booking.status === 'cancelled' ? 'strike-cancelled' : ''}>
            Estado: {STATUS_LABEL[booking.status] ?? booking.status}
          </p>

          {booking.canCancel ? (
            <button type="button" onClick={handleCancel} disabled={cancelling} className="ink-stamp">
              {cancelling ? 'Cancelando…' : 'Cancelar turno'}
            </button>
          ) : (
            booking.status === 'active' && (
              <p className="margin-note">
                Faltan menos de 2 horas para el turno: no se puede cancelar online. Contactá al dueño
                directamente.
              </p>
            )
          )}
        </div>
      )}
    </section>
  )
}
