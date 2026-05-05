import type { Activity } from '@/entities/activity/model/types';
import {
  convertMovingTime2Sec,
  formatDuration,
} from '@/entities/activity/lib/format';
import { activityTitleForRun } from '@/entities/activity/lib/stats';
import EventPbMedalIcon from './EventPbMedalIcon';
import EventRouteBackground from './EventRouteBackground';
import styles from '@/features/events/events.module.css';

const EventCard = ({
  pbLabel,
  previewed,
  run,
  onOpen,
  onPreview,
}: {
  pbLabel?: string;
  previewed: boolean;
  run: Activity;
  onOpen: (run: Activity) => void;
  onPreview: (runId: number) => void;
}) => (
  <button
    type="button"
    className={`${styles.eventCard} ${pbLabel ? styles.eventCardPb : ''} ${
      previewed ? styles.eventCardPreviewed : ''
    }`}
    data-event-id={run.run_id}
    onPointerDown={(event) => {
      if (event.pointerType !== 'mouse') {
        onPreview(run.run_id);
      }
    }}
    onPointerEnter={(event) => {
      if (event.pointerType !== 'mouse') {
        onPreview(run.run_id);
      }
    }}
    onClick={() => onOpen(run)}
  >
    <EventRouteBackground run={run} />
    {pbLabel && (
      <span className={styles.eventPbBadge}>
        <EventPbMedalIcon />
        {pbLabel}
      </span>
    )}
    <span>{run.start_date_local.slice(0, 10)}</span>
    <strong>{activityTitleForRun(run)}</strong>
    <small>{formatDuration(convertMovingTime2Sec(run.moving_time))}</small>
  </button>
);

export default EventCard;
