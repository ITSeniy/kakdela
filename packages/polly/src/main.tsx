import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/jetbrains-mono/400.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import { App } from './App.js'
import { CallPopup } from './features/voice/CallPopup.js'
import { queryClient } from './lib/query.js'
import './lib/theme.js' // применяет сохранённую data-theme на загрузке (нужно и попапу)
import './styles/global.css'

// Отдельное окно входящего звонка (T-087, desktop): тот же бандл, но грузится по
// index.html?cp=<base64> и рендерит только лёгкий CallPopup — без auth/WS/query.
// Данные звонка едут в самом query-параметре `cp` (см. open_call_popup в Rust).
const callPopupData =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('cp')
    : null

const root = ReactDOM.createRoot(document.getElementById('root')!)
if (callPopupData) {
  root.render(
    <React.StrictMode>
      <CallPopup encoded={callPopupData} />
    </React.StrictMode>,
  )
} else {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}
