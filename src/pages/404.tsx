import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <main
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#000',
      color: '#fff',
      fontFamily: 'var(--font-sans)',
      padding: 24,
      textAlign: 'center',
    }}
  >
    <div>
      <h1 style={{ margin: 0, fontSize: 64, fontWeight: 900 }}>404</h1>
      <p style={{ color: '#a1a1aa' }}>This page does not exist.</p>
      <Link style={{ color: '#e31937', fontWeight: 800 }} to="/">
        Back to dashboard
      </Link>
    </div>
  </main>
);

export default NotFoundPage;
