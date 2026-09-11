import test from 'node:test'
import assert from 'node:assert/strict'
import { app } from '@azure/functions'

const routes = []
const originalHttp = app.http
app.http = (name, options) => routes.push({ name, ...options })
await import('./functions/adminClients.js')
await import('./functions/staff.js')
app.http = originalHttp

test('management routes avoid Azure reserved prefixes and register expected methods', () => {
  assert.deepEqual(routes.map(({ route, methods }) => [route, methods]), [
    ['firm/clients', ['POST']],
    ['firm/clients/{oid}', ['PATCH']],
    ['firm/staff', ['GET']],
    ['firm/staff', ['POST']],
    ['firm/staff/{oid}', ['PATCH']],
  ])
  for (const { route } of routes) assert.doesNotMatch(route.replace(/^\/+/, ''), /^(admin|runtime)/i)
})

test('all management handlers still reject requests without portal credentials', async () => {
  for (const { route, methods, handler } of routes) {
    const request = { method: methods[0], headers: new Headers() }
    const result = await handler(request)
    assert.equal(result.status, 401, route)
  }
})
