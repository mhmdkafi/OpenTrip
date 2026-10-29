import Image from "next/image";

// Shown while the workspace loads: the real shell's frame with shimmering placeholders, so the page
// keeps its shape instead of sitting on a blank screen.
export function DashboardSkeleton() {
  return <div className="rimbaloka-app" aria-busy="true">
    <header className="mobile-bar"><span className="mobile-menu" aria-hidden="true"/><span className="mobile-brand"><Image src="/brand/rimbaloka-logo.jpeg" alt="" width={32} height={32}/>TripDash</span></header>
    <aside className="forest-sidebar">
      <span className="brand-lockup"><Image src="/brand/rimbaloka-logo.jpeg" alt="" width={43} height={43}/><div><strong>TripDash</strong><small>Rimbaloka Trip</small></div></span>
      <div className="sk-nav" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i}/>)}</div>
    </aside>
    <div className="app-main"><main className="app-content">
      <p className="sr-only" role="status">Loading your workspace…</p>
      <div className="sk-page" aria-hidden="true">
        <i className="sk sk-title"/>
        <div className="sk-row">{Array.from({ length: 4 }, (_, i) => <i key={i} className="sk sk-card"/>)}</div>
        <i className="sk sk-panel"/>
      </div>
    </main></div>
  </div>;
}
