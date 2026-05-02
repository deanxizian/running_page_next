// Constants
const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ?? '';
const MUNICIPALITY_CITIES_ARR = [
  '北京市',
  '上海市',
  '天津市',
  '重庆市',
  '香港特别行政区',
  '澳门特别行政区',
];

// styling: set to `true` if you want dash-line route
const USE_DASH_LINE = false;
// styling: route line opacity: [0, 1]
const LINE_OPACITY = 0.4;
// styling: map height - responsive design
// Use smaller height on mobile devices for better user experience
const MAP_HEIGHT = window.innerWidth <= 768 ? 250 : 600;
//set to `false` if you want to hide the road label characters
const ROAD_LABEL_DISPLAY = true;

// IF you are outside China please make sure IS_CHINESE = false
const IS_CHINESE = true;
const FULL_MARATHON_RUN_TITLE = IS_CHINESE ? '全程马拉松' : 'Full Marathon';
const HALF_MARATHON_RUN_TITLE = IS_CHINESE ? '半程马拉松' : 'Half Marathon';
const MORNING_RUN_TITLE = IS_CHINESE ? '清晨跑步' : 'Morning Run';
const MIDDAY_RUN_TITLE = IS_CHINESE ? '午间跑步' : 'Midday Run';
const AFTERNOON_RUN_TITLE = IS_CHINESE ? '午后跑步' : 'Afternoon Run';
const EVENING_RUN_TITLE = IS_CHINESE ? '傍晚跑步' : 'Evening Run';
const NIGHT_RUN_TITLE = IS_CHINESE ? '夜晚跑步' : 'Night Run';

const RUN_TITLES = {
  FULL_MARATHON_RUN_TITLE,
  HALF_MARATHON_RUN_TITLE,
  MORNING_RUN_TITLE,
  MIDDAY_RUN_TITLE,
  AFTERNOON_RUN_TITLE,
  EVENING_RUN_TITLE,
  NIGHT_RUN_TITLE,
};

export {
  MAPBOX_TOKEN,
  MUNICIPALITY_CITIES_ARR,
  IS_CHINESE,
  ROAD_LABEL_DISPLAY,
  RUN_TITLES,
  USE_DASH_LINE,
  LINE_OPACITY,
  MAP_HEIGHT,
};

const primary = 'rgb(224,237,94)';
const dark_vanilla = 'rgb(228,212,220)';

// If your map has an offset please change this line
// issues #92 and #198
export const NEED_FIX_MAP = false;
export const MAIN_COLOR = primary;
export const PROVINCE_FILL_COLOR = '#E31937';
export const COUNTRY_FILL_COLOR = dark_vanilla;

export const SINGLE_RUN_COLOR_DARK = '#E31937';

// map tiles vendor, maptiler or mapbox or stadiamaps
// if you want to use maptiler, set the access token in MAP_TILE_ACCESS_TOKEN
export const MAP_TILE_VENDOR = 'mapcn';

export const MAP_TILE_STYLE_DARK = 'dark-matter';

// access token. you can apply a new one, it's free.
// maptiler: Gt5R0jT8tuIYxW6sNrAg | sign up at https://cloud.maptiler.com/auth/widget
// stadiamaps: 8a769c5a-9125-4936-bdcf-a6b90cb5d0a4 | sign up at https://client.stadiamaps.com/signup/
// mapcn: empty
export const MAP_TILE_ACCESS_TOKEN = '';

export const MAP_TILE_STYLES = {
  mapcn: {
    'osm-bright':
      'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    'osm-liberty':
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    'dark-matter':
      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  // Alternative free tile providers for regions where Carto may be blocked
  mapcn_openfreemap: {
    'osm-bright': 'https://tiles.openfreemap.org/styles/bright',
    'dark-matter': 'https://tiles.openfreemap.org/styles/dark',
  },
  mapcn_maptiler_free: {
    // Use free, tokenless styles to avoid requiring an API key
    'osm-bright': 'https://tiles.openfreemap.org/styles/bright',
    'dark-matter': 'https://tiles.openfreemap.org/styles/dark',
  },
  maptiler: {
    'dataviz-light': 'https://api.maptiler.com/maps/dataviz/style.json?key=',
    'dataviz-dark':
      'https://api.maptiler.com/maps/dataviz-dark/style.json?key=',
    'basic-light': 'https://api.maptiler.com/maps/basic-v2/style.json?key=',
    'basic-dark': 'https://api.maptiler.com/maps/basic-v2-dark/style.json?key=',
    'streets-light': 'https://api.maptiler.com/maps/streets-v2/style.json?key=',
    'streets-dark':
      'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=',
    'outdoor-light': 'https://api.maptiler.com/maps/outdoor-v2/style.json?key=',
    'outdoor-dark':
      'https://api.maptiler.com/maps/outdoor-v2-dark/style.json?key=',
    'bright-light': 'https://api.maptiler.com/maps/bright-v2/style.json?key=',
    'bright-dark':
      'https://api.maptiler.com/maps/bright-v2-dark/style.json?key=',
    'topo-light': 'https://api.maptiler.com/maps/topo-v2/style.json?key=',
    'topo-dark': 'https://api.maptiler.com/maps/topo-v2-dark/style.json?key=',
    'winter-light': 'https://api.maptiler.com/maps/winter-v2/style.json?key=',
    'winter-dark':
      'https://api.maptiler.com/maps/winter-v2-dark/style.json?key=',
    hybrid: 'https://api.maptiler.com/maps/hybrid/style.json?key=',
  },

  // https://docs.stadiamaps.com/themes/
  stadiamaps: {
    // light
    alidade_smooth:
      'https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=',
    alidade_smooth_dark:
      'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=',
    alidade_satellite:
      'https://tiles.stadiamaps.com/styles/alidade_satellite.json?api_key=',
  },

  // https://docs.mapbox.com/api/maps/styles/
  mapbox: {
    'dark-v10': 'mapbox://styles/mapbox/dark-v10',
    'dark-v11': 'mapbox://styles/mapbox/dark-v11',
    'light-v10': 'mapbox://styles/mapbox/light-v10',
    'light-v11': 'mapbox://styles/mapbox/light-v11',
    'navigation-night': 'mapbox://styles/mapbox/navigation-night-v1',
    'satellite-streets-v12': 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  default: 'mapbox://styles/mapbox/dark-v10',
};

// Configuration validation
if (typeof window !== 'undefined') {
  // Validate token requirements
  if (MAP_TILE_VENDOR === 'mapcn' && MAP_TILE_ACCESS_TOKEN !== '') {
    console.warn(
      '⚠️ MapCN (Carto) does not require an access token.\n' +
        '💡 You can set MAP_TILE_ACCESS_TOKEN = "" in src/utils/const.ts'
    );
  }

  if (
    ['mapbox', 'maptiler', 'stadiamaps'].includes(MAP_TILE_VENDOR) &&
    MAP_TILE_ACCESS_TOKEN === ''
  ) {
    console.error(
      `❌ ${MAP_TILE_VENDOR.toUpperCase()} requires an access token!\n` +
        `💡 Please set MAP_TILE_ACCESS_TOKEN in src/utils/const.ts\n` +
        `📚 See README.md for instructions on getting a token.\n` +
        `\n` +
        `💡 TIP: Use MAP_TILE_VENDOR = 'mapcn' for free (no token required)`
    );
  }

  // Validate style matches vendor
  const vendorStyles = (MAP_TILE_STYLES as any)[MAP_TILE_VENDOR];
  if (vendorStyles && !vendorStyles[MAP_TILE_STYLE_DARK]) {
    console.error(
      `❌ Style "${MAP_TILE_STYLE_DARK}" is not valid for vendor "${MAP_TILE_VENDOR}"\n` +
        `💡 Available styles: ${Object.keys(vendorStyles).join(', ')}\n` +
        `📚 Check src/utils/const.ts MAP_TILE_STYLES for valid combinations`
    );
  }

  // Success message for correct MapCN configuration
  if (
    MAP_TILE_VENDOR === 'mapcn' &&
    MAP_TILE_ACCESS_TOKEN === '' &&
    vendorStyles?.[MAP_TILE_STYLE_DARK]
  ) {
    console.info(
      '✅ Using MapCN (Carto Basemaps) - Free, no token required!\n' +
        '📖 Attribution: Map tiles © CARTO, Map data © OpenStreetMap contributors\n' +
        '📚 See docs/CARTO_TERMS.md for usage terms'
    );
  }
}
