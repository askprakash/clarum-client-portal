import { activities, currentClient, documents } from '../data/mockData'
import type { ActivityItem, ClientDocument, ClientProfile } from '../types'

/**
 * Client-portal data access.
 *
 * This mock implementation will later be replaced with calls to Azure Functions,
 * Microsoft Graph, and SharePoint. Keep page components dependent on this
 * module rather than on mock files directly.
 */
export const portalService = {
  getCurrentClient(): ClientProfile {
    return currentClient
  },

  listDocuments(): ClientDocument[] {
    return [...documents].sort((a, b) => b.date.localeCompare(a.date))
  },

  listRecentDocuments(limit = 4): ClientDocument[] {
    return this.listDocuments().slice(0, limit)
  },

  listDocumentsNeedingAttention(): ClientDocument[] {
    return this.listDocuments().filter((doc) => doc.status === 'needs_attention')
  },

  listActivity(limit = 6): ActivityItem[] {
    return [...activities]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit)
  },
}
