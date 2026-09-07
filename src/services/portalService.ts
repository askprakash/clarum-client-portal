import { getApiToken, isAdminAccount, isClientAccount, clientUserId } from '../auth'
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

const fallbackClient: ClientProfile = {
  id: clientUserId,
  fullName: 'PRC ANALYTICS INC',
  title: 'Client',
  organization: 'PRC ANALYTICS INC',
  email: 'prakash@prcanalytics.com',
  phone: 'Not provided',
  mailingAddress: 'Not provided',
  clientSince: 'Not provided',
  engagements: [],
  preferredContact: 'Email',
}

const actingClientKey = 'clarum-acting-client'

let actingClientId: string | null = sessionStorage.getItem(actingClientKey)
let cachedClients: ClientProfile[] = []

function setActingClientId(id: string | null) {
  actingClientId = id
  if (id) sessionStorage.setItem(actingClientKey, id)
  else sessionStorage.removeItem(actingClientKey)
}

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const token = await getApiToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(path, { ...init, headers })
  if (!response.ok) {
    let message = 'The document service could not complete this request.'
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // Use the default message when the API does not return JSON.
    }
    throw new Error(message)
  }
  return response
}

async function authorizedJsonFetch<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await authorizedFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
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
    if (isClientAccount()) return fallbackClient
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
    const body = await authorizedJsonFetch<{ temporaryPassword: string }>('/api/admin/clients', 'POST', input)
    return { email: input.email, temporaryPassword: body.temporaryPassword }
  },

  async setClientStatus(oid: string, status: 'active' | 'disabled'): Promise<void> {
    await authorizedJsonFetch('/api/admin/clients/' + encodeURIComponent(oid), 'PATCH', { status })
  },

  async listStaff(): Promise<StaffMember[]> {
    const body = await authorizedJsonFetch<{ staff: StaffMember[] }>('/api/admin/staff', 'GET')
    return body.staff
  },

  async createStaff(input: NewStaffInput): Promise<ProvisionedAccount> {
    const body = await authorizedJsonFetch<{ temporaryPassword: string }>('/api/admin/staff', 'POST', input)
    return { email: input.email, temporaryPassword: body.temporaryPassword }
  },

  async setStaffStatus(oid: string, status: 'active' | 'disabled'): Promise<void> {
    await authorizedJsonFetch('/api/admin/staff/' + encodeURIComponent(oid), 'PATCH', { status })
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
      headers: { Authorization: `Bearer ${token}` },
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
