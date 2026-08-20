import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 20000,
    testTimeout: 20000,
    // Los tests de integración comparten un único Postgres real (Docker);
    // correr archivos en paralelo intercalaría sus resetDb()/inserts.
    fileParallelism: false,
  },
})
