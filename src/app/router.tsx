import { Navigate, createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter(
  [
    {
      lazy: async () => {
        const { default: DashboardLayout } =
          await import('@/app/DashboardLayout');
        return { Component: DashboardLayout };
      },
      children: [
        {
          index: true,
          lazy: async () => {
            const { default: HomePage } =
              await import('@/features/home/HomePage');
            return { Component: HomePage };
          },
        },
        {
          path: 'heatmap',
          lazy: async () => {
            const { default: HeatmapPage } =
              await import('@/features/heatmap/HeatmapPage');
            return { Component: HeatmapPage };
          },
        },
        {
          path: 'events',
          lazy: async () => {
            const { default: EventsPage } =
              await import('@/features/events/EventsPage');
            return { Component: EventsPage };
          },
        },
        { path: 'mls', element: <Navigate to="/events" replace /> },
        {
          path: '*',
          lazy: async () => {
            const { default: NotFoundPage } = await import('@/pages/404');
            return { Component: NotFoundPage };
          },
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
);
