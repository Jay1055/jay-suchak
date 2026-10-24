import { useState } from "react";
import { apiRequest } from "./api.js";

const loginRoles = [
  { id: "admin", label: "Administrator" },
  { id: "departmentHead", label: "Department head" },
  { id: "governmentEmployee", label: "Government employee" },
  { id: "smartCityWorker", label: "Smart city developer" },
];

export default function LoginPanel({ onLogin }) {
  const [role, setRole] = useState("departmentHead");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ role, username, email, password }),
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
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="auth-kicker">SUCHNASETU WORKSPACE</p>
        <h2 id="login-title">Sign in</h2>
        <p className="auth-intro">Choose your account type, then enter your username and password.</p>
        <div className="role-options" role="group" aria-label="Account type">
          {loginRoles.map((item) => (
            <button key={item.id} type="button" className={role === item.id ? "role-option selected" : "role-option"} aria-pressed={role === item.id} onClick={() => setRole(item.id)}>{item.label}</button>
          ))}
        </div>
        <form className="auth-form" onSubmit={submit}>
          {role === "admin" ? (
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
          ) : (
            <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
          )}
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Continue"}</button>
        </form>
      </section>
    </main>
  );
}