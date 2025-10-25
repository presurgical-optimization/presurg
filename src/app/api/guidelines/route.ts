import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
//

export async function GET() {
  try {
    requireRole(["doctor"]);
    const guidelines = await prisma.surgeryGuideline.findMany({
      select: { id: true, name: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ guidelines });
  } catch (error: unknown) {
    // 先將 error 轉型為具有 message 屬性的型別
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      if (error.message === "FORBIDDEN")    return NextResponse.json({ error: "FORBIDDEN"    }, { status: 403 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}