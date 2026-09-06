import { PublicClientApplication } from '@azure/msal-browser'

export const tenantId = 'd13486fb-c6cb-40ad-9587-8d71585c135b'
export const clientUserId = 'e7468903-52b6-4e96-97ca-239c0ec6188a'
export const auth = new PublicClientApplication({
  auth: {
    clientId: '728b382c-e6b6-4b99-bd67-8e24bc45d352',
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
