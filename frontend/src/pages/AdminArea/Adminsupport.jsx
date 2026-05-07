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

const AdminSupport = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const bottomRef = useRef(null);

  const fetchStudents = async () => {
    try {
      const res = await request("/messages/admin/students");
      setStudents(res.students || []);
    } catch (err) {
      console.error("Failed to fetch student list:", err);
    } finally {
      setFetching(false);
    }
  };

  const fetchConversation = async (studentId) => {
    try {
      const res = await request(`/messages/${studentId}`);
      setMessages(res.messages || []);
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    fetchConversation(selectedStudent.sender_id);
    const interval = setInterval(() => fetchConversation(selectedStudent.sender_id), 5000);
    return () => clearInterval(interval);
  }, [selectedStudent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleReply = async () => {
    const trimmed = reply.trim();
    if (!trimmed || !selectedStudent) return;
    setLoading(true);
    try {
      // sender_id is taken from JWT on the backend — only send receiver_id and message
      await request("/messages/reply", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: selectedStudent.sender_id,
          message: trimmed,
        }),
      });
      setReply("");
      await fetchConversation(selectedStudent.sender_id);
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 overflow-hidden p-4 sm:p-6">

      {/* Sidebar — student list */}
      <div className="flex w-64 shrink-0 flex-col rounded-l-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <h2 className="font-semibold text-white">💬 Conversations</h2>
          <p className="mt-0.5 text-xs text-slate-400">{students.length} student{students.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {fetching ? (
            <p className="p-2 text-sm text-slate-400">Loading...</p>
          ) : students.length === 0 ? (
            <p className="p-2 text-sm text-slate-400">No conversations yet.</p>
          ) : (
            students.map((s) => (
              <button
                key={s.sender_id}
                onClick={() => setSelectedStudent(s)}
                className={`flex w-full flex-col items-start gap-0.5 rounded-2xl px-3 py-3 text-left transition ${
                  selectedStudent?.sender_id === s.sender_id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <span className="truncate text-sm font-medium">{s.name}</span>
                </div>
                {s.student_id && (
                  <span className={`ml-7 truncate text-xs ${selectedStudent?.sender_id === s.sender_id ? "text-indigo-200" : "text-slate-500"}`}>
                    {s.student_id}{s.course ? ` · ${s.course}` : ""}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col rounded-r-3xl border border-l-0 border-slate-800 bg-slate-900/60">
        {!selectedStudent ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-5xl">💬</span>
            <p className="text-sm text-slate-400">Select a student to view the conversation.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-800 px-5 py-4">
              <p className="font-semibold text-white">{selectedStudent.name}</p>
              <p className="text-xs text-slate-400">
                {selectedStudent.student_id}{selectedStudent.course ? ` · ${selectedStudent.course}` : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isAdmin = msg.role === "admin";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isAdmin ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-slate-800 text-slate-100"
                        }`}>
                          <p className="leading-relaxed">{msg.message}</p>
                          <p className={`mt-1 text-right text-[10px] ${isAdmin ? "text-indigo-200" : "text-slate-500"}`}>
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

            <div className="border-t border-slate-800 p-3">
              <div className="flex items-end gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply to ${selectedStudent.name}...`}
                  rows={2}
                  disabled={loading}
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                />
                <button
                  onClick={handleReply}
                  disabled={loading || !reply.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
                >
                  {loading ? "Sending..." : "Reply"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;
