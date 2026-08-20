import { useEffect, useState } from 'react'
import { getAvailability, createBooking, ApiError } from '../../lib/api.ts'
import type { AvailabilityDay, CreatedBooking } from '../../lib/api.ts'

function formatDayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function Reservar() {
  const [days, setDays] = useState<AvailabilityDay[] | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedBooking | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getAvailability()
      .then((res) => setDays(res.days.filter((d) => d.slots.length > 0)))
      .catch(() => setError('No pudimos cargar los horarios disponibles. Recargá la página.'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) return
    setSubmitting(true)
    setError(null)
    try {
      const booking = await createBooking({
        slotStart: selectedSlot,
        customerName: name,
        customerPhone: phone,
      })
      setResult(booking)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('No pudimos registrar la reserva. Intentá de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl">Turno anotado en la libreta</h1>
        <p>Guardá este código: lo vas a necesitar para consultar o cancelar tu turno.</p>
        <div className="ink-stamp text-2xl">{result.bookingCode}</div>
        <p className="text-ink-soft">
          {new Date(result.slotStart).toLocaleString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl">Reservar un turno</h1>

      {error && <p className="margin-note">{error}</p>}

      {days === null && <p className="text-ink-soft italic">Cargando horarios…</p>}

      {days !== null && days.length === 0 && (
        <p className="text-ink-soft italic">No hay turnos disponibles en los próximos 14 días.</p>
      )}

      <div className="divide-y divide-paper-line">
        {days?.map((day) => (
          <div key={day.date} className="py-3">
            <h2 className="ledger-hours text-xs uppercase tracking-widest text-ink-soft mb-2">
              {formatDayLabel(day.date)}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {day.slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelectedSlot(slot.start)}
                  className={`ledger-hours text-sm px-1 border-b ${
                    selectedSlot === slot.start
                      ? 'border-stamp text-stamp'
                      : 'border-transparent hover:border-ink-faint'
                  }`}
                >
                  {formatHour(slot.start)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-ink pt-4">
          <p className="ledger-hours text-sm">
            Turno elegido: <strong>{formatHour(selectedSlot)}</strong>
          </p>
          <label className="flex flex-col text-sm">
            Nombre
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border-b border-ink-faint py-1"
            />
          </label>
          <label className="flex flex-col text-sm">
            Teléfono
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-transparent border-b border-ink-faint py-1"
            />
          </label>
          <button type="submit" disabled={submitting} className="ink-stamp">
            {submitting ? 'Anotando…' : 'Confirmar turno'}
          </button>
        </form>
      )}
    </section>
  )
}
