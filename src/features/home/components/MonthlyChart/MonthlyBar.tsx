import { DIST_UNIT } from '@/entities/activity/lib/format';
import type { MonthlyBarViewModel } from '../../model/types';
import styles from '@/components/NextDashboard/style.module.css';

const MonthlyBar = ({
  bar,
  active,
  onHover,
  onPreview,
  onClearPreview,
  onSelect,
}: {
  bar: MonthlyBarViewModel;
  active: boolean;
  onHover: (monthKey: string | null) => void;
  onPreview: (monthKey: string | undefined) => void;
  onClearPreview: () => void;
  onSelect: (monthKey: string) => void;
}) => (
  <button
    type="button"
    className={`${styles.barItem} ${active ? styles.barItemActive : ''} ${
      !bar.inRange ? styles.barItemDisabled : ''
    }`}
    data-month-key={bar.monthKey}
    disabled={!bar.inRange}
    title={`${bar.month} ${bar.distanceLabel} ${DIST_UNIT}`}
    onPointerEnter={(event) => {
      if (!bar.inRange) {
        return;
      }

      if (event.pointerType === 'mouse') {
        onHover(bar.monthKey);
        return;
      }

      onPreview(bar.monthKey);
    }}
    onPointerLeave={(event) => {
      if (event.pointerType === 'mouse') {
        onHover(null);
      }
    }}
    onFocus={(event) => {
      if (bar.inRange && event.currentTarget.matches(':focus-visible')) {
        onHover(bar.monthKey);
      }
    }}
    onBlur={() => onHover(null)}
    onPointerDown={(event) => {
      if (event.pointerType !== 'mouse' && bar.inRange) {
        onPreview(bar.monthKey);
      }
    }}
    onClick={() => {
      if (!bar.inRange) {
        return;
      }

      onClearPreview();
      onSelect(bar.monthKey);
    }}
  >
    <span className={styles.barColumn}>
      <span className={styles.barValue}>
        {bar.distanceLabel}
        <em>{DIST_UNIT}</em>
      </span>
      <span className={styles.barFill} style={{ height: bar.height }} />
    </span>
    <small>{bar.month}</small>
  </button>
);

export default MonthlyBar;
