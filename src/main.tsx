import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles.css'

function applyLite() {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mem = nav.deviceMemory ?? 8
  const supportsBackdrop = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'blur(1px)')
  if (mem <= 3 || !supportsBackdrop) {
    document.documentElement.setAttribute('data-lite', 'true')
  }
}
applyLite()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
