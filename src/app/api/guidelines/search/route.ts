// src/app/api/guideline/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(Number(searchParams.get('limit') || '20'), 50);

  if (!q) {
    const rows = await prisma.surgeryGuideline.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true, surgeries: true } } },
    });
    return NextResponse.json(
      rows.map((g: { id: string; name: string; description: string | null; createdAt: Date; _count: { items: number; surgeries: number } }) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        createdAt: g.createdAt,
        itemsCount: g._count.items,
        surgeriesCount: g._count.surgeries,
      }))
    );
  }

  const rows = await prisma.surgeryGuideline.findMany({
    take: limit,
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { items: { some: { title: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true, surgeries: true } } },
  });

  return NextResponse.json(
    rows.map((g: { id: string; name: string; description: string | null; createdAt: Date; _count: { items: number; surgeries: number } }) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      createdAt: g.createdAt,
      itemsCount: g._count.items,
      surgeriesCount: g._count.surgeries,
    }))
  );
}
