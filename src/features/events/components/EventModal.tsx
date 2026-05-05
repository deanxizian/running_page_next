import RunMap from '@/components/RunMap/LazyRunMap';
import {
  DIST_UNIT,
  M_TO_DIST,
  convertMovingTime2Sec,
  formatDuration,
  formatPace,
} from '@/entities/activity/lib/format';
import { activityTitleForRun } from '@/entities/activity/lib/stats';
import { EVENT_MODAL_MAP_HEIGHT } from '@/shared/lib/dashboard';
import type { EventModalViewModel } from '../model/types';
import styles from '@/components/NextDashboard/events.module.css';

const EventModal = ({
  countries,
  provinces,
  vm,
  onClose,
  onIgnoreViewStateUpdate,
}: {
  countries: string[];
  provinces: string[];
  vm: EventModalViewModel;
  onClose: () => void;
  onIgnoreViewStateUpdate: () => void;
}) => (
  <div
    className={`${styles.modalBackdrop} ${
      vm.isClosing ? styles.modalBackdropClosing : ''
    }`}
    onClick={onClose}
  >
    <div
      className={`${styles.eventModal} ${
        vm.isClosing ? styles.eventModalClosing : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={vm.titleId}
      onClick={(event) => event.stopPropagation()}
    >
      <small>{vm.selectedEvent.start_date_local.slice(0, 10)}</small>
      <strong id={vm.titleId}>{activityTitleForRun(vm.selectedEvent)}</strong>
      <span>
        距离 {(vm.selectedEvent.distance / M_TO_DIST).toFixed(2)} {DIST_UNIT} ·
        配速 {formatPace(vm.selectedEvent.average_speed)} /{DIST_UNIT} · 时间{' '}
        {formatDuration(convertMovingTime2Sec(vm.selectedEvent.moving_time))}
      </span>
      <span className={styles.eventModalMap}>
        <RunMap
          viewState={vm.viewState}
          geoData={vm.geoData}
          countries={countries}
          provinces={provinces}
          setViewState={onIgnoreViewStateUpdate}
          height={EVENT_MODAL_MAP_HEIGHT}
          animateCamera={false}
        />
      </span>
    </div>
  </div>
);

export default EventModal;
