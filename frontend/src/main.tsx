import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement: Element | null = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with ID "root" not found in the document.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
