import type { Activity, IViewState } from '@/entities/activity/model/types';
import type { FeatureCollection, LineString } from '@/types/geojson';

export type EventGroup = [year: string, runs: Activity[]];

export type EventModalViewModel = {
  geoData: FeatureCollection<LineString>;
  isClosing: boolean;
  selectedEvent: Activity;
  titleId: string;
  viewState: IViewState;
};
