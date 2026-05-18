"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Bot, User, ChevronDown, Loader2, Plus, Trash2, PanelLeftClose, PanelLeft, MessageSquare, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chatApi, chatSessionsApi, ChatSource, ChatSession, ChatMessage } from "@/lib/api";
import type { Components } from "react-markdown";

interface Message {
  role: "user" | "assistant" | "error";
  content: string;
  sources?: ChatSource[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    chatSessionsApi.list()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoadingMessages(true);
    try {
      const detail = await chatSessionsApi.get(sessionId);
      setMessages(
        detail.messages.map((m: ChatMessage) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources ? JSON.parse(m.sources) as ChatSource[] : undefined,
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const session = await chatSessionsApi.create();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch {
      // silently fail
    }
  }, []);

  const handleDeleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatSessionsApi.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch {
      // silently fail
    }
  }, [activeSessionId]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await chatSessionsApi.create();
        setSessions((prev) => [session, ...prev]);
        sessionId = session.id;
        setActiveSessionId(session.id);
      } catch {
        return;
      }
    }

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);
    setInput("");

    const history = messages
      .filter((m) => m.role !== "error")
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: trimmed });

    chatApi.stream(trimmed, history, (event) => {
      if (event.type === "content") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content += event.text!;
          }
          return updated;
        });
      } else if (event.type === "done") {
        setStreaming(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant" && event.sources) {
            last.sources = event.sources;
          }
          return updated;
        });
        setSessions((prev) => prev.map((s) =>
          s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s
        ));
      } else if (event.type === "error") {
        setStreaming(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant" && !last.content) {
            last.role = "error";
            last.content = event.error || "Something went wrong";
          }
          return updated;
        });
      }
    }, undefined, sessionId);
  }, [input, streaming, activeSessionId, messages]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-200 border-r bg-muted/10 flex flex-col overflow-hidden`}>
        <div className="flex items-center gap-2 p-3 border-b">
          <Button variant="outline" size="sm" className="flex-1 justify-start gap-2" onClick={handleNewChat}>
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSidebarOpen(false)}>
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No chats yet</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => loadSession(session.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadSession(session.id); } }}
                className={`w-full text-left p-2.5 rounded-lg text-sm flex items-start gap-2.5 group hover:bg-muted/50 transition-colors cursor-pointer ${
                  activeSessionId === session.id ? "bg-muted/70" : ""
                }`}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">
                    {session.title || "New Chat"}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDate(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sidebar toggle */}
        {!sidebarOpen && (
          <div className="flex items-center gap-2 p-2 border-b md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium truncate">
              {sessions.find((s) => s.id === activeSessionId)?.title || "Chat"}
            </span>
          </div>
        )}

        <div ref={messagesRef} className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !activeSessionId ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Document Chat</h2>
              <p className="text-muted-foreground max-w-md">
                Ask questions about your documents. Start a new chat or select one from the sidebar.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {sessions.find((s) => s.id === activeSessionId)?.title || "New Chat"}
              </h2>
              <p className="text-muted-foreground max-w-md">
                Send a message to start chatting with your documents.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" :
                    msg.role === "error" ? "bg-destructive text-destructive-foreground" :
                    "bg-muted"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div>
                    <Card className={`p-3 ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" :
                      msg.role === "error" ? "border-destructive bg-destructive/10" :
                      ""
                    }`}>
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      ) : (
                        <div className="text-sm leading-relaxed prose-sm max-w-none dark:prose-invert">
                          {msg.content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {msg.content}
                            </ReactMarkdown>
                          ) : streaming && i === messages.length - 1 ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              thinking
                            </span>
                          ) : null}
                        </div>
                      )}
                    </Card>
                    {msg.sources && msg.sources.length > 0 && (
                      <SourcesList sources={msg.sources} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3 md:p-4 bg-background">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={activeSessionId ? "Ask about your documents..." : "Start a new chat..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={streaming}
            />
            <Button size="icon" onClick={handleSend} disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const markdownComponents: Components = {
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <pre className="bg-muted/50 rounded-lg p-3 overflow-x-auto my-2 text-sm">
        <code className={className} {...props}>{children}</code>
      </pre>
    ) : (
      <code className="bg-muted/50 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  h1: ({ children }) => (
    <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc ml-5 mt-1 mb-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal ml-5 mt-1 mb-1 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm">{children}</li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border-collapse border border-border">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/30">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-border px-3 py-1.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-1.5">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 pl-3 py-1 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-1">{children}</p>
  ),
};

function SourcesList({ sources }: { sources: ChatSource[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
      {sources.slice(0, expanded ? undefined : 2).map((s, i) => {
        const content = s.doc_id ? (
          <Link href={`/document/${s.doc_id}`} className="hover:underline">
            {s.filename}
          </Link>
        ) : (
          s.filename
        );
        return (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {content}
          </span>
        );
      })}
      {!expanded && sources.length > 2 && (
        <button
          className="text-[11px] px-1.5 py-0.5 flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(true)}
        >
          +{sources.length - 2} more <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
