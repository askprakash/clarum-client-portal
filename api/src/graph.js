// Provisions and manages local accounts in the CLARUM Clients (Entra External ID / CIAM)
// tenant via Microsoft Graph, using an app-only (client credentials) service principal.
// This is a DIFFERENT app registration from the one clients/staff sign in through
// (see SETUP.md) — it exists only for this server-side provisioning.

import { randomBytes } from 'node:crypto'
import { ciamTenantDomain, tenantId as ciamTenantId } from './config.js'

const tokenTenantId = process.env.GRAPH_TENANT_ID || ciamTenantId

function requireGraphCredentials() {
  const clientId = process.env.GRAPH_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'Account provisioning is not configured (GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET app settings are missing)',
    )
  }
  return { clientId, clientSecret }
}

let cachedToken = null

async function getGraphToken() {
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

function generateTemporaryPassword() {
  const raw = randomBytes(18).toString('base64').replace(/[+/=]/g, '')
  // Guarantee upper/lower/digit/symbol so it always satisfies Entra's default complexity policy.
  return `Clarum-${raw.slice(0, 16)}!7`
}

export async function createLocalAccount({ email, displayName }) {
  const token = await getGraphToken()
  const password = generateTemporaryPassword()
  const response = await fetch('https://graph.microsoft.com/v1.0/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountEnabled: true,
      displayName,
      identities: [
        {
          signInType: 'emailAddress',
          issuer: ciamTenantDomain,
          issuerAssignedId: email,
        },
      ],
      passwordProfile: {
        password,
        forceChangePasswordNextSignIn: true,
      },
      passwordPolicies: 'DisablePasswordExpiration',
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Could not create the account in Microsoft Entra: ${detail.slice(0, 300) || response.statusText}`)
  }
  const created = await response.json()
  return { oid: created.id, temporaryPassword: password }
}

export async function setAccountEnabled(oid, enabled) {
  const token = await getGraphToken()
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${oid}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountEnabled: enabled }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Could not update the account in Microsoft Entra: ${detail.slice(0, 300) || response.statusText}`)
  }
}
