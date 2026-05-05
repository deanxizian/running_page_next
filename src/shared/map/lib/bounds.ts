const DEFAULT_MAP_HEIGHT = 600;

const isBigMapZoom = (zoom: number | undefined) => (zoom ?? 0) <= 3;

export { DEFAULT_MAP_HEIGHT, isBigMapZoom };
