export default function WorkspaceLoading() {
  return (
    <div className="dashboard" aria-label="Loading workspace" aria-busy="true">
      <div className="skeleton" style={{ height: 174, borderRadius: 15 }} />
      <div className="stats-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="stat-card">
            <div className="skeleton" style={{ width: 47, height: 47, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "70%", height: 9 }} />
              <div className="skeleton" style={{ width: "40%", height: 20, marginTop: 9 }} />
              <div className="skeleton" style={{ width: "55%", height: 8, marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="panel" style={{ minHeight: 300, padding: 20 }}>
            <div className="skeleton" style={{ width: "40%", height: 14 }} />
            <div className="skeleton" style={{ height: 44, marginTop: 18 }} />
            <div className="skeleton" style={{ height: 44, marginTop: 8 }} />
            <div className="skeleton" style={{ height: 44, marginTop: 8 }} />
            <div className="skeleton" style={{ height: 44, marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
