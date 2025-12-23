// src/app/api/doctor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const patients = await prisma.user.findMany({
      where: { role: "patient" },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        dob: true,
        patientSurgeries: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            status: true,
            guideline: { select: { name: true, description: true } },
            versions: {
              orderBy: { versionNo: "asc" }, // 由舊到新
              select: {
                id: true,
                versionNo: true,
                createdAt: true,
                author: { select: { id: true, name: true } },
                instructions: true
              },
            },
          },
        },
      },
    });

    // 整形：把最新版本抽出成 latestVersion，其餘放 history
    const data = patients.map((p) => ({
      id: p.id,
      name: p.name,
      dob: p.dob,
      surgeries: p.patientSurgeries.map((s) => {
        const allVersions = s.versions || [];
        const latest = allVersions.length
          ? allVersions[allVersions.length - 1]
          : null;
        const history = allVersions;
        return {
          id: s.id,
          status: s.status,
          guideline: s.guideline,
          latestVersion: latest,
          history
        };
      }),
    }));

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
