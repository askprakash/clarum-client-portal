import { getApiToken, getGraphToken, isAdminAccount, isClientAccount, getSignedInClient } from '../auth'
import type {
  ActivityItem,
  ClientDocument,
  ClientProfile,
  DocumentCategory,
  NewClientInput,
  NewStaffInput,
  ProvisionedAccount,
  StaffMember,
} from '../types'

const actingClientKey = 'clarum-acting-client'

let actingClientId: string | null = sessionStorage.getItem(actingClientKey)
let cachedClients: ClientProfile[] = []

function setActingClientId(id: string | null) {
  actingClientId = id
  if (id) sessionStorage.setItem(actingClientKey, id)
  else sessionStorage.removeItem(actingClientKey)
}

async function authorizedFetch(path: string, init: RequestInit = {}, graphToken?: string) {
  const token = await getApiToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('X-Authorization', `Bearer ${token}`)
  headers.set('X-Portal-Authorization', `Bearer ${token}`)
  if (graphToken) {
    headers.set('X-Graph-Authorization', `Bearer ${graphToken}`)
  }
  const response = await fetch(path, { ...init, headers })
  if (!response.ok) {
    let message = `The portal could not complete this request (${response.status}).`
    const text = await response.text()
    try {
      const body = JSON.parse(text) as { error?: string; detail?: string }
      if (body.error) message = body.detail ? `${body.error} (${body.detail})` : body.error
    } catch {
      // A platform or proxy failure may return plain text rather than API JSON.
      const detail = text.replace(/<[^>]+>/g, ' ').trim().slice(0, 180)
      if (detail) message += ` ${detail}`
    }
    throw new Error(message)
  }
  return response
}

async function authorizedJsonFetch<T>(
  path: string,
  method: string,
  body?: unknown,
  options: { graph?: boolean } = {},
): Promise<T> {
  const graphToken = options.graph ? await getGraphToken() : undefined
  const payload =
    graphToken && body && typeof body === 'object'
      ? { ...(body as Record<string, unknown>), graphAccessToken: graphToken }
      : body
  const response = await authorizedFetch(
    path,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    },
    graphToken,
  )
  return (await response.json()) as T
}

function documentsPath(params: Record<string, string> = {}) {
  const search = new URLSearchParams(params)
  if (isAdminAccount()) {
    if (!actingClientId) throw new Error('Choose a client')
    search.set('clientId', actingClientId)
  }
  const query = search.toString()
  return query ? `/api/documents?${query}` : '/api/documents'
}

export const portalService = {
  getActingClientId() {
    return actingClientId
  },

  setActingClient(id: string | null) {
    setActingClientId(id)
  },

  getCurrentClient(): ClientProfile {
    if (isClientAccount()) return getSignedInClient()
    if (isAdminAccount()) {
      const selected = cachedClients.find((client) => client.id === actingClientId)
      if (selected) return selected
      throw new Error('Choose a client')
    }
    throw new Error('Client sign-in required')
  },

  async listClients(): Promise<ClientProfile[]> {
    const response = await authorizedFetch('/api/clients')
    const body = (await response.json()) as { clients: ClientProfile[] }
    cachedClients = body.clients
    return cachedClients
  },

  async createClient(input: NewClientInput): Promise<ProvisionedAccount> {
    const body = await authorizedJsonFetch<{ temporaryPassword: string }>(
      '/api/firm/clients',
      'POST',
      input,
      { graph: true },
    )
    return { email: input.email, temporaryPassword: body.temporaryPassword }
  },

  async setClientStatus(oid: string, status: 'active' | 'disabled'): Promise<void> {
    await authorizedJsonFetch('/api/firm/clients/' + encodeURIComponent(oid), 'PATCH', { status }, { graph: true })
  },

  async updateClient(oid: string, input: NewClientInput): Promise<ClientProfile> {
    const body = await authorizedJsonFetch<{ client: ClientProfile }>(
      '/api/firm/clients/' + encodeURIComponent(oid) + '/profile', 'PATCH', input,
    )
    cachedClients = cachedClients.map((client) => client.id === oid ? body.client : client)
    return body.client
  },

  async listStaff(): Promise<StaffMember[]> {
    const body = await authorizedJsonFetch<{ staff: StaffMember[] }>('/api/firm/staff', 'GET')
    return body.staff
  },

  async createStaff(input: NewStaffInput): Promise<ProvisionedAccount> {
    const body = await authorizedJsonFetch<{ temporaryPassword: string }>(
      '/api/firm/staff',
      'POST',
      input,
      { graph: true },
    )
    return { email: input.email, temporaryPassword: body.temporaryPassword }
  },

  async setStaffStatus(oid: string, status: 'active' | 'disabled'): Promise<void> {
    await authorizedJsonFetch('/api/firm/staff/' + encodeURIComponent(oid), 'PATCH', { status }, { graph: true })
  },

  async updateStaff(oid: string, displayName: string): Promise<StaffMember> {
    const body = await authorizedJsonFetch<{ staff: StaffMember }>(
      '/api/firm/staff/' + encodeURIComponent(oid) + '/profile', 'PATCH', { displayName },
    )
    return body.staff
  },

  async listDocuments(): Promise<ClientDocument[]> {
    const response = await authorizedFetch(documentsPath())
    const body = (await response.json()) as { documents: ClientDocument[] }
    return [...body.documents].sort((a, b) => b.date.localeCompare(a.date))
  },

  async listRecentDocuments(limit = 4): Promise<ClientDocument[]> {
    return (await this.listDocuments()).slice(0, limit)
  },

  async listDocumentsNeedingAttention(): Promise<ClientDocument[]> {
    return (await this.listDocuments()).filter((doc) => doc.status === 'needs_attention')
  },

  listActivity(): ActivityItem[] {
    return []
  },

  async uploadDocument(file: File, category: DocumentCategory | 'Other') {
    const data = new FormData()
    data.set('file', file)
    data.set('category', category)
    const response = await authorizedFetch(documentsPath(), { method: 'POST', body: data })
    return (await response.json()) as { document: ClientDocument }
  },

  async openDocument(document: ClientDocument, download = false) {
    const token = await getApiToken()
    const response = await fetch(documentsPath({ id: document.id, ...(download ? { download: '1' } : {}) }), {
      headers: { Authorization: `Bearer ${token}`, 'X-Authorization': `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('The document could not be opened.')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    if (download) {
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.name
      link.click()
      URL.revokeObjectURL(url)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
