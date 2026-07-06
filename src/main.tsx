import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Pannellum library has a race condition bug where destroying a viewer
// while an XHR panorama download is pending causes a TypeError when the
// download completes (attempts to set 'src' on undefined).
// We intercept and suppress this specific error globally to prevent Vite's overlay.
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes("Cannot set properties of undefined (setting 'src')")) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
