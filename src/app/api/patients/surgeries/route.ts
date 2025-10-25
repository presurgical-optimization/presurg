import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const s = await requireRole(["patient"]);
    const surgeries = await prisma.surgery.findMany({
      where: { patientId: s.userId },
      include: {
        guideline: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
        currentPublishedVersion: { 
          select: { 
            id: true, 
            versionNo: true, 
            status: true, 
            publishedAt: true 
          } 
        },
      },
      orderBy: { scheduledAt: "asc" },
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