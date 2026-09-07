import { app } from '@azure/functions'
import { authorizePortal, json } from '../auth.js'
import { graphTokenFromRequest } from '../graph.js'
import { countActiveStaff, createStaff, listStaff, setStaffStatus } from '../staff.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

app.http('staffList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/staff',
  handler: async (request) => {
    const auth = await authorizePortal(request)
    if (auth.status) return json(auth.status, auth.body)
    if (auth.role !== 'admin') {
      return json(403, { error: 'Administrator sign-in is required' })
    }
    return json(200, { staff: await listStaff() })
  },
})

app.http('staffCreate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'admin/staff',
  handler: async (request) => {
    const auth = await authorizePortal(request)
    if (auth.status) return json(auth.status, auth.body)
    if (auth.role !== 'admin') {
      return json(403, { error: 'Administrator sign-in is required' })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json(400, { error: 'Invalid request body' })
    }

    const displayName = String(body.displayName || '').trim()
    const email = String(body.email || '').trim()
    if (!displayName || !email) {
      return json(400, { error: 'Name and email are required' })
    }
    if (!emailPattern.test(email)) {
      return json(400, { error: 'Enter a valid email address' })
    }

    try {
      const { staff, temporaryPassword } = await createStaff({
        displayName,
        email,
        graphToken: graphTokenFromRequest(request, body),
      })
      return json(201, { staff, temporaryPassword })
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : 'Could not create the staff account' })
    }
  },
})

app.http('staffStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'admin/staff/{oid}',
  handler: async (request) => {
    const auth = await authorizePortal(request)
    if (auth.status) return json(auth.status, auth.body)
    if (auth.role !== 'admin') {
      return json(403, { error: 'Administrator sign-in is required' })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json(400, { error: 'Invalid request body' })
    }
    const status = body.status === 'disabled' ? 'disabled' : body.status === 'active' ? 'active' : null
    if (!status) {
      return json(400, { error: 'Status must be active or disabled' })
    }

    const targetOid = request.params.oid
    if (status === 'disabled' && targetOid === auth.oid) {
      return json(400, { error: 'You cannot disable your own account' })
    }

    try {
      if (status === 'disabled') {
        const activeCount = await countActiveStaff()
        if (activeCount <= 1) {
          return json(400, { error: 'At least one active staff account is required' })
        }
      }
      const updated = await setStaffStatus(targetOid, status, graphTokenFromRequest(request, body))
      if (!updated) return json(404, { error: 'Staff account not found' })
      return json(200, { staff: await listStaff() })
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : 'Could not update the staff account' })
    }
  },
})
