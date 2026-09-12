import {
  CLIENT_LIBRARY_FOLDERS,
  PORTAL_STATE_FOLDER,
  canAccessItem,
  canRoleWriteFolder,
  clientFolderName,
  folderForUpload,
  parentFolderName,
  sanitizeSharePointName,
} from './sharepointAccess.js'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function sharepointConfig() {
  return {
    tenantId: requiredEnv('GRAPH_TENANT_ID'),
    clientId: requiredEnv('GRAPH_CLIENT_ID'),
    clientSecret: requiredEnv('GRAPH_CLIENT_SECRET'),
    siteId: requiredEnv('SHAREPOINT_SITE_ID'),
    driveId: requiredEnv('SHAREPOINT_DRIVE_ID'),
  }
}

let cachedToken = null

async function getSharePointToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token
  }
  const { tenantId, clientId, clientSecret } = sharepointConfig()
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  })
  if (!response.ok) {
    throw new Error('Could not authenticate with Microsoft Graph for SharePoint')
  }
  const body = await response.json()
  cachedToken = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 }
  return cachedToken.token
}

async function graph(path, init = {}, options = {}) {
  const { driveId, siteId } = sharepointConfig()
  const url = path.startsWith('https://')
    ? path
    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}${path}`
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${await getSharePointToken()}`)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  let response
  try {
    response = await fetch(url, { ...init, headers, signal: controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('SharePoint request timed out')
    throw error
  } finally {
    clearTimeout(timeout)
  }
  if (response.status === 404 && (!init.method || init.method === 'GET')) return { status: 404, json: null, etag: undefined }
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const lowered = detail.toLowerCase()
    if (response.status === 403 || lowered.includes('accessdenied')) {
      throw new Error(
        'The portal app does not have Sites.Selected write access to the Clarum SharePoint site',
      )
    }
    throw new Error(
      `SharePoint request failed (${response.status}): ${detail.slice(0, 300) || response.statusText}`,
    )
  }
  if (response.status === 204) return { status: 204, json: null, etag: response.headers.get('etag') }
  if (options.raw) {
    return {
      status: response.status,
      buffer: Buffer.from(await response.arrayBuffer()),
      etag: response.headers.get('etag'),
    }
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return { status: response.status, json: await response.json(), etag: response.headers.get('etag') }
  }
  return {
    status: response.status,
    buffer: Buffer.from(await response.arrayBuffer()),
    etag: response.headers.get('etag'),
  }
}

async function getItemByPath(itemPath) {
  const encoded = itemPath
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
  const result = await graph(`/root:/${encoded}`)
  return result.status === 404 ? null : result.json
}

async function createFolder(parentId, name) {
  try {
    const result = await graph(`/items/${parentId}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    })
    return result.json
  } catch (error) {
    const existing = await getChild(parentId, name)
    if (existing?.folder) return existing
    throw error
  }
}

async function getChild(parentId, name) {
  const items = await listChildren(parentId)
  return items.find((item) => item.name === name) || null
}

async function listChildren(parentId) {
  const items = []
  let path = `/items/${parentId}/children?$select=id,name,folder,file,size,createdDateTime,lastModifiedDateTime,parentReference,fileSystemInfo`
  while (path) {
    const result = await graph(path)
    items.push(...(result.json?.value || []))
    path = result.json?.['@odata.nextLink'] || ''
  }
  return items
}

export async function ensureRootFolder(name) {
  const root = await graph('/root')
  const existing = await getChild(root.json.id, name)
  if (existing) return existing
  return createFolder(root.json.id, name)
}

export async function ensureClientLibrary({ oid, organization, folderId, folderName }, createStandardFolders = true) {
  const expectedName = folderName || clientFolderName(organization, oid)
  let folder = null
  if (folderId) {
    const result = await graph(`/items/${encodeURIComponent(folderId)}`)
    folder = result.status === 404 ? null : result.json
  }
  if (!folder) {
    folder = await getItemByPath(expectedName)
  }
  if (!folder) {
    const root = await graph('/root')
    folder = await createFolder(root.json.id, expectedName)
  }
  if (createStandardFolders) {
    for (const name of CLIENT_LIBRARY_FOLDERS) {
      const child = await getChild(folder.id, name)
      if (!child) await createFolder(folder.id, name)
    }
  }
  return { folderId: folder.id, folderName: folder.name }
}

async function getFolderChild(clientFolderId, folderName) {
  const child = await getChild(clientFolderId, folderName)
  if (!child?.folder) throw new Error('The SharePoint client folder is missing')
  return child
}

export async function createClientSubfolder(client, role, parentName, name) {
  if (!canRoleWriteFolder(role, parentName)) throw new Error('You cannot create folders in that area')
  const library = await ensureClientLibrary(client, false)
  const parent = await getFolderChild(library.folderId, parentName)
  const safeName = sanitizeSharePointName(name, '')
  if (!safeName) throw new Error('Enter a folder name')
  const existing = await getChild(parent.id, safeName)
  if (existing) return existing
  return createFolder(parent.id, safeName)
}

function mapDocument(item, folderName, role) {
  const name = item.name || 'document'
  const uploadedAt = item.lastModifiedDateTime || item.createdDateTime || new Date().toISOString()
  return {
    id: item.id,
    name,
    category: folderName,
    date: String(uploadedAt).slice(0, 10),
    status: role === 'admin' && folderName === 'Client Uploads' ? 'needs_attention' : 'available',
    attentionReason:
      role === 'admin' && folderName === 'Client Uploads' ? 'New file uploaded by the client' : undefined,
    fileType: name.includes('.') ? name.split('.').pop().toUpperCase() : 'FILE',
    contentType: item.file?.mimeType || 'application/octet-stream',
  }
}

export async function listDocumentsForClient(client, role) {
  const library = await ensureClientLibrary(client, false)
  const folders = await listChildren(library.folderId)
  const documents = []
  for (const folder of folders) {
    if (!folder.folder) continue
    if (!canAccessItem(role, folder, library.folderId, library.folderName)) continue
    async function collect(parentId, category) {
      const files = await listChildren(parentId)
      for (const file of files) {
        if (file.folder) await collect(file.id, category)
        else documents.push(mapDocument(file, category, role))
      }
    }
    await collect(folder.id, folder.name)
  }
  return documents.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getAuthorizedDocument(client, role, itemId) {
  if (!itemId || itemId.length > 200) return null
  const library = await ensureClientLibrary(client)
  const result = await graph(`/items/${encodeURIComponent(itemId)}`)
  const item = result.status === 404 ? null : result.json
  if (!item || item.folder) return null
  if (!canAccessItem(role, item, library.folderId, library.folderName)) return null
  const folderName = parentFolderName(item, library.folderName)
  return { item, library, folderName, document: mapDocument(item, folderName, role) }
}

export async function downloadAuthorizedDocument(client, role, itemId) {
  const authorized = await getAuthorizedDocument(client, role, itemId)
  if (!authorized) return null
  const result = await graph(`/items/${encodeURIComponent(itemId)}/content`, {}, { raw: true })
  if (result.status === 404) return null
  return {
    buffer: result.buffer,
    contentType: authorized.document.contentType,
    name: authorized.document.name,
  }
}

export async function uploadAuthorizedDocument(client, role, { fileName, buffer, contentType, category }) {
  const folderName = folderForUpload(role, category)
  if (!canRoleWriteFolder(role, folderName)) {
    throw new Error('You cannot upload to that folder')
  }
  const library = await ensureClientLibrary(client)
  const folder = await getFolderChild(library.folderId, folderName)
  const safeName = sanitizeSharePointName(fileName)
  const item = await uploadToFolder(folder.id, safeName, buffer, contentType)
  return mapDocument(item, folderName, role)
}

async function uploadToFolder(parentId, fileName, buffer, contentType) {
  if (buffer.length <= 4 * 1024 * 1024) {
    const result = await graph(`/items/${parentId}:/${encodeURIComponent(fileName)}:/content`, {
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
      body: buffer,
    })
    return result.json
  }

  const session = await graph(`/items/${parentId}:/${encodeURIComponent(fileName)}:/createUploadSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
        name: fileName,
      },
    }),
  })
  const uploadUrl = session.json.uploadUrl
  const chunkSize = 327680 * 10
  let offset = 0
  let uploaded = null
  while (offset < buffer.length) {
    const end = Math.min(offset + chunkSize, buffer.length)
    const chunk = buffer.subarray(offset, end)
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${offset}-${end - 1}/${buffer.length}`,
      },
      body: chunk,
    })
    if (!response.ok && response.status !== 202) {
      const detail = await response.text().catch(() => '')
      throw new Error(`SharePoint upload failed: ${detail.slice(0, 300) || response.statusText}`)
    }
    if (response.status === 201 || response.status === 200) {
      uploaded = await response.json()
    }
    offset = end
  }
  return uploaded
}

export async function readPortalState() {
  await ensureRootFolder(PORTAL_STATE_FOLDER)
  const item = await getItemByPath(`${PORTAL_STATE_FOLDER}/state.json`)
  if (!item) return { state: null, etag: undefined, itemId: undefined }
  const content = await graph(`/items/${item.id}/content`, {}, { raw: true })
  const parsed = JSON.parse(content.buffer.toString('utf8'))
  return { state: parsed, etag: item.eTag, itemId: item.id }
}

export async function writePortalState(state, etag) {
  await ensureRootFolder(PORTAL_STATE_FOLDER)
  const payload = JSON.stringify(state)
  const headers = { 'Content-Type': 'application/json' }
  if (etag) headers['If-Match'] = etag
  const result = await graph(`/root:/${PORTAL_STATE_FOLDER}/state.json:/content${etag ? '' : '?@microsoft.graph.conflictBehavior=fail'}`, {
    method: 'PUT',
    headers,
    body: payload,
  })
  return result.json
}

export function isSharePointConflict(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('409') || message.includes('412') || message.includes('precondition') || message.includes('If-Match')
}
