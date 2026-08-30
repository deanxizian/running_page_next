import { useEffect, useMemo } from 'react';
import { useDashboardData } from '@/app/DashboardLayout';
import {
  attachActivityRoutes,
  parseActivityRoutes,
} from '@/entities/activity/data/activityRoutes';
import { preloadRunMap } from '@/shared/map/LazyRunMap';
import EventList from './components/EventList';
import EventModal from './components/EventModal';
import { useEventsPage } from './model/useEventsPage';
import sharedStyles from '@/shared/ui/dashboard.module.css';
import styles from '@/features/events/events.module.css';
import rawEventRoutes from '@/static/event_routes.json';

const eventRoutes = parseActivityRoutes(rawEventRoutes);

const EventsPage = () => {
  const { activitySnapshot } = useDashboardData();
  const activitiesWithEventRoutes = useMemo(
    () => attachActivityRoutes(activitySnapshot.sortedActivities, eventRoutes),
    [activitySnapshot.sortedActivities]
  );
  const eventsPage = useEventsPage(activitiesWithEventRoutes);

  useEffect(() => {
    preloadRunMap();
  }, []);

  return (
    <main className={`${sharedStyles.main} ${styles.eventsMain}`}>
      <EventList
        eventPbLabels={eventsPage.eventList.eventPbLabels}
        groupedEvents={eventsPage.eventList.groupedEvents}
        previewedEventId={eventsPage.eventList.previewedEventId}
        previewEventCard={eventsPage.eventList.previewEventCard}
        previewEventCardAtPoint={eventsPage.eventList.previewEventCardAtPoint}
        openEventModal={eventsPage.actions.openEventModal}
      />
      {eventsPage.eventModal && (
        <EventModal
          vm={eventsPage.eventModal}
          countries={activitySnapshot.countries}
          provinces={activitySnapshot.provinces}
          onClose={eventsPage.actions.closeEventModal}
          onIgnoreViewStateUpdate={
            eventsPage.actions.ignoreModalViewStateUpdate
          }
        />
      )}
    </main>
  );
};

export default EventsPage;
