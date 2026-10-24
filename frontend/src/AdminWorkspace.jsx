import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";

const chartSeries = [
  { key: "headCount", label: "Department heads", className: "heads" },
  { key: "employeeCount", label: "Government employees", className: "employees" },
  { key: "workerCount", label: "Smart city developers", className: "developers" },
];

export default function AdminWorkspace({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    apiRequest("/api/admin/overview")
      .then((data) => { if (isCurrent) setOverview(data); })
      .catch((requestError) => { if (isCurrent) setError(requestError.message); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  const totals = overview?.totals;
  const maxValues = Object.fromEntries(chartSeries.map((series) => [
    series.key,
    Math.max(1, ...(overview?.departments || []).map((department) => department[series.key])),
  ]));

  return (
    <main className="staff-workspace admin-workspace">
      <header className="staff-topbar">
        <a className="staff-brand" href="/" aria-label="SuchnaSetu home"><img src="/logo.png" alt="SuchnaSetu" /></a>
        <nav className="staff-nav" aria-label="Administrator workspace"><span className="staff-nav-item selected">Overview</span></nav>
        <div className="staff-topbar-right"><span><strong>{user.email}</strong><small>Administrator</small></span><button className="staff-logout" type="button" onClick={onLogout}>Sign out</button></div>
      </header>
      <section className="staff-content">
        <div className="staff-title-row"><div><p className="staff-eyebrow">ORGANIZATION</p><h1>Admin overview</h1><p>Departments, department heads, and team accounts across SuchnaSetu.</p></div></div>
        {error && <p className="auth-error staff-page-error" role="alert">{error}</p>}
        {isLoading ? <div className="staff-empty">Loading organization data...</div> : overview && (
          <>
            <div className="dashboard-metrics admin-metrics">
              <article className="dashboard-metric"><span>DEPARTMENTS</span><strong>{totals.departmentCount}</strong><small>Organization units</small></article>
              <article className="dashboard-metric"><span>DEPARTMENT HEADS</span><strong>{totals.activeHeadCount}<small className="metric-total"> / {totals.headCount} total</small></strong><small>Active accounts</small></article>
              <article className="dashboard-metric"><span>GOVERNMENT EMPLOYEES</span><strong>{totals.employeeCount}</strong><small>Active accounts</small></article>
              <article className="dashboard-metric"><span>SMART CITY DEVELOPERS</span><strong>{totals.workerCount}</strong><small>Active accounts</small></article>
            </div>
            <section className="admin-chart-panel">
              <div className="dashboard-panel-heading"><div><p className="staff-eyebrow">TEAM DISTRIBUTION</p><h2>Accounts by department</h2></div><span>{totals.memberCount} team accounts</span></div>
              {overview.departments.length ? (
                <div className="admin-chart-list">
                  {overview.departments.map((department) => (
                    <article className="admin-chart-department" key={department._id}>
                      <div className="admin-chart-dept-heading"><strong>{department.name}</strong><span>{department.code}</span></div>
                      <div className="admin-chart-series-list">
                        {chartSeries.map((series) => <div className="admin-chart-series" key={series.key}><span>{series.label}</span><div className="member-chart-track"><span className={`member-chart-bar ${series.className}`} style={{ width: `${department[series.key] / maxValues[series.key] * 100}%` }} /></div><strong>{department[series.key]}</strong></div>)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="staff-empty"><h3>No departments yet</h3><p>Create departments in the admin workspace to see organization analytics here.</p></div>}
            </section>
          </>
        )}
      </section>
    </main>
  );
}