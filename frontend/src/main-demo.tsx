/**
 * Точка входа для демо оптимизированной карты
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppOptimizedMap from './AppOptimizedMap.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppOptimizedMap />
  </StrictMode>,
)