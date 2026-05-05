import { useEffect } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import useActivities from '@/entities/activity/hooks/useActivities';
import type { ActivitySnapshot } from '@/entities/activity/hooks/useActivities';
import { APP_LOCALE } from '@/shared/config/i18n';
import { PageShell } from '@/shared/ui/dashboard';

type DashboardOutletContext = {
  activitySnapshot: ActivitySnapshot;
};

const currentYear = () => new Date().getFullYear().toString();

const DashboardLayout = () => {
  const activitySnapshot = useActivities();

  useEffect(() => {
    document.documentElement.lang = APP_LOCALE;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.title = 'Running Page';
  }, []);

  return (
    <PageShell thisYear={activitySnapshot.thisYear || currentYear()}>
      <Outlet context={{ activitySnapshot }} />
    </PageShell>
  );
};

const useDashboardData = () => useOutletContext<DashboardOutletContext>();

export { useDashboardData };
export default DashboardLayout;
