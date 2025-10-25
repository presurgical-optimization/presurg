import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth"; // 你已經改成 async await cookies() 的版本

export async function GET() {
  try {
    const s = await readSession(); // { userId, role } | null
    if (!s) {
      // 你也可以回 401；黑客松我就回 user:null，前端好處理
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { id: true, name: true, role: true, dob: true }, // 想隱私可拿掉 dob
    });

    // db 找不到（極少見：帳號被刪了），視為未登入
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
