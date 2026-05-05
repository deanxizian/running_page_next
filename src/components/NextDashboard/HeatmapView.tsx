import { PointerEvent as ReactPointerEvent, useCallback, useMemo } from 'react';
import type { ActivityGroups } from '@/entities/activity/lib/group';
import type { Activity } from '@/entities/activity/model/types';
import { DIST_UNIT } from '@/entities/activity/lib/format';
import { useTouchPreview } from '@/shared/hooks/useTouchInteractions';
import {
  EMPTY_ACTIVITIES,
  getMondayFirstDayIndex,
  totalDistance,
  summarizeRuns,
  formatRoundedHours,
  formatDurationShort,
} from '@/shared/lib/dashboard';
import sharedStyles from './style.module.css';
import styles from './heatmap.module.css';

const HeatmapView = ({
  years,
  sortedActivities,
  activityGroups,
}: {
  years: string[];
  sortedActivities: Activity[];
  activityGroups: ActivityGroups;
}) => {
  const totalStats = summarizeRuns(sortedActivities);
  const {
    previewedKey: previewedHeatmapKey,
    showTouchPreview: previewHeatmapCell,
  } = useTouchPreview<string>();
  const yearlyHeatmaps = useMemo(
    () =>
      years.map((yearLabel) => {
        const yearRuns =
          activityGroups.byYear.get(yearLabel) ?? EMPTY_ACTIVITIES;
        const year = Number(yearLabel);

        const start = new Date(year, 0, 1);
        start.setDate(start.getDate() - getMondayFirstDayIndex(start));
        const end = new Date(year, 11, 31);
        end.setDate(end.getDate() + (6 - getMondayFirstDayIndex(end)));
        const dayCount =
          Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

        const cells = Array.from({ length: dayCount }, (_, index) => {
          const date = new Date(start);
          date.setDate(start.getDate() + index);
          const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const runs = activityGroups.byDate.get(key) ?? EMPTY_ACTIVITIES;
          const distance = totalDistance(runs);
          return {
            key,
            date,
            distance,
            inYear: date.getFullYear() === year,
          };
        });

        return {
          year: yearLabel,
          stats: summarizeRuns(yearRuns),
          weekCount: dayCount / 7,
          cells,
        };
      }),
    [activityGroups, years]
  );
  const previewHeatmapCellAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const heatCell = element?.closest<HTMLElement>('[data-heat-key]');

      if (!heatCell) {
        return;
      }

      previewHeatmapCell(heatCell.dataset.heatKey);
    },
    [previewHeatmapCell]
  );

  return (
    <main className={sharedStyles.main}>
      <section className={styles.heatmapPage}>
        <div className={styles.heatmapPageHeader}>
          <div className={styles.heatmapTotalStats}>
            <span>
              <strong>{totalStats.count}</strong>
              <small>runs</small>
            </span>
            <span>
              <strong>{totalStats.distance.toFixed(0)}</strong>
              <small>{DIST_UNIT}</small>
            </span>
            <span>
              <strong>{formatRoundedHours(totalStats.seconds)}</strong>
              <small>hours</small>
            </span>
          </div>
        </div>

        <div className={styles.heatmapYearList}>
          {yearlyHeatmaps.map((yearHeatmap) => (
            <section
              key={yearHeatmap.year}
              className={`${sharedStyles.panel} ${styles.heatmapYearBlock}`}
            >
              <div className={styles.heatmapYearHeader}>
                <strong>{yearHeatmap.year}</strong>
                <div className={styles.heatStats}>
                  <div className={styles.heatStatsPrimary}>
                    <span>{yearHeatmap.stats.count} runs</span>
                    <span>
                      {yearHeatmap.stats.distance.toFixed(0)} {DIST_UNIT}
                    </span>
                    <span>
                      {formatDurationShort(yearHeatmap.stats.seconds)}
                    </span>
                  </div>
                  <div className={styles.heatStatsSecondary}>
                    <span>
                      {yearHeatmap.stats.avgPace} /{DIST_UNIT}
                    </span>
                    <span>{yearHeatmap.stats.avgHeartRate || '-'} bpm</span>
                  </div>
                </div>
              </div>
              <div className={styles.heatmapWrap}>
                <div
                  className={styles.yearHeatmap}
                  style={{ aspectRatio: `${yearHeatmap.weekCount} / 7` }}
                  onPointerMove={previewHeatmapCellAtPoint}
                >
                  {yearHeatmap.cells.map((cell) => (
                    <span
                      key={cell.key}
                      className={`${styles.heatCell} ${
                        !cell.inYear
                          ? styles.heatOutside
                          : cell.distance === 0
                            ? styles.heatEmpty
                            : cell.distance < 5
                              ? styles.heatLevelOne
                              : cell.distance < 10
                                ? styles.heatLevelTwo
                                : cell.distance < 20
                                  ? styles.heatLevelThree
                                  : styles.heatLevelFour
                      } ${
                        previewedHeatmapKey === cell.key
                          ? styles.heatCellPreviewed
                          : ''
                      }`}
                      data-heat-key={cell.inYear ? cell.key : undefined}
                      title={`${cell.key}: ${cell.distance.toFixed(2)} ${DIST_UNIT}`}
                      onPointerDown={(event) => {
                        if (event.pointerType !== 'mouse' && cell.inYear) {
                          previewHeatmapCell(cell.key);
                        }
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== 'mouse' && cell.inYear) {
                          previewHeatmapCell(cell.key);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
};

export default HeatmapView;
