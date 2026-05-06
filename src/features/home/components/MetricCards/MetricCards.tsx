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
      stackDetails
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
        text: `${Math.abs(vm.yearDistance - vm.previousYearDistance).toFixed(
          1
        )} ${DIST_UNIT} vs last year`,
        positive: vm.yearDistance >= vm.previousYearDistance,
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
        text: `${Math.abs(vm.monthDistance - vm.previousMonthDistance).toFixed(
          1
        )} ${DIST_UNIT} vs last month`,
        positive: vm.monthDistance >= vm.previousMonthDistance,
      }}
    />
  </>
);

export default MetricCards;
