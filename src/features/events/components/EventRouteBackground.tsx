import type { Activity } from '@/entities/activity/model/types';
import { getRoutePath } from '@/entities/activity/lib/route';
import styles from '@/features/events/events.module.css';

const EventRouteBackground = ({ run }: { run: Activity }) => {
  const d = getRoutePath(run, 160, 96);
  if (!d) {
    return null;
  }

  return (
    <svg
      className={styles.eventRouteBackground}
      viewBox="0 0 160 96"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
};

export default EventRouteBackground;
