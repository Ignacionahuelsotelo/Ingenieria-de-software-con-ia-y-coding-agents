import 'dotenv/config'

function buildConnectionConfig() {
  const { DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env

  if (DATABASE_URL) {
    return { connectionString: DATABASE_URL }
  }

  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return {
      host: PGHOST,
      port: PGPORT ? Number(PGPORT) : 5432,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
    }
  }

  throw new Error(
    'Config inválida: definí DATABASE_URL, o todas de PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE en las variables de entorno.'
  )
}

function loadConfig() {
  const ownerPassword = process.env.OWNER_PASSWORD
  if (!ownerPassword) {
    throw new Error(
      'Config inválida: falta la variable de entorno OWNER_PASSWORD (clave del dueño para /api/admin).'
    )
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000

  return {
    db: buildConnectionConfig(),
    ownerPassword,
    port,
  }
}

export const config = loadConfig()
export { loadConfig }
