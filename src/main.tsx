import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import '@/styles/index.css';
import DeferredTelemetry from '@/app/DeferredTelemetry';
import { router } from '@/app/router';
import { APP_LOCALE } from '@/shared/config/i18n';

document.documentElement.lang = APP_LOCALE;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <DeferredTelemetry />
  </React.StrictMode>
);
