import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Activity } from '@/entities/activity/model/types';
import type { EventGroup } from '../model/types';
import EventCard from './EventCard';
import styles from '@/components/NextDashboard/events.module.css';

const EventList = ({
  eventPbLabels,
  groupedEvents,
  previewedEventId,
  previewEventCard,
  previewEventCardAtPoint,
  openEventModal,
}: {
  eventPbLabels: Map<number, string>;
  groupedEvents: EventGroup[];
  previewedEventId: number | null;
  previewEventCard: (runId: number) => void;
  previewEventCardAtPoint: (event: ReactPointerEvent<HTMLDivElement>) => void;
  openEventModal: (run: Activity) => void;
}) => (
  <section className={styles.eventGroups}>
    {groupedEvents.map(([year, runs]) => (
      <div key={year} className={styles.eventYearGroup}>
        <div className={styles.eventYearHeader}>
          <strong>{year}</strong>
          <span>赛季</span>
        </div>
        <div
          className={styles.eventCards}
          onPointerMove={previewEventCardAtPoint}
        >
          {runs.map((run) => (
            <EventCard
              key={run.run_id}
              run={run}
              pbLabel={eventPbLabels.get(run.run_id)}
              previewed={previewedEventId === run.run_id}
              onPreview={previewEventCard}
              onOpen={openEventModal}
            />
          ))}
        </div>
      </div>
    ))}
  </section>
);

export default EventList;
