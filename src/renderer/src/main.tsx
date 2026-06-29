import './i18n'
import './assets/styles/index.css'
import './assets/styles/layout.css'
import './assets/styles/components.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Wait for preload to be ready before mounting
function mount(): void {
  if (typeof window !== 'undefined' && window.api) {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } else {
    // Retry after short delay if preload not ready yet
    setTimeout(mount, 50)
  }
}

mount()
