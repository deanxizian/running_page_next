import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';
import Index from './pages';
import NotFound from './pages/404';
import '@/styles/index.css';
import NextDashboard from '@/components/NextDashboard';

const routes = createBrowserRouter(
  [
    {
      path: '/',
      element: <Index />,
    },
    {
      path: 'heatmap',
      element: <NextDashboard view="heatmap" />,
    },
    {
      path: 'events',
      element: <NextDashboard view="events" />,
    },
    {
      path: 'mls',
      element: <Navigate to="/events" replace />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={routes} />
  </React.StrictMode>
);
