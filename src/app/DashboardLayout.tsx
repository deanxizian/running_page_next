import { Outlet, useOutletContext } from 'react-router';
import useActivities from '@/entities/activity/hooks/useActivities';
import type { ActivitySnapshot } from '@/entities/activity/hooks/useActivities';
import { PageShell } from '@/shared/ui/dashboard';

type DashboardOutletContext = {
  activitySnapshot: ActivitySnapshot;
};

const currentYear = () => new Date().getFullYear().toString();

const DashboardLayout = () => {
  const activitySnapshot = useActivities();

  return (
    <PageShell thisYear={currentYear()}>
      <Outlet context={{ activitySnapshot }} />
    </PageShell>
  );
};

const useDashboardData = () => useOutletContext<DashboardOutletContext>();

export { useDashboardData };
export default DashboardLayout;
