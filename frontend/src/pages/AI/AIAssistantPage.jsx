import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdSmartToy,
  MdSend,
  MdLightbulb,
  MdCheckCircle,
  MdCancel,
  MdFlashOn,
  MdRefresh,
  MdContentCopy,
  MdDeleteSweep,
  MdSearch,
  MdStorage,
  MdPsychology,
  MdAttachMoney,
  MdBusiness,
  MdShoppingCart,
  MdReceipt,
  MdInventory,
  MdVerified
} from "react-icons/md";
import toast from "react-hot-toast";
import { api } from "../../contexts/AuthContext";

const QUICK_PROMPTS = [
  { icon: <MdAttachMoney color="#10B981" />, label: "Total Spend This Month", query: "What is our total spend this month?" },
  { icon: <MdBusiness color="#EF4444" />, label: "Highest Risk Suppliers", query: "Which suppliers have the highest risk?" },
  { icon: <MdShoppingCart color="#F59E0B" />, label: "Pending PRs", query: "Show pending purchase requests." },
  { icon: <MdReceipt color="#6366F1" />, label: "Flagged Invoices", query: "Why was this invoice flagged?" },
  { icon: <MdInventory color="#06B6D4" />, label: "Low Stock Items", query: "Which products need reordering?" },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am your **IntelliProcure AI Copilot** 🤖.\n\nI am connected directly to your **Neon PostgreSQL Database** to provide real-time procurement intelligence, spend analytics, supplier risk evaluations, and autonomous workflow actions.\n\nWhat would you like to explore today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "What is our total spend this month?",
        "Which suppliers have the highest risk?",
        "Show pending purchase requests.",
        "Why was this invoice flagged?",
        "Which products need reordering?"
      ]
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningStep, setReasoningStep] = useState(0);
  const [executingActionId, setExecutingActionId] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Animated Database Reasoning Stages
  useEffect(() => {
    let interval;
    if (isLoading) {
      setReasoningStep(0);
      interval = setInterval(() => {
        setReasoningStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 700);
    } else {
      setReasoningStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const reasoningMessages = [
    { icon: <MdStorage fontSize={16} />, text: "Connecting to Neon PostgreSQL database..." },
    { icon: <MdSearch fontSize={16} />, text: "Analyzing live transaction records & supplier scores..." },
    { icon: <MdPsychology fontSize={16} />, text: "Synthesizing executive recommendation & action parameters..." }
  ];

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

  // Copy response
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Conversation history cleared. Ready for your next procurement query! 🤖",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestions: [
          "What is our total spend this month?",
          "Which suppliers have the highest risk?",
          "Show pending purchase requests."
        ]
      }
    ]);
    toast.success("Chat history reset");
  };

  // Action Confirmation Handler
  const handleConfirmAction = async (msgId, actionObj) => {
    setExecutingActionId(msgId);
    try {
      const res = await api.post("/ai/execute-action", {
        action_type: actionObj.action_type,
        target_id: actionObj.target_id
      });

      toast.success(res.data.message || "Action executed successfully! 🎉");

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
      <div className="page-header" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <MdSmartToy color="var(--primary)" /> IntelliProcure AI Copilot
            </h1>
            <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <MdVerified fontSize={13} /> Live DB Connected
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: "2px 0 0" }}>
            Autonomous procurement intelligence querying Neon PostgreSQL with human-in-the-loop action execution.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleClearChat} style={{ gap: 6 }}>
          <MdDeleteSweep fontSize={16} /> Clear Chat
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 10 }}>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            className="btn btn-secondary btn-sm"
            onClick={() => handleSend(qp.query)}
            disabled={isLoading}
            style={{
              whiteSpace: "nowrap",
              fontSize: 12,
              borderRadius: 20,
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg-card)",
              borderColor: "var(--border-color)"
            }}
          >
            {qp.icon} {qp.label}
          </button>
        ))}
      </div>

      {/* Main Chat Container */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
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
                    fontSize: 20,
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)"
                  }}
                >
                  <MdSmartToy />
                </div>
              )}

              <div style={{ maxWidth: "82%" }}>
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "var(--primary)" : "var(--bg-app)",
                    color: msg.role === "user" ? "white" : "var(--text-primary)",
                    border: msg.role === "user" ? "none" : "1px solid var(--border-color)",
                    fontSize: 14,
                    lineHeight: 1.65,
                    boxShadow: msg.role === "user" ? "0 4px 14px rgba(37,99,235,0.25)" : "none"
                  }}
                >
                  {/* Markdown Lines */}
                  {msg.content.split("\n").map((line, li) => {
                    if (line.startsWith("### ")) {
                      return (
                        <h3 key={li} style={{ fontSize: 15, fontWeight: 800, margin: "10px 0 6px", color: msg.role === "user" ? "white" : "var(--primary)" }}>
                          {line.replace("### ", "")}
                        </h3>
                      );
                    }
                    if (line.startsWith("- ") || line.startsWith("• ")) {
                      return (
                        <div key={li} style={{ display: "flex", gap: 6, marginLeft: 6, marginBottom: 4 }}>
                          <span style={{ color: "var(--primary)", fontWeight: 700 }}>•</span>
                          <span>{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      );
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

                {/* ── ACTION CONFIRMATION CARD (Controlled Execution) ── */}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#10B981", fontWeight: 700, marginTop: 4 }}>
                        <MdCheckCircle fontSize={18} /> {msg.actionResult}
                      </div>
                    ) : msg.actionCancelled ? (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                        Action cancelled by user.
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={executingActionId === msg.id}
                          onClick={() => handleConfirmAction(msg.id, msg.action)}
                          style={{ fontWeight: 700 }}
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

                {/* Suggestions Pills */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 20, fontSize: 11.5, padding: "4px 12px" }}
                        onClick={() => handleSend(sug)}
                      >
                        <MdLightbulb color="#F59E0B" /> {sug}
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer timestamp & copy */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, justifyContent: msg.role === "user" ? "flex-end" : "flex-start", fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{msg.timestamp}</span>
                  {msg.role === "assistant" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCopy(msg.content)}
                      style={{ padding: "1px 6px", fontSize: 11 }}
                      title="Copy response"
                    >
                      <MdContentCopy fontSize={12} /> Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ── LIVE DATABASE REASONING STEPS (Option C) ── */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
            >
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
                  flexShrink: 0
                }}
              >
                <MdSmartToy />
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "18px 18px 18px 4px",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  maxWidth: "80%"
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", animation: "pulse 1.2s infinite" }} />
                  Database Reasoning Engine Active
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {reasoningMessages.slice(0, reasoningStep + 1).map((step, sIdx) => (
                    <motion.div
                      key={sIdx}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: sIdx === reasoningStep ? "var(--text-primary)" : "var(--text-muted)",
                        fontWeight: sIdx === reasoningStep ? 600 : 400
                      }}
                    >
                      <span style={{ color: "var(--primary)" }}>{step.icon}</span>
                      <span>{step.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
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
              style={{ fontSize: 14, padding: "12px 18px", borderRadius: 10 }}
            />
            <button
              className="btn btn-primary"
              style={{ padding: "12px 22px", borderRadius: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
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
