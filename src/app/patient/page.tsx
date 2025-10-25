// app/patient/page.tsx
"use client";

import DrugRecognitionLauncher from "./DrugRecognitionLauncher";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { User, LogOut } from "lucide-react";

/* ---------- Schemas ---------- */
const GuidelineItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  itemKey: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  window: z.any().nullable().optional(),
  appliesIf: z.any().nullable().optional(),
});

const SurgerySchema = z.object({
  id: z.number(),
  scheduledAt: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.string(),
  doctor: z.object({ id: z.number(), name: z.string() }).optional(),
  guideline: z
    .object({
      id: z.number(),
      name: z.string(),
      items: z.array(GuidelineItemSchema),
    })
    .nullable()
    .optional(),
});
const ResponseSchema = z.object({ surgeries: z.array(SurgerySchema) });
type Surgery = z.infer<typeof SurgerySchema>;

const MeSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    role: z.enum(["doctor", "patient"]),
  }),
});
type Me = z.infer<typeof MeSchema>["user"];

/* ---------- Page ---------- */
export default function PatientPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [me, setMe] = useState<Me | null>(null);

  // Notification
  const [notifications, setNotifications] = useState<{ message: string; scheduledAt?: string | null; doctor?: string | null }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) 取得目前登入者
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!meRes.ok) {
          if (meRes.status === 401) {
            router.push("/"); // 未登入 → 回首頁
            return;
          }
          const j = await meRes.json().catch(() => ({}));
          throw new Error(j?.error ?? `HTTP ${meRes.status}`);
        }
        const meData = await meRes.json();
        const meParsed = MeSchema.safeParse(meData);
        if (!meParsed.success) throw new Error("Unexpected me response");

        // 僅允許病患
        if (meParsed.data.user.role !== "patient") {
          router.push("/"); // 非病患 → 回首頁
          return;
        }
        if (mounted) setMe(meParsed.data.user);

        // 2) 取得病患手術
        const res = await fetch("/api/patients/surgeries", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const parsed = ResponseSchema.safeParse(data);
        if (!parsed.success) throw new Error("Unexpected surgeries response");
        if (mounted) setSurgeries(parsed.data.surgeries);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

    // Patient: notification
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notificationst", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        } else {
          console.warn("⚠️ Unexpected notifications format:", data);
        }
      } catch (err) {
        console.error("❌ Load notifications error:", err);
      }
    }

    if (me?.role === "patient") {
      loadNotifications();
    }
  }, [me]);

  /* ---------- Header Controls ---------- */
  const toggleProfile = () => setIsProfileOpen((v) => !v);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/");
  };

  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <header
        className="w-full p-4 flex items-center shadow-lg relative"
        style={{ backgroundColor: "#1D4C6F" }}
      >
        {/* 左：Logo */}
        <div className="flex-none -mt-[30px] -ml-[5px]">
          <h1 className="text-xl font-serif italic font-bold tracking-widest opacity-35 text-white">
            Hackathon
          </h1>
        </div>

        {/* 中：Patient Name */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-3xl sm:text-4xl font-serif italic font-bold text-white tracking-widest">
            {me?.name ?? "Patient"}
          </p>
        </div>

        {/* 右：User Menu */}
        <div className="relative ml-auto">
          <button
            onClick={toggleProfile}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Toggle Patient Profile"
          >
            <User className="h-8 w-8 cursor-pointer text-white" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl py-3 z-10 border border-gray-200">
              <div className="px-4 pb-2 border-b">
                <h3 className="text-lg font-bold text-gray-900">{me?.name ?? "Patient"}</h3>
                {me && <p className="text-xs text-gray-500">ID: {me.id}</p>}
              </div>
              <div className="pt-2 border-t text-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Error 提示（若有） */}
      {error && (
        <div className="mx-auto mt-4 text-sm text-red-600">❌ {error}</div>
      )}

      {/* Main */}
      {/* <main className="grid place-items-center p-6"> */}
      <main className=" p-6 mx-auto">
        <div className="w-full max-w-5xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold text-center mb-6">My Surgeries</h1>
        </div>
        <div className="w-full max-w-2xl space-y-4">

          {/* 1. 左側：Notification/Sidebar (定位在第一欄) */}
          <div className="flex gap-6 justify-start items-start">
            <div className="w-200 bg-white p-4 rounded-xl shadow border border-gray-200">
              <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800 text-center">
                Notifications
              </h2>
              {/* 這裡可以放通知列表的內容 */}
              <div className="space-y-3">
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  {notifications.length === 0 ? (
                    <div className="text-sm text-neutral-500">No notification at this time.</div>
                  ) : (
                    <ul className="space-y-2">
                      {notifications
                        .sort((a, b) => a.ts - b.ts) // 按時間由近到遠排序
                        .map((n) => (
                          <li
                            key={`${n.surgeryId}-${n.ts}-${n.message}`}
                            className={`border-l-4 p-3 rounded shadow-sm transition ${
                              n.active
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-neutral-300 bg-neutral-50"
                            }`}
                          >
                            <div className="text-xs text-neutral-500 mb-1">
                              {new Date(n.ts).toLocaleString()}{" "}
                              {!n.active && <span className="opacity-70">(Not yet time)</span>}
                            </div>

                            <div className="text-sm font-medium">{n.message}</div>

                            {n.description && (
                              <div className="text-sm text-neutral-700">{n.description}</div>
                            )}

                            {n.type && (
                              <div className="text-xs text-neutral-400 mt-1">
                                type: {n.type}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
          </div>
          </div>
          

        
          {loading && 
            <div className="text-sm text-neutral-600 mx-auto text-center">Loading…</div>}

          {!loading && !error && (
            <div className="border rounded p-4 space-y-4 mx-auto max-w-2xl text-center">
              <h3 className="font-medium">Surgeries ({surgeries.length})</h3>

              {surgeries.length === 0 ? (
                <div className="text-sm text-neutral-600">No surgeries yet.</div>
              ) : (
                <ul className="space-y-4">
                  {surgeries.map((s) => (
                    <li key={s.id} className="space-y-2">
                      <div className="font-medium">
                        {s.status}
                        {s.scheduledAt ? ` — ${new Date(s.scheduledAt).toLocaleString()}` : ""}
                        {s.location ? ` — ${s.location}` : ""}
                        {s.doctor ? ` — ${s.doctor.name}` : ""}
                      </div>

                      {/* Guideline + Items */}
                      {s.guideline ? (
                        <div className="rounded border p-3">
                          <div className="font-semibold">
                            Guideline: {s.guideline.name}{" "}
                            <span className="text-xs text-neutral-500">#{s.guideline.id}</span>
                          </div>

                          {s.guideline.items.length > 0 ? (
                            <ul className="mt-2 space-y-2">
                              {s.guideline.items.map((gi) => (
                                <li key={gi.id} className="border rounded p-2">
                                  <div className="font-medium">
                                    {gi.title}
                                    {gi.itemKey ? (
                                      <span className="ml-2 text-xs text-neutral-500">
                                        ({gi.itemKey})
                                      </span>
                                    ) : null}
                                  </div>
                                  {gi.description ? (
                                    <div className="text-sm text-neutral-700">
                                      {gi.description}
                                    </div>
                                  ) : null}
                                  <div className="text-xs text-neutral-500">
                                    {gi.type ? `type: ${gi.type}` : ""}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-neutral-600 mt-1">
                              No items in this guideline.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-600">
                          No guideline attached.
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {/* 等 me 載好再掛子元件，避免 undefined */}
        {me && <DrugRecognitionLauncher userId={me.id} />}
      </main>
    </div>
);

}