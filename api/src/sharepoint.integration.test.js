import test from 'node:test'
import assert from 'node:assert/strict'

Object.assign(process.env, {
  GRAPH_TENANT_ID: 'test-sharepoint-tenant', GRAPH_CLIENT_ID: 'test-app',
  GRAPH_CLIENT_SECRET: 'fake-test-secret', SHAREPOINT_SITE_ID: 'test-site', SHAREPOINT_DRIVE_ID: 'test-drive',
})
const items = new Map([['root', { id: 'root', name: 'root', folder: {}, path: '' }]])
let stateBytes = ''
let version = 0
let identityCount = 0
let forceConflict = false
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input)
  const method = init.method || 'GET'
  if (url.hostname === 'login.microsoftonline.com') return json({ access_token: 'fake-sharepoint-token', expires_in: 3600 })
  assert.equal(url.hostname, 'graph.microsoft.com')
  if (url.pathname === '/v1.0/users') {
    identityCount++
    return json({ id: '11111111-2222-4333-8444-555555555555' }, 201)
  }
  const path = decodeURIComponent(url.pathname.split('/drives/test-drive')[1])
  if (path === '/root') return json(items.get('root'))
  if (path.startsWith('/root:/_portal/state.json:/content')) {
    if (forceConflict) { forceConflict = false; return json({ error: 'precondition failed' }, 412) }
    if (stateBytes) assert.equal(new Headers(init.headers).get('If-Match'), `"${version}"`)
    else assert.equal(url.searchParams.get('@microsoft.graph.conflictBehavior'), 'fail')
    stateBytes = init.body
    version++
    items.set('state', { id: 'state', name: 'state.json', path: '_portal/state.json', eTag: `"${version}"` })
    return json(items.get('state'))
  }
  if (path.startsWith('/root:/')) {
    const item = [...items.values()].find(item => item.path === path.slice(7))
    return item ? json(item) : json({}, 404)
  }
  const match = path.match(/^\/items\/([^/]+)(?:\/(children|content))?$/)
  assert.ok(match, `Unexpected mock request ${method} ${path}`)
  const [, id, action] = match
  if (action === 'content') return new Response(stateBytes)
  if (!action) return items.has(id) ? json(items.get(id)) : json({}, 404)
  if (method === 'GET') return json({ value: [...items.values()].filter(item => item.parentId === id) })
  const body = JSON.parse(init.body)
  const parent = items.get(id)
  const item = { id: `item-${items.size}`, name: body.name, folder: {}, parentId: id, path: [parent.path, body.name].filter(Boolean).join('/') }
  items.set(item.id, item)
  return json(item, 201)
}
const { createClient, getClientByOid } = await import('./clients.js')
const { updateState } = await import('./store.js')

test('fictitious client provisioning persists to SharePoint and creates all seven folders', async () => {
  const result = await createClient({ organization: 'Fictitious QA Company', fullName: 'Test Contact', email: 'qa@example.com', graphToken: 'fake-delegated-token-for-test' })
  assert.ok(result.temporaryPassword)
  assert.equal((await getClientByOid(result.client.id)).email, 'qa@example.com')
  const stored = JSON.parse(stateBytes).clients.find(client => client.oid === result.client.id)
  assert.ok(stored.folderId)
  assert.equal([...items.values()].filter(item => item.parentId === stored.folderId).length, 7)
  assert.ok(!stateBytes.includes(result.temporaryPassword))
  await assert.rejects(createClient({ organization: 'Duplicate', fullName: 'Test', email: 'QA@example.com', graphToken: 'fake-delegated-token-for-test' }), /already exists/)
  assert.equal(identityCount, 1)
  forceConflict = true
  await updateState(current => { current.clients.find(client => client.oid === result.client.id).phone = 'Test only'; return current })
  assert.equal((await getClientByOid(result.client.id)).phone, 'Test only')
})
