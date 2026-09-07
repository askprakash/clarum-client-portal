import { app } from '@azure/functions'
import './functions/documents.js'
import './functions/profile.js'
import './functions/clients.js'
import './functions/adminClients.js'
import './functions/staff.js'

app.setup({ enableHttpStream: true })
