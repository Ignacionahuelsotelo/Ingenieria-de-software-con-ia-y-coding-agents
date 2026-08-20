import { useState } from 'react'
import type { WeekdaySchedule } from '../../lib/api.ts'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface Props {
  weeklySchedule: WeekdaySchedule[]
  slotDurationMinutes: number
  onSave: (weeklySchedule: WeekdaySchedule[], slotDurationMinutes: number) => Promise<void>
  error?: string | null
}

export default function ScheduleForm({ weeklySchedule, slotDurationMinutes, onSave, error }: Props) {
  const [rows, setRows] = useState<WeekdaySchedule[]>(weeklySchedule)
  const [duration, setDuration] = useState(slotDurationMinutes)
  const [saving, setSaving] = useState(false)

  function updateRow(weekday: number, patch: Partial<WeekdaySchedule>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)))
  }

  function toggleOpen(weekday: number, isOpen: boolean) {
    updateRow(weekday, {
      isOpen,
      startTime: isOpen ? rows.find((r) => r.weekday === weekday)?.startTime ?? '09:00' : null,
      endTime: isOpen ? rows.find((r) => r.weekday === weekday)?.endTime ?? '18:00' : null,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(rows, duration)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="ledger-hours text-xs uppercase tracking-[0.2em] text-ink-soft">Horario semanal</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="ledger-hours text-xs uppercase tracking-wider text-ink-soft border-b border-ink">
            <th className="text-left py-2 font-normal">Día</th>
            <th className="text-left py-2 font-normal">Abierto</th>
            <th className="text-left py-2 font-normal">Desde</th>
            <th className="text-left py-2 font-normal">Hasta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.weekday} className="border-b border-paper-line">
              <td className="py-2 pr-3">{DAY_NAMES[row.weekday]}</td>
              <td className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={row.isOpen}
                  onChange={(e) => toggleOpen(row.weekday, e.target.checked)}
                  aria-label={`${DAY_NAMES[row.weekday]} abierto`}
                />
              </td>
              <td className="py-2 pr-3">
                <input
                  type="time"
                  disabled={!row.isOpen}
                  value={row.startTime ?? ''}
                  onChange={(e) => updateRow(row.weekday, { startTime: e.target.value })}
                  className="ledger-hours bg-transparent border-b border-ink-faint disabled:opacity-40"
                />
              </td>
              <td className="py-2 pr-3">
                <input
                  type="time"
                  disabled={!row.isOpen}
                  value={row.endTime ?? ''}
                  onChange={(e) => updateRow(row.weekday, { endTime: e.target.value })}
                  className="ledger-hours bg-transparent border-b border-ink-faint disabled:opacity-40"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <label className="flex items-center gap-3">
        <span className="ledger-hours text-xs uppercase tracking-wider text-ink-soft">
          Duración de turno (min)
        </span>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="ledger-hours w-20 bg-transparent border-b border-ink-faint"
        />
      </label>

      {error && <p className="margin-note">{error}</p>}

      <button type="submit" disabled={saving} className="ink-stamp">
        {saving ? 'Guardando…' : 'Guardar horario'}
      </button>
    </form>
  )
}
