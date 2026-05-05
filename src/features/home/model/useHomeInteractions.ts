import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useState,
} from 'react';
import {
  useTouchPreview,
  useTouchRevealAction,
} from '@/shared/hooks/useTouchInteractions';

const useHomeInteractions = (openEvents: () => void) => {
  const [totalTouchRevealResetSignal, setTotalTouchRevealResetSignal] =
    useState(0);
  const [eventTouchRevealResetSignal, setEventTouchRevealResetSignal] =
    useState(0);
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
  const clearTotalTouchReveal = useCallback(
    () => setTotalTouchRevealResetSignal((signal) => signal + 1),
    []
  );
  const clearEventTouchReveal = useCallback(
    () => setEventTouchRevealResetSignal((signal) => signal + 1),
    []
  );
  const {
    isTouchRevealActive: isEventTouchRevealActive,
    touchRevealHandlers: eventTouchRevealHandlers,
  } = useTouchRevealAction(openEvents, {
    onRevealStart: clearTotalTouchReveal,
    resetSignal: eventTouchRevealResetSignal,
  });
  const {
    previewedKey: previewedCalendarKey,
    showTouchPreview: previewCalendarCell,
    clearTouchPreview: clearCalendarPreview,
  } = useTouchPreview<string>();
  const {
    previewedKey: previewedMonthlyBarKey,
    showTouchPreview: previewMonthlyBar,
    clearTouchPreview: clearMonthlyBarPreview,
  } = useTouchPreview<string>();

  const previewCalendarCellAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const calendarButton = element?.closest<HTMLButtonElement>(
        '[data-calendar-key]'
      );

      if (!calendarButton || calendarButton.disabled) {
        return;
      }

      previewCalendarCell(calendarButton.dataset.calendarKey);
    },
    [previewCalendarCell]
  );

  const previewMonthlyBarAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const barButton = element?.closest<HTMLButtonElement>('[data-month-key]');

      if (!barButton || barButton.disabled) {
        return;
      }

      previewMonthlyBar(barButton.dataset.monthKey);
    },
    [previewMonthlyBar]
  );

  return {
    calendar: {
      previewedCalendarKey,
      previewCalendarCell,
      clearCalendarPreview,
      previewCalendarCellAtPoint,
    },
    eventSummary: {
      isEventTouchRevealActive,
      eventTouchRevealHandlers,
    },
    metrics: {
      totalTouchRevealResetSignal,
      clearEventTouchReveal,
    },
    monthlyChart: {
      hoveredMonthKey,
      previewedMonthlyBarKey,
      setHoveredMonthKey,
      previewMonthlyBar,
      clearMonthlyBarPreview,
      previewMonthlyBarAtPoint,
    },
  };
};

export { useHomeInteractions };
