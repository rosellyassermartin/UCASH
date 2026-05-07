import { useState } from "react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    systemName: "UCash",
    university: "University of Cebu",
    semesterLabel: "1st Semester 2024-2025",
    feeDeadline: "2025-05-30",
    gcashEnabled: true,
    mayaEnabled: true,
    bdoEnabled: true,
    metrobankEnabled: true,
    autoNotify: true,
    requireProof: true,
    maxTopup: 50000,
    minWithdrawal: 50,
    adminEmail: "admin@uc.edu.ph",
    supportPhone: "032-232-3000",
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggle = (key) => handleChange(key, !settings[key]);

  const Toggle = ({ k }) => (
    <button onClick={() => toggle(k)}
      className={`relative w-11 h-6 rounded-full transition-colors ${settings[k] ? "bg-indigo-600" : "bg-slate-700"}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[k] ? "left-6" : "left-1"}`} />
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">⚙️ System Settings</h1>
        <button onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
          💾 Save Changes
        </button>
      </div>

      {saved && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-3 flex items-center gap-2">
          <span>✅</span><p className="text-green-400 text-sm">Settings saved successfully!</p>
        </div>
      )}

      {/* General */}
      <Section title="🏫 General Settings">
        <Field label="System Name">
          <input value={settings.systemName} onChange={e => handleChange("systemName", e.target.value)}
            className="input-field" />
        </Field>
        <Field label="University">
          <input value={settings.university} onChange={e => handleChange("university", e.target.value)}
            className="input-field" />
        </Field>
        <Field label="Current Semester">
          <input value={settings.semesterLabel} onChange={e => handleChange("semesterLabel", e.target.value)}
            className="input-field" />
        </Field>
        <Field label="Fee Payment Deadline">
          <input type="date" value={settings.feeDeadline} onChange={e => handleChange("feeDeadline", e.target.value)}
            className="input-field" />
        </Field>
      </Section>

      {/* Payment methods */}
      <Section title="💳 Payment Methods">
        {[
          { key: "gcashEnabled", label: "GCash", icon: "💙" },
          { key: "mayaEnabled", label: "Maya", icon: "💚" },
          { key: "bdoEnabled", label: "BDO", icon: "🏦" },
          { key: "metrobankEnabled", label: "Metrobank", icon: "🏛️" },
        ].map(m => (
          <div key={m.key} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span>{m.icon}</span>
              <p className="text-white text-sm">{m.label}</p>
            </div>
            <Toggle k={m.key} />
          </div>
        ))}
      </Section>

      {/* Notifications */}
      <Section title="🔔 Notifications & Rules">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-white text-sm">Auto-notify students on status change</p>
            <p className="text-slate-500 text-xs">Send notification when transaction is verified/rejected</p>
          </div>
          <Toggle k="autoNotify" />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-white text-sm">Require payment proof for bank transfers</p>
            <p className="text-slate-500 text-xs">Students must upload screenshot for BDO/Metrobank</p>
          </div>
          <Toggle k="requireProof" />
        </div>
      </Section>

      {/* Limits */}
      <Section title="💰 Transaction Limits">
        <Field label="Max Top-up Amount (PHP)">
          <input type="number" value={settings.maxTopup} onChange={e => handleChange("maxTopup", Number(e.target.value))}
            className="input-field" />
        </Field>
        <Field label="Min Withdrawal Amount (PHP)">
          <input type="number" value={settings.minWithdrawal} onChange={e => handleChange("minWithdrawal", Number(e.target.value))}
            className="input-field" />
        </Field>
      </Section>

      {/* Contact */}
      <Section title="📞 Support Contact">
        <Field label="Admin Email">
          <input type="email" value={settings.adminEmail} onChange={e => handleChange("adminEmail", e.target.value)}
            className="input-field" />
        </Field>
        <Field label="Support Phone">
          <input value={settings.supportPhone} onChange={e => handleChange("supportPhone", e.target.value)}
            className="input-field" />
        </Field>
      </Section>

      <style>{`
        .input-field {
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 10px 16px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: #6366f1; }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-white font-semibold mb-4">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs mb-1.5">{label}</label>
      {children}
    </div>
  );
}
