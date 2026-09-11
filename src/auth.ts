import { PublicClientApplication } from '@azure/msal-browser'
import type { ClientProfile } from './types'

export const tenantId = 'd13486fb-c6cb-40ad-9587-8d71585c135b'
export const clientId = '728b382c-e6b6-4b99-bd67-8e24bc45d352'
let portalRole: 'admin' | 'client' | null = null
let portalClient: ClientProfile | null = null
export const apiScope = `api://${clientId}/access_as_user`
export const graphUserScope = 'https://graph.microsoft.com/User.ReadWrite.All'
export const loginScopes = ['openid', 'profile', 'email', apiScope]

export const auth = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://clarumclients.ciamlogin.com/${tenantId}`,
    knownAuthorities: ['clarumclients.ciamlogin.com', `${tenantId}.ciamlogin.com`],
    redirectUri: `${window.location.origin}/`,
    postLogoutRedirectUri: `${window.location.origin}/`,
  },
  cache: { cacheLocation: 'sessionStorage' },
})

export async function initializeAuth() {
  await auth.initialize()
  const result = await auth.handleRedirectPromise()
  const account = result?.account ?? auth.getAllAccounts()[0] ?? null
  auth.setActiveAccount(account)
  portalRole = null
  portalClient = null
  if (!account || account.tenantId !== tenantId) return
  const token = await getApiToken()
  const response = await fetch('/api/profile', {
    headers: { 'X-Portal-Authorization': `Bearer ${token}` },
  })
  if (response.status === 403) return
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error || `The portal could not load your profile (${response.status}).`)
  }
  const profile = await response.json() as { role: string; client: ClientProfile | null }
  if (profile.role === 'admin') portalRole = 'admin'
  if (profile.role === 'client' && profile.client?.id === account.idTokenClaims?.oid) {
    portalRole = 'client'
    portalClient = profile.client
  }
}

export function isClientAccount() {
  return portalRole === 'client'
}

export function getSignedInClient() {
  if (!portalClient) throw new Error('Client sign-in required')
  return portalClient
}

export function isAdminAccount() {
  return portalRole === 'admin'
}

export function isPortalAccount() {
  return isClientAccount() || isAdminAccount()
}

export async function getApiToken() {
  const account = auth.getActiveAccount()
  if (!account) throw new Error('Sign-in required')
  try {
    const result = await auth.acquireTokenSilent({ account, scopes: [apiScope] })
    return result.accessToken
  } catch {
    await auth.acquireTokenRedirect({ account, scopes: [apiScope] })
    throw new Error('Sign-in needs to be refreshed. Please try again after Microsoft sign-in completes.')
  }
}

export async function getGraphToken() {
  const account = auth.getActiveAccount()
  if (!account) throw new Error('Sign-in required')
  try {
    const result = await auth.acquireTokenSilent({ account, scopes: [graphUserScope] })
    return result.accessToken
  } catch {
    try {
      const result = await auth.acquireTokenPopup({ account, scopes: [graphUserScope] })
      return result.accessToken
    } catch {
      throw new Error(
        'Microsoft must allow this portal to create accounts. In Entra, add delegated User.ReadWrite.All to CLARUM Client Portal, grant admin consent, then try again.',
      )
    }
  }
}
