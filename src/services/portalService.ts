import { getApiToken, isClientAccount, clientUserId } from '../auth'
import type { ActivityItem, ClientDocument, ClientProfile, DocumentCategory } from '../types'

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

export const portalService = {
  getCurrentClient(): ClientProfile {
    if (!isClientAccount()) throw new Error('Client sign-in required')
    return fallbackClient
  },

  async listDocuments(): Promise<ClientDocument[]> {
    const response = await authorizedFetch('/api/documents')
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
    const response = await authorizedFetch('/api/documents', { method: 'POST', body: data })
    return (await response.json()) as { document: ClientDocument }
  },

  async openDocument(document: ClientDocument, download = false) {
    const token = await getApiToken()
    const response = await fetch(
      `/api/documents?id=${encodeURIComponent(document.id)}${download ? '&download=1' : ''}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
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
