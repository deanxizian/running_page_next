import type { StyleSpecification } from 'maplibre-gl';
import mapcnDarkStyle from './mapcn-dark-style.json';

type MapLayer = StyleSpecification['layers'][number];
type SymbolLayer = Extract<MapLayer, { type: 'symbol' }>;
type TextField = NonNullable<NonNullable<SymbolLayer['layout']>['text-field']>;

const CHINESE_LABEL_TEXT_FIELD = [
  'coalesce',
  ['get', 'name:zh-Hans'],
  ['get', 'name:zh'],
  ['get', 'name'],
  ['get', 'name_en'],
] as TextField;

const usesNameLabel = (textField: unknown) =>
  JSON.stringify(textField)?.includes('{name') ?? false;

const localizeMapLabels = (style: StyleSpecification): StyleSpecification => ({
  ...style,
  layers: style.layers.map((layer) => {
    if (
      layer.type !== 'symbol' ||
      !usesNameLabel(layer.layout?.['text-field'])
    ) {
      return layer;
    }

    return {
      ...layer,
      layout: {
        ...layer.layout,
        'text-field': CHINESE_LABEL_TEXT_FIELD,
      },
    };
  }),
});

const MAPCN_STYLE = localizeMapLabels(mapcnDarkStyle as StyleSpecification);
const getMapcnStyle = () => MAPCN_STYLE;

export { getMapcnStyle };
