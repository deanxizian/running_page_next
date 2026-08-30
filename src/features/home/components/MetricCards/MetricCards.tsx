import { DIST_UNIT, formatDurationShort } from '@/entities/activity/lib/format';
import { totalSeconds } from '@/entities/activity/lib/stats';
import { lastRunTextFor } from '@/features/home/lib/lastRun';
import { MONTH_GOAL, YEAR_GOAL } from '@/shared/lib/dashboard';
import type { HomeMetricsViewModel } from '../../model/types';
import { MetricCard } from '@/shared/ui/dashboard';
import styles from '@/shared/ui/dashboard.module.css';

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
        iconPositive: vm.monthDistance >= vm.lastMonthSamePeriodDistance,
      }}
    />
  </>
);

export default MetricCards;
