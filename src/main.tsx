import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAuth } from './auth'

const root = createRoot(document.getElementById('root')!)
initializeAuth().then(() => root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)).catch(() => root.render(<main className="page"><h1>Sign-in could not be completed</h1><p>Please start a new sign-in from the portal.</p><a href="/">Return to sign in</a></main>))
