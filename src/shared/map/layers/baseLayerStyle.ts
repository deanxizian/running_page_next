import type { AnyLayer, Map as MapboxMap } from 'mapbox-gl';

const RUNNING_LAYER_IDS = new Set([
  'province',
  'countries',
  'runs2',
  'runs2-indoor',
]);
const ROUTE_LAYER_IDS = new Set(['runs2', 'runs2-indoor']);

const setBasePaintProperty = (
  map: MapboxMap,
  layerId: string,
  property: string,
  value: unknown
) => {
  try {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, property, value);
    }
  } catch {
    // Third-party styles differ by layer type. Unsupported paint properties can be ignored.
  }
};

const softenMapBaseLayers = (map: MapboxMap) => {
  let styleJson;

  try {
    styleJson = map.getStyle();
  } catch {
    return;
  }

  const layers = styleJson.layers as AnyLayer[] | undefined;

  if (!layers?.length) {
    return false;
  }

  layers.forEach((layer) => {
    if (RUNNING_LAYER_IDS.has(layer.id)) {
      return;
    }

    const layerId = layer.id.toLowerCase();
    const isRoad =
      layerId.includes('road') ||
      layerId.includes('bridge') ||
      layerId.includes('tunnel') ||
      layerId.includes('aeroway');
    const isWater = layerId.includes('water');
    const isBoundary = layerId.includes('boundary');
    const isBuilding = layerId.includes('building');
    const isLand =
      layerId.includes('land') ||
      layerId.includes('park') ||
      layerId.includes('place');

    if (layer.type === 'background') {
      setBasePaintProperty(map, layer.id, 'background-color', '#202124');
      setBasePaintProperty(map, layer.id, 'background-opacity', 1);
      return;
    }

    if (layer.type === 'fill') {
      if (isWater) {
        setBasePaintProperty(map, layer.id, 'fill-color', '#22272c');
        setBasePaintProperty(map, layer.id, 'fill-opacity', 0.46);
        return;
      }

      setBasePaintProperty(map, layer.id, 'fill-color', '#202124');
      setBasePaintProperty(
        map,
        layer.id,
        'fill-opacity',
        isBuilding ? 0.16 : 0.72
      );
      return;
    }

    if (layer.type === 'line') {
      if (isRoad) {
        setBasePaintProperty(map, layer.id, 'line-color', '#626771');
        setBasePaintProperty(map, layer.id, 'line-opacity', 0.52);
        return;
      }

      if (isWater) {
        setBasePaintProperty(map, layer.id, 'line-color', '#2f3941');
        setBasePaintProperty(map, layer.id, 'line-opacity', 0.22);
        return;
      }

      setBasePaintProperty(map, layer.id, 'line-color', '#3b3d43');
      setBasePaintProperty(
        map,
        layer.id,
        'line-opacity',
        isBoundary ? 0.26 : 0.22
      );
      return;
    }

    if (layer.type === 'symbol') {
      setBasePaintProperty(
        map,
        layer.id,
        'text-color',
        isRoad ? '#9aa0a8' : isLand ? '#858990' : '#747981'
      );
      setBasePaintProperty(map, layer.id, 'text-halo-color', '#202124');
      setBasePaintProperty(map, layer.id, 'text-opacity', isRoad ? 0.5 : 0.42);
      setBasePaintProperty(map, layer.id, 'icon-opacity', 0.28);
    }
  });

  return true;
};

const showBaseLayers = (map: MapboxMap) => {
  let styleJson;

  try {
    styleJson = map.getStyle();
  } catch {
    return;
  }

  styleJson.layers?.forEach((layer: { id: string }) => {
    try {
      if (!ROUTE_LAYER_IDS.has(layer.id) && map.getLayer(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', 'visible');
      }
    } catch {
      // Third-party styles can change while data events are still firing.
    }
  });
};

export { softenMapBaseLayers, showBaseLayers };
