import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app.css';
import App from './App.jsx';

// Forzar que el Service Worker tome control inmediatamente al actualizarse
// en vez de esperar a que el usuario cierre todas las pestañas
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
