import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
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

function jwksUrlsForIssuer(iss) {
  const urls = [
    `https://clarumclients.ciamlogin.com/${tenantId}/discovery/v2.0/keys`,
    `https://${tenantId}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`,
    `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  ]
  if (typeof iss === 'string' && iss.startsWith('https://')) {
    try {
      const parsed = new URL(iss)
      const tenantPart = parsed.pathname.split('/').filter(Boolean)[0]
      if (tenantPart) {
        urls.unshift(`${parsed.origin}/${tenantPart}/discovery/v2.0/keys`)
      }
    } catch {
      // Ignore malformed issuer values and keep the default key endpoints.
    }
  }
  return [...new Set(urls)]
}

function looksLikeJwt(value) {
  return value.split('.').length === 3 && value.length > 80
}

function tokenFromHeader(header) {
  if (!header) return ''
  const value = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : header.trim()
  return looksLikeJwt(value) ? value : ''
}

function bearerToken(request) {
  const names = ['authorization', 'Authorization', 'x-authorization', 'X-Authorization']
  for (const name of names) {
    const token = tokenFromHeader(request.headers.get(name))
    if (token) return token
  }
  return ''
}

async function verifyAccessToken(token) {
  let iss
  try {
    iss = decodeJwt(token).iss
  } catch {
    iss = undefined
  }

  const options = {
    audience: [clientId, apiAudience],
    clockTolerance: 120,
  }

  let lastError
  for (const url of jwksUrlsForIssuer(iss)) {
    try {
      return await jwtVerify(token, getJwks(url), options)
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
  if (Array.isArray(payload.emails)) {
    for (const email of payload.emails) {
      if (typeof email === 'string') values.push(email)
    }
  }
  return values.map((email) => email.trim().toLowerCase()).filter(Boolean)
}

export async function authorizePortal(request) {
  const token = bearerToken(request)
  if (!token) {
    return { status: 401, body: { error: 'Sign-in required' } }
  }

  let payload
  try {
    ;({ payload } = await verifyAccessToken(token))
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
    const message = error instanceof Error ? error.message : ''
    if (message.includes('AZURE_SQL') || message.includes('Database is not configured')) {
      return { status: 503, body: { error: 'The portal database is not configured yet' } }
    }
    throw error
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
