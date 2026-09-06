import { app } from '@azure/functions'
import './functions/documents.js'
import './functions/profile.js'
import './functions/clients.js'

app.setup({ enableHttpStream: true })
