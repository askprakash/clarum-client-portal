import { createRemoteJWKSet, jwtVerify } from 'jose'
import { apiAudience, clientId, getAllowedClient, tenantId } from './clients.js'

const issuers = [
  `https://clarumclients.ciamlogin.com/${tenantId}/v2.0`,
  `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`,
  `https://login.microsoftonline.com/${tenantId}/v2.0`,
]

const jwks = createRemoteJWKSet(
  new URL(`https://clarumclients.ciamlogin.com/${tenantId}/discovery/v2.0/keys`),
)

export async function authorizeClient(request) {
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
  const client = getAllowedClient(oid)
  if (!client) {
    return { status: 403, body: { error: 'This account is not assigned to the portal' } }
  }

  return { client }
}

export function json(status, body) {
  return {
    status,
    jsonBody: body,
    headers: { 'Cache-Control': 'no-store' },
  }
}
