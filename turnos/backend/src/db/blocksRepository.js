import { pool } from './pool.js'

function toApiBlock(row) {
  return {
    id: Number(row.id),
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    reason: row.reason,
  }
}

/**
 * Crea un bloqueo e, en la misma transacción, cancela las reservas activas
 * que se solapen (FR-024). Devuelve el bloqueo creado y los códigos
 * cancelados.
 */
export async function createBlock(startsAt, endsAt, reason) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const insertResult = await client.query(
      `insert into blocks (starts_at, ends_at, reason)
       values ($1, $2, $3)
       returning id, starts_at, ends_at, reason`,
      [startsAt, endsAt, reason ?? null]
    )
    const block = insertResult.rows[0]

    const cancelResult = await client.query(
      `update bookings
          set status = 'cancelled', cancelled_reason = 'blocked', updated_at = now()
        where status = 'active'
          and slot_start < $2
          and slot_end > $1
        returning booking_code`,
      [startsAt, endsAt]
    )

    await client.query('COMMIT')

    return {
      block: toApiBlock(block),
      cancelledBookings: cancelResult.rows.map((r) => r.booking_code),
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function deleteBlock(id) {
  const { rows } = await pool.query('delete from blocks where id = $1 returning id', [id])
  return rows.length > 0
}

export async function listActiveBlocks(from, to) {
  const { rows } = await pool.query(
    `select id, starts_at, ends_at, reason
       from blocks
      where starts_at < $2
        and ends_at > $1
      order by starts_at`,
    [from, to]
  )
  return rows.map(toApiBlock)
}
