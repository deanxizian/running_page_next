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

const currentYear = () => new Date().getFullYear().toString();

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

const DashboardDataView = ({ currentView }: { currentView: DashboardView }) => {
  const {
    years,
    thisYear,
    sortedActivities,
    activityGroups,
    latestRun,
    latestMonth,
    earliestMonth,
  } = useActivities();

  return (
    <PageShell thisYear={thisYear || currentYear()}>
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

const NextDashboard = ({ view }: NextDashboardProps) => {
  const location = useLocation();
  const currentView = view ?? dashboardViewForPath(location.pathname);

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

  return <DashboardDataView currentView={currentView} />;
};

export default NextDashboard;
