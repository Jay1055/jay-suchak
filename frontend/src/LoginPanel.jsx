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
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand-panel">
          <img className="auth-brand-logo" src="/logo.png" alt="SuchnaSetu — Clarity in Rules. Confidence in Decisions." />
        </div>
        <div className="auth-panel-content">
          <p className="auth-kicker">{t("login.workspace")}</p>
          <h2 id="login-title">{t("login.title")}</h2>
          <p className="auth-intro">{t("login.intro")}</p>
          <form className="auth-form" onSubmit={submit}>
            <fieldset className="auth-role-picker">
              <legend>{t("login.as")}</legend>
              <div className="auth-role-options">
                <button className={role === "departmentHead" ? "auth-role-option selected" : "auth-role-option"} type="button" aria-pressed={role === "departmentHead"} onClick={() => setRole("departmentHead")}>{t("login.head")}</button>
              </div>
              <label className="auth-staff-role">{t("login.domain")}<select value={["governmentEmployee", "smartCityWorker"].includes(role) ? role : ""} onChange={(event) => setRole(event.target.value)}><option value="" disabled hidden>{t("login.selectDomain")}</option><option value="governmentEmployee">{t("login.employee")}</option><option value="smartCityWorker">{t("login.developer")}</option></select></label>
            </fieldset>
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