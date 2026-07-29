import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import { getMapcnStyle } from './map';

type SymbolLayer = Extract<
  StyleSpecification['layers'][number],
  { type: 'symbol' }
>;

const CHINESE_LABEL_TEXT_FIELD = [
  'coalesce',
  ['get', 'name:zh-Hans'],
  ['get', 'name:zh'],
  ['get', 'name'],
  ['get', 'name_en'],
];

describe('MapCN style', () => {
  it('uses Chinese-first labels without changing house numbers', () => {
    const symbolLayers = getMapcnStyle().layers.filter(
      (layer): layer is SymbolLayer =>
        layer.type === 'symbol' && Boolean(layer.layout?.['text-field'])
    );
    const houseNumberLayer = symbolLayers.find(
      (layer) => layer.id === 'housenumber'
    );
    const namedLayers = symbolLayers.filter(
      (layer) => layer.id !== 'housenumber'
    );

    expect(namedLayers).toHaveLength(26);
    for (const layer of namedLayers) {
      expect(layer.layout?.['text-field']).toEqual(CHINESE_LABEL_TEXT_FIELD);
    }
    expect(houseNumberLayer?.layout?.['text-field']).toBe('{housenumber}');
  });
});
