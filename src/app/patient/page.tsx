// app/patient/page.tsx
"use client";
import DrugRecognitionLauncher from "./DrugRecognitionLauncher";
import { useEffect, useState } from "react";
import { z } from "zod";

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
  guideline: z.object({
    id: z.number(),
    name: z.string(),
    items: z.array(GuidelineItemSchema),
  }).nullable().optional(),
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

export default function PatientPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [me, setMe] = useState<Me | null>(null);

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
          let msg = `HTTP ${meRes.status}`;
          try {
            const j = await meRes.json();
            if (j?.error) msg = j.error;
          } catch {}
          throw new Error(msg);
        }
        const meData = await meRes.json();
        const meParsed = MeSchema.safeParse(meData);
        if (!meParsed.success) throw new Error("Unexpected me response");
        if (mounted) setMe(meParsed.data.user);

        // 2) 取得病患手術
        const res = await fetch("/api/patients/surgeries", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch {}
          throw new Error(msg);
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
  }, []);

  return (
    <main className="min-h-svh grid place-items-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">My Surgeries</h1>

        {loading && <div className="text-sm text-neutral-600">Loading…</div>}
        {error && <div className="text-sm text-red-600">❌ {error}</div>}

        {!loading && !error && (
          <div className="border rounded p-4 space-y-4">
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
                      {s.doctor ? ` — Dr. ${s.doctor.name}` : ""}
                    </div>

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
                                    <span className="ml-2 text-xs text-neutral-500">({gi.itemKey})</span>
                                  ) : null}
                                </div>
                                {gi.description ? (
                                  <div className="text-sm text-neutral-700">{gi.description}</div>
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
                      <div className="text-sm text-neutral-600">No guideline attached.</div>
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
  );
}
