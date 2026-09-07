// Static Microsoft Entra External ID (CIAM) configuration for the CLARUM Clients tenant.
// These are application/tenant identifiers, not secrets, and are safe to keep in source.

export const tenantId = 'd13486fb-c6cb-40ad-9587-8d71585c135b'
export const clientId = '728b382c-e6b6-4b99-bd67-8e24bc45d352'
export const apiAudience = `api://${clientId}`

// Primary domain of the CIAM tenant, used when creating local accounts via Microsoft Graph.
export const ciamTenantDomain = 'clarumclients.onmicrosoft.com'
