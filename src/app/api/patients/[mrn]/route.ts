import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function dateOnlyUTC(d: Date): string {
  return d.toISOString().slice(0, 10); // 直接取 UTC 年月日，避免時區誤差
}

function extractMrnFromPath(pathname: string): string {
  const after = pathname.split("/api/patients/")[1] ?? "";
  return decodeURIComponent(after.split("/")[0] ?? "").trim();
}

export async function GET(
  req: NextRequest,
  // ⬇️ params 是 Promise，必須 await
  ctx: { params: Promise<{ mrn: string }> }
) {
  try {
    const { mrn: rawMrn } = await ctx.params;        // ← 關鍵：await
    const mrnFromParams = rawMrn?.trim() ?? "";
    const mrn = mrnFromParams || extractMrnFromPath(req.nextUrl.pathname);

    if (!mrn) {
      return NextResponse.json({ error: "Missing MRN" }, { status: 400 });
    }

    const parsedQuery = QuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsedQuery.error.issues },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({ where: { mrn } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const dobParam = parsedQuery.data.dob;
    if (dobParam) {
      const want = dobParam; // YYYY-MM-DD（使用者送來）
      const got = dateOnlyUTC(new Date(patient.dob)); // DB → UTC 年月日
      if (want !== got) {
        return NextResponse.json({ error: "DOB mismatch" }, { status: 401 });
      }
    }

    return NextResponse.json(patient, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
