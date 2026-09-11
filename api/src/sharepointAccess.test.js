import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAccessItem,
  canRoleReadFolder,
  canRoleWriteFolder,
  clientFolderName,
  folderForUpload,
  itemIsUnderClientFolder,
  parentFolderName,
  sanitizeSharePointName,
} from './sharepointAccess.js'

test('sanitizes SharePoint names', () => {
  assert.equal(sanitizeSharePointName('Acme / Co: Taxes?'), 'Acme - Co- Taxes-')
  assert.equal(sanitizeSharePointName('   '), 'document')
})

test('builds a unique client folder name from organization and oid', () => {
  assert.equal(
    clientFolderName('PRC ANALYTICS INC', 'e7468903-52b6-4b99-bd67-8e24bc45d352'),
    'PRC ANALYTICS INC [e7468903]',
  )
})

test('clients can upload only to Client Uploads', () => {
  assert.equal(folderForUpload('client', 'Tax Returns'), 'Client Uploads')
  assert.equal(folderForUpload('admin', 'Tax Returns'), 'Tax')
  assert.equal(folderForUpload('admin', 'Correspondence'), 'Client Shared')
})

test('clients cannot read internal folders', () => {
  assert.equal(canRoleReadFolder('client', 'Workpapers'), false)
  assert.equal(canRoleReadFolder('client', 'Client Shared'), true)
  assert.equal(canRoleReadFolder('admin', 'Workpapers'), true)
  assert.equal(canRoleWriteFolder('client', 'Client Shared'), false)
  assert.equal(canRoleWriteFolder('client', 'Client Uploads'), true)
})

test('rejects items outside the resolved client folder', () => {
  const clientFolderId = 'folder-prc'
  const clientFolder = 'PRC ANALYTICS INC [e7468903]'
  const foreign = {
    id: 'doc-other',
    name: 'secret.pdf',
    parentReference: {
      id: 'folder-other',
      path: '/drives/drive/root:/Other Client [aaaaaaaa]/Workpapers',
    },
  }
  const shared = {
    id: 'doc-shared',
    name: 'return.pdf',
    parentReference: {
      id: 'shared-id',
      path: `/drives/drive/root:/${clientFolder}/Client Shared`,
    },
  }
  const workpaper = {
    id: 'doc-wp',
    name: 'wp.xlsx',
    parentReference: {
      id: 'wp-id',
      path: `/drives/drive/root:/${clientFolder}/Workpapers`,
    },
  }

  assert.equal(itemIsUnderClientFolder(foreign, clientFolderId, clientFolder), false)
  assert.equal(canAccessItem('client', foreign, clientFolderId, clientFolder), false)
  assert.equal(canAccessItem('client', shared, clientFolderId, clientFolder), true)
  assert.equal(canAccessItem('client', workpaper, clientFolderId, clientFolder), false)
  assert.equal(canAccessItem('admin', workpaper, clientFolderId, clientFolder), true)
  assert.equal(parentFolderName(shared, clientFolder), 'Client Shared')
})
