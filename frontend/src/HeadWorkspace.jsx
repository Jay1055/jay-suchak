import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";

const roles = [
  { id: "governmentEmployee", label: "Government employee", plural: "Government employees" },
  { id: "smartCityWorker", label: "Smart city developer", plural: "Smart city developers" },
];

const emptyStaff = { name: "", phone: "", email: "", username: "", password: "", role: "governmentEmployee" };

function StaffForm({ department, staff, defaultRole, onClose, onSaved }) {
  const [form, setForm] = useState(staff ? { ...staff, password: "" } : { ...emptyStaff, role: defaultRole });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const isEditing = Boolean(staff?._id);
    const payload = { ...form, departmentId: department._id };
    if (isEditing && !payload.password) delete payload.password;
    try {
      await apiRequest(isEditing ? `/api/head/staff/${staff._id}` : "/api/head/staff", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="staff-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-form-title">
        <header className="staff-modal-heading">
          <div><p className="staff-eyebrow">{department.name}</p><h2 id="staff-form-title">{staff ? "Update account" : "Add a team member"}</h2></div>
          <button className="staff-icon-button" type="button" aria-label="Close form" onClick={onClose}>×</button>
        </header>
        <form onSubmit={submit}>
          <div className="staff-form-grid">
            <label>Full name<input value={form.name} onChange={(event) => setField("name", event.target.value)} maxLength={120} autoComplete="name" required /></label>
            <label>Phone number<input type="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} maxLength={30} autoComplete="tel" required /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} maxLength={254} autoComplete="email" required /></label>
            <label>Username<input value={form.username} onChange={(event) => setField("username", event.target.value.toLowerCase())} minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._-]{2,31}" autoComplete="username" required /></label>
            <label>Account type<select value={form.role} onChange={(event) => setField("role", event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label>
            <label>Password<input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} minLength={8} maxLength={72} autoComplete={staff ? "new-password" : "new-password"} required={!staff} /><small>{staff ? "Leave blank to keep the current password." : "At least 8 characters."}</small></label>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="staff-modal-actions">
            <button className="staff-cancel" type="button" onClick={onClose}>Cancel</button>
            <button className="staff-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : staff ? "Save changes" : "Create account"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function HeadWorkspace({ user, onLogout }) {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [staff, setStaff] = useState([]);
  const [activeRole, setActiveRole] = useState("governmentEmployee");
  const [editingStaff, setEditingStaff] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    apiRequest("/api/head/departments")
      .then((data) => {
        if (!isCurrent) return;
        setDepartments(data.departments);
        setDepartmentId(data.departments[0]?._id || "");
      })
      .catch((requestError) => { if (isCurrent) setError(requestError.message); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  async function loadStaff() {
    if (!departmentId) {
      setStaff([]);
      return;
    }
    setError("");
    try {
      const data = await apiRequest(`/api/head/staff?departmentId=${encodeURIComponent(departmentId)}`);
      setStaff(data.staff);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadStaff(); }, [departmentId]);

  async function saveComplete() {
    setShowForm(false);
    setEditingStaff(null);
    await loadStaff();
  }

  async function deleteStaff(account) {
    if (!window.confirm(`Delete ${account.name}'s account? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/head/staff/${account._id}`, { method: "DELETE" });
      await loadStaff();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const department = departments.find((item) => item._id === departmentId);
  const visibleStaff = staff.filter((account) => account.role === activeRole);
  const activeRoleInfo = roles.find((role) => role.id === activeRole);
  const employeeCount = staff.filter((account) => account.role === "governmentEmployee").length;
  const workerCount = staff.filter((account) => account.role === "smartCityWorker").length;
  const chartMaximum = Math.max(employeeCount, workerCount, 1);

  function openCreate(role) {
    setActiveRole(role);
    setEditingStaff(null);
    setShowAddMenu(false);
    setActiveView("members");
    if (department) setShowForm(true);
    else setError("No department is assigned to your account yet.");
  }

  return (
    <main className="staff-workspace">
      <header className="staff-topbar">
        <a className="staff-brand" href="/" aria-label="SuchnaSetu home"><img src="/logo.png" alt="SuchnaSetu" /></a>
        <nav className="staff-nav" aria-label="Workspace">
          <button className={activeView === "dashboard" ? "staff-nav-item selected" : "staff-nav-item"} type="button" onClick={() => setActiveView("dashboard")}>Dashboard</button>
          <button className={activeView === "members" ? "staff-nav-item selected" : "staff-nav-item"} type="button" onClick={() => setActiveView("members")}>Members</button>
          <div className="add-member-menu">
            <button className="staff-primary nav-add-button" type="button" aria-expanded={showAddMenu} aria-haspopup="menu" onClick={() => setShowAddMenu((current) => !current)}>+ Add member</button>
            {showAddMenu && <div className="add-member-options" role="menu"><button type="button" role="menuitem" onClick={() => openCreate("governmentEmployee")}>Government employee</button><button type="button" role="menuitem" onClick={() => openCreate("smartCityWorker")}>Smart city developer</button></div>}
          </div>
        </nav>
        <div className="staff-topbar-right"><span><strong>{user.name}</strong><small>Department head</small></span><button className="staff-logout" type="button" onClick={onLogout}>Sign out</button></div>
      </header>
      <section className="staff-content">
        {activeView === "dashboard" ? (
          <>
            <div className="staff-title-row"><div><p className="staff-eyebrow">DEPARTMENT WORKSPACE</p><h1>Overview</h1><p>Your team, at a glance.</p></div>
              {departments.length > 1 && <label className="department-picker">Department<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}
            </div>
            {error && <p className="auth-error staff-page-error" role="alert">{error}</p>}
            {isLoading ? <div className="staff-empty">Loading your departments...</div> : departments.length ? (
              <>
                <div className="dashboard-metrics">
                  <article className="dashboard-metric"><span>TEAM MEMBERS</span><strong>{staff.length}</strong><small>{department?.name}</small></article>
                  <article className="dashboard-metric"><span>GOVERNMENT EMPLOYEES</span><strong>{employeeCount}</strong><small>Assigned to this department</small></article>
                  <article className="dashboard-metric"><span>SMART CITY DEVELOPERS</span><strong>{workerCount}</strong><small>Assigned to this department</small></article>
                </div>
                <section className="dashboard-chart-panel">
                  <div className="dashboard-panel-heading"><div><p className="staff-eyebrow">MEMBERSHIP</p><h2>Team composition</h2></div><span>{department?.code}</span></div>
                  <div className="member-chart" aria-label={`Team composition: ${employeeCount} government employees and ${workerCount} smart city developers`}>
                    <div className="member-chart-row"><span>Government employees</span><div className="member-chart-track"><span className="member-chart-bar employees" style={{ width: `${employeeCount / chartMaximum * 100}%` }} /></div><strong>{employeeCount}</strong></div>
                    <div className="member-chart-row"><span>Smart city developers</span><div className="member-chart-track"><span className="member-chart-bar developers" style={{ width: `${workerCount / chartMaximum * 100}%` }} /></div><strong>{workerCount}</strong></div>
                  </div>
                  <button className="dashboard-link" type="button" onClick={() => setActiveView("members")}>View member directory <span aria-hidden="true">→</span></button>
                </section>
              </>
            ) : <div className="staff-empty"><h3>No department assigned</h3><p>Your administrator must assign your account to a department before you can manage a team.</p></div>}
          </>
        ) : (
          <>
            <div className="staff-title-row"><div><p className="staff-eyebrow">DEPARTMENT WORKSPACE</p><h1>Team directory</h1><p>Manage employee accounts assigned to your departments.</p></div>
              {departments.length > 1 && <label className="department-picker">Department<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}
            </div>
        {error && <p className="auth-error staff-page-error" role="alert">{error}</p>}
        {isLoading ? <div className="staff-empty">Loading your departments...</div> : departments.length ? (
          <section className="staff-directory">
            <div className="staff-directory-heading"><div><span className="staff-eyebrow">{department?.code}</span><h2>{department?.name}</h2></div><span className="staff-count">{visibleStaff.length} {visibleStaff.length === 1 ? "account" : "accounts"}</span></div>
            <div className="staff-tabs" role="tablist" aria-label="Staff account type">
              {roles.map((role) => <button key={role.id} type="button" role="tab" aria-selected={activeRole === role.id} className={activeRole === role.id ? "staff-tab selected" : "staff-tab"} onClick={() => setActiveRole(role.id)}>{role.plural}<span>{staff.filter((account) => account.role === role.id).length}</span></button>)}
            </div>
            {visibleStaff.length ? (
              <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Name</th><th>Contact</th><th>Username</th><th>Actions</th></tr></thead><tbody>
                {visibleStaff.map((account) => <tr key={account._id}><td><strong>{account.name}</strong><small>{activeRoleInfo.label}</small></td><td><span>{account.email}</span><small>{account.phone}</small></td><td>{account.username}</td><td><div className="staff-row-actions"><button type="button" onClick={() => { setEditingStaff(account); setShowForm(true); }}>Edit</button><button type="button" className="staff-delete" onClick={() => deleteStaff(account)}>Delete</button></div></td></tr>)}
              </tbody></table></div>
            ) : <div className="staff-empty"><h3>No {activeRoleInfo.plural.toLowerCase()} yet</h3><p>Add the first account for {department?.name}.</p><button className="staff-secondary" type="button" disabled={!department} onClick={() => openCreate(activeRole)}>Add {activeRole === "governmentEmployee" ? "employee" : "smart city worker"}</button></div>}
          </section>
        ) : <div className="staff-empty"><h3>No department assigned</h3><p>Your administrator must assign your account to a department before you can manage a team.</p></div>}
          </>
        )}
      </section>
      {showForm && department && <StaffForm department={department} staff={editingStaff} defaultRole={activeRole} onClose={() => setShowForm(false)} onSaved={saveComplete} />}
    </main>
  );
}