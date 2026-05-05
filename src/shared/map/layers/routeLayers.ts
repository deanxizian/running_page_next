import type { FillPaint, LineLayout, LinePaint } from 'mapbox-gl';
import {
  COUNTRY_FILL_COLOR,
  PROVINCE_FILL_COLOR,
  SINGLE_RUN_COLOR_DARK,
} from '@/shared/theme/colors';
import { LINE_OPACITY } from '@/shared/config/map';

const routeLineLayout = {
  'line-join': 'round',
  'line-cap': 'round',
} satisfies LineLayout;

const provinceFillPaint = {
  'fill-color': PROVINCE_FILL_COLOR,
  'fill-opacity': 0.18,
} satisfies FillPaint;

const countryFillPaint = {
  'fill-color': COUNTRY_FILL_COLOR,
  'fill-opacity': ['case', ['==', ['get', 'name'], '中国'], 0.1, 0.5] as [
    'case',
    ['==', ['get', 'name'], string],
    number,
    number,
  ],
} satisfies FillPaint;

const outdoorRunPaintFor = (
  isBigMap: boolean,
  isSingleRun: boolean
): LinePaint => ({
  'line-color': SINGLE_RUN_COLOR_DARK,
  'line-width': [
    'case',
    ['==', ['get', 'dimmed'], true],
    0.9,
    isBigMap ? 1.3 : isSingleRun ? 2.35 : 2,
  ],
  'line-dasharray': [2, 0],
  'line-opacity': [
    'case',
    ['==', ['get', 'dimmed'], true],
    0.18,
    isSingleRun || isBigMap ? 0.86 : 0.8,
  ],
  'line-blur': 0.35,
});

const indoorRunPaintFor = (
  isBigMap: boolean,
  isSingleRun: boolean
): LinePaint => ({
  'line-color': SINGLE_RUN_COLOR_DARK,
  'line-width': [
    'case',
    ['==', ['get', 'dimmed'], true],
    0.85,
    isBigMap ? 1.2 : isSingleRun ? 2.1 : 1.85,
  ],
  'line-dasharray': [2, 0],
  'line-opacity': [
    'case',
    ['==', ['get', 'dimmed'], true],
    0.1,
    isSingleRun || isBigMap ? 0.55 : LINE_OPACITY * 0.55,
  ],
  'line-blur': 0.35,
});

const outdoorRunFilter = ['!=', ['get', 'indoor'], true];
const indoorRunFilter = ['==', ['get', 'indoor'], true];

export {
  countryFillPaint,
  indoorRunFilter,
  indoorRunPaintFor,
  outdoorRunFilter,
  outdoorRunPaintFor,
  provinceFillPaint,
  routeLineLayout,
};
