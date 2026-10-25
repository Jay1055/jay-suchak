import { useEffect, useRef, useState } from "react";
import AdminWorkspace from "./AdminWorkspace.jsx";
import HeadWorkspace from "./HeadWorkspace.jsx";
import LoginPanel from "./LoginPanel.jsx";
import { apiRequest } from "./api.js";
import { LanguageSwitcher, useLanguage, withLanguageInstruction } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/ask";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

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
    attach: <><path d="m21.4 11.6-8.5 8.5a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    collapse: <><path d="m15 18-6-6 6-6" /><path d="M4 5v14" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function StaffHome({ user, onLogout, onOpenAssistant }) {
  const { t } = useLanguage();
  return (
    <main className="staff-workspace staff-workspace-with-sidebar">
      <aside className="staff-home-sidebar" aria-label={t("staff.workspaceNavigation")}>
        <nav className="staff-home-nav">
          <a className="staff-home-nav-item active" href="/" aria-current="page"><Icon name="home" size={17} /><span>{t("common.home")}</span></a>
          <button className="staff-home-nav-item" type="button" onClick={onOpenAssistant}><Icon name="spark" size={17} /><span>{t("assistant.name")}</span></button>
        </nav>
        <button className="staff-home-logout" type="button" onClick={onLogout}>{t("common.signOut")}</button>
      </aside>
      <div className="staff-home-main">
        <header className="staff-topbar staff-home-topbar">
          <a className="staff-brand" href="/" aria-label="SuchnaSetu home"><img src="/logo.png" alt="SuchnaSetu" /></a>
          <p className="staff-home-context">SuchnaSetu <span>/</span> {t("common.home")}</p>
          <div className="staff-topbar-right">
            <LanguageSwitcher />
            <span><strong>{user.name}</strong><small>{user.role === "governmentEmployee" ? t("staff.roleEmployee") : t("staff.roleDeveloper")}</small></span>
          </div>
        </header>
        <section className="staff-content staff-profile-home">
          <p className="staff-eyebrow">{t("staff.account")}</p>
          <h1>{t("staff.welcome", { name: user.name })}</h1>
          <p>{user.department?.name || t("staff.noDepartment")} · {user.department?.code || ""}</p>
          <button className="staff-home-assistant-action" type="button" onClick={onOpenAssistant}><Icon name="spark" size={18} />{t("staff.openAssistant")}</button>
        </section>
      </div>
    </main>
  );
}

function LoginWelcomeAnimation({ onClose }) {
  const { t } = useLanguage();
  return (
    <div className="welcome-animation-backdrop" role="dialog" aria-modal="true" aria-label={t("welcome.aria")}>
      <div className="welcome-animation-panel">
        <video
          className="welcome-animation-video"
          src="/welcome-animation.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={onClose}
          onError={onClose}
        />

      </div>
    </div>
  );
}

function App() {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 761px)").matches);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const hasConversation = messages.length > 0;
  const suggestions = [
    { icon: "⌂", title: t("chat.schemes"), prompt: t("chat.schemesPrompt") },
    { icon: "▤", title: t("chat.rules"), prompt: t("chat.rulesPrompt") },
    { icon: "↗", title: t("chat.application"), prompt: t("chat.applicationPrompt") },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

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
      setError(t("auth.noApi"));
    } finally {
      setUser(null);
      setShowAssistant(false);
    }
  }

  function handleLogin(account) {
    setUser(account);
    setShowWelcomeAnimation(true);
  }

  if (isCheckingSession) return (
    <main className="auth-loading" aria-busy="true">
      <LanguageSwitcher />
      <div className="auth-loading-status" role="status">
        <span className="auth-loading-mark" aria-hidden="true"><img src="/logo-mark.png" alt="" /></span>
        <span>{t("common.loadingSession")}</span>
        <span className="auth-loading-line" aria-hidden="true" />
      </div>
    </main>
  );
  if (!user) return <LoginPanel onLogin={handleLogin} />;
  if (user?.role === "admin" && !showAssistant) return (
    <>
      <AdminWorkspace user={user} onLogout={signOut} onOpenAssistant={() => setShowAssistant(true)} />
      {showWelcomeAnimation && <LoginWelcomeAnimation onClose={() => setShowWelcomeAnimation(false)} />}
    </>
  );
  if (user?.role === "departmentHead" && !showAssistant) return (
    <>
      <HeadWorkspace user={user} onLogout={signOut} />
      {showWelcomeAnimation && <LoginWelcomeAnimation onClose={() => setShowWelcomeAnimation(false)} />}
    </>
  );
  if (user && !showAssistant) return (
    <>
      <StaffHome user={user} onLogout={signOut} onOpenAssistant={() => setShowAssistant(true)} />
      {showWelcomeAnimation && <LoginWelcomeAnimation onClose={() => setShowWelcomeAnimation(false)} />}
    </>
  );
  function startNewChat() {
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  function handleAttachmentSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setError(t("chat.attachmentLimit", { count: MAX_ATTACHMENTS }));
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, availableSlots);
    const currentTotalSize = attachments.reduce((total, attachment) => total + attachment.file.size, 0);
    const addedTotalSize = acceptedFiles.reduce((total, file) => total + file.size, 0);
    if (selectedFiles.length > availableSlots) {
      setError(t("chat.attachmentLimit", { count: MAX_ATTACHMENTS }));
    } else {
      setError("");
    }

    if (currentTotalSize + addedTotalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      setError(t("chat.attachmentsTotalTooLarge", { size: 20 }));
      return;
    }

    const tooLarge = acceptedFiles.find((file) => file.size > MAX_ATTACHMENT_SIZE);
    if (tooLarge) {
      setError(t("chat.attachmentTooLarge", { name: tooLarge.name, size: 10 }));
      return;
    }

    setAttachments((current) => [
      ...current,
      ...acceptedFiles.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  }

  function toggleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(t("chat.voiceUnsupported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = { en: "en-US", hi: "hi-IN", gu: "gu-IN" }[language] || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        setInput((current) => `${current}${current ? " " : ""}${transcript}`);
        setError("");
      }
    };
    recognition.onerror = (event) => {
      setError(t(event.error === "not-allowed" ? "chat.voicePermission" : "chat.voiceFailed"));
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setError("");
    setIsRecording(true);
    try {
      recognition.start();
    } catch (recognitionError) {
      recognitionRef.current = null;
      setIsRecording(false);
      setError(t("chat.voiceFailed"));
      console.error("Unable to start voice input.", recognitionError);
    }
  }

  function readAttachment(file) {
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

  async function sendMessage(event) {
    event?.preventDefault();
    const text = input.trim();
    const pendingAttachments = attachments;
    if ((!text && !pendingAttachments.length) || isLoading || isRecording) return;
    const query = text || t("chat.attachmentsOnly");

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      attachments: pendingAttachments.map(({ id, file }) => ({ id, name: file.name, type: file.type })),
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setAttachments([]);
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: withLanguageInstruction(query, language),
          language,
          attachments: await Promise.all(pendingAttachments.map(({ file }) => readAttachment(file))),
        }),
      });
      if (!response.ok) {
        throw new Error(t("chat.apiFailed", { status: response.status }));
      }

      const data = await response.json();
      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error(t("chat.apiInvalid"));
      }
      const sources = Array.isArray(data.sources)
        ? data.sources
        : Array.isArray(data.citations)
          ? data.citations
          : Array.isArray(data.documents)
            ? data.documents
            : [];
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: data.answer.trim(), sources },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? t("chat.apiOffline", { url: API_URL, hint: t("assistant.fastApiHint") })
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

  const composerAttachments = attachments.length > 0 && (
    <div className="composer-attachments" aria-label={t("chat.attachmentsSelected")}>
      {attachments.map(({ id, file }) => (
        <span className="composer-attachment" key={id}>
          <span className="composer-attachment-name" title={file.name}>{file.name}</span>
          <button
            type="button"
            aria-label={t("chat.removeAttachment", { name: file.name })}
            onClick={() => setAttachments((current) => current.filter((attachment) => attachment.id !== id))}
          >
            <Icon name="close" size={13} />
          </button>
        </span>
      ))}
    </div>
  );

  const composerInputActions = (
    <div className="composer-input-actions">
      <input
        ref={attachmentInputRef}
        className="composer-file-input"
        type="file"
        accept="image/*,audio/*,video/*,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.csv"
        multiple
        onChange={handleAttachmentSelection}
        aria-label={t("chat.attachFiles")}
      />
      <button
        className="composer-tool-button"
        type="button"
        aria-label={t("chat.attachFiles")}
        title={t("chat.attachFiles")}
        onClick={() => attachmentInputRef.current?.click()}
        disabled={isLoading || attachments.length >= MAX_ATTACHMENTS}
      >
        <Icon name="attach" size={18} />
        <span className="composer-tool-label">{t("chat.attachShort")}</span>
      </button>
      <button
        className={isRecording ? "composer-tool-button recording" : "composer-tool-button"}
        type="button"
        aria-label={t(isRecording ? "chat.stopRecording" : "chat.voiceInput")}
        title={t(isRecording ? "chat.stopRecording" : "chat.voiceInput")}
        aria-pressed={isRecording}
        onClick={toggleVoiceInput}
        disabled={isLoading}
      >
        <Icon name={isRecording ? "stop" : "mic"} size={18} />
        <span className="composer-tool-label">{t(isRecording ? "chat.stopShort" : "chat.voiceShort")}</span>
      </button>
    </div>
  );

  return (
    <div className="app-shell">
    {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label={t("common.closeNavigation")}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <div className="sidebar-top">
          <button className="sidebar-collapse-button" type="button" aria-label={t(sidebarCollapsed ? "common.expandNavigation" : "common.collapseNavigation")} title={t(sidebarCollapsed ? "common.expandNavigation" : "common.collapseNavigation")} onClick={() => setSidebarCollapsed((current) => !current)}>
            <Icon name="collapse" />
          </button>
          <button className="icon-button mobile-close" aria-label={t("common.closeNavigation")} onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <button className="new-chat-button" onClick={startNewChat}>
          <Icon name="plus" size={18} />
          <span>{t("chat.new")}</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <p className="section-label">{t("chat.space")}</p>
          <button className="nav-item active">
            <span className="nav-item-icon">◌</span>
            <span>{t("chat.assistant")}</span>
            <span className="active-dot" />
          </button>
          <button className="nav-item" onClick={() => setShowAssistant(false)}>
            <span className="nav-item-icon"><Icon name="home" size={17} /></span>
            <span>{t("common.home")}</span>
          </button>
        </div>

        <div className="sidebar-note">
          <div className="note-icon"><Icon name="spark" size={17} /></div>
          <p className="note-title">{t("chat.noteTitle")}</p>
          <p className="note-copy">{t("chat.noteCopy")}</p>
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>{t("chat.status")}</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <a className="assistant-topbar-brand" href="#" aria-label="SuchnaSetu home" onClick={(event) => event.preventDefault()}><img src="/logo.png" alt="SuchnaSetu" /></a>
          <button className="icon-button menu-button" aria-label={t("common.openNavigation")} onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>SuchnaSetu</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{t("chat.assistant")}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-label"><span className="secure-dot" /> {t("chat.private")}</span>
            <LanguageSwitcher />
            <button className="sign-in-button chat-workspace-return" type="button" onClick={() => setShowAssistant(false)}>
              <Icon name="arrow" size={15} />
              {t("chat.returnToWorkspace")}
            </button>
            <div className="avatar" aria-label={user.name}>{user.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <section className={`chat-area${hasConversation ? " chat-area-active" : ""}`}>
          {!hasConversation ? (
            <div className="welcome-view">
              <div className="welcome-badge"><Icon name="spark" size={15} /> {t("chat.guide")}</div>
              <h1>{t("chat.headline")}<br />{t("chat.headlineSecond")} <span>{t("chat.clearer")}</span></h1>
              <p className="welcome-description">
                {t("chat.description")}<br className="desktop-break" />
                {t("chat.descriptionSecond")}
              </p>

              <form className="composer welcome-composer" onSubmit={sendMessage}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={t("chat.placeholder")}
                  rows={1}
                  aria-label={t("chat.placeholder")}
                />
                {composerAttachments}
                {isRecording && <p className="composer-voice-status" role="status">{t("chat.listening")}</p>}
                <div className="composer-bottom">
                  <div className="composer-bottom-left">
                    {composerInputActions}
                    <span className="composer-hint"><span className="hint-key">↵</span> {t("chat.toSend")} <span className="hint-separator">·</span> {t("chat.newLine")}</span>
                  </div>
                  <button className="send-button" type="submit" disabled={(!input.trim() && !attachments.length) || isLoading || isRecording} aria-label={t("assistant.send")}>
                    <span>{t("chat.askSuchnaSetu")}</span><Icon name="send" size={16} />
                  </button>
                </div>
              </form>

              <div className="suggestions-heading"><span>{t("chat.suggestions")}</span><span className="suggestion-line" /></div>
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
              <p className="disclaimer">{t("chat.disclaimer")}</p>
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
                      <div className="message-author">{message.role === "assistant" ? "Suchak" : t("chat.you")}</div>
                      {message.content && <p>{message.content}</p>}
                      {message.sources?.length > 0 && (
                        <section className="message-sources" aria-label={t("chat.sources")}>
                          <strong>{t("chat.sources")}</strong>
                          <ol>
                            {message.sources.map((source, sourceIndex) => {
                              const title = typeof source === "string" ? source : source.title || source.name || source.filename || source.document || t("chat.sourceFallback", { number: sourceIndex + 1 });
                              const page = typeof source === "object" && source?.page != null ? source.page : source?.page_number;
                              const url = typeof source === "object" ? source.url || source.link : null;
                              return (
                                <li key={`${title}-${sourceIndex}`}>
                                  {url ? <a href={url} target="_blank" rel="noreferrer">{title}{page != null ? ` · ${t("chat.page", { page })}` : ""}</a> : <span>{title}{page != null ? ` · ${t("chat.page", { page })}` : ""}</span>}
                                </li>
                              );
                            })}
                          </ol>
                        </section>
                      )}
                      {message.attachments?.length > 0 && (
                        <div className="message-attachments" aria-label={t("chat.attachmentsSelected")}>
                          {message.attachments.map((attachment) => (
                            <span className="message-attachment" key={attachment.id} title={attachment.type || ""}>
                              <Icon name="attach" size={14} />
                              <span>{attachment.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {isLoading && (
                  <article className="message message-assistant">
                    <img className="message-avatar" src="/logo.png" alt="" />
                    <div className="message-body">
                      <div className="message-author">Suchak</div>
                      <div className="typing-indicator" role="status" aria-label={t("assistant.thinking")}> <span /><span /><span /><small>{t("assistant.thinking")}</small></div>
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
                  placeholder={t("chat.followup")}
                  rows={1}
                  aria-label={t("chat.followup")}
                />
                {composerAttachments}
                {isRecording && <p className="composer-voice-status" role="status">{t("chat.listening")}</p>}
                <div className="composer-bottom">
                  <div className="composer-bottom-left">
                    {composerInputActions}
                    <span className="composer-hint"><span className="hint-key">↵</span> {t("chat.toSend")} <span className="hint-separator">·</span> {t("chat.newLine")}</span>
                  </div>
                  <button className="send-button" type="submit" disabled={(!input.trim() && !attachments.length) || isLoading || isRecording} aria-label={t("assistant.send")}>
                    <span>{t("chat.send")}</span><Icon name="send" size={16} />
                  </button>
                </div>
              </form>
              <p className="conversation-disclaimer">{t("chat.verify")}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
