import { useEffect, useRef, useState } from "react";
import { apiRequest } from "./api.js";
import { LanguageSwitcher, useLanguage, withLanguageInstruction } from "./i18n.jsx";

const CHAT_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/ask";
const MAX_ASSISTANT_ATTACHMENTS = 5;
const MAX_ASSISTANT_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ASSISTANT_ATTACHMENT_SIZE = 20 * 1024 * 1024;

const roles = [
  { id: "governmentEmployee", labelKey: "common.employee", pluralKey: "head.governmentEmployees" },
  { id: "smartCityWorker", labelKey: "common.developer", pluralKey: "head.smartDevelopers" },
];

const emptyStaff = { name: "", phone: "", email: "", username: "", password: "", role: "governmentEmployee" };

function AssistantIcon({ name }) {
  const paths = {
    attach: <><path d="m21.4 11.6-8.5 8.5a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function StaffForm({ department, staff, defaultRole, onClose, onSaved }) {
  const { t } = useLanguage();
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
          <div><p className="staff-eyebrow">{department.name}</p><h2 id="staff-form-title">{staff ? t("member.update") : t("member.addTitle")}</h2></div>
          <button className="staff-icon-button" type="button" aria-label={t("member.closeForm")} onClick={onClose}>×</button>
        </header>
        <form onSubmit={submit}>
          <div className="staff-form-grid">
            <label>{t("member.fullName")}<input value={form.name} onChange={(event) => setField("name", event.target.value)} maxLength={120} autoComplete="name" required /></label>
            <label>{t("member.phone")}<input type="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} maxLength={30} autoComplete="tel" required /></label>
            <label>{t("member.email")}<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} maxLength={254} autoComplete="email" required /></label>
            <label>{t("head.username")}<input value={form.username} onChange={(event) => setField("username", event.target.value.toLowerCase())} minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._-]{2,31}" autoComplete="username" required /></label>
            <label>{t("head.accountType")}<select value={form.role} onChange={(event) => setField("role", event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{t(role.labelKey)}</option>)}</select></label>
            <label>{t("login.password")}<input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required={!staff} /><small>{staff ? t("member.keepPassword") : t("member.atLeast")}</small></label>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="staff-modal-actions">
            <button className="staff-cancel" type="button" onClick={onClose}>{t("member.cancel")}</button>
            <button className="staff-primary" type="submit" disabled={isSaving}>{isSaving ? t("member.saving") : staff ? t("member.save") : t("member.create")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function HeadWorkspace({ user, onLogout, onOpenAssistant }) {
  const { language, t } = useLanguage();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssistantHelp, setShowAssistantHelp] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [assistantAttachments, setAssistantAttachments] = useState([]);
  const [assistantError, setAssistantError] = useState("");
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [isAssistantRecording, setIsAssistantRecording] = useState(false);
  const assistantFileInputRef = useRef(null);
  const assistantRecognitionRef = useRef(null);

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
  useEffect(() => () => assistantRecognitionRef.current?.abort(), []);

  async function saveComplete() {
    setShowForm(false);
    setEditingStaff(null);
    await loadStaff();
  }

  async function deleteStaff(account) {
    if (!window.confirm(t("head.deleteConfirm", { name: account.name }))) return;
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
  const matchingStaff = staff.filter((account) => [account.name, account.username, account.email, account.phone].some((value) => value?.toLowerCase().includes(searchQuery.trim().toLowerCase())));
  const filteredVisibleStaff = visibleStaff.filter((account) => matchingStaff.some((matchingAccount) => matchingAccount._id === account._id));
  const employeeShare = staff.length ? employeeCount / staff.length * 100 : 0;
  const recentStaff = [...matchingStaff].slice(-4).reverse();
  const userInitials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  function openCreate(role) {
    setActiveRole(role);
    setEditingStaff(null);
    setShowAddMenu(false);
    setActiveView("members");
    if (department) setShowForm(true);
    else setError(t("head.noDepartmentError"));
  }

  function handleAssistantFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const availableSlots = MAX_ASSISTANT_ATTACHMENTS - assistantAttachments.length;
    const acceptedFiles = selectedFiles.slice(0, availableSlots);
    if (!acceptedFiles.length || selectedFiles.length > availableSlots) {
      setAssistantError(t("chat.attachmentLimit", { count: MAX_ASSISTANT_ATTACHMENTS }));
      if (!acceptedFiles.length) return;
    }
    const currentTotalSize = assistantAttachments.reduce((total, attachment) => total + attachment.file.size, 0);
    const addedTotalSize = acceptedFiles.reduce((total, file) => total + file.size, 0);
    if (currentTotalSize + addedTotalSize > MAX_TOTAL_ASSISTANT_ATTACHMENT_SIZE) {
      setAssistantError(t("chat.attachmentsTotalTooLarge", { size: 20 }));
      return;
    }
    const tooLarge = acceptedFiles.find((file) => file.size > MAX_ASSISTANT_ATTACHMENT_SIZE);
    if (tooLarge) {
      setAssistantError(t("chat.attachmentTooLarge", { name: tooLarge.name, size: 10 }));
      return;
    }
    setAssistantAttachments((current) => [
      ...current,
      ...acceptedFiles.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  }

  function toggleAssistantVoice() {
    if (isAssistantRecording) {
      assistantRecognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAssistantError(t("chat.voiceUnsupported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = { en: "en-US", hi: "hi-IN", gu: "gu-IN" }[language] || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ").trim();
      if (transcript) {
        setAssistantInput((current) => `${current}${current ? " " : ""}${transcript}`);
        setAssistantError("");
      }
    };
    recognition.onerror = (event) => {
      setAssistantError(t(event.error === "not-allowed" ? "chat.voicePermission" : "chat.voiceFailed"));
    };
    recognition.onend = () => {
      setIsAssistantRecording(false);
      assistantRecognitionRef.current = null;
    };
    assistantRecognitionRef.current = recognition;
    setAssistantError("");
    setIsAssistantRecording(true);
    try {
      recognition.start();
    } catch (recognitionError) {
      assistantRecognitionRef.current = null;
      setIsAssistantRecording(false);
      setAssistantError(t("chat.voiceFailed"));
      console.error("Unable to start department assistant voice input.", recognitionError);
    }
  }

  function readAssistantAttachment(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error(t("chat.attachmentReadFailed", { name: file.name })));
          return;
        }
        resolve({ name: file.name, type: file.type || "application/octet-stream", dataUrl: reader.result });
      };
      reader.onerror = () => reject(new Error(t("chat.attachmentReadFailed", { name: file.name })));
      reader.readAsDataURL(file);
    });
  }

  async function sendAssistantMessage(event) {
    event.preventDefault();
    const text = assistantInput.trim();
    const pendingAttachments = assistantAttachments;
    if ((!text && !pendingAttachments.length) || isAssistantLoading || isAssistantRecording) return;
    const query = text || t("chat.attachmentsOnly");

    setAssistantMessages((current) => [...current, {
      role: "user",
      content: text,
      attachments: pendingAttachments.map(({ id, file }) => ({ id, name: file.name, type: file.type })),
    }]);
    setAssistantInput("");
    setAssistantAttachments([]);
    setAssistantError("");
    setIsAssistantLoading(true);
    try {
      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: withLanguageInstruction(query, language),
          language,
          attachments: await Promise.all(pendingAttachments.map(({ file }) => readAssistantAttachment(file))),
        }),
      });
      if (!response.ok) throw new Error(t("assistant.failed", { status: response.status }));
      const data = await response.json();
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error(t("assistant.empty"));
      setAssistantMessages((current) => [...current, { role: "assistant", content: data.answer.trim() }]);
    } catch (requestError) {
      setAssistantError(requestError instanceof TypeError ? t("assistant.unreachable", { url: CHAT_API_URL }) : requestError.message);
    } finally {
      setIsAssistantLoading(false);
    }
  }

  function addAssistantReply(content) {
    setAssistantMessages((current) => [...current, { role: "assistant", content }]);
  }

  return (
    <main className="staff-workspace head-workspace">
      <aside className="head-sidebar">
        <a className="head-sidebar-brand" href="/" aria-label="SuchnaSetu"><img src="/logo-mark.png" alt="SuchnaSetu" /></a>
        <nav className="head-sidebar-nav" aria-label={t("head.workspace")}>
          <button className={activeView === "dashboard" ? "head-side-link active" : "head-side-link"} type="button" aria-label={t("head.dashboard")} title={t("head.dashboard")} onClick={() => setActiveView("dashboard")}><span aria-hidden="true">▦</span></button>
          <button className={activeView === "members" ? "head-side-link active" : "head-side-link"} type="button" aria-label={t("head.members")} title={t("head.members")} onClick={() => setActiveView("members")}><span aria-hidden="true">♧</span></button>
          <button className="head-side-link head-assistant-nav-link" type="button" aria-label={t("assistant.name")} title={t("assistant.name")} onClick={onOpenAssistant}><span aria-hidden="true">✦</span></button>
          <button className="head-side-link" type="button" aria-label={t("assistant.help")} title={t("assistant.help")} onClick={() => setShowAssistantHelp((current) => !current)}><span aria-hidden="true">?</span></button>
        </nav>
        <div className="head-sidebar-bottom">
          <span className="head-sidebar-initials" aria-label={user.name}>{userInitials}</span>
          <button className="head-side-link head-side-signout" type="button" aria-label={t("common.signOut")} title={t("common.signOut")} onClick={onLogout}><span aria-hidden="true">⇥</span></button>
        </div>
      </aside>
      <div className="head-main">
      <header className="head-topbar">
        <div className="head-topbar-spacer" />
        <div className="add-member-menu head-add-member-menu">
          <button className="staff-primary nav-add-button" type="button" aria-expanded={showAddMenu} aria-haspopup="menu" onClick={() => setShowAddMenu((current) => !current)}>{t("head.add")}</button>
          {showAddMenu && <div className="add-member-options" role="menu"><button type="button" role="menuitem" onClick={() => openCreate("governmentEmployee")}>{t("login.employee")}</button><button type="button" role="menuitem" onClick={() => openCreate("smartCityWorker")}>{t("login.developer")}</button></div>}
        </div>
        <label className="head-search"><span aria-hidden="true">⌕</span><input aria-label={t("head.search")} placeholder={t("head.search")} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label>
        {departments.length > 1 && <label className="department-picker head-department-picker"><span className="visually-hidden">{t("common.department")}</span><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}
        <div className="head-profile">
          <LanguageSwitcher />
          <span className="head-profile-avatar">{userInitials}</span>
          <span className="head-profile-name"><strong>{user.name}</strong><small>{t("head.role")}</small></span>
          <button className="staff-logout" type="button" onClick={onLogout}>{t("common.signOut")}</button>
        </div>
      </header>
      <section className="staff-content head-content">
        {activeView === "dashboard" ? (
          <>
            <div className="staff-title-row head-title-row"><div><p className="staff-eyebrow">{t("head.workspace")}</p><h1>{t("head.overview")}</h1></div>
            </div>
            {error && <p className="auth-error staff-page-error" role="alert">{error}</p>}
            {isLoading ? <div className="staff-empty">{t("head.loading")}</div> : departments.length ? (
              <>
                <div className="dashboard-metrics head-dashboard-metrics">
                  <article className="dashboard-metric head-metric"><span>{t("head.team")}</span><strong>{staff.length}</strong><small>{t("head.inDepartment", { department: department?.name || t("common.department") })}</small><span className="head-metric-icon" aria-hidden="true">♧</span></article>
                  <article className="dashboard-metric head-metric"><span>{t("head.governmentEmployees")}</span><strong>{employeeCount}</strong><small>{staff.length ? t("head.percentTeam", { percent: Math.round(employeeCount / staff.length * 100) }) : t("head.noMembers")}</small><span className="head-metric-icon" aria-hidden="true">▤</span></article>
                  <article className="dashboard-metric head-metric"><span>{t("head.smartDevelopers")}</span><strong>{workerCount}</strong><small>{workerCount ? t("head.activeTeam") : t("head.inviteDeveloper")}</small><span className="head-metric-icon" aria-hidden="true">⌘</span></article>
                </div>
                <div className="head-dashboard-grid">
                  <div className="head-dashboard-primary">
                    <section className="dashboard-chart-panel head-composition-panel">
                      <div className="dashboard-panel-heading"><div><h2>{t("head.teamComposition")}</h2></div><span>{department?.code}</span></div>
                      <div className="head-composition-content" aria-label={`${t("head.teamComposition")}: ${t("head.teamCompositionLabel", { employees: employeeCount, developers: workerCount })}`}>
                        <div className="head-donut" style={{ "--employee-share": `${employeeShare}%` }}><strong>{staff.length}</strong></div>
                        <div className="head-composition-legend">
                          <div><i className="legend-employee" /><span>{t("head.governmentEmployees")}</span><strong>{employeeCount}</strong></div>
                          <div><i className="legend-developer" /><span>{t("head.developers")}</span><strong>{workerCount}</strong></div>
                        </div>
                      </div>
                    </section>
                    <section className="head-recent-panel">
                      <div className="head-recent-heading"><h2>{t("head.recentMembers")}</h2><button type="button" onClick={() => setActiveView("members")}>{t("head.viewAll")} <span aria-hidden="true">→</span></button></div>
                      {recentStaff.length ? <div className="head-recent-list">{recentStaff.map((member) => <article className="head-recent-member" key={member._id}><span className="head-member-avatar">{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className="head-member-copy"><strong>{member.name}</strong><small>{t(roles.find((item) => item.id === member.role)?.labelKey || "common.employee")}</small></span><span className="head-member-status">{t("common.active")}</span></article>)}</div> : <div className="head-recent-empty">{searchQuery ? t("head.noMatch") : t("head.recentEmpty")}</div>}
                    </section>
                  </div>
                  <aside className="head-assistant-panel" aria-label={t("head.departmentOverview")}>
                    <div className="head-assistant-heading">
                      <span className="head-assistant-mark" aria-hidden="true">✦</span>
                      <span><strong>{t("assistant.name")}</strong><small><i />{t("assistant.online")}</small></span>
                      <button className="head-assistant-menu" type="button" aria-label={t("assistant.help")} onClick={() => setShowAssistantHelp((current) => !current)}>•••</button>
                    </div>
                    <div className="head-assistant-messages" aria-live="polite">
                      <p className="head-assistant-message">{t("assistant.greeting", { name: user.name })}</p>
                      <p className="head-assistant-message">{t("assistant.summary", {
                        total: staff.length,
                        members: t(staff.length === 1 ? "assistant.member" : "assistant.members"),
                        employees: employeeCount,
                        employeeLabel: t(employeeCount === 1 ? "assistant.employee" : "assistant.employees"),
                        developers: workerCount,
                        developerLabel: t(workerCount === 1 ? "assistant.developer" : "assistant.developers"),
                      })}</p>
                      {assistantMessages.map((message, index) => (
                        <div className={`head-assistant-message-wrap ${message.role === "user" ? "from-user" : ""}`} key={`${message.role}-${index}`}>
                          {message.content && <p className={`head-assistant-message ${message.role === "user" ? "from-user" : ""}`}>{message.content}</p>}
                          {message.attachments?.map((attachment) => <span className="head-assistant-file" key={attachment.id} title={attachment.type || ""}><AssistantIcon name="attach" />{attachment.name}</span>)}
                        </div>
                      ))}
                      {isAssistantRecording && <p className="head-assistant-voice-status" role="status">{t("chat.listening")}</p>}
                      {isAssistantLoading && <p className="head-assistant-message">{t("assistant.thinking")}</p>}
                      {assistantError && <p className="head-assistant-error" role="alert">{assistantError}</p>}
                      {showAssistantHelp && <p className="head-assistant-message">{t("head.helpText")}</p>}
                      <div className="head-assistant-actions">
                        <button className="head-assistant-action" type="button" onClick={() => openCreate("governmentEmployee")}>{t("assistant.add")}</button>
                        <button className="head-assistant-action" type="button" onClick={() => addAssistantReply(t("assistant.summary", {
                          total: staff.length,
                          members: t(staff.length === 1 ? "assistant.member" : "assistant.members"),
                          employees: employeeCount,
                          employeeLabel: t(employeeCount === 1 ? "assistant.employee" : "assistant.employees"),
                          developers: workerCount,
                          developerLabel: t(workerCount === 1 ? "assistant.developer" : "assistant.developers"),
                        }))}>{t("assistant.teamSummary")}</button>
                        <button className="head-assistant-action" type="button" onClick={() => setShowAssistantHelp((current) => !current)}>{t("assistant.help")}</button>
                      </div>
                    </div>
                    <form className="head-assistant-footer" onSubmit={sendAssistantMessage}>
                      <div className="head-assistant-input-row">
                        <input
                          ref={assistantFileInputRef}
                          className="head-assistant-file-input"
                          type="file"
                          accept="image/*,audio/*,video/*,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.csv"
                          multiple
                          onChange={handleAssistantFiles}
                          aria-label={t("chat.attachFiles")}
                        />
                        <button className="head-assistant-input-tool" type="button" aria-label={t("chat.attachFiles")} title={t("chat.attachFiles")} disabled={isAssistantLoading || assistantAttachments.length >= MAX_ASSISTANT_ATTACHMENTS} onClick={() => assistantFileInputRef.current?.click()}><AssistantIcon name="attach" /></button>
                        <button className={isAssistantRecording ? "head-assistant-input-tool recording" : "head-assistant-input-tool"} type="button" aria-label={t(isAssistantRecording ? "chat.stopRecording" : "chat.voiceInput")} title={t(isAssistantRecording ? "chat.stopRecording" : "chat.voiceInput")} aria-pressed={isAssistantRecording} disabled={isAssistantLoading} onClick={toggleAssistantVoice}><AssistantIcon name={isAssistantRecording ? "stop" : "mic"} /></button>
                      <input aria-label={t("assistant.name")} placeholder={t("assistant.ask")} value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} disabled={isAssistantLoading} />
                      <button type="submit" aria-label={t("assistant.send")} disabled={(!assistantInput.trim() && !assistantAttachments.length) || isAssistantLoading || isAssistantRecording}><span aria-hidden="true">➤</span></button>
                      </div>
                      {assistantAttachments.length > 0 && (
                        <div className="head-assistant-selected-files" aria-label={t("chat.attachmentsSelected")}>
                          {assistantAttachments.map(({ id, file }) => (
                            <span className="head-assistant-file" key={id}>
                              <AssistantIcon name="attach" />
                              <span>{file.name}</span>
                              <button type="button" aria-label={t("chat.removeAttachment", { name: file.name })} onClick={() => setAssistantAttachments((current) => current.filter((attachment) => attachment.id !== id))}><AssistantIcon name="close" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </form>
                  </aside>
                </div>
              </>
            ) : <div className="staff-empty"><h3>{t("head.noDepartmentTitle")}</h3><p>{t("common.adminAssign")}</p></div>}
          </>
        ) : (
          <>
            <div className="staff-title-row"><div><p className="staff-eyebrow">{t("head.workspace")}</p><h1>{t("head.directoryTitle")}</h1><p>{t("head.directoryDescription")}</p></div>
              {departments.length > 1 && <label className="department-picker">{t("common.department")}<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>}
            </div>
        {error && <p className="auth-error staff-page-error" role="alert">{error}</p>}
        {isLoading ? <div className="staff-empty">{t("head.loading")}</div> : departments.length ? (
          <section className="staff-directory">
            <div className="staff-directory-heading"><div><span className="staff-eyebrow">{department?.code}</span><h2>{department?.name}</h2></div><span className="staff-count">{t("head.memberCount", { count: visibleStaff.length, label: t(visibleStaff.length === 1 ? "common.account" : "common.accounts") })}</span></div>
            <div className="staff-tabs" role="tablist" aria-label={t("head.accountType")}>
              {roles.map((role) => <button key={role.id} type="button" role="tab" aria-selected={activeRole === role.id} className={activeRole === role.id ? "staff-tab selected" : "staff-tab"} onClick={() => setActiveRole(role.id)}>{t(role.pluralKey)}<span>{staff.filter((account) => account.role === role.id).length}</span></button>)}
            </div>
            {filteredVisibleStaff.length ? (
              <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>{t("member.name")}</th><th>{t("head.contact")}</th><th>{t("head.username")}</th><th>{t("common.actions")}</th></tr></thead><tbody>
                {filteredVisibleStaff.map((account) => <tr key={account._id}><td><strong>{account.name}</strong><small>{t(activeRoleInfo.labelKey)}</small></td><td><span>{account.email}</span><small>{account.phone}</small></td><td>{account.username}</td><td><div className="staff-row-actions"><button type="button" onClick={() => { setEditingStaff(account); setShowForm(true); }}>{t("common.edit")}</button><button type="button" className="staff-delete" onClick={() => deleteStaff(account)}>{t("common.delete")}</button></div></td></tr>)}
              </tbody></table></div>
            ) : <div className="staff-empty"><h3>{searchQuery ? t("head.noMatching") : t("head.noRoleMembers", { role: t(activeRoleInfo.pluralKey).toLowerCase() })}</h3><p>{searchQuery ? t("head.searchHint") : t("head.addFirst", { department: department?.name })}</p>{!searchQuery && <button className="staff-secondary" type="button" disabled={!department} onClick={() => openCreate(activeRole)}>{t(activeRole === "governmentEmployee" ? "head.addEmployee" : "head.addDeveloper")}</button>}</div>}
          </section>
        ) : <div className="staff-empty"><h3>{t("head.noDepartmentTitle")}</h3><p>{t("common.adminAssign")}</p></div>}
          </>
        )}
      </section>
      {showForm && department && <StaffForm department={department} staff={editingStaff} defaultRole={activeRole} onClose={() => setShowForm(false)} onSaved={saveComplete} />}
      </div>
    </main>
  );
}