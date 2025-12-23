// src/app/api/guidelines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";

export async function GET() {
  try {
    requireRole(["doctor"]);
    const guidelines = await prisma.surgeryGuideline.findMany({
      select: { id: true, name: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ guidelines });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      if (error.message === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(["doctor"]);
    const body = await req.json();
    const name = (body?.name ?? "").trim();
    const description = (body?.description ?? "").trim();

    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const created = await prisma.surgeryGuideline.create({
      data: { name, description: description || null },
      select: { id: true, name: true, description: true, createdAt: true },
    });

    // WebSocket broadcast: guideline changed (created)
    const io = getIO();
    io?.to("guidelines").emit("guideline:updated", {
      action: "created",
      guidelineId: created.id,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ guideline: created }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      if (error.message === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
