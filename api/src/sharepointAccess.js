export const CLIENT_LIBRARY_FOLDERS = [
  'Permanent',
  'Accounting',
  'Tax',
  'Advisory',
  'Workpapers',
  'Client Shared',
  'Client Uploads',
]

export const CLIENT_VISIBLE_FOLDERS = ['Client Shared', 'Client Uploads']
export const PORTAL_STATE_FOLDER = '_portal'

const forbiddenName = /["*:<>?/\\|]/g

export function sanitizeSharePointName(value, fallback = 'document') {
  const cleaned = String(value || '')
    .replace(forbiddenName, '-')
    .replace(/\.+$/g, '')
    .trim()
    .slice(0, 200)
  return cleaned || fallback
}

export function clientFolderName(organization, oid) {
  const org = sanitizeSharePointName(organization, 'Client')
  const suffix = String(oid || '').replace(/-/g, '').slice(0, 8)
  return suffix ? `${org} [${suffix}]` : org
}

export function folderForUpload(role, category) {
  if (role === 'client') return 'Client Uploads'
  const map = {
    'Tax Returns': 'Tax',
    Organizers: 'Tax',
    'Financial Statements': 'Accounting',
    Payroll: 'Accounting',
    'Engagement Letters': 'Permanent',
    Correspondence: 'Client Shared',
    Other: 'Workpapers',
    Permanent: 'Permanent',
    Accounting: 'Accounting',
    Tax: 'Tax',
    Advisory: 'Advisory',
    Workpapers: 'Workpapers',
    'Client Shared': 'Client Shared',
    'Client Uploads': 'Client Uploads',
  }
  return map[category] || 'Workpapers'
}

export function canRoleReadFolder(role, folderName) {
  if (role === 'admin') return CLIENT_LIBRARY_FOLDERS.includes(folderName)
  return role === 'client' && CLIENT_VISIBLE_FOLDERS.includes(folderName)
}

export function canRoleWriteFolder(role, folderName) {
  if (role === 'admin') return CLIENT_LIBRARY_FOLDERS.includes(folderName)
  return role === 'client' && folderName === 'Client Uploads'
}

export function itemIsUnderClientFolder(item, clientFolderId, clientFolderNameValue) {
  if (!item || !clientFolderId) return false
  if (item.id === clientFolderId) return true
  if (item.parentReference?.id === clientFolderId) return true
  const path = decodeURIComponent(String(item.parentReference?.path || ''))
  if (!path) return false
  const escaped = clientFolderNameValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`root:/${escaped}(?:/|$)`).test(path)
}

export function parentFolderName(item, clientFolderNameValue) {
  const path = decodeURIComponent(String(item.parentReference?.path || ''))
  const escaped = clientFolderNameValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = path.match(new RegExp(`root:/${escaped}/([^/]+)`))
  if (match) return match[1]
  return item.parentReference?.name || ''
}

export function canAccessItem(role, item, clientFolderId, clientFolderNameValue) {
  if (!itemIsUnderClientFolder(item, clientFolderId, clientFolderNameValue)) return false
  if (item.folder) return canRoleReadFolder(role, item.name)
  const folder = parentFolderName(item, clientFolderNameValue)
  return canRoleReadFolder(role, folder)
}
