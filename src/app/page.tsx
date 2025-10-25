"use client";

import { useState } from "react";
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

// const PatientSummarySchema = z.object({
//   id: z.number(),
//   name: z.string(),
//   dob: z.string(), // ISO date
// });
// type PatientSummary = z.infer<typeof PatientSummarySchema>;

// // ★ GuidelineItem schema：顯示在病患的手術下面
// const GuidelineItemSchema = z.object({
//   id: z.number(),
//   title: z.string(),
//   description: z.string().nullable().optional(),
//   itemKey: z.string().nullable().optional(),
//   type: z.string().nullable().optional(),
//   window: z.any().nullable().optional(),    // 後端是 JSONB，這裡用 any 直接顯示
//   appliesIf: z.any().nullable().optional(), // 同上
// });
// type GuidelineItem = z.infer<typeof GuidelineItemSchema>;

// // ★ Surgery schema：guideline 內含 items（不含 version）
// const SurgerySchema = z.object({
//   id: z.number(),
//   scheduledAt: z.string().nullable().optional(),
//   location: z.string().nullable().optional(),
//   status: z.string(),
//   doctor: z.object({ id: z.number(), name: z.string() }).optional(),
//   guideline: z
//     .object({
//       id: z.number(),
//       name: z.string(),
//       items: z.array(GuidelineItemSchema),
//     })
//     .nullable()
//     .optional(),
// });
// type Surgery = z.infer<typeof SurgerySchema>;

/** ---------- Page ---------- */
export default function HomePage() {
  const router = useRouter(); // 實例化 router
  const [ssn, setSsn] = useState("");
  const [birthday, setBirthday] = useState(""); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  // const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // doctor 專用資料
  // const [patients, setPatients] = useState<PatientSummary[] | null>(null);

  // patient 專用資料（含 guideline.items）
  // const [mySurgeries, setMySurgeries] = useState<Surgery[] | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // setPatients(null);
    // setMySurgeries(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ssn: ssn.trim(),
          dob: birthday.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const maybeErr = ApiErrorSchema.safeParse(data);
        setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
        // setMe(null);
        return;
      }

      const parsed = LoginResponseSchema.safeParse(data);
      if (!parsed.success) {
        setError("Unexpected response from server");
        // setMe(null);
        return;
      }

      // ** 關鍵變更：登入成功後跳轉到 /patient 頁面 **
      // /patient 對應到 /app/patient/page.tsx
      router.push("/patient");
      // setMe(parsed.data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      // setMe(null);
    } finally {
      setLoading(false);
    }
  }

  // async function logout() {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  //     setMe(null);
  //     setPatients(null);
  //     setMySurgeries(null);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Network error");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // // doctor: 列出所有病患
  // async function loadPatients() {
  //   setLoading(true);
  //   setError(null);
  //   setPatients(null);
  //   try {
  //     const res = await fetch("/api/patients", { credentials: "include", cache: "no-store" });
      // const data = await res.json();
      // if (!res.ok) {
      //   const maybeErr = ApiErrorSchema.safeParse(data);
      //   setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
      //   return;
      // }
      // const arr = z.object({ patients: z.array(PatientSummarySchema) }).safeParse(data);
      // if (!arr.success) {
      //   setError("Unexpected patients response");
      //   return;
  //     }
  //     setPatients(arr.data.patients);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Network error");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // patient: 讀取自己的手術（含 guideline.items）
  // async function loadMySurgeries() {
  //   setLoading(true);
  //   setError(null);
  //   setMySurgeries(null);
  //   try {
  //     // ★ 這裡改成 /api/me/surgeries（病患自己的手術）
  //     const res = await fetch("/api/patients/surgeries", { credentials: "include", cache: "no-store" });
  //     const data = await res.json();
  //     if (!res.ok) {
      //   const maybeErr = ApiErrorSchema.safeParse(data);
      //   setError(maybeErr.success ? maybeErr.data.error : `HTTP ${res.status}`);
      //   return;
      // }
      // // 後端需回傳 guideline: { id, name, items: [...] }
      // const arr = z.object({ surgeries: z.array(SurgerySchema) }).safeParse(data);
      // if (!arr.success) {
      //   setError("Unexpected surgeries response");
  //       return;
  //     }
  //     setMySurgeries(arr.data.surgeries);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Network error");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

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
            min="1900-01-01"
            max={new Date().toISOString().split('T')[0]} // 今天日期
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
              // onClick={logout}
              // disabled={loading || !me}
              className="bg-neutral-700 text-white py-2 px-4 rounded disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </form>

        {/* Status / error */}
        {error && <p className="text-red-600">❌ {error}</p>}

        {/* Current user */}
        {/* {me ? (
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
        )} */}

        {/* Role-specific actions */}
        {/* {me?.role === "doctor" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Doctor Tools</h2>
            <button
              onClick={loadPatients}
              disabled={loading}
              className="bg-emerald-600 text-white py-2 px-4 rounded disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load All Patients"}
            </button> */}

            {/* {patients && (
              <div className="border rounded p-4 space-y-2">
                <h3 className="font-medium">Patients ({patients.length})</h3>
                <ul className="list-disc pl-5"> */}
                  {/* {patients.map((p) => (
                    <li key={p.id}>
                      {p.name} — DOB: {new Date(p.dob).toLocaleDateString()} (#{p.id})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )} */}

        {/* {me?.role === "patient" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">My Surgeries</h2>
            <button
              onClick={loadMySurgeries}
              disabled={loading}
              className="bg-emerald-600 text-white py-2 px-4 rounded disabled:opacity-60" */}
            {/* > */}
              {/* {loading ? "Loading..." : "Load My Surgeries"}
            </button>

            {mySurgeries && (
              <div className="border rounded p-4 space-y-4">
                <h3 className="font-medium">Surgeries ({mySurgeries.length})</h3>
                <ul className="space-y-4"> */}
                  {/* {mySurgeries.map((s) => (
                    <li key={s.id} className="space-y-2">
                      <div className="font-medium">
                        {s.status}
                        {s.scheduledAt ? ` — ${new Date(s.scheduledAt).toLocaleString()}` : ""}
                        {s.location ? ` — ${s.location}` : ""}
                        {s.doctor ? ` — Dr. ${s.doctor.name}` : ""}
                      </div> */}

                      {/* Guideline + Items */}
                      {/* {s.guideline ? (
                        <div className="rounded border p-3">
                          <div className="font-semibold">Guideline: {s.guideline.name}</div>
                          {s.guideline.items.length > 0 ? (
                            <ul className="mt-2 space-y-2">
                              {s.guideline.items.map((gi) => (
                                <li key={gi.id} className="border rounded p-2"> */}
                                  {/* <div className="font-medium">
                                    {gi.title}
                                    {gi.itemKey ? (
                                      <span className="ml-2 text-xs text-neutral-500">({gi.itemKey})</span>
                                    ) : null}
                                  </div>
                                  {gi.description ? ( */}
                          {/* //           <div className="text-sm text-neutral-700">{gi.description}</div>
                          //         ) : null}
                          //         <div className="text-xs text-neutral-500">
                          //           {gi.type ? `type: ${gi.type}` : ""}
                          //         </div>
                          //       </li>
                          //     ))}
                          //   </ul> */}
                          {/* // ) : ( */}
                      {/* //       <div className="text-sm text-neutral-600 mt-1">No items in this guideline.</div> */}
                      {/* //     )} */}
                      {/* //   </div> */}
                      {/* // ) : ( */}
                      {/* //   <div className="text-sm text-neutral-600">No guideline attached.</div> */}
                      {/* // )} */}
                    {/* </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )} */}
      </div>
    </main>
  );
}
