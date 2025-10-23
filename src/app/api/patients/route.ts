import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST body 驗證（無 any）
const CreatePatientSchema = z.object({
  mrn: z.string().min(1, "mrn required"),
  name: z.string().min(1, "name required"),
  dob: z.coerce.date(), // "YYYY-MM-DD" 會被轉成 Date
});

export async function GET() {
  const list = await prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(list, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreatePatientSchema.parse(json);

    const created = await prisma.patient.create({
      data: { mrn: parsed.mrn, name: parsed.name, dob: parsed.dob },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    // Prisma unique constraint
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "MRN already exists" }, { status: 409 });
    }
    // Zod 驗證錯誤
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", details: e.issues }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
