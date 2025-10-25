import { cookies } from "next/headers";
import { getSession, SessionData } from "./session";

export async function readSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();            // <= 這裡要 await
  const sid = cookieStore.get("sid")?.value || null;
  return getSession(sid);
}

export async function requireAuth(): Promise<SessionData> {
  const s = await readSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireRole(
  roles: Array<SessionData["role"]>
): Promise<SessionData> {
  const s = await requireAuth();
  if (!roles.includes(s.role)) throw new Error("FORBIDDEN");
  return s;
}
