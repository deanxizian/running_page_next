import { ChevronIcon } from '@/components/NextDashboard/ui';
import type { HomeDashboardActions } from '../../model/types';
import styles from '@/components/NextDashboard/style.module.css';

const Pagination = ({
  page,
  pageCount,
  actions,
}: {
  page: number;
  pageCount: number;
  actions: Pick<HomeDashboardActions, 'goToPreviousPage' | 'goToNextPage'>;
}) => (
  <div className={styles.pagination}>
    <button
      type="button"
      onClick={actions.goToPreviousPage}
      disabled={page === 0}
      aria-label="Previous page"
    >
      <ChevronIcon direction="left" />
    </button>
    <span>
      Page {page + 1} of {pageCount}
    </span>
    <button
      type="button"
      onClick={actions.goToNextPage}
      disabled={page >= pageCount - 1}
      aria-label="Next page"
    >
      <ChevronIcon direction="right" />
    </button>
  </div>
);

export default Pagination;
