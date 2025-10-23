"use client";

import { useState } from "react";
import { z } from "zod";

/** ---------- Schemas & Types ---------- */
const PatientSchema = z.object({
  id: z.string(),
  mrn: z.string(),
  name: z.string(),
  dob: z.string(),        // ISO string from API
  createdAt: z.string(),  // ISO string from API
});
type Patient = z.infer<typeof PatientSchema>;

const ApiErrorSchema = z.object({ error: z.string() });
type ApiError = z.infer<typeof ApiErrorSchema>;

/** ---------- Page ---------- */
export default function HomePage() {
  const [ssn, setSsn] = useState<string>("");
  const [birthday, setBirthday] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 以 SSN 當 MRN 使用；生日可選
      const qs = birthday ? `?dob=${encodeURIComponent(birthday)}` : "";
      const res = await fetch(`/api/patients/${encodeURIComponent(ssn)}${qs}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        const maybeErr = ApiErrorSchema.safeParse(data);
        setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
        return;
      }

      const parsed = PatientSchema.safeParse(data);
      if (!parsed.success) {
        setError("Unexpected response shape from server");
        // 想看詳細錯誤可印：
        console.error();
        return;
      }

      setResult(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh grid place-items-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Patient Search</h1>

        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <input
            className="border p-2 rounded"
            placeholder="SSN (used as MRN)"
            value={ssn}
            onChange={(e) => setSsn(e.target.value)}
            aria-label="SSN"
          />
          <input
            type="date"
            className="border p-2 rounded"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            aria-label="Birthday"
          />
          <button
            type="submit"
            disabled={loading || ssn.trim() === ""}
            className="bg-blue-600 text-white py-2 rounded disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="text-red-600">❌ {error}</p>}

        {result && (
          <div className="border rounded p-4 space-y-1">
            <div>
              <b>MRN:</b> {result.mrn}
            </div>
            <div>
              <b>Name:</b> {result.name}
            </div>
            <div>
              <b>DOB:</b> {new Date(result.dob).toLocaleDateString()}
            </div>
            <div>
              <b>Created:</b> {new Date(result.createdAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
