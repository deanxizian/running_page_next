import RunMap from '@/shared/map/LazyRunMap';
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
import styles from '@/features/events/events.module.css';

const metricValue = (
  value: number | null | undefined,
  unit: string,
  digits = 0
) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '--'
    : `${value.toFixed(digits)} ${unit}`;

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
}) => {
  const eventMetrics = [
    {
      label: 'Distance:',
      value: `${(vm.selectedEvent.distance / M_TO_DIST).toFixed(2)} ${DIST_UNIT}`,
      primary: true,
    },
    {
      label: 'Pace:',
      value: `${formatPace(vm.selectedEvent.average_speed)}/${DIST_UNIT}`,
      primary: true,
    },
    {
      label: 'Time:',
      value: formatDuration(
        convertMovingTime2Sec(vm.selectedEvent.moving_time)
      ),
      primary: true,
    },
    {
      label: 'Temperature:',
      value: metricValue(vm.selectedEvent.average_temp, '°C'),
      primary: false,
    },
    {
      label: 'Elevation:',
      value: metricValue(vm.selectedEvent.elevation_gain, 'm'),
      primary: false,
    },
    {
      label: 'Avg. HR:',
      value: metricValue(vm.selectedEvent.average_heartrate, 'bpm'),
      primary: false,
    },
  ];

  return (
    <div
      className={`${styles.modalBackdrop} ${
        vm.isClosing ? styles.modalBackdropClosing : ''
      }`}
    >
      <button
        type="button"
        className={styles.modalBackdropDismiss}
        aria-label="Close event details"
        onClick={onClose}
      />
      <div
        className={`${styles.eventModal} ${
          vm.isClosing ? styles.eventModalClosing : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={vm.titleId}
      >
        <small>{vm.selectedEvent.start_date_local.slice(0, 10)}</small>
        <strong id={vm.titleId}>{activityTitleForRun(vm.selectedEvent)}</strong>
        <dl className={styles.eventModalMetrics}>
          {eventMetrics.map((metric) => (
            <div
              key={metric.label}
              className={`${styles.eventModalMetric} ${
                metric.primary ? styles.eventModalMetricPrimary : ''
              }`}
            >
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
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
};

export default EventModal;
