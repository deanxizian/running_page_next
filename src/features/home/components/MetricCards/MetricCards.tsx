import {
  DIST_UNIT,
  MONTH_GOAL,
  YEAR_GOAL,
  totalSeconds,
} from '@/shared/lib/dashboard';
import { formatDurationShort } from '@/entities/activity/lib/format';
import type { HomeMetricsViewModel } from '../../model/types';
import { MetricCard } from '@/shared/ui/dashboard';
import styles from '@/shared/ui/dashboard.module.css';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const daysAgoFromLocalDate = (localDate: string) => {
  const [year, month, day] = localDate.slice(0, 10).split('-').map(Number);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const runDateUtc = Date.UTC(year, month - 1, day);

  return Math.max(0, Math.round((todayUtc - runDateUtc) / DAY_IN_MS));
};

const lastRunTextFor = (localDate: string) => {
  const daysAgo = daysAgoFromLocalDate(localDate);

  if (daysAgo === 0) {
    return 'last run today';
  }

  if (daysAgo === 1) {
    return 'last run 1 day ago';
  }

  return `last run ${daysAgo} days ago`;
};

const latestRunFooterFor = (vm: HomeMetricsViewModel) => {
  if (!vm.latestRun) {
    return undefined;
  }

  return {
    text: lastRunTextFor(vm.latestRun.start_date_local),
    icon: 'calendar' as const,
  };
};

const MetricCards = ({
  vm,
  openHeatmap,
}: {
  vm: HomeMetricsViewModel;
  openHeatmap: () => void;
}) => (
  <>
    <MetricCard
      label="Total Distance"
      value={vm.allDistance.toFixed(1)}
      unit={` ${DIST_UNIT}`}
      detailIcons={['bolt', 'clock']}
      details={[`${vm.totalRunCount} runs`, formatDurationShort(vm.allSeconds)]}
      footer={latestRunFooterFor(vm)}
      overlay="点击打开热力图"
      onClick={openHeatmap}
      onTouchRevealStart={vm.clearEventTouchReveal}
      touchRevealResetSignal={vm.totalTouchRevealResetSignal}
      className={styles.totalMetricCard}
    />
    <MetricCard
      label="Yearly Goal"
      value={vm.yearDistance.toFixed(1)}
      unit={` / ${YEAR_GOAL} ${DIST_UNIT}`}
      detailIcons={['bolt', 'clock']}
      details={[
        `${vm.currentYearRuns.length} runs`,
        formatDurationShort(totalSeconds(vm.currentYearRuns)),
      ]}
      progress={(vm.yearDistance / YEAR_GOAL) * 100}
      trend={{
        text: `${Math.abs(
          vm.yearDistance - vm.lastYearSamePeriodDistance
        ).toFixed(1)} ${DIST_UNIT} vs last year`,
        positive: vm.yearDistance >= vm.previousYearDistance,
        iconPositive: vm.yearDistance >= vm.lastYearSamePeriodDistance,
      }}
    />
    <MetricCard
      label="Monthly Goal"
      value={vm.monthDistance.toFixed(1)}
      unit={` / ${MONTH_GOAL} ${DIST_UNIT}`}
      detailIcons={['bolt', 'clock']}
      details={[
        `${vm.currentMonthRuns.length} runs`,
        formatDurationShort(totalSeconds(vm.currentMonthRuns)),
      ]}
      progress={(vm.monthDistance / MONTH_GOAL) * 100}
      trend={{
        text: `${Math.abs(
          vm.monthDistance - vm.lastMonthSamePeriodDistance
        ).toFixed(1)} ${DIST_UNIT} vs last month`,
        positive: vm.monthDistance >= vm.previousMonthDistance,
        iconPositive: vm.monthDistance >= vm.lastMonthSamePeriodDistance,
      }}
    />
  </>
);

export default MetricCards;
