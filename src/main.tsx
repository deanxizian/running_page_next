import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import '@/styles/index.css';
import NextDashboard from '@/components/NextDashboard';

const routes = createBrowserRouter(
  [
    {
      path: '*',
      element: <NextDashboard />,
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={routes} />
  </React.StrictMode>
);
