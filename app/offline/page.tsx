export const metadata = {
  title: 'You are offline',
  description: 'JMT Academy connection help',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="offline-title">
        <p className="auth-kicker">JMT ACADEMY · CONNECTION STATUS</p>
        <h1 id="offline-title">You are currently offline</h1>
        <p className="muted">
          Your internet connection is unavailable. Reconnect to continue using
          your courses, submit work, or refresh protected learning materials.
        </p>
        <p className="muted">
          This page is the first offline foundation. Downloaded lessons and
          synchronisation will become available as those features are completed.
        </p>
        <a className="button button-primary" href="/">Try again</a>
      </section>
    </main>
  );
}
