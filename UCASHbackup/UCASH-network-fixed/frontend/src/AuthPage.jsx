import { useState } from "react";
import logo from "./assets/logo.png";
import { authAPI } from "./api";

export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await authAPI.login(loginForm.email, loginForm.password);
      localStorage.setItem("ucash_token", res.token);

      onLogin({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        studentId: res.user.student_id,
      });
    } catch (err) {
      setError(err.message || "Login failed.");
      console.error("LOGIN ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (registerForm.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.register({
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
      });

      localStorage.setItem("ucash_token", res.token);

      setSuccess("Registration successful.");

      onLogin({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        studentId: res.user.student_id,
      });
    } catch (err) {
      setError(err.message || "Registration failed.");
      console.error("REGISTER ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-14">
          <div>
            <div className="flex items-center gap-4">
              <img src={logo} alt="UCash Logo" className="h-12 w-auto sm:h-14" />
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl">UCash</h1>
                <p className="text-sm text-slate-300 sm:text-base">
                  University Payments
                </p>
              </div>
            </div>

            <div className="mt-10 max-w-xl">
              <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-medium text-blue-300">
                User Authentication &amp; Data Management
              </span>

              <h2 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                Secure university payment access for students and administrators.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
                Sign in to manage wallets, payments, notifications, linked
                accounts, student records, and transaction verification in one
                responsive portal.
              </p>
            </div>
          </div>

          <div className="mt-10 max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-base font-semibold">Demo accounts after backend seed</p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>
                Student: <span className="font-semibold text-white">juan@uc.edu.ph</span> /{" "}
                <span className="font-semibold text-white">student123</span>
              </p>
              <p>
                Admin: <span className="font-semibold text-white">admin@uc.edu.ph</span> /{" "}
                <span className="font-semibold text-white">admin123</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-8 sm:px-10 lg:px-14">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl sm:p-8">
            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-900 p-1">
              <button
                onClick={() => setTab("login")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  tab === "login"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setTab("register")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  tab === "register"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h3 className="text-3xl font-bold">Welcome back</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Login to continue using UCash.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    placeholder="you@uc.edu.ph"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <h3 className="text-3xl font-bold">Create account</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Register a student account to start using the system.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={registerForm.name}
                    onChange={handleRegisterChange}
                    placeholder="Juan dela Cruz"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      placeholder="you@uc.edu.ph"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={registerForm.phone}
                      onChange={handleRegisterChange}
                      placeholder="09XXXXXXXXX"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={registerForm.confirmPassword}
                      onChange={handleRegisterChange}
                      placeholder="Repeat password"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}