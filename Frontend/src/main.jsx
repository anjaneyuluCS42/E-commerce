import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';
import queryClient from './lib/queryClient.ts';
import { applyTheme } from './store/themeStore.ts';

// Apply saved theme before first render to prevent flash
try {
  const saved = JSON.parse(localStorage.getItem('theme-storage') || '{}');
  applyTheme(saved?.state?.theme ?? 'light');
} catch {
  // default to light
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);