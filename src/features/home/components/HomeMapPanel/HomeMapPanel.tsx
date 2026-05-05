import RunMap from '@/shared/map/LazyRunMap';
import { MAP_PANEL_HEIGHT } from '@/shared/lib/dashboard';
import type { HomeMapViewModel } from '../../model/types';
import styles from '@/shared/ui/dashboard.module.css';

const HomeMapPanel = ({
  id,
  vm,
  countries,
  provinces,
}: {
  id?: string;
  vm: HomeMapViewModel;
  countries: string[];
  provinces: string[];
}) => (
  <section id={id} className={`${styles.panel} ${styles.mapPanel}`}>
    <RunMap
      viewState={vm.viewState}
      geoData={vm.selectedGeoData}
      countries={countries}
      provinces={provinces}
      setViewState={vm.setMapViewState}
      height={MAP_PANEL_HEIGHT}
      onReady={vm.handleMapReady}
    />
  </section>
);

export default HomeMapPanel;
