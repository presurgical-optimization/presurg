// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const s = await readSession(); // 從 cookie 讀 sid → 取回 { userId, role } 或 null
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // 取一下基本資料（你也可以只回 userId/role）
  const user = await prisma.user.findUnique({
    where: { id: s.userId },
    select: { id: true, name: true, role: true },
  });

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  return NextResponse.json({ user }); // => { user: { id, name, role } }
}
