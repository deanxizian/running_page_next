import { activityTitleForRun } from '@/entities/activity/lib/stats';
import type { EventSummaryViewModel } from '../../model/types';
import styles from '@/shared/ui/dashboard.module.css';

const EventSummaryCard = ({
  id,
  vm,
}: {
  id?: string;
  vm: EventSummaryViewModel;
}) => (
  <button
    type="button"
    id={id}
    className={`${styles.panel} ${styles.eventPanel} ${
      vm.isEventTouchRevealActive ? styles.cardTouchRevealActive : ''
    }`}
    {...vm.eventTouchRevealHandlers}
  >
    <span className={styles.eventCount}>{vm.eventRuns.length}</span>
    <span className={styles.eventTitle}>
      <strong>Marathon Events</strong>
      <span>in {vm.year}</span>
    </span>
    <span className={styles.latestFinish}>
      <span>Latest Finish</span>
      <strong>
        {vm.latestEvent ? activityTitleForRun(vm.latestEvent) : '-'}
      </strong>
      <small>
        {vm.latestEvent
          ? vm.latestEvent.start_date_local.slice(0, 10).replaceAll('-', '/')
          : '-'}
      </small>
    </span>
    <span className={styles.cardOverlay}>点击打开赛事记录</span>
  </button>
);

export default EventSummaryCard;
