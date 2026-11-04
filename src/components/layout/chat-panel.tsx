"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "Give me a workspace summary",
  "Show private projects",
  "What Markdown files are pending?",
  "Workspace status",
];

export function ChatPanel({
  viewerName,
  onClose,
}: {
  viewerName: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi ${viewerName.split(" ")[0]}! I can summarise your workspace, list public or private projects, show workspaces, notes, Markdown files and GitHub status.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(value: string) {
    const text = value.trim();
    if (!text || sending) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const payload = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The assistant could not answer.");
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: payload.reply ?? "" },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "The assistant could not answer.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="chat-panel" aria-label="Workspace chat">
      <header className="chat-head">
        <span className="chat-head-icon">
          <MessageCircle size={17} />
        </span>
        <div>
          <h2>Workspace assistant</h2>
          <p>Answers from your real DEVSPACE data</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close chat">
          <X size={16} />
        </button>
      </header>

      <div className="chat-body" ref={bodyRef}>
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.role}`}>
            <span className="chat-avatar">
              {message.role === "assistant" ? <Sparkles size={13} /> : viewerName.charAt(0)}
            </span>
            <div className="chat-bubble">{message.content}</div>
          </div>
        ))}
        {sending ? (
          <div className="chat-message assistant">
            <span className="chat-avatar">
              <Sparkles size={13} />
            </span>
            <div className="chat-bubble chat-typing">
              <Loader2 size={13} className="animate-spin" /> Checking your workspace…
            </div>
          </div>
        ) : null}
      </div>

      <div className="chat-quick">
        {quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={sending}>
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          ref={inputRef}
          className="input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about projects, notes or files…"
          aria-label="Chat message"
          disabled={sending}
        />
        <button type="submit" className="chat-send" aria-label="Send message" disabled={!input.trim() || sending}>
          <Send size={15} />
        </button>
      </form>
    </section>
  );
}
