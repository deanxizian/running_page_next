import { useDashboardData } from '@/app/DashboardLayout';
import HomeView from '@/features/home/HomeView';

const HomePage = () => {
  const { activitySnapshot } = useDashboardData();

  return (
    <HomeView
      years={activitySnapshot.years}
      thisYear={activitySnapshot.thisYear}
      sortedActivities={activitySnapshot.sortedActivities}
      activityGroups={activitySnapshot.activityGroups}
      latestRun={activitySnapshot.latestRun}
      latestMonth={activitySnapshot.latestMonth}
      earliestMonth={activitySnapshot.earliestMonth}
      countries={activitySnapshot.countries}
      provinces={activitySnapshot.provinces}
    />
  );
};

export default HomePage;
