import { createApp } from '../../src/app.js'

export async function startTestServer() {
  const app = createApp()
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  return { server, baseUrl: `http://localhost:${port}` }
}

export async function stopTestServer(server) {
  await new Promise((resolve) => server.close(resolve))
}
