import { useEffect, useMemo, useState } from "react";
import { adminAPI } from "../../api";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  studentId: "",
  course: "BSIT",
  year: 1,
  status: "active",
};

const displayStatus = (status) =>
  status === "suspended" ? "Suspended" : "Active";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStudents = async () => {
    try {
      setPageLoading(true);
      setError("");
      const params = { sortBy };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await adminAPI.getStudents(params);
      setStudents(res.students || []);
    } catch (err) {
      setError(err.message || "Failed to load students.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [sortBy]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" || s.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "year" ? Number(value) : value,
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedId(null);
    setModal("create");
    setError("");
    setSuccess("");
  };

  const openEdit = (student) => {
    setForm({
      name: student.name || "",
      email: student.email || "",
      phone: student.phone || "",
      password: "",
      studentId: student.student_id || "",
      course: student.course || "BSIT",
      year: Number(student.year) || 1,
      status: student.status || "active",
    });
    setSelectedId(student.id);
    setModal("edit");
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (modal === "create") {
      if (!form.password.trim()) {
        setError("Password is required when creating a student.");
        return;
      }
      if (form.password.trim().length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (modal === "create") {
        await adminAPI.createStudent({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password.trim(),
          studentId: form.studentId.trim(),
          course: form.course,
          year: Number(form.year),
        });
        setSuccess("Student created successfully.");
      } else if (modal === "edit" && selectedId) {
        await adminAPI.updateStudent(selectedId, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          course: form.course,
          year: Number(form.year),
          status: form.status,
        });
        setSuccess("Student updated successfully.");
      }

      setModal(null);
      setForm(emptyForm);
      setSelectedId(null);
      await loadStudents();
    } catch (err) {
      setError(err.message || "Could not save student.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendToggle = async (student) => {
    try {
      setError("");
      setSuccess("");
      await adminAPI.suspendStudent(student.id);
      setSuccess(
        student.status === "active"
          ? "Student suspended successfully."
          : "Student activated successfully."
      );
      await loadStudents();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    }
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.name}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await adminAPI.deleteStudent(student.id);
      setSuccess("Student deleted successfully.");
      await loadStudents();
    } catch (err) {
      setError(err.message || "Failed to delete student.");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-white text-2xl font-bold">👨‍🎓 Manage Students</h1>
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + Add Student
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-green-300 text-sm">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search name, ID, email..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="name">Sort: Name</option>
          <option value="balance">Sort: Balance</option>
          <option value="studentId">Sort: Student ID</option>
          <option value="newest">Sort: Newest</option>
        </select>

        <button
          onClick={loadStudents}
          className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-sm"
        >
          Refresh
        </button>
      </div>

      <p className="text-slate-500 text-xs">
        {filteredStudents.length} student
        {filteredStudents.length !== 1 ? "s" : ""} found
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Student</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">ID / Course</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Contact</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Balance</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400 text-sm">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 text-sm">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {s.name?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-xs font-mono">{s.student_id}</p>
                      <p className="text-slate-500 text-xs">{s.course || "N/A"} · Yr {s.year || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-xs">{s.email}</p>
                      <p className="text-slate-500 text-xs">{s.phone || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-bold ${Number(s.balance) > 0 ? "text-green-400" : "text-slate-500"}`}>
                        ₱{Number(s.balance || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        s.status === "active"
                          ? "bg-green-900/40 text-green-400"
                          : "bg-red-900/40 text-red-400"
                      }`}>
                        {displayStatus(s.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSuspendToggle(s)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            s.status === "active"
                              ? "bg-yellow-900/40 hover:bg-yellow-900/60 text-yellow-400"
                              : "bg-green-900/40 hover:bg-green-900/60 text-green-400"
                          }`}
                        >
                          {s.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-1 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl">
            <h2 className="text-white font-bold text-lg mb-5">
              {modal === "create" ? "➕ Add Student" : "✏️ Edit Student"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 text-xs mb-1">Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleForm}
                  placeholder="Juan dela Cruz"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleForm}
                  placeholder="name@uc.edu.ph"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleForm}
                  placeholder="09XXXXXXXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Student ID</label>
                <input
                  name="studentId"
                  value={form.studentId}
                  onChange={handleForm}
                  placeholder="Leave blank to auto-generate"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Password {modal === "create" ? "*" : ""}
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleForm}
                  placeholder={modal === "create" ? "Required" : "Leave blank to keep unchanged"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required={modal === "create"}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Course</label>
                <select
                  name="course"
                  value={form.course}
                  onChange={handleForm}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {["BSIT", "BSCS", "BSBA", "BSCE", "BSED", "BSACM"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Year</label>
                <select
                  name="year"
                  value={form.year}
                  onChange={handleForm}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {modal === "edit" && (
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 text-xs mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleForm}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              >
                {loading ? "Saving..." : modal === "create" ? "Add Student" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}