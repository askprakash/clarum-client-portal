export const tenantId = 'd13486fb-c6cb-40ad-9587-8d71585c135b'
export const clientId = '728b382c-e6b6-4b99-bd67-8e24bc45d352'
export const apiAudience = `api://${clientId}`

export const allowedClients = {
  'e7468903-52b6-4e96-97ca-239c0ec6188a': {
    id: 'e7468903-52b6-4e96-97ca-239c0ec6188a',
    fullName: 'PRC ANALYTICS INC',
    title: 'Client',
    organization: 'PRC ANALYTICS INC',
    email: 'prakash@prcanalytics.com',
    phone: 'Not provided',
    mailingAddress: 'Not provided',
    clientSince: 'Not provided',
    engagements: [],
    preferredContact: 'Email',
  },
}

export function getAllowedClient(oid) {
  return allowedClients[oid] ?? null
}
