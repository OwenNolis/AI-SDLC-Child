import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Explicitly check for the root element to ensure it exists before creating the React root.
// This addresses the SonarQube S4325 rule by providing a clear null-check instead of an assertion.
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with ID "root" not found in the document.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
