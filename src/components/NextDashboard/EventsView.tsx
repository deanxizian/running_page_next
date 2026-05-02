import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import RunMap from '@/components/RunMap';
import type { Activity } from '@/utils/utils';
import {
  M_TO_DIST,
  convertMovingTime2Sec,
  formatPace,
  geoJsonForRuns,
} from '@/utils/utils';
import {
  EVENT_MODAL_EXIT_DURATION_MS,
  EVENT_MODAL_MAP_HEIGHT,
  activityTitleForRun,
  isMarathonEventRun,
  getRacePbCategory,
  formatDuration,
  getEventModalMapViewport,
  getEventModalViewState,
} from './shared';
import { useTouchPreview } from './hooks';
import {
  EventRouteBackground,
  EventPbMedalIcon,
} from './ui';
import type { RacePbCategory } from './shared';
import styles from './style.module.css';

const EventsView = ({ sortedActivities }: { sortedActivities: Activity[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);
  const [isEventModalClosing, setIsEventModalClosing] = useState(false);
  const {
    previewedKey: previewedEventId,
    showTouchPreview: previewEventCard,
    clearTouchPreview: clearEventCardPreview,
  } = useTouchPreview<number>();
  const [eventModalMapViewport, setEventModalMapViewport] = useState(
    getEventModalMapViewport
  );
  const eventModalExitTimeoutRef = useRef<number | null>(null);
  const eventScrollLockRef = useRef<{
    scrollY: number;
    bodyPosition: string;
    bodyTop: string;
    bodyWidth: string;
  } | null>(null);
  const isEventModalOpen = selectedEvent !== null;
  const eventRuns = useMemo(
    () => sortedActivities.filter(isMarathonEventRun),
    [sortedActivities]
  );
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, Activity[]>();
    eventRuns.forEach((run) => {
      const year = run.start_date_local.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), run]);
    });
    return [...groups.entries()].sort(([a], [b]) => Number(b) - Number(a));
  }, [eventRuns]);
  const eventPbLabels = useMemo(() => {
    const bestByCategory = new Map<
      RacePbCategory,
      { run: Activity; seconds: number }
    >();

    eventRuns.forEach((run) => {
      const category = getRacePbCategory(run);
      const seconds = convertMovingTime2Sec(run.moving_time);

      if (!category || seconds <= 0) {
        return;
      }

      const currentBest = bestByCategory.get(category);
      if (!currentBest || seconds < currentBest.seconds) {
        bestByCategory.set(category, { run, seconds });
      }
    });

    const labels = new Map<number, string>();
    const halfPb = bestByCategory.get('half');
    const fullPb = bestByCategory.get('full');

    if (halfPb) {
      labels.set(halfPb.run.run_id, 'PB');
    }
    if (fullPb) {
      labels.set(fullPb.run.run_id, 'PB');
    }

    return labels;
  }, [eventRuns]);

  const modalGeoData = useMemo(
    () => geoJsonForRuns(selectedEvent ? [selectedEvent] : []),
    [selectedEvent]
  );
  const modalViewState = useMemo(
    () => getEventModalViewState(selectedEvent, eventModalMapViewport),
    [eventModalMapViewport, selectedEvent]
  );
  const ignoreModalViewStateUpdate = useCallback(() => undefined, []);
  const clearEventModalExitTimeout = useCallback(() => {
    if (eventModalExitTimeoutRef.current) {
      window.clearTimeout(eventModalExitTimeoutRef.current);
      eventModalExitTimeoutRef.current = null;
    }
  }, []);
  const openEventModal = useCallback(
    (run: Activity) => {
      clearEventCardPreview();
      clearEventModalExitTimeout();
      setIsEventModalClosing(false);
      setSelectedEvent(run);
    },
    [clearEventCardPreview, clearEventModalExitTimeout]
  );
  const previewEventCardAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      const eventCard = element?.closest<HTMLButtonElement>('[data-event-id]');
      const eventId = Number(eventCard?.dataset.eventId);

      if (!Number.isFinite(eventId)) {
        return;
      }

      previewEventCard(eventId);
    },
    [previewEventCard]
  );
  const closeEventModal = useCallback(() => {
    if (!selectedEvent || isEventModalClosing) {
      return;
    }

    setIsEventModalClosing(true);
    eventModalExitTimeoutRef.current = window.setTimeout(() => {
      setSelectedEvent(null);
      setIsEventModalClosing(false);
      eventModalExitTimeoutRef.current = null;
    }, EVENT_MODAL_EXIT_DURATION_MS);
  }, [isEventModalClosing, selectedEvent]);
  const eventModalTitleId = selectedEvent
    ? `event-modal-title-${selectedEvent.run_id}`
    : undefined;

  useEffect(
    () => () => {
      clearEventModalExitTimeout();
    },
    [clearEventModalExitTimeout]
  );

  useEffect(() => {
    if (!isEventModalOpen) {
      return undefined;
    }

    const updateEventModalMapViewport = () => {
      setEventModalMapViewport(getEventModalMapViewport());
    };

    updateEventModalMapViewport();
    window.addEventListener('resize', updateEventModalMapViewport);

    return () => {
      window.removeEventListener('resize', updateEventModalMapViewport);
    };
  }, [isEventModalOpen]);

  useEffect(() => {
    if (!isEventModalOpen || eventScrollLockRef.current) {
      return undefined;
    }

    const bodyStyle = document.body.style;
    const scrollY = window.scrollY;

    eventScrollLockRef.current = {
      scrollY,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyWidth: bodyStyle.width,
    };

    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';

    return () => {
      const lock = eventScrollLockRef.current;

      if (!lock) {
        return;
      }

      bodyStyle.position = lock.bodyPosition;
      bodyStyle.top = lock.bodyTop;
      bodyStyle.width = lock.bodyWidth;
      eventScrollLockRef.current = null;
      window.scrollTo(0, lock.scrollY);
    };
  }, [isEventModalOpen]);

  useEffect(() => {
    if (!isEventModalOpen) {
      return undefined;
    }

    const handleModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEventModal();
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [closeEventModal, isEventModalOpen]);

  return (
    <main className={`${styles.main} ${styles.eventsMain}`}>
      <section className={styles.eventGroups}>
        {groupedEvents.map(([year, runs]) => (
          <div key={year} className={styles.eventYearGroup}>
            <div className={styles.eventYearHeader}>
              <strong>{year}</strong>
              <span>赛季</span>
            </div>
            <div
              className={styles.eventCards}
              onPointerMove={previewEventCardAtPoint}
            >
              {runs.map((run) =>
                (() => {
                  const pbLabel = eventPbLabels.get(run.run_id);

                  return (
                    <button
                      key={run.run_id}
                      type="button"
                      className={`${styles.eventCard} ${
                        pbLabel ? styles.eventCardPb : ''
                      } ${
                        previewedEventId === run.run_id
                          ? styles.eventCardPreviewed
                          : ''
                      }`}
                      data-event-id={run.run_id}
                      onPointerDown={(event) => {
                        if (event.pointerType !== 'mouse') {
                          previewEventCard(run.run_id);
                        }
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== 'mouse') {
                          previewEventCard(run.run_id);
                        }
                      }}
                      onClick={() => openEventModal(run)}
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
                      <small>
                        {(run.distance / M_TO_DIST).toFixed(2)} km ·{' '}
                        {formatPace(run.average_speed)}
                      </small>
                    </button>
                  );
                })()
              )}
            </div>
          </div>
        ))}
      </section>
      {selectedEvent && (
        <div
          className={`${styles.modalBackdrop} ${
            isEventModalClosing ? styles.modalBackdropClosing : ''
          }`}
          onClick={closeEventModal}
        >
          <div
            className={`${styles.eventModal} ${
              isEventModalClosing ? styles.eventModalClosing : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={eventModalTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <small>{selectedEvent.start_date_local.slice(0, 10)}</small>
            <strong id={eventModalTitleId}>
              {activityTitleForRun(selectedEvent)}
            </strong>
            <span>
              {(selectedEvent.distance / M_TO_DIST).toFixed(2)} km ·{' '}
              {formatDuration(convertMovingTime2Sec(selectedEvent.moving_time))}
            </span>
            <span className={styles.eventModalMap}>
              <RunMap
                viewState={modalViewState}
                geoData={modalGeoData}
                setViewState={ignoreModalViewStateUpdate}
                height={EVENT_MODAL_MAP_HEIGHT}
                animateCamera={false}
              />
            </span>
          </div>
        </div>
      )}
    </main>
  );
};


export default EventsView;
