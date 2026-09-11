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
)).catch((error: unknown) => root.render(<main className="page"><h1>The portal could not load your profile</h1><p>{error instanceof Error ? error.message : 'Please try again.'}</p><a href="/">Return to sign in</a></main>))
