// 超簡單 in-memory sessions（重啟即失、足夠黑客松）
// 若有多實例，請改成 Redis 等集中式儲存
import { randomBytes } from "crypto";

export type SessionData = {
  userId: number;
  role: "doctor" | "patient";
};

const store = new Map<string, SessionData>();

export function createSession(data: SessionData) {
  const sid = randomBytes(16).toString("hex");
  store.set(sid, data);
  return sid;
}

export function getSession(sid?: string | null) {
  if (!sid) return null;
  return store.get(sid) || null;
}

export function deleteSession(sid?: string | null) {
  if (!sid) return;
  store.delete(sid);
}
