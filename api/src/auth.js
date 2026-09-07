import { createRemoteJWKSet, jwtVerify } from 'jose'
import { apiAudience, clientId, tenantId } from './config.js'
import { getActiveClientByOid } from './clients.js'
import { bootstrapFirstAdmin, getActiveStaffByOid } from './staff.js'

const issuers = [
  `https://clarumclients.ciamlogin.com/${tenantId}/v2.0`,
  `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`,
  `https://login.microsoftonline.com/${tenantId}/v2.0`,
]

const jwks = createRemoteJWKSet(
  new URL(`https://clarumclients.ciamlogin.com/${tenantId}/discovery/v2.0/keys`),
)

function emailsFromPayload(payload) {
  const values = []
  if (typeof payload.preferred_username === 'string') values.push(payload.preferred_username)
  if (typeof payload.email === 'string') values.push(payload.email)
  if (typeof payload.upn === 'string') values.push(payload.upn)
  if (Array.isArray(payload.emails)) {
    for (const email of payload.emails) {
      if (typeof email === 'string') values.push(email)
    }
  }
  return values.map((email) => email.trim().toLowerCase()).filter(Boolean)
}

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
  if (!oid) {
    return { status: 403, body: { error: 'This account is not assigned to the portal' } }
  }

  let staff = await getActiveStaffByOid(oid)
  if (!staff) {
    staff = await bootstrapFirstAdmin({
      oid,
      emails: emailsFromPayload(payload),
      displayName: typeof payload.name === 'string' ? payload.name : undefined,
    })
  }
  if (staff) return { role: 'admin', oid, staff }

  const client = await getActiveClientByOid(oid)
  if (client) return { role: 'client', oid, client }

  return { status: 403, body: { error: 'This account is not assigned to the portal' } }
}

export async function resolveClient(auth, request, form) {
  if (auth.role === 'client') return auth.client

  const clientOid =
    request.query.get('clientId') ||
    (form && typeof form.get === 'function' ? String(form.get('clientId') || '') : '')
  if (!clientOid) {
    return { status: 400, body: { error: 'Choose a client' } }
  }
  const client = await getActiveClientByOid(clientOid)
  if (!client) {
    return { status: 400, body: { error: 'Choose a client' } }
  }
  return client
}

export async function authorizeClient(request) {
  const auth = await authorizePortal(request)
  if (auth.status) return auth
  if (auth.role === 'client') return { client: auth.client, role: auth.role }
  const scoped = await resolveClient(auth, request)
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
