process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://turnos:turnos@localhost:5433/turnos'
process.env.OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'test-owner-password'
process.env.PORT = process.env.PORT || '0'
