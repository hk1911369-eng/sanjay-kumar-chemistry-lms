import Link from 'next/link';

export default function CoursesLoading() {
  return (
    <main className="portal-shell" aria-busy="true" aria-label="Loading course catalogue">
      <header className="portal-header">
        <Link className="brand" href="/">JMT ACADEMY</Link>
        <span className="skeleton-line skeleton-login" aria-hidden="true" />
      </header>
      <section className="portal-content catalogue-page">
        <span className="auth-kicker">JMT ACADEMY · COURSE CATALOGUE</span>
        <div className="skeleton-line skeleton-heading" aria-hidden="true" />
        <div className="skeleton-line skeleton-intro" aria-hidden="true" />
        <div className="catalogue-skeleton-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <article className="catalogue-skeleton-card" key={index}>
              <div className="catalogue-skeleton-cover" />
              <div className="catalogue-skeleton-body">
                <div className="skeleton-line skeleton-short" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-medium" />
                <div className="skeleton-line skeleton-price" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
