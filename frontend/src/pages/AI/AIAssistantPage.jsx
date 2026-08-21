import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdSmartToy,
  MdSend,
  MdLightbulb,
  MdCheckCircle,
  MdCancel,
  MdFlashOn,
  MdRefresh
} from "react-icons/md";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am your **IntelliProcure AI Copilot** 🤖.\n\nI query **real enterprise database records** to answer questions on spend, supplier risks, purchase requests, invoice flags, and inventory reordering.\n\nHow can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "What is our total spend this month?",
        "Which suppliers have the highest risk?",
        "Show pending purchase requests.",
        "Why was this invoice flagged?",
        "Which products need reordering?",
        "Which supplier is recommended for this RFQ?"
      ]
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const res = await api.post("/ai/chat", { message: queryText });
      const actionObj = res.data?.data?.action;

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestions: res.data.suggestions || [],
        action: actionObj
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Copilot query failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit Action Confirmation Handler
  const handleConfirmAction = async (msgId, actionObj) => {
    setExecutingActionId(msgId);
    try {
      const res = await api.post("/ai/execute-action", {
        action_type: actionObj.action_type,
        target_id: actionObj.target_id
      });

      toast.success(res.data.message || "Action executed successfully!");

      // Append confirmation result message from assistant
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? { ...msg, actionExecuted: true, actionResult: res.data.message }
            : msg
        )
      );
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to execute action.");
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleCancelAction = (msgId) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId ? { ...msg, actionCancelled: true } : msg
      )
    );
    toast.info("Action cancelled.");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MdSmartToy color="var(--primary)" /> IntelliProcure AI Copilot
          </h1>
          <p className="page-subtitle">Conversational procurement assistant connected to live database queries with controlled action execution.</p>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Messages Scroll Area */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 12
              }}
            >
              {msg.role === "assistant" && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #2563EB, #6366F1)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 20
                  }}
                >
                  <MdSmartToy />
                </div>
              )}

              <div style={{ maxWidth: "80%" }}>
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? "var(--primary)" : "var(--bg-app)",
                    color: msg.role === "user" ? "white" : "var(--text-primary)",
                    border: msg.role === "user" ? "none" : "1px solid var(--border-color)",
                    fontSize: 14,
                    lineHeight: 1.6
                  }}
                >
                  {/* Markdown Renderer with Headers, Bold, Bullets */}
                  {msg.content.split("\n").map((line, li) => {
                    if (line.startsWith("### ")) {
                      return <h3 key={li} style={{ fontSize: 15, fontWeight: 800, margin: "8px 0 4px", color: msg.role === "user" ? "white" : "var(--primary)" }}>{line.replace("### ", "")}</h3>;
                    }
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <div key={li} style={{ marginBottom: line === "" ? 6 : 2 }}>
                        {parts.map((part, pi) =>
                          pi % 2 === 1 ? (
                            <strong key={pi} style={{ color: msg.role === "user" ? "white" : "var(--primary-600, var(--primary))" }}>
                              {part}
                            </strong>
                          ) : (
                            <span key={pi}>{part}</span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── ACTION CONFIRMATION CARD (Controlled Write Operations) ── */}
                {msg.action && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 16,
                      background: "var(--bg-card)",
                      border: "2px dashed var(--primary)",
                      borderRadius: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>
                      <MdFlashOn fontSize={18} /> AI Recommended Action:
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600 }}>{msg.action.summary}</div>

                    {msg.actionExecuted ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--success)", fontWeight: 700, marginTop: 4 }}>
                        <MdCheckCircle fontSize={16} /> {msg.actionResult}
                      </div>
                    ) : msg.actionCancelled ? (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                        Action cancelled.
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={executingActionId === msg.id}
                          onClick={() => handleConfirmAction(msg.id, msg.action)}
                        >
                          <MdCheckCircle /> Confirm & Execute
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={executingActionId === msg.id}
                          onClick={() => handleCancelAction(msg.id)}
                        >
                          <MdCancel /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions Pills if Assistant */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 20, fontSize: 12 }}
                        onClick={() => handleSend(sug)}
                      >
                        <MdLightbulb color="#F59E0B" /> {sug}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textAlign: msg.role === "user" ? "right" : "left" }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #2563EB, #6366F1)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MdSmartToy />
              </div>
              <div style={{ padding: "12px 18px", borderRadius: 16, background: "var(--bg-app)", border: "1px solid var(--border-color)", fontSize: 13, color: "var(--text-muted)" }}>
                Executing controlled database query...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: 16, borderTop: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              className="form-control"
              placeholder="Ask Copilot: 'What is our total spend this month?' or 'Show pending PRs'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              style={{ fontSize: 14, padding: "12px 16px" }}
            />
            <button
              className="btn btn-primary"
              style={{ padding: "12px 20px" }}
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
            >
              <MdSend fontSize={18} /> Send
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
