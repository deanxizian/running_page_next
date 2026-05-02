import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useActivities from '@/hooks/useActivities';
import NotFoundPage from '@/pages/404';
import HomeView from './HomeView';
import HeatmapView from './HeatmapView';
import EventsView from './EventsView';
import { PageShell } from './ui';

type DashboardView = 'home' | 'heatmap' | 'events';
type DashboardRouteView = DashboardView | 'redirect-events' | 'not-found';

interface NextDashboardProps {
  view?: DashboardView;
}

const dashboardViewForPath = (pathname: string): DashboardRouteView => {
  if (pathname === '/') {
    return 'home';
  }

  if (pathname.startsWith('/heatmap')) {
    return 'heatmap';
  }

  if (pathname.startsWith('/events')) {
    return 'events';
  }

  if (pathname.startsWith('/mls')) {
    return 'redirect-events';
  }

  return 'not-found';
};

const NextDashboard = ({ view }: NextDashboardProps) => {
  const location = useLocation();
  const currentView = view ?? dashboardViewForPath(location.pathname);
  const {
    years,
    thisYear,
    sortedActivities,
    activityGroups,
    latestRun,
    latestMonth,
    earliestMonth,
  } = useActivities();

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.setAttribute('data-theme', 'dark');
    document.title = 'Running Page';
  }, []);

  if (currentView === 'redirect-events') {
    return <Navigate to="/events" replace />;
  }

  if (currentView === 'not-found') {
    return <NotFoundPage />;
  }

  return (
    <PageShell thisYear={thisYear}>
      {currentView === 'home' && (
        <HomeView
          years={years}
          thisYear={thisYear}
          sortedActivities={sortedActivities}
          activityGroups={activityGroups}
          latestRun={latestRun}
          latestMonth={latestMonth}
          earliestMonth={earliestMonth}
        />
      )}
      {currentView === 'heatmap' && (
        <HeatmapView
          years={years}
          sortedActivities={sortedActivities}
          activityGroups={activityGroups}
        />
      )}
      {currentView === 'events' && (
        <EventsView sortedActivities={sortedActivities} />
      )}
    </PageShell>
  );
};

export default NextDashboard;
