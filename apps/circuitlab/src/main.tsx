import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './ui/styles.css'
import { fontsReady } from './ui/fonts'

// part labels are painted into textures once, so the lab's fonts load first
void fontsReady().then(() =>
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
)
