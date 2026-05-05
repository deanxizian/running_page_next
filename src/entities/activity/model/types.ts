export type Coordinate = [number, number];

export interface Activity {
  run_id: number;
  name: string;
  distance: number;
  moving_time: string;
  type: string;
  subtype: string;
  start_date: string;
  start_date_local: string;
  start_time_local_ms: number;
  month_key: string;
  year_key: string;
  location_country?: string | null;
  summary_polyline?: string | null;
  average_heartrate?: number | null;
  elevation_gain: number | null;
  average_speed: number;
  streak: number;
}

export interface IViewState {
  longitude?: number;
  latitude?: number;
  zoom?: number;
}
