import { createRemoteJWKSet, jwtVerify } from 'jose'
import { apiAudience, clientId, tenantId } from './config.js'
import { getActiveClientByOid } from './clients.js'
import { bootstrapFirstAdmin, getActiveStaffByOid } from './staff.js'

const jwksCache = new Map()

function getJwks(url) {
  let jwks = jwksCache.get(url)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url))
    jwksCache.set(url, jwks)
  }
  return jwks
}

const trustedIssuers = [
  `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`,
  `https://clarumclients.ciamlogin.com/${tenantId}/v2.0`,
  `https://login.microsoftonline.com/${tenantId}/v2.0`,
]
const keyUrls = [
  `https://clarumclients.ciamlogin.com/${tenantId}/discovery/v2.0/keys`,
  `https://${tenantId}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`,
  `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
]

function tokenFromHeader(header) {
  if (!header) return ''
  const value = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : header.trim()
  return value.split('.').length === 3 && value.length > 80 ? value : ''
}

export function portalTokens(request) {
  // Azure can supply its own Authorization header when proxying to Functions.
  // Prefer the explicit portal header, but verify every candidate before trusting it.
  return [...new Set(['x-portal-authorization', 'x-authorization', 'authorization']
    .map((name) => tokenFromHeader(request.headers.get(name))).filter(Boolean))]
}

export async function verifyAccessToken(token) {
  let lastError
  for (const url of keyUrls) {
    try {
      const result = await jwtVerify(token, getJwks(url), {
        audience: [clientId, apiAudience],
        issuer: trustedIssuers,
        clockTolerance: 120,
      })
      if (result.payload.tid !== tenantId) throw new Error('Unexpected tenant')
      return result
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Token verification failed')
}

function emailsFromPayload(payload) {
  const values = []
  if (typeof payload.preferred_username === 'string') values.push(payload.preferred_username)
  if (typeof payload.email === 'string') values.push(payload.email)
  if (typeof payload.upn === 'string') values.push(payload.upn)
  if (typeof payload.unique_name === 'string') values.push(payload.unique_name)
  if (Array.isArray(payload.emails)) {
    for (const email of payload.emails) {
      if (typeof email === 'string') values.push(email)
    }
  }
  return values.map((email) => email.trim().toLowerCase()).filter(Boolean)
}

export async function authorizePortal(request) {
  const tokens = portalTokens(request)
  if (!tokens.length) return { status: 401, body: { error: 'Sign-in required' } }

  let payload
  let failure
  for (const token of tokens) {
    try {
      ;({ payload } = await verifyAccessToken(token))
      break
    } catch (error) {
      failure = error
    }
  }
  if (!payload) {
    return { status: 401, body: {
      error: 'The sign-in token is not valid',
      detail: typeof failure?.code === 'string' ? failure.code : 'Token verification failed',
    } }
  }

  if (payload.tid !== tenantId) {
    return { status: 403, body: { error: 'This account is not in the CLARUM Clients tenant' } }
  }

  const oid = typeof payload.oid === 'string' ? payload.oid : ''
  if (!oid) {
    return { status: 403, body: { error: 'This account is not assigned to the portal' } }
  }

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SharePoint storage failed'
    return { status: 503, body: { error: message } }
  }

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
  if (auth.role === 'client') return { client: auth.client, role: auth.role, oid: auth.oid }
  const scoped = await resolveClient(auth, request)
  if (scoped.status) return scoped
  return { client: scoped, role: auth.role, oid: auth.oid }
}

export function json(status, body) {
  return {
    status,
    jsonBody: body,
    headers: { 'Cache-Control': 'no-store' },
  }
}
