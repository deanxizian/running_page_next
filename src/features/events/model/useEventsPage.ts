import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Activity } from '@/entities/activity/model/types';
import {
  geoJsonForRuns,
  getEventModalMapViewport,
  getEventModalViewState,
} from '@/entities/activity/lib/route';
import { EVENT_MODAL_EXIT_DURATION_MS } from '@/shared/lib/dashboard';
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock';
import { useTouchPreview } from '@/shared/hooks/useTouchInteractions';
import { useModalClosingState } from '../hooks/useModalClosingState';
import {
  eventPbLabelsFor,
  eventRunsFor,
  groupedEventsFor,
} from './eventSelectors';

const useEventsPage = (sortedActivities: Activity[]) => {
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);
  const [eventModalMapViewport, setEventModalMapViewport] = useState(
    getEventModalMapViewport
  );
  const modalClosing = useModalClosingState(EVENT_MODAL_EXIT_DURATION_MS);
  const {
    previewedKey: previewedEventId,
    showTouchPreview: previewEventCard,
    clearTouchPreview: clearEventCardPreview,
  } = useTouchPreview<number>();
  const eventRuns = useMemo(
    () => eventRunsFor(sortedActivities),
    [sortedActivities]
  );
  const groupedEvents = useMemo(() => groupedEventsFor(eventRuns), [eventRuns]);
  const eventPbLabels = useMemo(() => eventPbLabelsFor(eventRuns), [eventRuns]);
  const isEventModalOpen = selectedEvent !== null;

  useBodyScrollLock(isEventModalOpen);

  const modalGeoData = useMemo(
    () => geoJsonForRuns(selectedEvent ? [selectedEvent] : []),
    [selectedEvent]
  );
  const modalViewState = useMemo(
    () => getEventModalViewState(selectedEvent, eventModalMapViewport),
    [eventModalMapViewport, selectedEvent]
  );
  const ignoreModalViewStateUpdate = useCallback(() => undefined, []);
  const openEventModal = useCallback(
    (run: Activity) => {
      clearEventCardPreview();
      modalClosing.resetClosing();
      setSelectedEvent(run);
    },
    [clearEventCardPreview, modalClosing]
  );
  const closeEventModal = useCallback(() => {
    if (!selectedEvent) {
      return;
    }

    modalClosing.startClosing(() => setSelectedEvent(null));
  }, [modalClosing, selectedEvent]);
  const previewEventCardAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const eventCard = element?.closest<HTMLButtonElement>('[data-event-id]');
      const eventId = Number(eventCard?.dataset.eventId);

      if (!Number.isFinite(eventId)) {
        return;
      }

      previewEventCard(eventId);
    },
    [previewEventCard]
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

  return {
    eventList: {
      eventPbLabels,
      groupedEvents,
      previewedEventId,
      previewEventCard,
      previewEventCardAtPoint,
    },
    eventModal: selectedEvent
      ? {
          geoData: modalGeoData,
          isClosing: modalClosing.isClosing,
          selectedEvent,
          titleId: `event-modal-title-${selectedEvent.run_id}`,
          viewState: modalViewState,
        }
      : null,
    actions: {
      closeEventModal,
      ignoreModalViewStateUpdate,
      openEventModal,
    },
  };
};

export { useEventsPage };
