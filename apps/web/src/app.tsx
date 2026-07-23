import { lazy, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { WelcomePage } from '@/pages/welcome-page';

const DownloadsPage = lazy(() =>
  import('@/pages/downloads-page').then((module) => ({ default: module.DownloadsPage })),
);
const HowToLoginPage = lazy(() =>
  import('@/pages/how-to-login-page').then((module) => ({ default: module.HowToLoginPage })),
);
const InformationalPage = lazy(() =>
  import('@/pages/informational-page').then((module) => ({
    default: module.InformationalPage,
  })),
);
const AuthResultPage = lazy(() =>
  import('@/pages/auth-result-page').then((module) => ({ default: module.AuthResultPage })),
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: 'how-to-login', element: <HowToLoginPage /> },
      { path: 'downloads', element: <DownloadsPage /> },
      { path: 'privacy', element: <InformationalPage page="privacy" /> },
      { path: 'terms', element: <InformationalPage page="terms" /> },
      { path: 'support', element: <InformationalPage page="support" /> },
      { path: 'auth/result', element: <AuthResultPage /> },
      {
        path: 'help/google-permissions',
        element: <InformationalPage page="googlePermissions" />,
      },
    ],
  },
]);

export function App(): ReactNode {
  return <RouterProvider router={router} />;
}
