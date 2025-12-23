import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();                // <= await
  const sid = cookieStore.get("sid")?.value ?? null;  // <= 從請求拿現在的 sid
  deleteSession(sid);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sid", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
