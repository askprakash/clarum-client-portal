import { app } from '@azure/functions'
import './functions/documents.js'
import './functions/profile.js'

app.setup({ enableHttpStream: true })
