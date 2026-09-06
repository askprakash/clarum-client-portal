import { createRemoteJWKSet, jwtVerify } from 'jose'
import {
  apiAudience,
  clientId,
  getAllowedClient,
  isAdminPayload,
  tenantId,
} from './clients.js'

const issuers = [
  `https://clarumclients.ciamlogin.com/${tenantId}/v2.0`,
  `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`,
  `https://login.microsoftonline.com/${tenantId}/v2.0`,
]

const jwks = createRemoteJWKSet(
  new URL(`https://clarumclients.ciamlogin.com/${tenantId}/discovery/v2.0/keys`),
)

export async function authorizePortal(request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return { status: 401, body: { error: 'Sign-in required' } }
  }

  const token = header.slice(7).trim()
  let payload
  try {
    ;({ payload } = await jwtVerify(token, jwks, {
      issuer: issuers,
      audience: [clientId, apiAudience],
      clockTolerance: 60,
    }))
  } catch {
    return { status: 401, body: { error: 'The sign-in token is not valid' } }
  }

  if (payload.tid !== tenantId) {
    return { status: 403, body: { error: 'This account is not in the CLARUM Clients tenant' } }
  }

  const oid = typeof payload.oid === 'string' ? payload.oid : ''
  const admin = isAdminPayload(payload)
  const client = getAllowedClient(oid)
  if (!admin && !client) {
    return { status: 403, body: { error: 'This account is not assigned to the portal' } }
  }

  return { role: admin ? 'admin' : 'client', oid, client }
}

export function resolveClient(auth, request, form) {
  if (auth.role === 'client') return auth.client

  const clientId =
    request.query.get('clientId') ||
    (form && typeof form.get === 'function' ? String(form.get('clientId') || '') : '')
  const client = getAllowedClient(clientId)
  if (!client) {
    return { status: 400, body: { error: 'Choose a client' } }
  }
  return client
}

export async function authorizeClient(request) {
  const auth = await authorizePortal(request)
  if (auth.status) return auth
  if (auth.role === 'client') return { client: auth.client, role: auth.role }
  const scoped = resolveClient(auth, request)
  if (scoped.status) return scoped
  return { client: scoped, role: auth.role }
}

export function json(status, body) {
  return {
    status,
    jsonBody: body,
    headers: { 'Cache-Control': 'no-store' },
  }
}
