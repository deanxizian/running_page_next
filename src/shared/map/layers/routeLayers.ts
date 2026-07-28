import type {
  FillLayerSpecification,
  LineLayerSpecification,
} from 'maplibre-gl';
import {
  COUNTRY_FILL_COLOR,
  PROVINCE_FILL_COLOR,
  SINGLE_RUN_COLOR_DARK,
} from '@/shared/theme/colors';

type FillPaint = NonNullable<FillLayerSpecification['paint']>;
type LineLayout = NonNullable<LineLayerSpecification['layout']>;
type LinePaint = NonNullable<LineLayerSpecification['paint']>;

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

const runPaintFor = (isBigMap: boolean, isSingleRun: boolean): LinePaint => ({
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

export { countryFillPaint, provinceFillPaint, runPaintFor, routeLineLayout };
