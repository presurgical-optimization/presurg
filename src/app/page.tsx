"use client";

import { useState, useEffect } from "react"; //Add useEffect -E
import { useRouter } from "next/navigation";
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

/** ---------- Page ---------- */
export default function HomePage() {
  const router = useRouter(); 
  const [ssn, setSsn] = useState("");
  const [birthday, setBirthday] = useState(""); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);


  // patient 專用資料（含 guideline.items）
  const [mySurgeries, setMySurgeries] = useState<Surgery[] | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);


    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ssn: ssn.trim(), dob: birthday.trim() }),
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

      const user = parsed.data.user;
      setMe(user);

      // ★ 登入成功 → 依角色導向
      if (user.role === "patient") {
        router.push("/patient");
      } else if (user.role === "doctor") {
        router.push("/doctor"); // 之後你要給醫師的頁面
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }
 

  return (
    <main className="min-h-svh grid place-items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Welcome!</h1>

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
            min="1900-01-01"
            max={new Date().toISOString().split('T')[0]} // 今天日期
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || ssn.trim() === "" || birthday.trim() === ""}
              style={{ backgroundColor: "rgb(29, 76, 111)" }}
              className="text-white py-2 px-4 rounded disabled:opacity-60 hover:opacity-90 transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>

        {/* Status / error */}
        {error && <p className="text-red-600">❌ {error}</p>}

      </div>
    </main>
  );
}