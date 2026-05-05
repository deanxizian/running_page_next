import styles from '@/components/NextDashboard/events.module.css';

const EventPbMedalIcon = () => (
  <svg
    className={styles.eventPbMedal}
    viewBox="0 0 18 22"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4.3 1.8h4.1l1.1 5.1-2.7 2.4L4.3 1.8Z" />
    <path d="M9.6 1.8h4.1l-2.5 7.5-2.7-2.4 1.1-5.1Z" />
    <circle cx="9" cy="14.6" r="5.4" />
  </svg>
);

export default EventPbMedalIcon;
