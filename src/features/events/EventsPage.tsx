import { useDashboardData } from '@/app/DashboardLayout';
import EventsView from '@/components/NextDashboard/EventsView';

const EventsPage = () => {
  const { activitySnapshot } = useDashboardData();

  return (
    <EventsView
      sortedActivities={activitySnapshot.sortedActivities}
      countries={activitySnapshot.countries}
      provinces={activitySnapshot.provinces}
    />
  );
};

export default EventsPage;
