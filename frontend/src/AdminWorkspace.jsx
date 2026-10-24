import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";
import { LanguageSwitcher, useLanguage } from "./i18n.jsx";

const chartSeries = [
  { key: "headCount", translationKey: "admin.heads", className: "heads" },
  { key: "employeeCount", translationKey: "admin.employees", className: "employees" },
  { key: "workerCount", translationKey: "admin.developers", className: "developers" },
];

export default function AdminWorkspace({ user, onLogout, onOpenAssistant }) {
  const { t } = useLanguage();
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
        <a className="staff-brand" href="/" aria-label="SuchnaSetu"><img src="/logo.png" alt="SuchnaSetu" /></a>
        <nav className="staff-nav" aria-label={t("admin.workspace")}>
          <span className="staff-nav-item selected">{t("common.overview")}</span>
          <button className="staff-nav-item staff-assistant-link" type="button" onClick={onOpenAssistant}><span aria-hidden="true">✦</span>{t("assistant.name")}</button>
        </nav>
        <div className="staff-topbar-right"><LanguageSwitcher /><span><strong>{user.email}</strong><small>{t("admin.workspace")}</small></span><button className="staff-logout" type="button" onClick={onLogout}>{t("common.signOut")}</button></div>
      </header>
      <section className="staff-content">
        <div className="staff-title-row"><div><p className="staff-eyebrow">{t("admin.organization")}</p><h1>{t("admin.overview")}</h1><p>{t("admin.description")}</p></div></div>
        {error && <p className="auth-error staff-page-error" role="alert">{error}</p>}
        {isLoading ? <div className="staff-empty">{t("admin.loading")}</div> : overview && (
          <>
            <div className="dashboard-metrics admin-metrics">
              <article className="dashboard-metric"><span>{t("admin.departments")}</span><strong>{totals.departmentCount}</strong><small>{t("admin.units")}</small></article>
              <article className="dashboard-metric"><span>{t("admin.heads")}</span><strong>{totals.activeHeadCount}<small className="metric-total"> / {t("admin.total", { count: totals.headCount })}</small></strong><small>{t("admin.active")}</small></article>
              <article className="dashboard-metric"><span>{t("admin.employees")}</span><strong>{totals.employeeCount}</strong><small>{t("admin.active")}</small></article>
              <article className="dashboard-metric"><span>{t("admin.developers")}</span><strong>{totals.workerCount}</strong><small>{t("admin.active")}</small></article>
            </div>
            <section className="admin-chart-panel">
              <div className="dashboard-panel-heading"><div><p className="staff-eyebrow">{t("admin.distribution")}</p><h2>{t("admin.accountsByDepartment")}</h2></div><span>{t("admin.teamAccounts", { count: totals.memberCount })}</span></div>
              {overview.departments.length ? (
                <div className="admin-chart-list">
                  {overview.departments.map((department) => (
                    <article className="admin-chart-department" key={department._id}>
                      <div className="admin-chart-dept-heading"><strong>{department.name}</strong><span>{department.code}</span></div>
                      <div className="admin-chart-series-list">
                        {chartSeries.map((series) => <div className="admin-chart-series" key={series.key}><span>{t(series.translationKey)}</span><div className="member-chart-track"><span className={`member-chart-bar ${series.className}`} style={{ width: `${department[series.key] / maxValues[series.key] * 100}%` }} /></div><strong>{department[series.key]}</strong></div>)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="staff-empty"><h3>{t("admin.noDepartments")}</h3><p>{t("admin.noDepartmentsHelp")}</p></div>}
            </section>
          </>
        )}
      </section>
    </main>
  );
}