import type { Activity } from '../model/types';

const RUN_TITLES = {
  FULL_MARATHON_RUN_TITLE: '全程马拉松',
  HALF_MARATHON_RUN_TITLE: '半程马拉松',
  MORNING_RUN_TITLE: '清晨跑步',
  MIDDAY_RUN_TITLE: '午间跑步',
  AFTERNOON_RUN_TITLE: '午后跑步',
  EVENING_RUN_TITLE: '傍晚跑步',
  NIGHT_RUN_TITLE: '夜晚跑步',
};

const titleForRun = (run: Activity): string => {
  const runDistance = run.distance / 1000;
  const runHour = +run.start_date_local.slice(11, 13);
  if (runDistance > 20 && runDistance < 40) {
    return RUN_TITLES.HALF_MARATHON_RUN_TITLE;
  }
  if (runDistance >= 40) {
    return RUN_TITLES.FULL_MARATHON_RUN_TITLE;
  }
  if (runHour >= 0 && runHour <= 10) {
    return RUN_TITLES.MORNING_RUN_TITLE;
  }
  if (runHour > 10 && runHour <= 14) {
    return RUN_TITLES.MIDDAY_RUN_TITLE;
  }
  if (runHour > 14 && runHour <= 18) {
    return RUN_TITLES.AFTERNOON_RUN_TITLE;
  }
  if (runHour > 18 && runHour <= 21) {
    return RUN_TITLES.EVENING_RUN_TITLE;
  }
  return RUN_TITLES.NIGHT_RUN_TITLE;
};

export { titleForRun };
