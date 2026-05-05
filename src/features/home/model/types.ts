import type {
  ButtonHTMLAttributes,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { Activity, IViewState } from '@/entities/activity/model/types';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import type { HomeSlideDirection } from './homeReducer';

type TouchRevealHandlers = ButtonHTMLAttributes<HTMLButtonElement>;

export interface CalendarCellViewModel {
  day: number | null;
  runs: Activity[];
  distance: number;
}

export interface MonthlyBarViewModel {
  month: string;
  monthKey: string;
  distanceLabel: string;
  height: string;
  inRange: boolean;
}

export type HomeMetricsViewModel = {
  allDistance: number;
  allSeconds: number;
  totalRunCount: number;
  yearDistance: number;
  previousYearDistance: number;
  monthDistance: number;
  previousMonthDistance: number;
  currentYearRuns: Activity[];
  currentMonthRuns: Activity[];
  totalTouchRevealResetSignal: number;
  clearEventTouchReveal: () => void;
};

export type EventSummaryViewModel = {
  marathonRuns: Activity[];
  latestLongRun: Activity | null;
  isEventTouchRevealActive: boolean;
  eventTouchRevealHandlers: TouchRevealHandlers;
};

export type HomeMapViewModel = {
  viewState: IViewState;
  selectedGeoData: FeatureCollection<RPGeometry>;
  setMapViewState: (viewState: IViewState) => void;
  handleMapReady: () => void;
};

export type ActivityLogViewModel = {
  years: string[];
  yearFilter: string;
  displayedActivities: Activity[];
  pagedRuns: Activity[];
  page: number;
  pageCount: number;
  selectedRun: Activity | null;
};

export type CalendarPanelViewModel = {
  calendarMonth: string;
  calendar: {
    cells: CalendarCellViewModel[];
    monthlyDistance: number;
  };
  previousCalendarMonth: string;
  nextCalendarMonth: string;
  canGoToPreviousMonth: boolean;
  canGoToNextMonth: boolean;
  selectedRun: Activity | null;
  previewedCalendarKey: string | null;
  slideDirection: HomeSlideDirection;
  previewCalendarCell: (key: string | undefined) => void;
  clearCalendarPreview: () => void;
  previewCalendarCellAtPoint: (
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
};

export type MonthlyChartViewModel = {
  monthlyChartYear: string;
  monthlyBars: MonthlyBarViewModel[];
  activeMonthlyBarKey: string;
  olderMonthlyChartYear: string | null;
  newerMonthlyChartYear: string | null;
  slideDirection: HomeSlideDirection;
  setHoveredMonthKey: (monthKey: string | null) => void;
  previewMonthlyBar: (monthKey: string | undefined) => void;
  clearMonthlyBarPreview: () => void;
  previewMonthlyBarAtPoint: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export type HomeDashboardActions = {
  changeFilter: (year: string) => void;
  toggleRunSelection: (run: Activity) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  changeCalendarMonth: (monthKey: string) => void;
  changeMonthlyChartYear: (year: string | null) => void;
};

export type HomeDashboardViewModel = {
  metrics: HomeMetricsViewModel;
  eventSummary: EventSummaryViewModel;
  map: HomeMapViewModel;
  log: ActivityLogViewModel;
  calendar: CalendarPanelViewModel;
  monthlyChart: MonthlyChartViewModel;
  actions: HomeDashboardActions;
};
