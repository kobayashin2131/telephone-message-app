import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Applied before the first paint so switching color tone doesn't flash the default.
const savedTone = localStorage.getItem('callsync_tone');
if (savedTone && savedTone !== 'sage') {
  document.documentElement.setAttribute('data-tone', savedTone);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
