import { useEffect, useRef, useState } from "react";
import AdminWorkspace from "./AdminWorkspace.jsx";
import HeadWorkspace from "./HeadWorkspace.jsx";
import LoginPanel from "./LoginPanel.jsx";
import { apiRequest } from "./api.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/ask";

const suggestions = [
  {
    icon: "⌂",
    title: "Government schemes",
    prompt: "What government schemes are available for small businesses?",
  },
  {
    icon: "▤",
    title: "Rules & regulations",
    prompt: "How can I find the rules for starting a small business?",
  },
  {
    icon: "↗",
    title: "Application process",
    prompt: "What documents do I need to apply for a government scheme?",
  },
];

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function StaffHome({ user, onLogout }) {
  return (
    <main className="staff-workspace">
      <header className="staff-topbar">
        <a className="staff-brand" href="/" aria-label="SuchnaSetu home"><img src="/logo.png" alt="SuchnaSetu" /></a>
        <div className="staff-topbar-right"><span><strong>{user.name}</strong><small>{user.role === "governmentEmployee" ? "Government employee" : "Smart city developer"}</small></span><button className="staff-logout" type="button" onClick={onLogout}>Sign out</button></div>
      </header>
      <section className="staff-content staff-profile-home">
        <p className="staff-eyebrow">SUCHNASETU ACCOUNT</p>
        <h1>Welcome, {user.name}</h1>
        <p>{user.department?.name || "No department assigned"} · {user.department?.code || ""}</p>
      </section>
    </main>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const hasConversation = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    let isCurrent = true;
    apiRequest("/api/auth/me")
      .then((data) => { if (isCurrent) setUser(data.user); })
      .catch(() => {})
      .finally(() => { if (isCurrent) setIsCheckingSession(false); });
    return () => { isCurrent = false; };
  }, []);

  async function signOut() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      setError("Could not reach the API to end the session.");
    } finally {
      setUser(null);
      setShowLogin(false);
    }
  }

  if (isCheckingSession) return <main className="auth-loading" aria-live="polite">Checking your session...</main>;
  if (user?.role === "admin") return <AdminWorkspace user={user} onLogout={signOut} />;
  if (user?.role === "departmentHead") return <HeadWorkspace user={user} onLogout={signOut} />;
  if (user) return <StaffHome user={user} onLogout={signOut} />;
  return <LoginPanel onLogin={setUser} />;

  function startNewChat() {
    setMessages([]);
    setInput("");
    setError("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessage = { id: crypto.randomUUID(), role: "user", content: query };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error(`The assistant couldn't answer (HTTP ${response.status}). Please try again.`);
      }

      const data = await response.json();
      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The API response did not include a valid “answer” field.");
      }
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: data.answer.trim() },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? `Couldn't reach the API at ${API_URL}. Check that your FastAPI server is running and allows this frontend's origin.`
          : requestError.message,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <a className="brand" href="#" aria-label="SuchnaSetu home" onClick={(event) => event.preventDefault()}>
            <img src="/logo.png" alt="SuchnaSetu" />
          </a>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <button className="new-chat-button" onClick={startNewChat}>
          <Icon name="plus" size={18} />
          <span>Start a new chat</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <p className="section-label">YOUR SPACE</p>
          <button className="nav-item active">
            <span className="nav-item-icon">◌</span>
            <span>Assistant</span>
            <span className="active-dot" />
          </button>
          <button className="nav-item" onClick={startNewChat}>
            <span className="nav-item-icon">◷</span>
            <span>Recent conversations</span>
          </button>
        </div>

        <div className="sidebar-note">
          <div className="note-icon"><Icon name="spark" size={17} /></div>
          <p className="note-title">Clarity starts here</p>
          <p className="note-copy">Understand policies and procedures, one question at a time.</p>
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Here to help, whenever you need</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>SuchnaSetu</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Assistant</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-label"><span className="secure-dot" /> Private conversation</span>
            {!isCheckingSession && <button className="sign-in-button" type="button" onClick={() => setShowLogin(true)}>Sign in</button>}
            <div className="avatar" aria-label="Guest user">G</div>
          </div>
        </header>

        <section className={`chat-area${hasConversation ? " chat-area-active" : ""}`}>
          {!hasConversation ? (
            <div className="welcome-view">
              <div className="welcome-badge"><Icon name="spark" size={15} /> YOUR GUIDE TO CLEAR ANSWERS</div>
              <h1>Good questions lead<br />to <span>clearer answers.</span></h1>
              <p className="welcome-description">
                Ask about government policies, rules, or procedures.<br className="desktop-break" />
                We’ll help make the complicated feel simple.
              </p>

              <form className="composer welcome-composer" onSubmit={sendMessage}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask anything about policies, rules, or procedures..."
                  rows={1}
                  aria-label="Your question"
                />
                <div className="composer-bottom">
                  <span className="composer-hint"><span className="hint-key">↵</span> to send <span className="hint-separator">·</span> shift + ↵ for a new line</span>
                  <button className="send-button" type="submit" disabled={!input.trim() || isLoading} aria-label="Send message">
                    <span>Ask SuchnaSetu</span><Icon name="send" size={16} />
                  </button>
                </div>
              </form>

              <div className="suggestions-heading"><span>NOT SURE WHERE TO START?</span><span className="suggestion-line" /></div>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    className="suggestion-card"
                    onClick={() => {
                      setInput(suggestion.prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span className="suggestion-icon">{suggestion.icon}</span>
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className="suggestion-arrow"><Icon name="arrow" size={15} /></span>
                  </button>
                ))}
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
              <p className="disclaimer">SuchnaSetu can make mistakes. Always verify important information with official sources.</p>
            </div>
          ) : (
            <div className="conversation">
              <div className="message-list">
                {messages.map((message) => (
                  <article key={message.id} className={`message message-${message.role}`}>
                    {message.role === "assistant" ? (
                      <img className="message-avatar" src="/logo.png" alt="" />
                    ) : (
                      <div className="message-avatar user-avatar">G</div>
                    )}
                    <div className="message-body">
                      <div className="message-author">{message.role === "assistant" ? "SuchnaSetu" : "You"}</div>
                      <p>{message.content}</p>
                    </div>
                  </article>
                ))}
                {isLoading && (
                  <article className="message message-assistant">
                    <img className="message-avatar" src="/logo.png" alt="" />
                    <div className="message-body">
                      <div className="message-author">SuchnaSetu</div>
                      <div className="typing-indicator" aria-label="SuchnaSetu is thinking"><span /><span /><span /></div>
                    </div>
                  </article>
                )}
                {error && <p className="error-message conversation-error" role="alert">{error}</p>}
                <div ref={messagesEndRef} />
              </div>
              <form className="composer conversation-composer" onSubmit={sendMessage}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask a follow-up question..."
                  rows={1}
                  aria-label="Your follow-up question"
                />
                <div className="composer-bottom">
                  <span className="composer-hint"><span className="hint-key">↵</span> to send <span className="hint-separator">·</span> shift + ↵ for a new line</span>
                  <button className="send-button" type="submit" disabled={!input.trim() || isLoading} aria-label="Send message">
                    <span>Send</span><Icon name="send" size={16} />
                  </button>
                </div>
              </form>
              <p className="conversation-disclaimer">For guidance only. Please confirm important details with official sources.</p>
            </div>
          )}
        </section>
      </main>
      {showLogin && <LoginPanel onLogin={(account) => { setUser(account); setShowLogin(false); }} onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export default App;
