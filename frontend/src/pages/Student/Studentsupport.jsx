import { useEffect, useRef, useState } from "react";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000/api`;

const request = async (path, options = {}) => {
  const token = localStorage.getItem("ucash_token");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
  return data;
};

const StudentSupport = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const bottomRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await request(`/messages/${user.id}`);
      setMessages(res.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      // sender_id is taken from JWT on the backend — only send the message
      await request("/messages/send", {
        method: "POST",
        body: JSON.stringify({ message: trimmed }),
      });
      setInput("");
      await fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">🛟 Student Support</h1>
        <p className="mt-1 text-sm text-slate-400">Chat with our admin team. We typically reply within a few hours.</p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-4">
        {fetching ? (
          <p className="text-sm text-slate-400">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl">👋</span>
            <p className="text-sm text-slate-400">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-slate-800 text-slate-100"
                  }`}>
                    <p className="leading-relaxed">{msg.message}</p>
                    <p className={`mt-1 text-right text-[10px] ${isMine ? "text-blue-200" : "text-slate-500"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send)"
          rows={2}
          disabled={loading}
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default StudentSupport;
