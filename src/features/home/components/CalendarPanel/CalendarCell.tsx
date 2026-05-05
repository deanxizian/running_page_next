import type { Activity } from '@/entities/activity/model/types';
import { DIST_UNIT } from '@/entities/activity/lib/format';
import { RouteSpark } from '@/shared/ui/dashboard';
import type { CalendarCellViewModel } from '../../model/types';
import styles from '@/shared/ui/dashboard.module.css';

const CalendarCell = ({
  cell,
  cellKey,
  selectedRun,
  previewedCalendarKey,
  onPreview,
  onClearPreview,
  onToggleRun,
}: {
  cell: CalendarCellViewModel;
  cellKey: string;
  selectedRun: Activity | null;
  previewedCalendarKey: string | null;
  onPreview: (key: string | undefined) => void;
  onClearPreview: () => void;
  onToggleRun: (run: Activity) => void;
}) => {
  const isSelectedCell = Boolean(
    selectedRun && cell.runs.some((run) => run.run_id === selectedRun.run_id)
  );
  const calendarRun = isSelectedCell ? selectedRun : (cell.runs[0] ?? null);
  const canSelectCell = Boolean(calendarRun);

  return (
    <button
      type="button"
      className={`${cell.runs.length ? styles.calendarActive : ''} ${
        isSelectedCell ? styles.calendarSelected : ''
      } ${
        cellKey && previewedCalendarKey === cellKey
          ? styles.calendarPreviewed
          : ''
      }`}
      data-calendar-key={canSelectCell ? cellKey : undefined}
      disabled={!canSelectCell}
      aria-pressed={cell.day ? isSelectedCell : undefined}
      onPointerDown={(event) => {
        if (event.pointerType !== 'mouse' && canSelectCell) {
          onPreview(cellKey);
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse' && canSelectCell) {
          onPreview(cellKey);
        }
      }}
      onClick={() => {
        onClearPreview();
        if (calendarRun) {
          onToggleRun(calendarRun);
        }
      }}
    >
      {calendarRun ? <RouteSpark run={calendarRun} /> : <span />}
      {cell.runs.length ? (
        <span className={styles.calendarHoverMeta}>
          <strong>{cell.day}日</strong>
          <span>
            {cell.distance.toFixed(cell.distance >= 10 ? 0 : 1)} {DIST_UNIT}
          </span>
        </span>
      ) : (
        <small>{cell.day}</small>
      )}
    </button>
  );
};

export default CalendarCell;
