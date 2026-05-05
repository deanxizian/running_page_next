import { ChevronIcon } from '@/shared/ui/dashboard';
import type {
  HomeDashboardActions,
  MonthlyChartViewModel,
} from '../../model/types';
import MonthlyBar from './MonthlyBar';
import styles from '@/shared/ui/dashboard.module.css';

const slideClassFor = (direction: MonthlyChartViewModel['slideDirection']) =>
  direction === 'backward'
    ? styles.calendarSlideBackward
    : direction === 'forward'
      ? styles.calendarSlideForward
      : '';

const MonthlyChart = ({
  vm,
  actions,
}: {
  vm: MonthlyChartViewModel;
  actions: Pick<
    HomeDashboardActions,
    'changeMonthlyChartYear' | 'changeCalendarMonth'
  >;
}) => (
  <section className={`${styles.panel} ${styles.chartPanel}`}>
    <div className={styles.chartHeader}>
      <strong>Monthly Distance</strong>
      <div className={styles.chartYearControls}>
        <button
          type="button"
          onClick={() =>
            actions.changeMonthlyChartYear(vm.olderMonthlyChartYear)
          }
          disabled={!vm.olderMonthlyChartYear}
          aria-label="Previous year"
        >
          <ChevronIcon direction="left" />
        </button>
        <span>{vm.monthlyChartYear}</span>
        <button
          type="button"
          onClick={() =>
            actions.changeMonthlyChartYear(vm.newerMonthlyChartYear)
          }
          disabled={!vm.newerMonthlyChartYear}
          aria-label="Next year"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </div>
    <div
      key={`monthly-chart-${vm.monthlyChartYear}`}
      className={`${styles.barChart} ${slideClassFor(vm.slideDirection)}`}
      onPointerMove={vm.previewMonthlyBarAtPoint}
    >
      {vm.monthlyBars.map((bar) => (
        <MonthlyBar
          key={bar.month}
          bar={bar}
          active={bar.monthKey === vm.activeMonthlyBarKey && bar.inRange}
          onHover={vm.setHoveredMonthKey}
          onPreview={vm.previewMonthlyBar}
          onClearPreview={vm.clearMonthlyBarPreview}
          onSelect={actions.changeCalendarMonth}
        />
      ))}
    </div>
  </section>
);

export default MonthlyChart;
