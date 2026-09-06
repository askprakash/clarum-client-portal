import { app } from '@azure/functions'
import { authorizeClient, json } from '../auth.js'

app.http('profile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'profile',
  handler: async (request) => {
    const auth = await authorizeClient(request)
    if (auth.status) return json(auth.status, auth.body)
    return json(200, { client: auth.client })
  },
})
