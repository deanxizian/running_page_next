import { DIST_UNIT } from '@/entities/activity/lib/format';
import { WEEKDAY_LABELS } from '@/shared/lib/dashboard';
import { ChevronIcon } from '@/components/NextDashboard/ui';
import type {
  CalendarPanelViewModel,
  HomeDashboardActions,
} from '../../model/types';
import CalendarCell from './CalendarCell';
import styles from '@/components/NextDashboard/style.module.css';

const slideClassFor = (direction: CalendarPanelViewModel['slideDirection']) =>
  direction === 'backward'
    ? styles.calendarSlideBackward
    : direction === 'forward'
      ? styles.calendarSlideForward
      : '';

const CalendarPanel = ({
  vm,
  actions,
}: {
  vm: CalendarPanelViewModel;
  actions: Pick<
    HomeDashboardActions,
    'changeCalendarMonth' | 'toggleRunSelection'
  >;
}) => (
  <section className={`${styles.panel} ${styles.calendarPanel}`}>
    <div className={styles.calendarHeader}>
      <div>
        <strong>{vm.calendarMonth.replace('-', '/')}</strong>
        <span>
          {vm.calendar.monthlyDistance.toFixed(0)} {DIST_UNIT}
        </span>
      </div>
      <div className={styles.calendarControls}>
        <button
          type="button"
          onClick={() => actions.changeCalendarMonth(vm.previousCalendarMonth)}
          disabled={!vm.canGoToPreviousMonth}
          aria-label="Previous month"
        >
          <ChevronIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={() => actions.changeCalendarMonth(vm.nextCalendarMonth)}
          disabled={!vm.canGoToNextMonth}
          aria-label="Next month"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </div>
    <div className={styles.weekdays}>
      {WEEKDAY_LABELS.map((day, index) => (
        <span key={`${day}-${index}`}>{day}</span>
      ))}
    </div>
    <div
      key={`calendar-${vm.calendarMonth}`}
      className={`${styles.calendarGrid} ${slideClassFor(vm.slideDirection)}`}
      onPointerMove={vm.previewCalendarCellAtPoint}
    >
      {vm.calendar.cells.map((cell, index) => (
        <CalendarCell
          key={`${cell.day ?? 'empty'}-${index}`}
          cell={cell}
          cellKey={cell.day ? `${vm.calendarMonth}-${cell.day}` : ''}
          selectedRun={vm.selectedRun}
          previewedCalendarKey={vm.previewedCalendarKey}
          onPreview={vm.previewCalendarCell}
          onClearPreview={vm.clearCalendarPreview}
          onToggleRun={actions.toggleRunSelection}
        />
      ))}
    </div>
  </section>
);

export default CalendarPanel;
