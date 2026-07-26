import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/hind-siliguri/bengali-400.css';
import '@fontsource/hind-siliguri/bengali-500.css';
import '@fontsource/hind-siliguri/bengali-600.css';
import '@fontsource/hind-siliguri/bengali-700.css';
import { App } from './app';
import { ErrorBoundary } from './components/error-boundary';
import './i18n';
import { ThemeProvider } from './providers/theme-provider';
import { AuthProvider } from './providers/auth-provider';
import { checkVersionAndMigrate } from './lib/storage';
import './styles.css';

checkVersionAndMigrate();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});
const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Root element was not found');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
