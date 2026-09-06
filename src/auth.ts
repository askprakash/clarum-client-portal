import { PublicClientApplication } from '@azure/msal-browser'

export const tenantId = 'd13486fb-c6cb-40ad-9587-8d71585c135b'
export const clientId = '728b382c-e6b6-4b99-bd67-8e24bc45d352'
export const clientUserId = 'e7468903-52b6-4e96-97ca-239c0ec6188a'
export const apiScope = `api://${clientId}/access_as_user`
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
}

export function isClientAccount() {
  const account = auth.getActiveAccount()
  return account?.tenantId === tenantId && account.idTokenClaims?.oid === clientUserId
}

export async function getApiToken() {
  const account = auth.getActiveAccount()
  if (!account) throw new Error('Sign-in required')
  const result = await auth.acquireTokenSilent({ account, scopes: [apiScope] })
  return result.accessToken
}
