// app/api/patients/surgeries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";

// 依你的實際 instructions 結構調整這個 helper：
// 假設 SurgeryPlanVersion.instructions 是 JSONB，形如：
// { items: [{ id, title, description, itemKey, type, window, appliesIf }, ...] }
function extractItemsFromInstructions(instructions: any) {
  if (!instructions) return [];
  // 常見設計：instructions.items 是完整清單；若你只想回「藥物指示」，可在此 filter
  const items = Array.isArray(instructions?.items) ? instructions.items : [];
  return items.map((it: any) => ({
    id: Number(it?.id ?? 0),                   // 若後端沒 id，可用遞增或 versionId*1e6+idx
    title: String(it?.title ?? "Untitled"),
    description: it?.description ?? null,
    itemKey: it?.itemKey ?? null,
    type: it?.type ?? null,
    window: it?.window ?? null,
    appliesIf: it?.appliesIf ?? null,
  }));
}

export async function GET() {
  // 1) 驗證 session
  const s = await readSession();
  if (!s || s.role !== "patient") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 2) 先查該病患的手術，取出 versionId 與需要的顯示欄位
  const surgeries = await prisma.surgery.findMany({
    where: { patientId: s.userId },
    select: {
      id: true,
      scheduledAt: true,
      location: true,
      status: true,
      doctor: { select: { id: true, name: true } },
      currentPublishedVersionId: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (surgeries.length === 0) {
    return NextResponse.json({ surgeries: [] });
  }

  // 3) 收集 versionIds → 查版本（取 versionNo 與 instructions）
  const versionIds = surgeries
    .map((r) => r.currentPublishedVersionId)
    .filter((id): id is number => id !== null);

  const versions = versionIds.length
    ? await prisma.surgeryPlanVersion.findMany({
        where: { id: { in: versionIds } },
        select: {
          id: true,
          versionNo: true,        // 方便組一個名稱
          instructions: true,     // JSONB
          status: true,           // 如果你要顯示也可帶
          publishedAt: true,      // 如果你要顯示也可帶
        },
      })
    : [];

  // 4) 做一個快取 map，方便 O(1) 取版本
  const versionMap = new Map<number, (typeof versions)[number]>();
  for (const v of versions) versionMap.set(v.id, v);

  // 5) 組裝回傳資料（把 version → guideline）
  const out = surgeries.map((surg) => {
    const v = surg.currentPublishedVersionId
      ? versionMap.get(surg.currentPublishedVersionId)
      : undefined;

    const items = v ? extractItemsFromInstructions(v.instructions) : [];

    return {
      id: surg.id,
      scheduledAt: surg.scheduledAt,
      location: surg.location,
      status: surg.status,
      doctor: surg.doctor ?? undefined,
      // 讓前端沿用你既有的 schema：guideline: { id, name, items }
      guideline: v
        ? {
            id: v.id,
            name: `Current Plan v${v.versionNo ?? "?"}`, // 想顯示成別的名稱可自訂
            items,
          }
        : null,
      // 如果你還想把版本資訊另行提供，也可以加一段 meta：
      // currentPublishedVersion: v
      //   ? { id: v.id, versionNo: v.versionNo, status: v.status, publishedAt: v.publishedAt }
      //   : null,
    };
  });

  return NextResponse.json({ surgeries: out });
}
