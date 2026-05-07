import { useEffect, useState } from "react";
import AuthPage from "./AuthPage.jsx";
import logo from "./assets/logo.png";
import { authAPI } from "./api.js";
import StudentDashboard from "./pages/Student/StudentDashboard.jsx";
import StudentFunds from "./pages/Student/StudentFunds.jsx";
import StudentPayments from "./pages/Student/StudentPayments.jsx";
import StudentTransactions from "./pages/Student/StudentTransactions.jsx";
import StudentLinkedAccounts from "./pages/Student/StudentLinkedAccounts.jsx";
import StudentNotifications from "./pages/Student/StudentNotifications.jsx";
import StudentWallet from "./pages/Student/StudentWallet.jsx";
import Studentsupport from "./pages/Student/Studentsupport.jsx";
import AdminDashboard from "./pages/AdminArea/AdminDashboard.jsx";
import AdminStudents from "./pages/AdminArea/AdminStudents.jsx";
import AdminTransactions from "./pages/AdminArea/AdminTransactions.jsx";
import AdminReports from "./pages/AdminArea/AdminReports.jsx";
import AdminSettings from "./pages/AdminArea/AdminSettings.jsx";
import AdminOverview from "./pages/AdminArea/AdminOverview.jsx";
import Adminsupport from "./pages/AdminArea/Adminsupport.jsx";

const STUDENT_NAV = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "wallet", label: "Wallet", icon: "👛" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "funds", label: "Funds", icon: "➕" },
  { id: "transactions", label: "History", icon: "📋" },
  { id: "linked", label: "Linked Accounts", icon: "🔗" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "support", label: "Support", icon: "🛟" },
];

const ADMIN_NAV = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "overview", label: "Overview", icon: "👁️" },
  { id: "students", label: "Students", icon: "👨‍🎓" },
  { id: "transactions", label: "Transactions", icon: "💰" },
  { id: "reports", label: "Reports", icon: "📄" },
  { id: "settings", label: "Settings", icon: "⚙️" },
  { id: "support", label: "Support", icon: "🛟" },
];

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    studentId: user.studentId || user.student_id || user.studentID || "",
    role: user.role || "student",
  };
}

function renderStudentPage(page, user, onNavigate) {
  switch (page) {
    case "dashboard":    return <StudentDashboard user={user} onNavigate={onNavigate} />;
    case "wallet":       return <StudentWallet user={user} />;
    case "funds":        return <StudentFunds user={user} />;
    case "payments":     return <StudentPayments user={user} />;
    case "transactions": return <StudentTransactions user={user} />;
    case "linked":       return <StudentLinkedAccounts user={user} />;
    case "notifications":return <StudentNotifications user={user} />;
    case "support":      return <Studentsupport user={user} />;
    default:             return <StudentDashboard user={user} onNavigate={onNavigate} />;
  }
}

function renderAdminPage(page, user, onNavigate) {
  switch (page) {
    case "dashboard":    return <AdminDashboard user={user} onNavigate={onNavigate} />;
    case "overview":     return <AdminOverview user={user} />;
    case "students":     return <AdminStudents user={user} />;
    case "transactions": return <AdminTransactions user={user} />;
    case "reports":      return <AdminReports user={user} />;
    case "settings":     return <AdminSettings user={user} />;
    case "support":      return <Adminsupport user={user} />;
    default:             return <AdminDashboard user={user} onNavigate={onNavigate} />;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ucash_token");
    if (!token) {
      setLoading(false);
      return;
    }

    authAPI
      .getMe()
      .then((data) => {
        setUser(normalizeUser(data.user));
      })
      .catch(() => {
        localStorage.removeItem("ucash_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData) => {
    setUser(normalizeUser(userData));
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("ucash_token");
    setUser(null);
    setActivePage("dashboard");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-200">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-2xl shadow-black/30">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-blue-600/70" />
          <div>
            <p className="text-sm font-semibold text-white">Loading UCash</p>
            <p className="text-xs text-slate-400">Checking your session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} logo={logo} />;
  }

  if (user.role === "admin") {
    return (
      <ResponsiveLayout
        user={user}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        nav={ADMIN_NAV}
        accent="indigo"
        subtitle="Admin Panel"
        logo={logo}
      >
        {renderAdminPage(activePage, user, setActivePage)}
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout
      user={user}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={handleLogout}
      nav={STUDENT_NAV}
      accent="blue"
      subtitle="Student Portal"
      logo={logo}
    >
      {renderStudentPage(activePage, user, setActivePage)}
    </ResponsiveLayout>
  );
}

function ResponsiveLayout({
  user,
  activePage,
  onNavigate,
  onLogout,
  nav,
  accent,
  subtitle,
  logo,
  children,
}) {
  const [open, setOpen] = useState(false);

  const accentMap = {
    blue: {
      panel: "bg-slate-900 border-slate-800",
      active: "bg-blue-600 text-white",
      idle: "text-slate-300 hover:bg-slate-800 hover:text-white",
      badge: "text-blue-300",
      userBg: "bg-blue-700",
      topBtn: "border-slate-700 bg-slate-900/80",
    },
    indigo: {
      panel: "bg-indigo-950 border-indigo-900",
      active: "bg-indigo-600 text-white",
      idle: "text-indigo-200 hover:bg-indigo-900 hover:text-white",
      badge: "text-indigo-300",
      userBg: "bg-indigo-600",
      topBtn: "border-indigo-800 bg-indigo-950/90",
    },
  };

  const ui = accentMap[accent];

  const closeAndNavigate = (id) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`rounded-xl border px-3 py-2 text-sm text-white ${ui.topBtn}`}
          >
            ☰ Menu
          </button>
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={logo} alt="UCash logo" className="h-8 w-auto object-contain" />
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.studentId || subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className={`hidden w-72 shrink-0 border-r ${ui.panel} lg:flex lg:flex-col`}>
          <SidebarContent
            user={user}
            activePage={activePage}
            onNavigate={onNavigate}
            onLogout={onLogout}
            nav={nav}
            subtitle={subtitle}
            logo={logo}
            ui={ui}
          />
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <aside className={`relative z-10 flex h-full w-[86%] max-w-xs flex-col border-r ${ui.panel}`}>
              <SidebarContent
                user={user}
                activePage={activePage}
                onNavigate={closeAndNavigate}
                onLogout={onLogout}
                nav={nav}
                subtitle={subtitle}
                logo={logo}
                ui={ui}
                mobile
                onClose={() => setOpen(false)}
              />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ user, activePage, onNavigate, onLogout, nav, subtitle, logo, ui, mobile, onClose }) {
  return (
    <>
      <div className="border-b border-inherit p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={logo} alt="UCash logo" className="h-11 w-auto shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">UCash</p>
              <p className={`truncate text-xs ${ui.badge}`}>{subtitle}</p>
            </div>
          </div>
          {mobile && (
            <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-inherit p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ui.userBg} text-sm font-bold text-white`}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.studentId || (user.role === "admin" ? "Administrator" : "Student")}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-4">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
              activePage === item.id ? ui.active : ui.idle
            }`}
          >
            <span>{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-red-400 transition hover:bg-red-900/20"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}
