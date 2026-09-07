export type AppView = 'clients' | 'staff' | 'dashboard' | 'documents' | 'upload' | 'profile'

export type DocumentCategory =
  | 'Tax Returns'
  | 'Organizers'
  | 'Financial Statements'
  | 'Engagement Letters'
  | 'Payroll'
  | 'Correspondence'

export type DocumentStatus = 'available' | 'needs_attention' | 'pending_review'

export type ActivityType = 'upload' | 'review' | 'request' | 'notice'

export interface ClientProfile {
  id: string
  fullName: string
  title: string
  organization: string
  email: string
  phone: string
  mailingAddress: string
  clientSince: string
  engagements: string[]
  preferredContact: 'Email' | 'Phone'
  status?: 'active' | 'disabled'
}

export interface StaffMember {
  id: string
  displayName: string
  email: string
  status: 'active' | 'disabled'
}

export interface NewClientInput {
  organization: string
  fullName: string
  email: string
  phone?: string
  mailingAddress?: string
  preferredContact: 'Email' | 'Phone'
}

export interface NewStaffInput {
  displayName: string
  email: string
}

export interface ProvisionedAccount {
  email: string
  temporaryPassword: string
}

export interface ClientDocument {
  id: string
  name: string
  category: DocumentCategory
  date: string
  status: DocumentStatus
  attentionReason?: string
  fileType: string
}

export interface ActivityItem {
  id: string
  timestamp: string
  title: string
  detail: string
  type: ActivityType
}
