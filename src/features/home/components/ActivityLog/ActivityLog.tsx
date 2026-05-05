import { ROWS_PER_PAGE } from '@/shared/lib/dashboard';
import type {
  ActivityLogViewModel,
  HomeDashboardActions,
} from '../../model/types';
import ActivityLogRow from './ActivityLogRow';
import Pagination from './Pagination';
import styles from '@/components/NextDashboard/style.module.css';

const ActivityLog = ({
  vm,
  actions,
}: {
  vm: ActivityLogViewModel;
  actions: Pick<
    HomeDashboardActions,
    'changeFilter' | 'toggleRunSelection' | 'goToPreviousPage' | 'goToNextPage'
  >;
}) => (
  <section id="activity-log" className={styles.panel}>
    <div className={styles.panelHeader}>
      <h2>Activity Log</h2>
      <span>
        Showing{' '}
        {vm.displayedActivities.length ? vm.page * ROWS_PER_PAGE + 1 : 0}-
        {Math.min((vm.page + 1) * ROWS_PER_PAGE, vm.displayedActivities.length)}{' '}
        of {vm.displayedActivities.length}
      </span>
    </div>
    <div className={styles.filterRow}>
      {[...vm.years, 'All'].map((year) => (
        <button
          key={year}
          type="button"
          className={vm.yearFilter === year ? styles.filterActive : ''}
          onClick={() => actions.changeFilter(year)}
        >
          {year}
        </button>
      ))}
    </div>
    <div className={styles.tableWrap}>
      <table className={styles.activityTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Distance</th>
            <th>Duration</th>
            <th>Pace</th>
            <th>HR</th>
          </tr>
        </thead>
        <tbody key={`${vm.yearFilter}-${vm.page}`}>
          {vm.pagedRuns.map((run, index) => (
            <ActivityLogRow
              key={run.run_id}
              index={index}
              run={run}
              selected={vm.selectedRun?.run_id === run.run_id}
              onToggle={actions.toggleRunSelection}
            />
          ))}
        </tbody>
      </table>
    </div>
    <Pagination page={vm.page} pageCount={vm.pageCount} actions={actions} />
  </section>
);

export default ActivityLog;
