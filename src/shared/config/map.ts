import type { StyleSpecification } from 'maplibre-gl';

const MAPCN_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

let cachedMapcnStyle: StyleSpecification | null = null;
let mapcnStyleRequest: Promise<StyleSpecification> | null = null;

const loadMapcnStyle = () => {
  if (cachedMapcnStyle) {
    return Promise.resolve(cachedMapcnStyle);
  }

  if (!mapcnStyleRequest) {
    mapcnStyleRequest = fetch(MAPCN_STYLE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Map style request failed: ${response.status}`);
        }

        return response.json() as Promise<StyleSpecification>;
      })
      .then((style) => {
        cachedMapcnStyle = style;
        return style;
      })
      .catch((error: unknown) => {
        mapcnStyleRequest = null;
        throw error;
      });
  }

  return mapcnStyleRequest;
};

const getMapcnStyle = () => cachedMapcnStyle ?? MAPCN_STYLE_URL;

const LINE_OPACITY = 0.4;

export { getMapcnStyle, LINE_OPACITY, loadMapcnStyle };
