import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Prisma } from '@prisma/client';

// 假設 requireRole 返回的 currentUser 包含 userId
interface CurrentUser {
    id: number;
    userId: number; 
    name: string;
    role: string;
}

/**
 * POST /api/surgery
 * 醫生為病人新增一項手術記錄 (Create Surgery)
 * 請求體必須包含 patientId，並自動創建 Version 1.0 計劃版本。
 */
export async function POST(request: NextRequest) {
    try {
        // 1. 身份驗證與角色檢查：只有 doctor 可以新增手術
        const currentUser = await requireRole(["doctor"]) as CurrentUser;
        const doctorId = currentUser.userId;

        // 2. 獲取請求體並解析
        const body = await request.json();
        const { 
            patientId, 
            guidelineId, 
            scheduledAt, 
            location,
            instructions // 初始的 instructions
        } = body;
        
        // 3. 數據驗證
        
        // 檢查 patientId 是否存在且為有效數字
        if (patientId === undefined || isNaN(parseInt(patientId))) {
            return NextResponse.json({ error: 'Missing or invalid patientId.' }, { status: 400 });
        }
        const numericPatientId = parseInt(patientId, 10);

        // 檢查病人是否存在
        const patient = await prisma.user.findUnique({ where: { id: numericPatientId, role: 'patient' } });
        if (!patient) {
            return NextResponse.json({ error: `Patient with ID ${numericPatientId} not found or is not a patient.` }, { status: 404 });
        }
        
        // 檢查指南 ID 是否有效 (如果提供了)
        let numericGuidelineId: number | null = null;
        if (guidelineId !== undefined && guidelineId !== null) {
            numericGuidelineId = parseInt(guidelineId, 10);
            if (isNaN(numericGuidelineId) || numericGuidelineId <= 0) {
                return NextResponse.json({ error: 'Invalid guidelineId format.' }, { status: 400 });
            }
        }

        // 處理時間格式
        let scheduledDate: Date | undefined;
        if (scheduledAt !== undefined) {
            scheduledDate = new Date(scheduledAt);
            if (isNaN(scheduledDate.getTime())) {
                return NextResponse.json({ error: 'Invalid scheduledAt date format.' }, { status: 400 });
            }
        }

        // 4. 執行巢狀寫入事務：創建 Surgery 並自動創建 Version 1.0
        const newSurgery = await prisma.surgery.create({
            data: {
                // 關聯欄位
                patient: { connect: { id: numericPatientId } },
                doctor: { connect: { id: doctorId } },
                guideline: numericGuidelineId ? { connect: { id: numericGuidelineId } } : undefined,
                
                // 基本欄位
                scheduledAt: scheduledDate,
                location: location,
                
                // 巢狀寫入：自動創建 Version 1.0
                versions: {
                    create: {
                        versionNo: 1,
                        author: { connect: { id: doctorId } },
                        instructions: instructions || {}, 
                        isPublished: false, 
                        status: 'DRAFT', // 假設 PlanStatus Enum 存在 'DRAFT'
                        createdAt: new Date(), 
                        basedOnGuidelineId: numericGuidelineId, // 參考手術的指南
                    }
                }
            },
            // 選擇返回的數據，包括創建的初始版本
            include: {
                versions: {
                    where: { versionNo: 1 }, // 只選取 Version 1
                    include: { author: { select: { id: true, name: true, role: true } } }
                },
                guideline: { select: { id: true, name: true } }
            }
        });

        // 5. 格式化返回結果
        const initialVersion = newSurgery.versions?.[0] || null;

        return NextResponse.json({
            ...newSurgery,
            initialVersion: initialVersion,
            message: "Surgery and initial plan version created successfully."
        }, { status: 201 });

    } catch (error) {
        console.error('Failed to create new surgery:', error);
        
        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
                return NextResponse.json({ error: 'Authorization error: ' + error.message }, { status: 403 });
            }
            if (errorMessage.includes('foreign key constraint failed')) {
                return NextResponse.json({ error: 'Foreign key constraint failed. Patient or Guideline not found.' }, { status: 400 });
            }
        }
        
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
