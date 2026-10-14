import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import './styles.css';
import  { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // no refetch every time the tab regains focus
      retry: 2,                    // helps with Render spin-down / Neon cold start
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
      staleTime: 60 * 5 * 1000
    },
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
        <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <App />
      </StoreProvider>
        </QueryClientProvider>
    </HashRouter>
  </React.StrictMode>
);
