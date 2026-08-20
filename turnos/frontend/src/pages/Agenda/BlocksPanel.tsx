import { useState } from 'react'
import type { Block } from '../../lib/api.ts'

interface Props {
  blocks: Block[]
  onCreate: (startsAt: string, endsAt: string, reason: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  error?: string | null
}

export default function BlocksPanel({ blocks, onCreate, onDelete, error }: Props) {
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onCreate(new Date(startsAt).toISOString(), new Date(endsAt).toISOString(), reason)
      setStartsAt('')
      setEndsAt('')
      setReason('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="ledger-hours text-xs uppercase tracking-[0.2em] text-ink-soft">Bloqueos puntuales</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-ink-soft">
          Desde
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="ledger-hours bg-transparent border-b border-ink-faint"
          />
        </label>
        <label className="flex flex-col text-xs text-ink-soft">
          Hasta
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="ledger-hours bg-transparent border-b border-ink-faint"
          />
        </label>
        <label className="flex flex-col text-xs text-ink-soft">
          Motivo (opcional)
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-transparent border-b border-ink-faint"
          />
        </label>
        <button type="submit" disabled={saving} className="ink-stamp">
          {saving ? 'Anotando…' : 'Bloquear'}
        </button>
      </form>

      {error && <p className="margin-note">{error}</p>}

      <ul className="space-y-1">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-baseline justify-between border-b border-dotted border-ink-faint py-1">
            <span className="margin-note">
              {new Date(b.startsAt).toLocaleString()} — {new Date(b.endsAt).toLocaleString()}
              {b.reason ? ` · ${b.reason}` : ''}
            </span>
            <button
              type="button"
              onClick={() => onDelete(b.id)}
              className="ledger-hours text-xs text-ink-soft underline hover:text-red-ink"
            >
              quitar
            </button>
          </li>
        ))}
        {blocks.length === 0 && <li className="text-ink-faint italic">Sin bloqueos anotados.</li>}
      </ul>
    </section>
  )
}
