import { useDashboardData } from '@/app/DashboardLayout';
import HeatmapView from '@/features/heatmap/HeatmapView';

const HeatmapPage = () => {
  const { activitySnapshot } = useDashboardData();

  return (
    <HeatmapView
      years={activitySnapshot.years}
      sortedActivities={activitySnapshot.sortedActivities}
      activityGroups={activitySnapshot.activityGroups}
    />
  );
};

export default HeatmapPage;
