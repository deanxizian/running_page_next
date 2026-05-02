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

// styling: route line opacity: [0, 1]
const LINE_OPACITY = 0.4;

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
  RUN_TITLES,
  LINE_OPACITY,
};

const primary = 'rgb(224,237,94)';
const dark_vanilla = 'rgb(228,212,220)';

export const MAIN_COLOR = primary;
export const PROVINCE_FILL_COLOR = '#E31937';
export const COUNTRY_FILL_COLOR = dark_vanilla;

export const SINGLE_RUN_COLOR_DARK = '#E31937';

export const MAP_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
