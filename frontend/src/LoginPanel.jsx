import { useState } from "react";
import { apiRequest } from "./api.js";
import { LanguageSwitcher, useLanguage } from "./i18n.jsx";

export default function LoginPanel({ onLogin }) {
  const { t } = useLanguage();
  const [role, setRole] = useState("departmentHead");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ role, username, password }),
      });
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <LanguageSwitcher />
      <div>
        <img src="/logo-mark-login.png" alt="Logo" height="180"  />
      </div>
      <section className="auth-panel" aria-labelledby="login-title">
        {/* <div className="auth-brand-panel" aria-hidden="true">
          <span className="auth-brand-avatar">
          
          </span>
        </div> */}
        <div className="auth-panel-content">
          <h2 id="login-title">{t("login.title")}</h2>
          <p className="auth-intro">{t("login.intro")}</p>
          <form className="auth-form" onSubmit={submit}>
            <label>{t("login.as")}<select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="departmentHead">{t("login.head")}</option>
              <option value="governmentEmployee">{t("login.employee")}</option>
              <option value="smartCityWorker">{t("login.worker")}</option>
            </select></label>
            <label>{t("login.username")}<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
            <label>{t("login.password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? t("login.submitting") : t("login.continue")}</button>
          </form>
        </div>
      </section>
    </main>
  );
}