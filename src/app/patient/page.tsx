// app/api/patients/surgeries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";

// 依你的 instructions 結構調整這個 helper
function extractItemsFromInstructions(instructions: any) {
  // 假設 instructions = { items: [...] }
  const arr = Array.isArray(instructions?.items) ? instructions.items : [];
  return arr.map((it: any, idx: number) => ({
    // 若 JSON 裡沒有 id，就造一個穩定 id（例如 idx 或 (versionId*1e6 + idx)）
    id: typeof it?.id === "number" ? it.id : idx,
    title: String(it?.title ?? "Untitled"),
    description: it?.description ?? null,
    itemKey: it?.itemKey ?? null,
    type: it?.type ?? null,
    window: it?.window ?? null,
    appliesIf: it?.appliesIf ?? null,
  }));
}

export async function GET() {
  const s = await readSession();
  if (!s || s.role !== "patient") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // ✅ 只選需要的欄位，包含 JSONB：instructions
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
          status: true,
          publishedAt: true,
          instructions: true, // ← 關鍵：把 JSON 撈回來
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // ✅ 在 JS 端把 JSON 組成前端想要的 guideline.items
  const surgeries = rows.map((r) => {
    const v = r.currentPublishedVersion;
    const items = v ? extractItemsFromInstructions(v.instructions) : [];

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
            items, // ← 這裡就是從 instructions 映出來的 items
          }
        : null,
      // 如果前端還需要版本資訊，可以加一段 meta：
      // currentPublishedVersion: v
      //   ? { id: v.id, versionNo: v.versionNo, status: v.status, publishedAt: v.publishedAt }
      //   : null,
    };
  });

  return NextResponse.json({ surgeries });
}
