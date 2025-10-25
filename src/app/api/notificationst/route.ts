import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/* ----------------------------------------------------
   🧮 Helper：計算時間差（小時）
---------------------------------------------------- */
function hoursBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

/* ----------------------------------------------------
   🧠 Helper：判斷 window 是否生效
---------------------------------------------------- */
function parseWindow(window: any, surgeryDate: Date): boolean {
  if (!window) return false;
  const now = new Date();
  const diffHours = (a: Date, b: Date) =>
    (a.getTime() - b.getTime()) / (1000 * 60 * 60);
  const hoursToSurgery = diffHours(surgeryDate, now);
  const hoursFromSurgery = -hoursToSurgery;

  const w = typeof window === "string" ? JSON.parse(window) : window;

  function exprToHour(expr: string): number | null {
    if (!expr) return null;
    if (/^D[-+]\d+$/.test(expr)) return parseInt(expr.replace("D", "")) * 24;
    if (/^DOS[-+]\d+h$/.test(expr)) return parseInt(expr.match(/[-+]\d+/)?.[0] ?? "0");
    if (expr === "DOS-morning") return 0;
    if (expr === "postop-stable") return 24;
    return null;
  }

  function isActive(expr: any): boolean {
    if (expr.when) {
      const h = exprToHour(expr.when);
      if (h === null) return false;
      if (expr.when === "DOS-morning") return hoursToSurgery <= 3 && hoursToSurgery >= 0;
      if (h > 0) return hoursToSurgery <= h && hoursToSurgery > h - 2;
      if (h < 0) return hoursToSurgery <= Math.abs(h) && hoursToSurgery > Math.abs(h) - 24;
    }

    const fromH = expr.from ? exprToHour(expr.from) : null;
    const untilH = expr.until ? exprToHour(expr.until) : null;

    let fromCond = true;
    let untilCond = true;

    if (fromH !== null) fromCond = hoursToSurgery <= Math.abs(fromH);
    if (untilH !== null) {
      if (expr.until === "postop-stable") untilCond = hoursFromSurgery < 24;
      else untilCond = hoursToSurgery >= Math.abs(untilH);
    }

    return fromCond && untilCond;
  }

  try {
    return isActive(w);
  } catch (e) {
    console.warn("⚠️ parseWindow error:", e, window);
    return false;
  }
}

/* ----------------------------------------------------
   🕒 Helper：計算實際「應執行時間」
---------------------------------------------------- */
function getWindowStartTime(window: any, surgeryDate: Date): Date | null {
  if (!window) return null;
  const w = typeof window === "string" ? JSON.parse(window) : window;

  const surgeryTime = new Date(surgeryDate);
  const adjustHours = (hours: number) => {
    const d = new Date(surgeryTime);
    d.setHours(d.getHours() + hours);
    return d;
  };

  const parseExpr = (expr: string): number | null => {
    if (!expr) return null;
    if (/^D[-+]\d+$/.test(expr)) return parseInt(expr.replace("D", "")) * 24;
    if (/^DOS[-+]\d+h$/.test(expr)) return parseInt(expr.match(/[-+]\d+/)?.[0] ?? "0");
    if (expr === "DOS-morning") return 0;
    if (expr === "postop-stable") return 24;
    return null;
  };

  const fromH = w.from ? parseExpr(w.from) : null;
  const whenH = w.when ? parseExpr(w.when) : null;
  let target = new Date(surgeryTime);

  if (fromH !== null) target = adjustHours(fromH);
  else if (whenH !== null) target = adjustHours(whenH);

  // 特殊 case
  if (w.when === "DOS-morning") target.setHours(7, 0, 0, 0);

  return target;
}

/* ----------------------------------------------------
   🚀 GET：病患通知 API
---------------------------------------------------- */
export async function GET() {
  try {
    const session = await requireRole(["patient"]);
    const now = new Date();

    const surgeries = await prisma.surgery.findMany({
      where: { patientId: session.userId },
      include: {
        guideline: {
          select: {
            items: {
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                window: true,
              },
              orderBy: { id: "asc" },
            },
          },
        },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    console.log("🧩 surgeries:", surgeries.map((s) => ({
      id: s.id,
      date: s.scheduledAt,
      items: s.guideline?.items.length ?? 0,
      sampleItem: s.guideline?.items[0]?.window ?? null,
    })));

    const notifications: any[] = [];

    for (const surgery of surgeries) {
      if (!surgery.scheduledAt) continue;
      const scheduled = new Date(surgery.scheduledAt);

      for (const item of surgery.guideline?.items || []) {
        const active = parseWindow(item.window, scheduled);
        const targetTime = getWindowStartTime(item.window, scheduled);

        console.log(
          `🎯 Guideline item ${item.title} window=`,
          item.window,
          "→ target=",
          targetTime?.toLocaleString(),
          "active=",
          active
        );

        notifications.push({
          surgeryId: surgery.id,
          message: `✅ ${item.title}`,
          description: item.description,
          type: item.type ?? "general",
          ts: targetTime ? targetTime.getTime() : now.getTime(),
          active,
        });
      }

      // 加上主要手術提醒
      const hours = hoursBetween(scheduled, now);
      notifications.push({
        surgeryId: surgery.id,
        message: `📅 Your surgery is scheduled for ${scheduled.toLocaleString()} with Dr. ${surgery.doctor.name}.`,
        type: "surgery",
        ts: scheduled.getTime(),
        active: hours <= 24 && hours > -3,
      });
    }

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error("❌ Notification API error:", error);
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
