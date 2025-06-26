import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import { PlainTextIPView } from './components/views/PlainTextIPView.tsx';
import { SettingsViewWrapper } from './components/views/SettingsView.tsx';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/settings',
    element: <SettingsViewWrapper />
  },
  // This route is a fallback for when the static file serving doesn't work
  {
    path: '/ipv4',
    element: <PlainTextIPView />
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);