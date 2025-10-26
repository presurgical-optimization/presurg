import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// 假設 requireRole 返回的 currentUser 包含 userId


/**
 * GET /api/doctor/surgeries
 * 獲取當前登入醫生 (doctorId) 的所有手術列表
 */
export async function GET(request: NextRequest) {
    try {
        // 1. 身份驗證與角色檢查
        const currentUser = await requireRole(["doctor"]);
        const doctorId = currentUser.userId;

        // 2. 執行查詢: 獲取該醫生的所有手術
        const surgeries = await prisma.surgery.findMany({
            where: {
                doctorId: doctorId,
            },
            // 按照預定時間降序排列 (最新/即將進行的在前)
            orderBy: {
                scheduledAt: 'desc',
            },
            // 包含病患和指南的基本資訊
            include: {
                

                patient: {
                    select: { id: true, name: true, ssn: true },
                },
                guideline: {
                    select: { id: true, name: true },
                },currentPublishedVersion: {
                    select: {
                    id: true,
                    versionNo: true,
                    instructions: true, // JSONB（期待為陣列）
                    },
                },
            
                
            },
        });

        if (surgeries.length === 0) {
            return NextResponse.json({ message: 'No surgeries found for this doctor.' }, { status: 200 });
        }

        return NextResponse.json({ surgeries }, { status: 200 });

    } catch (error) {
        console.error('Failed to retrieve doctor surgeries:', error);
        
        if (error instanceof Error && error.message.toLowerCase().includes('forbidden')) {
            return NextResponse.json({ error: 'Authorization error: Forbidden' }, { status: 403 });
        }
        
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
