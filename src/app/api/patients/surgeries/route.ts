// app/api/patients/surgeries/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 你給的 instructions 是一個 JSON 陣列：
// [
//   {
//     "type":"medication",
//     "title":"Acetaminophen",
//     "dosage":"325-650 mg PR q4-6hr PRN ...",
//     "window":{"from":"D-4","until":"postop-stable"},
//     "enabled":true,
//     "itemKey":"med-sglt2i-hold",
//     "max_dose":"Not to exceed 4 g/day (Adults)",
//     "orderIndex":10,
//     "description":"Non-opioid analgesic ...",
//     "indications":[...],
//     "dosage_adjustment":{...},
//     "administration_note":"..."
//   }
// ]
//
// 前端目前的 GuidelineItemSchema 只有：
// { id, title, description, itemKey, type, window, appliesIf }
// 所以這裡先最小映射；其它欄位（如 dosage/max_dose/indications）先略過，
// 之後若前端要顯示，再擴 schema。

export async function GET() {
  try {
    const s = await requireRole(["patient"]);

    const rows = await prisma.surgery.findMany({
      where: { patientId: s.userId },
      select: {
        id: true,
        scheduledAt: true,
        location: true,
        status: true,
        doctor: { select: { id: true, name: true } },
        currentPublishedVersion: {
          select: {
            id: true,
            versionNo: true,
            instructions: true, // JSONB（期待為陣列）
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const surgeries = rows.map((r) => {
      const v = r.currentPublishedVersion;
      // 將 instructions 陣列 → guideline.items
      const items = Array.isArray(v?.instructions)
        ? v!.instructions.map((it: any, idx: number) => ({
            // 若沒有穩定 id，就用 (versionId * 1e6 + idx) 造一個
            id: Number(it?.id ?? (v!.id * 1_000_000 + idx)),
            title: String(it?.title ?? "Untitled"),
            description: it?.description ?? null,
            itemKey: it?.itemKey ?? null,
            type: it?.type ?? null,
            window: it?.window ?? null,
            appliesIf: it?.appliesIf ?? null,
          }))
        : [];

      return {
        id: r.id,
        scheduledAt: r.scheduledAt,
        location: r.location,
        status: r.status,
        doctor: r.doctor ?? undefined,
        guideline: v
          ? {
              id: v.id,
              name: `Current Plan v${v.versionNo ?? "?"}`,
              items,
            }
          : null,
      };
    });

    return NextResponse.json({ surgeries });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
