"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, ChevronDown, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chatApi, ChatSource } from "@/lib/api";

interface Message {
  role: "user" | "assistant" | "error";
  content: string;
  sources?: ChatSource[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

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
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div ref={messagesRef} className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Chat</h2>
            <p className="text-muted-foreground max-w-md">
              Ask questions about your documents. I'll search using keyword and semantic matching to find relevant answers.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
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
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 md:p-4 bg-background">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ask about your documents..."
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
  );
}

const markdownComponents = {
  code: ({ className, children, ...props }: { className?: string; children: React.ReactNode }) => {
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
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-base font-semibold mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc ml-5 mt-1 mb-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal ml-5 mt-1 mb-1 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-sm">{children}</li>
  ),
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border-collapse border border-border">{children}</table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-muted/30">{children}</thead>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="border border-border px-3 py-1.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="border border-border px-3 py-1.5">{children}</td>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary/40 pl-3 py-1 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm leading-relaxed mb-1">{children}</p>
  ),
};

function SourcesList({ sources }: { sources: ChatSource[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
      {sources.slice(0, expanded ? undefined : 2).map((s, i) => (
        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
          {s.filename}
        </span>
      ))}
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
