import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActivityGroups } from '@/entities/activity/lib/group';
import type { Activity } from '@/entities/activity/model/types';
import ActivityLog from '@/features/home/components/ActivityLog/ActivityLog';
import CalendarPanel from '@/features/home/components/CalendarPanel/CalendarPanel';
import EventSummaryCard from '@/features/home/components/EventSummaryCard/EventSummaryCard';
import HomeMapPanel from '@/features/home/components/HomeMapPanel/HomeMapPanel';
import MetricCards from '@/features/home/components/MetricCards/MetricCards';
import MonthlyChart from '@/features/home/components/MonthlyChart/MonthlyChart';
import { useHomeDashboard } from '@/features/home/model/useHomeDashboard';
import styles from './style.module.css';

const HomeView = ({
  years,
  thisYear,
  sortedActivities,
  activityGroups,
  latestRun,
  latestMonth,
  earliestMonth,
  countries,
  provinces,
}: {
  years: string[];
  thisYear: string;
  sortedActivities: Activity[];
  activityGroups: ActivityGroups;
  latestRun: Activity | null;
  latestMonth: string;
  earliestMonth: string;
  countries: string[];
  provinces: string[];
}) => {
  const navigate = useNavigate();
  const openHeatmap = useCallback(() => navigate('/heatmap'), [navigate]);
  const openEvents = useCallback(() => navigate('/events'), [navigate]);
  const dashboard = useHomeDashboard({
    years,
    thisYear,
    sortedActivities,
    activityGroups,
    latestRun,
    latestMonth,
    earliestMonth,
    openEvents,
  });

  return (
    <main className={styles.main}>
      <section className={styles.dashboardGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.metricsGrid}>
            <MetricCards vm={dashboard.metrics} openHeatmap={openHeatmap} />
          </div>

          <ActivityLog vm={dashboard.log} actions={dashboard.actions} />
        </div>

        <aside className={styles.rightColumn}>
          <EventSummaryCard
            id="events"
            thisYear={thisYear}
            vm={dashboard.eventSummary}
          />
          <HomeMapPanel
            id="map-panel"
            vm={dashboard.map}
            countries={countries}
            provinces={provinces}
          />
          <CalendarPanel vm={dashboard.calendar} actions={dashboard.actions} />
          <MonthlyChart
            vm={dashboard.monthlyChart}
            actions={dashboard.actions}
          />
        </aside>
      </section>
    </main>
  );
};

export default HomeView;
