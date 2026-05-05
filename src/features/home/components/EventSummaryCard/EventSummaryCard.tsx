import { activityTitleForRun } from '@/entities/activity/lib/stats';
import type { EventSummaryViewModel } from '../../model/types';
import styles from '@/components/NextDashboard/style.module.css';

const EventSummaryCard = ({
  id,
  thisYear,
  vm,
}: {
  id?: string;
  thisYear: string;
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
    <span className={styles.eventCount}>{vm.marathonRuns.length}</span>
    <span className={styles.eventTitle}>
      <strong>Marathon Events</strong>
      <span>in {thisYear}</span>
    </span>
    <span className={styles.latestFinish}>
      <span>Latest Finish</span>
      <strong>
        {vm.latestLongRun ? activityTitleForRun(vm.latestLongRun) : '-'}
      </strong>
      <small>
        {vm.latestLongRun
          ? vm.latestLongRun.start_date_local.slice(0, 10).replaceAll('-', '/')
          : '-'}
      </small>
    </span>
    <span className={styles.cardOverlay}>点击打开赛事记录</span>
  </button>
);

export default EventSummaryCard;
