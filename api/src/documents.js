import {
  downloadAuthorizedDocument,
  ensureClientLibrary,
  getAuthorizedDocument,
  listDocumentsForClient as listSharePointDocuments,
  uploadAuthorizedDocument,
  createClientSubfolder,
} from './sharepoint.js'
import { getClientRecord, saveClientLibrary } from './clients.js'

async function libraryFor(clientOid) {
  const record = await getClientRecord(clientOid)
  if (!record) return null
  const library = await ensureClientLibrary(record)
  if (library.folderId !== record.folderId || library.folderName !== record.folderName) {
    await saveClientLibrary(clientOid, library)
  }
  return { ...record, ...library }
}

export async function listDocumentsForClient(clientOid, role) {
  const client = await libraryFor(clientOid)
  if (!client) return []
  return listSharePointDocuments(client, role)
}

export async function getDocument(clientOid, role, id) {
  const client = await libraryFor(clientOid)
  if (!client) return null
  return getAuthorizedDocument(client, role, id)
}

export async function getDocumentBytes(clientOid, role, id) {
  const client = await libraryFor(clientOid)
  if (!client) return null
  return downloadAuthorizedDocument(client, role, id)
}

export async function uploadDocument(clientOid, role, file) {
  const client = await libraryFor(clientOid)
  if (!client) throw new Error('Choose a client')
  return uploadAuthorizedDocument(client, role, file)
}

export async function createFolder(clientOid, role, parentName, name) {
  const client = await libraryFor(clientOid)
  if (!client) throw new Error('Choose a client')
  return createClientSubfolder(client, role, parentName, name)
}
