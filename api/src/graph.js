// Provisions local accounts in the CLARUM Clients tenant via Microsoft Graph.
// Prefers the signed-in administrator's delegated token (X-Graph-Authorization) so
// no extra app registration or client secret is required. App-only CIAM_GRAPH_CLIENT_*
// credentials remain supported if they are configured.

import { randomBytes } from 'node:crypto'
import { ciamTenantDomain, tenantId as ciamTenantId } from './config.js'

const tokenTenantId = process.env.CIAM_GRAPH_TENANT_ID || ciamTenantId

function requireGraphCredentials() {
  const clientId = process.env.CIAM_GRAPH_CLIENT_ID
  const clientSecret = process.env.CIAM_GRAPH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'Microsoft must allow this portal to create accounts. Sign in again if prompted, then retry.',
    )
  }
  return { clientId, clientSecret }
}

let cachedToken = null

async function getAppGraphToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token
  }
  const { clientId, clientSecret } = requireGraphCredentials()
  const response = await fetch(`https://login.microsoftonline.com/${tokenTenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  })
  if (!response.ok) {
    throw new Error('Could not authenticate with Microsoft Graph for account provisioning')
  }
  const body = await response.json()
  cachedToken = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 }
  return cachedToken.token
}

async function resolveGraphToken(graphToken) {
  // Account provisioning requires application permission. A delegated token can
  // authenticate the portal user but may not have a directory role that permits
  // creating users, even when the app registration has User.ReadWrite.All.
  // Prefer the confidential app token whenever its credentials are configured.
  if (process.env.CIAM_GRAPH_CLIENT_ID && process.env.CIAM_GRAPH_CLIENT_SECRET) {
    return getAppGraphToken()
  }
  if (typeof graphToken === 'string' && graphToken.length > 20) return graphToken
  return getAppGraphToken()
}

function generateTemporaryPassword() {
  const raw = randomBytes(18).toString('base64').replace(/[+/=]/g, '')
  return `Clarum-${raw.slice(0, 16)}!7`
}

function mailNicknameFor(email) {
  const local = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || 'client'
  const suffix = randomBytes(3).toString('hex')
  return `${local}${suffix}`.slice(0, 64)
}

function graphError(detail, fallback) {
  const lowered = detail.toLowerCase()
  if (lowered.includes('insufficient') || lowered.includes('authorization_requestdenied') || lowered.includes('403')) {
    return 'Microsoft did not allow this portal to create the account. Grant User.ReadWrite.All for CLARUM Client Portal, then sign in again.'
  }
  if (lowered.includes('already exists') || lowered.includes('objectconflict') || lowered.includes('another object')) {
    return 'An account with this email already exists in Microsoft Entra'
  }
  return `${fallback}: ${detail.slice(0, 300) || 'request failed'}`
}

export function graphTokenFromRequest(request, body) {
  const names = ['x-graph-authorization', 'X-Graph-Authorization']
  for (const name of names) {
    const header = request.headers.get(name)
    if (!header) continue
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : header.trim()
    if (token) return token
  }
  if (body && typeof body.graphAccessToken === 'string') return body.graphAccessToken.trim()
  return ''
}

export async function createLocalAccount({ email, displayName, graphToken }) {
  const token = await resolveGraphToken(graphToken)
  const password = generateTemporaryPassword()
  const mailNickname = mailNicknameFor(email)
  const response = await fetch('https://graph.microsoft.com/v1.0/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountEnabled: true,
      displayName,
      mailNickname,
      userPrincipalName: `${mailNickname}@${ciamTenantDomain}`,
      identities: [
        {
          signInType: 'emailAddress',
          issuer: ciamTenantDomain,
          issuerAssignedId: email,
        },
      ],
      passwordProfile: {
        password,
        forceChangePasswordNextSignIn: false,
      },
      passwordPolicies: 'DisablePasswordExpiration',
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(graphError(detail, 'Could not create the account in Microsoft Entra'))
  }
  const created = await response.json()
  return { oid: created.id, temporaryPassword: password }
}

export async function setAccountEnabled(oid, enabled, graphToken) {
  const token = await resolveGraphToken(graphToken)
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${oid}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountEnabled: enabled }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(graphError(detail, 'Could not update the account in Microsoft Entra'))
  }
}
