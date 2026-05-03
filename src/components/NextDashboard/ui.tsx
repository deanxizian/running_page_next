import { useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { Activity } from '@/utils/utils';
import {
  NAV_LINKS,
  NAV_INDICATOR_STEP_DURATION_MS,
  getRoutePath,
  navIndexForPath,
} from './shared';
import { useTouchRevealAction } from './hooks';
import styles from './style.module.css';

const MetricCard = ({
  label,
  value,
  unit,
  details,
  detailIcons,
  stackDetails = false,
  progress,
  trend,
  onClick,
  overlay,
  className,
  onTouchRevealStart,
  touchRevealResetSignal,
}: {
  label: string;
  value: string;
  unit: string;
  details: string[];
  detailIcons?: MetricIconName[];
  stackDetails?: boolean;
  progress?: number;
  trend?: {
    text: string;
    positive: boolean;
  };
  onClick?: () => void;
  overlay?: string;
  className?: string;
  onTouchRevealStart?: () => void;
  touchRevealResetSignal?: number;
}) => {
  const { isTouchRevealActive, touchRevealHandlers } =
    useTouchRevealAction(onClick, {
      onRevealStart: onTouchRevealStart,
      resetSignal: touchRevealResetSignal,
    });
  const cardClassName = [
    styles.metricCard,
    onClick ? styles.metricCardInteractive : '',
    isTouchRevealActive ? styles.cardTouchRevealActive : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>
        {value}
        <span>{unit}</span>
      </span>
      <span
        className={`${styles.metricProgressSlot} ${
          typeof progress === 'number' ? '' : styles.metricSlotEmpty
        }`}
      >
        {typeof progress === 'number' && (
          <span className={styles.progressTrack}>
            <span
              className={styles.progressBar}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </span>
        )}
      </span>
      <span
        className={`${styles.metricDetails} ${
          stackDetails ? styles.metricDetailsStacked : ''
        }`}
      >
        {details.map((detail, index) => (
          <span key={`${detail}-${index}`} className={styles.metricDetailItem}>
            {detailIcons?.[index] && (
              <span className={styles.metricDetailIcon}>
                <MetricIcon icon={detailIcons[index]} />
              </span>
            )}
            {detail}
          </span>
        ))}
      </span>
      <span className={styles.metricTrendSlot}>
        {trend ? (
          <span
            className={`${styles.metricTrend} ${
              trend.positive ? styles.trendPositive : styles.trendMuted
            }`}
          >
            <span className={styles.metricDetailIcon}>
              <MetricIcon icon={trend.positive ? 'trendUp' : 'trendDown'} />
            </span>
            {trend.text}
          </span>
        ) : (
          <span className={styles.metricTrendPlaceholder} aria-hidden="true" />
        )}
      </span>
      {overlay && <span className={styles.cardOverlay}>{overlay}</span>}
    </>
  );

  if (!onClick) {
    return <article className={cardClassName}>{content}</article>;
  }

  return (
    <button type="button" className={cardClassName} {...touchRevealHandlers}>
      {content}
    </button>
  );
};

type MetricIconName =
  | 'bolt'
  | 'clock'
  | 'target'
  | 'calendar'
  | 'trendUp'
  | 'trendDown';

const MetricIcon = ({ icon }: { icon: MetricIconName }) => {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (icon) {
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2" />
          <path d="M9 2h6" />
        </svg>
      );
    case 'target':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18" />
        </svg>
      );
    case 'trendUp':
      return (
        <svg {...commonProps}>
          <path d="m3 17 6-6 4 4 7-7" />
          <path d="M14 8h6v6" />
        </svg>
      );
    case 'trendDown':
      return (
        <svg {...commonProps}>
          <path d="m3 7 6 6 4-4 7 7" />
          <path d="M14 16h6v-6" />
        </svg>
      );
    case 'bolt':
    default:
      return (
        <svg {...commonProps}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      );
  }
};

const RouteSpark = ({ run }: { run: Activity }) => {
  const d = getRoutePath(run);
  if (!d) {
    return <span className={styles.calendarDistanceOnly} />;
  }

  return (
    <svg className={styles.routeSpark} viewBox="0 0 68 36" aria-hidden="true">
      <path d={d} />
    </svg>
  );
};

const EventRouteBackground = ({ run }: { run: Activity }) => {
  const d = getRoutePath(run, 160, 96);
  if (!d) {
    return null;
  }

  return (
    <svg
      className={styles.eventRouteBackground}
      viewBox="0 0 160 96"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
};

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

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg
    className={styles.navArrowIcon}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d={direction === 'left' ? 'M15 18 9 12l6-6' : 'm9 18 6-6-6-6'} />
  </svg>
);

const navIndicatorStyle = (activeNavIndex: number, travelSteps: number) =>
  ({
    '--nav-indicator-offset':
      activeNavIndex === 0
        ? '0px'
        : activeNavIndex === 1
          ? 'calc(100% + var(--nav-gap))'
          : 'calc(200% + var(--nav-gap) + var(--nav-gap))',
    '--nav-indicator-duration':
      travelSteps === 0
        ? '0ms'
        : `${travelSteps * NAV_INDICATOR_STEP_DURATION_MS}ms`,
  }) as CSSProperties;

const PageShell = ({
  children,
  thisYear,
}: {
  children: ReactNode;
  thisYear: string;
}) => {
  const location = useLocation();
  const activeNavIndex = navIndexForPath(location.pathname);
  const previousNavIndexRef = useRef(activeNavIndex);
  const indicatorTravelSteps = Math.abs(
    activeNavIndex - previousNavIndexRef.current
  );
  const indicatorStyle = navIndicatorStyle(
    activeNavIndex,
    indicatorTravelSteps
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    previousNavIndexRef.current = activeNavIndex;
  }, [activeNavIndex]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.brand}>
            <span>Running</span>
            <span> Page</span>
          </Link>
          <div className={styles.navLinks} style={indicatorStyle}>
            <span className={styles.navIndicator} aria-hidden="true" />
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? styles.navLinkActive : undefined
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      {children}
      <footer className={styles.footer}>
        © {thisYear} Running Page. All miles counted.
      </footer>
    </div>
  );
};

export {
  MetricCard,
  RouteSpark,
  EventRouteBackground,
  EventPbMedalIcon,
  ChevronIcon,
  PageShell,
};
