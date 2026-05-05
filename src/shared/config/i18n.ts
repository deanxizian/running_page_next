const APP_LOCALE = import.meta.env.VITE_APP_LOCALE ?? 'zh-CN';
const IS_CHINESE = APP_LOCALE.toLowerCase().startsWith('zh');

export { APP_LOCALE, IS_CHINESE };
