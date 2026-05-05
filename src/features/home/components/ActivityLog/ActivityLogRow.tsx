import type { Activity } from '@/entities/activity/model/types';
import {
  DIST_UNIT,
  M_TO_DIST,
  convertMovingTime2Sec,
  formatDuration,
  formatPace,
} from '@/entities/activity/lib/format';
import { activityTitleForRun } from '@/entities/activity/lib/stats';
import {
  ROW_FADE_BASE_DELAY_MS,
  ROW_FADE_STAGGER_MS,
} from '@/shared/lib/dashboard';
import styles from '@/components/NextDashboard/style.module.css';

const ActivityLogRow = ({
  index,
  run,
  selected,
  onToggle,
}: {
  index: number;
  run: Activity;
  selected: boolean;
  onToggle: (run: Activity) => void;
}) => {
  const [activityDate, activityTime = ''] = run.start_date_local.split(' ');
  const activityDisplayTime = activityTime.slice(0, 5);

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`${styles.activityRow} ${selected ? styles.selectedRow : ''}`}
      style={{
        animationDelay: `${
          ROW_FADE_BASE_DELAY_MS + index * ROW_FADE_STAGGER_MS
        }ms`,
      }}
      onClick={() => onToggle(run)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        onToggle(run);
      }}
    >
      <td className={styles.activityDateCell}>
        <span>{activityDate}</span>
        {activityDisplayTime && <small>{activityDisplayTime}</small>}
      </td>
      <td>{activityTitleForRun(run)}</td>
      <td>
        {(run.distance / M_TO_DIST).toFixed(2)}
        <span>{DIST_UNIT}</span>
      </td>
      <td>{formatDuration(convertMovingTime2Sec(run.moving_time))}</td>
      <td>{formatPace(run.average_speed)}</td>
      <td>{run.average_heartrate ? Math.round(run.average_heartrate) : '-'}</td>
    </tr>
  );
};

export default ActivityLogRow;
