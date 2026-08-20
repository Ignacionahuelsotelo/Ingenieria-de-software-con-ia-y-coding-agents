import { useEffect, useState } from 'react'
import ScheduleForm from './ScheduleForm.tsx'
import BlocksPanel from './BlocksPanel.tsx'
import {
  ApiError,
  getSchedule,
  putSchedule,
  createBlock as apiCreateBlock,
  deleteBlock as apiDeleteBlock,
  getAgenda,
  completeBooking,
  markNoShow,
  cancelBookingAsOwner,
} from '../../lib/api.ts'
import type { ScheduleConfig, Block, AgendaBooking } from '../../lib/api.ts'

const STATUS_LABEL: Record<string, string> = {
  active: 'activo',
  completed: 'cumplido',
  no_show: 'ausente',
  cancelled: 'cancelado',
}

function todayLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AgendaView() {
  const [ownerPassword, setOwnerPassword] = useState<string | null>(
    sessionStorage.getItem('ownerPassword')
  )
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [blocksError, setBlocksError] = useState<string | null>(null)

  const [date, setDate] = useState(todayLocalDate())
  const [bookings, setBookings] = useState<AgendaBooking[]>([])
  const [agendaError, setAgendaError] = useState<string | null>(null)

  async function loadAll(password: string) {
    try {
      const config = await getSchedule(password)
      setSchedule(config)
      setAuthError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthError('Clave incorrecta.')
        sessionStorage.removeItem('ownerPassword')
        setOwnerPassword(null)
        return
      }
      setScheduleError('No pudimos cargar el horario.')
    }
  }

  useEffect(() => {
    if (ownerPassword) loadAll(ownerPassword)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerPassword])

  useEffect(() => {
    if (!ownerPassword) return
    getAgenda(ownerPassword, date)
      .then((res) => setBookings(res.bookings))
      .catch(() => setAgendaError('No pudimos cargar la agenda de ese día.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerPassword, date])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    sessionStorage.setItem('ownerPassword', passwordInput)
    setOwnerPassword(passwordInput)
  }

  if (!ownerPassword) {
    return (
      <section className="space-y-4 max-w-sm">
        <h1 className="text-2xl">Agenda del dueño</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="flex flex-col text-sm">
            Clave
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="bg-transparent border-b border-ink-faint py-1"
            />
          </label>
          {authError && <p className="margin-note">{authError}</p>}
          <button type="submit" className="ink-stamp">
            Entrar
          </button>
        </form>
      </section>
    )
  }

  async function handleAction(code: string, action: 'complete' | 'no-show' | 'cancel') {
    if (!ownerPassword) return
    setAgendaError(null)
    try {
      const fn = action === 'complete' ? completeBooking : action === 'no-show' ? markNoShow : cancelBookingAsOwner
      const result = await fn(ownerPassword, code)
      setBookings((prev) => prev.map((b) => (b.bookingCode === code ? { ...b, status: result.status } : b)))
    } catch (err) {
      setAgendaError(err instanceof ApiError ? err.message : 'No pudimos actualizar el turno.')
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl">Agenda del día</h1>
        <label className="flex flex-col text-sm w-48">
          Día
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ledger-hours bg-transparent border-b border-ink-faint py-1"
          />
        </label>

        {agendaError && <p className="margin-note">{agendaError}</p>}

        <table className="w-full border-collapse">
          <thead>
            <tr className="ledger-hours text-xs uppercase tracking-wider text-ink-soft border-b border-ink">
              <th className="text-left py-2 font-normal">Hora</th>
              <th className="text-left py-2 font-normal">Cliente</th>
              <th className="text-left py-2 font-normal">Estado</th>
              <th className="text-left py-2 font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.bookingCode} className="border-b border-paper-line">
                <td className="ledger-hours py-2 pr-3">
                  {new Date(b.slotStart).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2 pr-3">
                  {b.customerName} · {b.customerPhone}
                </td>
                <td className={`py-2 pr-3 ${b.status === 'cancelled' ? 'strike-cancelled' : ''}`}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </td>
                <td className="py-2 pr-3 space-x-2">
                  {b.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(b.bookingCode, 'complete')}
                        className="ledger-hours text-xs underline"
                      >
                        cumplido
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(b.bookingCode, 'no-show')}
                        className="ledger-hours text-xs underline"
                      >
                        ausente
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(b.bookingCode, 'cancel')}
                        className="ledger-hours text-xs underline text-red-ink"
                      >
                        cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="text-ink-faint italic py-3">
                  Sin turnos anotados este día.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {schedule && (
        <ScheduleForm
          weeklySchedule={schedule.weeklySchedule}
          slotDurationMinutes={schedule.slotDurationMinutes}
          error={scheduleError}
          onSave={async (weeklySchedule, slotDurationMinutes) => {
            setScheduleError(null)
            try {
              const saved = await putSchedule(ownerPassword, { weeklySchedule, slotDurationMinutes })
              setSchedule(saved)
            } catch (err) {
              setScheduleError(err instanceof ApiError ? err.message : 'No pudimos guardar el horario.')
            }
          }}
        />
      )}

      <BlocksPanel
        blocks={blocks}
        error={blocksError}
        onCreate={async (startsAt, endsAt, reason) => {
          setBlocksError(null)
          try {
            const created = await apiCreateBlock(ownerPassword, { startsAt, endsAt, reason })
            setBlocks((prev) => [...prev, created])
          } catch (err) {
            setBlocksError(err instanceof ApiError ? err.message : 'No pudimos crear el bloqueo.')
          }
        }}
        onDelete={async (id) => {
          setBlocksError(null)
          try {
            await apiDeleteBlock(ownerPassword, id)
            setBlocks((prev) => prev.filter((b) => b.id !== id))
          } catch (err) {
            setBlocksError(err instanceof ApiError ? err.message : 'No pudimos quitar el bloqueo.')
          }
        }}
      />
    </div>
  )
}
