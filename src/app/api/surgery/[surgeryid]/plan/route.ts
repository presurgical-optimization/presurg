//


import { NextRequest, NextResponse } from 'next/server'; 
import { prisma } from "@/lib/prisma"; 
import { requireRole } from "@/lib/auth";
// 定義動態參數的類型
interface Params {
  params: {
    surgeryid: string; // 這是手術的 PK ID (SURGERY.id)
  };
}

/**
 * GET /api/surgery/[id]/plan
 * 獲取特定手術的所有計劃版本列表
 * * 數據庫操作：SELECT * FROM SURGERY_PLAN_VERSION WHERE surgeryId = {id}
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ surgeryid: string }>  }
) {
  // ✅ 重要：Next.js 14.2+ 的 params 是 Promise，必須 await
  const { surgeryid } = await context.params;
  const surgeryId = parseInt(surgeryid, 10);


  if (isNaN(surgeryId)) {
    return NextResponse.json({ 
        error: 'Invalid surgery ID format.',
        details: 'Received params object content: '}, { status: 400 });
  }

  try {

    const s = await requireRole(["doctor"]);
    // 1. 執行查詢: 獲取該手術的所有計劃版本，並按版本號降序排序
    const versions = await prisma.SurgeryPlanVersion.findMany({
      where: {
        surgeryId: surgeryId,
      },
      orderBy: {
        versionNo: 'desc',
      },
      // 可以在這裡選擇性地包含 authorId 的 User 資訊
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (versions.length === 0) {
      // 即使沒有版本也返回 200，但列表為空
      return NextResponse.json({ versions: [] }, { status: 200 });
    }

    return NextResponse.json({ versions }, { status: 200 });

  } catch (error) {
    console.error('Failed to retrieve surgery plan versions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  // 使用 context 來處理 Next.js 14.2+ 可能出現的 params 是 Promise 的情況
  context: { params: Promise<{ surgeryid: string }> }
) {
  
  // ✅ 修正 Promise 錯誤：必須 await 解開 params
  const { surgeryid } = await context.params;
  const surgeryId = parseInt(surgeryid, 10);

  // 1. ID 格式驗證
  if (isNaN(surgeryId)) {
    return NextResponse.json({ error: 'Invalid surgery ID format.' }, { status: 400 });
  }

  try {
    // 2. 身份驗證：只有醫生可以創建計劃版本
    const currentUser = await requireRole(["doctor"]);
    const authorId = currentUser.userId; // 假設 requireRole 返回的 currentUser 包含 id

    // 3. 獲取請求體和指令
    const body = await request.json();
    const { instructions } = body; 
    
    // 4. 檢查手術是否存在 (可選但建議)
    const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } });
    if (!surgery) {
      return NextResponse.json({ error: 'Surgery not found.' }, { status: 404 });
    }

    // 5. 獲取當前最高版本號並計算新的版本號
    const latestVersion = await prisma.SurgeryPlanVersion.findFirst({
      where: { surgeryId: surgeryId },
      orderBy: { versionNo: 'desc' },
    });
    const nextVersionNo = (latestVersion?.versionNo || 0) + 1;

    // 6. 創建新的計劃版本 (預設為 Draft)
    const newVersion = await prisma.SurgeryPlanVersion.create({
      data: {
        surgeryId: surgeryId,
        versionNo: nextVersionNo,
        authorId: authorId,
        instructions: instructions || {}, // 預設為空 JSON 或從 body 獲取
        isPublished: false, 
        status: 'DRAFT',
        createdAt: new Date(),
        
        basedOnGuidelineId: surgery.guidelineId,
        // 假設 Prisma Model 中有 'Draft' 狀態
      },
      include: {
        author: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json({ 
      message: 'New plan version created successfully.', 
      version: newVersion 
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create new plan version:', error);
    
    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
            return NextResponse.json({ error: 'Authorization error: ' + error.message }, { status: 403 });
        }
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

