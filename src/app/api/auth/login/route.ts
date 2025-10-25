import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const { ssn, dob } = await req.json();
  const dobDate = new Date(dob);

  const user = await prisma.user.findFirst({
    where: { ssn, dob: dobDate },
    select: { id: true, name: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const sid = createSession({ userId: user.id, role: user.role });
  const res = NextResponse.json({ user });
  res.cookies.set("sid", sid, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  return res;
}
