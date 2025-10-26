// src/app/api/openAI/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/prisma";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs"; // Make sure it runs at server environment

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Use multipart/form-data" }, { status: 415 });
    }

    const form = await req.formData();

    // Step 1: Find all surgeries id then find versionIds
    const userId = Number(form.get("userId"));
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const surgeries = await prisma.surgery.findMany({
        where: { patientId: userId },
        select: { currentPublishedVersionId: true },
    });

    const versionIds = surgeries
        .map((s: { currentPublishedVersionId: number | null }) => s.currentPublishedVersionId)
        .filter((id: number | null): id is number => id !== null);


    // Step 2: Use versionIds to find SurgeryPlanVersion and pick medication instructions
    const versions = await prisma.SurgeryPlanVersion.findMany({
        where: { id: { in: versionIds } },
        select: { id: true, instructions: true },
    });

    type MedicationInfo = {
        title?: string;
        description?: string;
    };

    const medications: MedicationInfo[] = [];

    for (const v of versions) {
        const arr = Array.isArray(v.instructions) ? (v.instructions as any[]) : [];
        for (const item of arr) {
            if (item?.type === "medication") {
                medications.push({
                    title: item.title,
                    description: item.description,
                });
            }
        }
    }

    // Step 3: Read all input 
    const file = form.get("image") as File;
    if (!file) return NextResponse.json({ error: "image is required" }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detected = await fileTypeFromBuffer(buffer);
    const mime = detected?.mime || "image/jpeg";
    const base64Image = buffer.toString("base64");

    // Optimal: Front-end can choose to provide this input
    const hints = {
        imprint: (form.get("imprint") as string | null)?.trim() || "",
        color: (form.get("color") as string | null)?.trim() || "",
        shape: (form.get("shape") as string | null)?.trim() || "",
    };

    // Srep 4: Define response JSON
    const systemPrompt = `
        You are a pill identifier. Identify the medication in the image and compare with user_med_list.
        Return JSON ONLY with:
        - name: string
        - confidence_0to1: number (0..1)
        - is_on_user_list: boolean
        - matched_index: integer (0-based, -1 if none)
        - reason: string
        Never provide medical advice.
        `.trim();

    // Step 5: Sent API to model
    const resp = await (client.responses.create as any)({
        model: "gpt-4.1-mini",
        input: [
            { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
            {
                role: "user",
                content: [
                    { type: "input_text", text: JSON.stringify({ user_med_list: medications, hints }) },
                    { type: "input_image", image_url: `data:${mime};base64,${base64Image}`, detail: "high", },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "pill_identifier_result",
                strict: true, // 建議開啟，避免多出你未定義的欄位
                schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "confidence_0to1", "is_on_user_list", "matched_index", "reason"],
                    properties: {
                        name: { type: "string" },
                        confidence_0to1: { type: "number", minimum: 0, maximum: 1 },
                        is_on_user_list: { type: "boolean" },
                        matched_index: { type: "integer" },
                        reason: { type: "string" }
                    }
                }
            }
        }
    });

    type LlmResult = {
        name: string;
        confidence_0to1: number;
        is_on_user_list: boolean;
        matched_index: number; // -1 if none
        reason: string;
    };

    let result: LlmResult;
    try {
        result = JSON.parse(resp.output_text) as LlmResult;
    } catch {
        return NextResponse.json(
            { error: "LLM returned non-JSON", raw: resp.output_text },
            { status: 502 }
        );
    }

    // Add compare pill by hand
    const qCore = [hints.imprint, hints.color, hints.shape].filter(Boolean).join(" ");
    const drugsQuery = encodeURIComponent(`site:drugs.com pill identifier ${qCore}`);
    const verifyLinks = [
        { label: "Drugs.com site search", url: `https://www.google.com/search?q=${drugsQuery}` },
    ];

    // ---- 回傳決策（單一出口）----
    let matchedPayload: any = null;
    if (result.is_on_user_list && typeof result.matched_index === "number" && result.matched_index >= 0) {
        const idx = result.matched_index;
        const med = idx >= 0 && idx < medications.length ? medications[idx] : undefined;
        matchedPayload = med
            ? { title: med.title ?? null, description: med.description ?? null }
            : null;
    }

    return NextResponse.json({
        image_checked: { mime, size: file.size },
        inputs_used: hints,
        user_med_list_count: medications.length,
        versionIds,
        decision: {
            matched: !!matchedPayload,
            identified_name: result.name ?? null,
            confidence: result.confidence_0to1 ?? null,
            reason: result.reason ?? null,
            medication: matchedPayload, // 若 null = 不在清單
            message: matchedPayload ? undefined : "This pill is not on the patient's prescribed list.",
        },
        verification: {
            strategy: "Compare imprint/color/shape with official images and the medication label.",
            links: verifyLinks,
        },
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "analysis_failed" }, { status: 500 });
  }
}
