import { useState } from "react";
import logo from "./assets/logo.png";
import { authAPI } from "./api";

export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirmPw, setShowRegConfirmPw] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });

  const handleLoginChange = (e) =>
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) =>
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await authAPI.login(loginForm.email, loginForm.password);
      localStorage.setItem("ucash_token", res.token);
      onLogin({ id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role, studentId: res.user.student_id });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (registerForm.password !== registerForm.confirmPassword) return setError("Passwords do not match.");
    if (registerForm.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const res = await authAPI.register({
        name: registerForm.name, email: registerForm.email,
        phone: registerForm.phone, password: registerForm.password,
      });
      localStorage.setItem("ucash_token", res.token);
      setSuccess("Registration successful.");
      onLogin({ id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role, studentId: res.user.student_id });
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  const EyeIcon = ({ show, toggle }) => (
    <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/30";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060812] font-sans text-white">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-600/5 blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left Panel */}
        <div className="flex flex-col justify-between px-8 py-10 sm:px-12 lg:px-16">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                <img src={logo} alt="UCash" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">UCash</span>              </div>
            </div>

            <div className="mt-16 max-w-lg">
              

              <h2 className="mt-8 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
                Your campus
                <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  finances,
                </span>
                simplified.
              </h2>

              <p className="mt-6 text-base leading-relaxed text-slate-400">
                Manage wallets, pay tuition, track fees, and verify transactions — all in one secure portal built for University of Cebu students and administrators.
              </p>

              {/* Feature chips */}
              <div className="mt-8 flex flex-wrap gap-2">
                {["Instant Payments", "E-Wallet", "Transaction History", "Fee Tracking"].map((f) => (
                  <span key={f} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">{f}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="mt-10 max-w-lg rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Demo Accounts</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Student</p>
                <p className="mt-1 text-xs text-slate-300">juan@uc.edu.ph</p>
                <p className="text-xs text-slate-500">student123</p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Admin</p>
                <p className="mt-1 text-xs text-slate-300">admin@uc.edu.ph</p>
                <p className="text-xs text-slate-500">admin123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            {/* Glass card */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
              {/* Tab switcher */}
              <div className="mb-8 grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1">
                {["login", "register"].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                      tab === t
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {/* Alerts */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <span className="mt-0.5 text-red-400">⚠</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <span className="mt-0.5">✓</span>
                  {success}
                </div>
              )}

              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Welcome back</h3>
                    <p className="mt-1.5 text-sm text-slate-500">Sign in to access your UCash account.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Email Address</label>
                    <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange}
                      placeholder="you@uc.edu.ph" className={inputClass} required />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Password</label>
                    <div className="relative">
                      <input type={showLoginPw ? "text" : "password"} name="password" value={loginForm.password}
                        onChange={handleLoginChange} placeholder="Enter your password"
                        className={`${inputClass} pr-12`} required />
                      <EyeIcon show={showLoginPw} toggle={() => setShowLoginPw(!showLoginPw)} />
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60">
                    <span className="relative z-10">{loading ? "Signing in…" : "Sign In"}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Create account</h3>
                    <p className="mt-1.5 text-sm text-slate-500">Register a new student account.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Full Name</label>
                    <input type="text" name="name" value={registerForm.name} onChange={handleRegisterChange}
                      placeholder="Juan dela Cruz" className={inputClass} required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-400">Email</label>
                      <input type="email" name="email" value={registerForm.email} onChange={handleRegisterChange}
                        placeholder="you@uc.edu.ph" className={inputClass} required />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-400">Phone</label>
                      <input type="text" name="phone" value={registerForm.phone} onChange={handleRegisterChange}
                        placeholder="09XXXXXXXXX" className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-400">Password</label>
                      <div className="relative">
                        <input type={showRegPw ? "text" : "password"} name="password" value={registerForm.password}
                          onChange={handleRegisterChange} placeholder="Min. 6 chars" className={`${inputClass} pr-12`} required />
                        <EyeIcon show={showRegPw} toggle={() => setShowRegPw(!showRegPw)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-400">Confirm</label>
                      <div className="relative">
                        <input type={showRegConfirmPw ? "text" : "password"} name="confirmPassword" value={registerForm.confirmPassword}
                          onChange={handleRegisterChange} placeholder="Repeat" className={`${inputClass} pr-12`} required />
                        <EyeIcon show={showRegConfirmPw} toggle={() => setShowRegConfirmPw(!showRegConfirmPw)} />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60">
                    <span className="relative z-10">{loading ? "Creating account…" : "Create Account"}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
