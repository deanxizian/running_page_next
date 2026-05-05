import { Navigate, createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '@/app/DashboardLayout';
import EventsPage from '@/features/events/EventsPage';
import HeatmapPage from '@/features/heatmap/HeatmapPage';
import HomePage from '@/features/home/HomePage';
import NotFoundPage from '@/pages/404';

export const router = createBrowserRouter(
  [
    {
      element: <DashboardLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'heatmap', element: <HeatmapPage /> },
        { path: 'events', element: <EventsPage /> },
        { path: 'mls', element: <Navigate to="/events" replace /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
);
