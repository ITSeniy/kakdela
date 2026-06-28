import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/jetbrains-mono/400.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import { App } from './App.js'
import { queryClient } from './lib/query.js'
import './styles/global.css'

// Окно входящего звонка (T-087, desktop) — это ОТДЕЛЬНАЯ статичная страница
// public/call-popup.html, а не этот SPA-бандл (см. open_call_popup в Rust).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
