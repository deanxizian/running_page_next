import styles from '../style.module.css';

type MapErrorOverlayProps = {
  message: string;
};

const MapErrorOverlay = ({ message }: MapErrorOverlayProps) => (
  <div className={styles.mapErrorNotification}>
    <span>{message}</span>
    <button onClick={() => window.location.reload()}>Reload Page</button>
  </div>
);

export { MapErrorOverlay };
