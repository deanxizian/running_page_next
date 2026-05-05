import type { Activity } from '../model/types';
import { IS_CHINESE } from '@/shared/config/i18n';

const RUN_TITLES = {
  FULL_MARATHON_RUN_TITLE: IS_CHINESE ? '全程马拉松' : 'Full Marathon',
  HALF_MARATHON_RUN_TITLE: IS_CHINESE ? '半程马拉松' : 'Half Marathon',
  MORNING_RUN_TITLE: IS_CHINESE ? '清晨跑步' : 'Morning Run',
  MIDDAY_RUN_TITLE: IS_CHINESE ? '午间跑步' : 'Midday Run',
  AFTERNOON_RUN_TITLE: IS_CHINESE ? '午后跑步' : 'Afternoon Run',
  EVENING_RUN_TITLE: IS_CHINESE ? '傍晚跑步' : 'Evening Run',
  NIGHT_RUN_TITLE: IS_CHINESE ? '夜晚跑步' : 'Night Run',
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
