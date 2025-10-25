"use client";

import { useState } from "react";
import { z } from "zod";

/** ---------- Schemas & Types ---------- */
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.enum(["doctor", "patient"]),
});
type User = z.infer<typeof UserSchema>;

const LoginResponseSchema = z.object({ user: UserSchema });
type LoginResponse = z.infer<typeof LoginResponseSchema>;

const ApiErrorSchema = z.object({ error: z.string() });
type ApiError = z.infer<typeof ApiErrorSchema>;

const PatientSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  dob: z.string(), // ISO date
});
type PatientSummary = z.infer<typeof PatientSummarySchema>;

const SurgerySchema = z.object({
  id: z.number(),
  scheduledAt: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.string(),
  doctor: z.object({ id: z.number(), name: z.string() }).optional(),
  guideline: z.object({ id: z.number(), name: z.string() }).nullable().optional(),
});
type Surgery = z.infer<typeof SurgerySchema>;

/** ---------- Page ---------- */
export default function HomePage() {
  const [ssn, setSsn] = useState("");
  const [birthday, setBirthday] = useState(""); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // doctor 專用資料
  const [patients, setPatients] = useState<PatientSummary[] | null>(null);

  // patient 專用資料
  const [mySurgeries, setMySurgeries] = useState<Surgery[] | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPatients(null);
    setMySurgeries(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 後端是 cookie session，client fetch 同網域會自帶 cookie；保險起見附上：
        credentials: "include",
        body: JSON.stringify({
          ssn: ssn.trim(),
          dob: birthday.trim(), // 建議 YYYY-MM-DD；若你後端有做 19800312 轉換也可
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const maybeErr = ApiErrorSchema.safeParse(data);
        setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
        setMe(null);
        return;
      }

      const parsed = LoginResponseSchema.safeParse(data);
      if (!parsed.success) {
        setError("Unexpected response from server");
        setMe(null);
        return;
      }

      setMe(parsed.data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setMe(null);
      setPatients(null);
      setMySurgeries(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  // doctor: 列出所有病患
  async function loadPatients() {
    setLoading(true);
    setError(null);
    setPatients(null);
    try {
      const res = await fetch("/api/patients", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        const maybeErr = ApiErrorSchema.safeParse(data);
        setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
        return;
      }
      // 後端回傳 { patients: [...] }
      const arr = z.object({ patients: z.array(PatientSummarySchema) }).safeParse(data);
      if (!arr.success) {
        setError("Unexpected patients response");
        return;
      }
      setPatients(arr.data.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  // patient: 讀取自己的手術
  async function loadMySurgeries() {
    setLoading(true);
    setError(null);
    setMySurgeries(null);
    try {
      const res = await fetch("/api/me/surgeries", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        const maybeErr = ApiErrorSchema.safeParse(data);
        setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
        return;
      }
      // 後端回傳 { surgeries: [...] }
      const arr = z.object({ surgeries: z.array(SurgerySchema) }).safeParse(data);
      if (!arr.success) {
        setError("Unexpected surgeries response");
        return;
      }
      setMySurgeries(arr.data.surgeries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh grid place-items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Auth + Role Demo</h1>

        {/* Login form */}
        <form onSubmit={login} className="flex flex-col gap-3">
          <input
            className="border p-2 rounded"
            placeholder="SSN"
            value={ssn}
            onChange={(e) => setSsn(e.target.value)}
            aria-label="SSN"
            autoComplete="off"
          />
          <input
            type="date"
            className="border p-2 rounded"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            aria-label="Birthday"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || ssn.trim() === "" || birthday.trim() === ""}
              className="bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={loading || !me}
              className="bg-neutral-700 text-white py-2 px-4 rounded disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </form>

        {/* Status / error */}
        {error && <p className="text-red-600">❌ {error}</p>}

        {/* Current user */}
        {me ? (
          <div className="border rounded p-4 space-y-1">
            <div>
              <b>User:</b> {me.name} <span className="text-xs opacity-70">#{me.id}</span>
            </div>
            <div>
              <b>Role:</b> {me.role}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Not logged in</p>
        )}

        {/* Role-specific actions */}
        {me?.role === "doctor" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Doctor Tools</h2>
            <button
              onClick={loadPatients}
              disabled={loading}
              className="bg-emerald-600 text-white py-2 px-4 rounded disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load All Patients"}
            </button>

            {patients && (
              <div className="border rounded p-4 space-y-2">
                <h3 className="font-medium">Patients ({patients.length})</h3>
                <ul className="list-disc pl-5">
                  {patients.map((p) => (
                    <li key={p.id}>
                      {p.name} — DOB: {new Date(p.dob).toLocaleDateString()} (#{p.id})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {me?.role === "patient" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">My Surgeries</h2>
            <button
              onClick={loadMySurgeries}
              disabled={loading}
              className="bg-emerald-600 text-white py-2 px-4 rounded disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load My Surgeries"}
            </button>

            {mySurgeries && (
              <div className="border rounded p-4 space-y-2">
                <h3 className="font-medium">Surgeries ({mySurgeries.length})</h3>
                <ul className="list-disc pl-5">
                  {mySurgeries.map((s) => (
                    <li key={s.id}>
                      {s.status}
                      {s.scheduledAt ? ` — ${new Date(s.scheduledAt).toLocaleString()}` : ""}
                      {s.location ? ` — ${s.location}` : ""}
                      {s.doctor ? ` — Dr. ${s.doctor.name}` : ""}
                      {s.guideline ? ` — Guideline: ${s.guideline.name}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
