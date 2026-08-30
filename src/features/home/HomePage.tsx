import { useMemo } from 'react';
import { useDashboardData } from '@/app/DashboardLayout';
import {
  attachActivityRoutes,
  parseActivityRoutes,
} from '@/entities/activity/data/activityRoutes';
import { buildActivitySnapshot } from '@/entities/activity/data/buildActivitySnapshot';
import HomeView from '@/features/home/HomeView';
import rawActivityRoutes from '@/static/activity_routes.json';

const activityRoutes = parseActivityRoutes(rawActivityRoutes);

const HomePage = () => {
  const { activitySnapshot } = useDashboardData();
  const routedActivitySnapshot = useMemo(
    () =>
      buildActivitySnapshot(
        attachActivityRoutes(activitySnapshot.activities, activityRoutes)
      ),
    [activitySnapshot]
  );

  return (
    <HomeView
      years={routedActivitySnapshot.years}
      thisYear={routedActivitySnapshot.thisYear}
      sortedActivities={routedActivitySnapshot.sortedActivities}
      activityGroups={routedActivitySnapshot.activityGroups}
      latestRun={routedActivitySnapshot.latestRun}
      latestMonth={routedActivitySnapshot.latestMonth}
      earliestMonth={routedActivitySnapshot.earliestMonth}
      countries={routedActivitySnapshot.countries}
      provinces={routedActivitySnapshot.provinces}
    />
  );
};

export default HomePage;
