import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Use a non-null assertion operator '!' as is common in main.tsx for simple apps
// where the root element is guaranteed to exist in index.html. This makes the
// explicit null check unnecessary from a type perspective.
const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
