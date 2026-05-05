import { useDashboardData } from '@/app/DashboardLayout';
import EventList from './components/EventList';
import EventModal from './components/EventModal';
import { useEventsPage } from './model/useEventsPage';
import sharedStyles from '@/components/NextDashboard/style.module.css';
import styles from '@/components/NextDashboard/events.module.css';

const EventsPage = () => {
  const { activitySnapshot } = useDashboardData();
  const eventsPage = useEventsPage(activitySnapshot.sortedActivities);

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
