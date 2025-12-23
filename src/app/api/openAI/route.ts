// src/app/api/openAI/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/prisma";

import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const runtime = "nodejs"; // Ensure server runtime (not edge)

// --------------------
// 1) Structured output schema
// --------------------
const PillIdentifierSchema = z.object({
  name: z.string(),
  confidence_0to1: z.number().min(0).max(1),
  is_on_user_list: z.boolean(),
  matched_index: z.number().int(), // -1 if none
  reason: z.string(),
});

type LlmResult = z.infer<typeof PillIdentifierSchema>;

export async function POST(req: NextRequest) {
  // We'll capture run log info to store in DB
  const runMeta: {
    userId?: number;
    surgeryIds?: number[];
    versionIds?: number[];
    model?: string;
    inputJson?: any;
    outputJson?: any;
    status?: "SUCCESS" | "ERROR";
    error?: string;
  } = {};

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Use multipart/form-data" }, { status: 415 });
    }

    const form = await req.formData();

    // Step 1: Find surgeries -> versionIds
    const userId = Number(form.get("userId"));
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    runMeta.userId = userId;

    const surgeries = await prisma.surgery.findMany({
      where: { patientId: userId },
      select: { id: true, currentPublishedVersionId: true },
    });

    const surgeryIds = surgeries.map((s) => s.id);
    runMeta.surgeryIds = surgeryIds;

    const versionIds = surgeries
      .map((s) => s.currentPublishedVersionId)
      .filter((id: number | null): id is number => id !== null);

    runMeta.versionIds = versionIds;

    // Step 2: versions -> medication instructions
    const versions = await prisma.surgeryPlanVersion.findMany({
      where: { id: { in: versionIds } },
      select: { id: true, surgeryId: true, instructions: true },
    });

    type MedicationInfo = { title?: string; description?: string };
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

    // Step 3: read image + hints
    const file = form.get("image") as File;
    if (!file) return NextResponse.json({ error: "image is required" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detected = await fileTypeFromBuffer(buffer);
    const mime = detected?.mime || "image/jpeg";
    const base64Image = buffer.toString("base64");

    const hints = {
      imprint: (form.get("imprint") as string | null)?.trim() || "",
      color: (form.get("color") as string | null)?.trim() || "",
      shape: (form.get("shape") as string | null)?.trim() || "",
    };

    // Step 4: prompt
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

    // Step 5: LangChain model with structured output
    const modelName = "gpt-4.1-mini";
    runMeta.model = modelName;

    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: modelName,
      temperature: 0,
    }).withStructuredOutput(PillIdentifierSchema);

    const inputPayload = {
      user_med_list: medications,
      hints,
    };
    runMeta.inputJson = {
      ...inputPayload,
      image: { mime, size: file.size }, // metadata only (not storing base64)
    };

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage({
        content: [
          { type: "text", text: JSON.stringify(inputPayload) },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${base64Image}` },
          },
        ],
      }),
    ];

    let result: LlmResult;
    try {
      result = (await model.invoke(messages)) as LlmResult;
      runMeta.outputJson = result;
      runMeta.status = "SUCCESS";
    } catch (e: any) {
      runMeta.status = "ERROR";
      runMeta.error = e?.message ?? String(e);

      // Persist failure run
      await prisma.llmExtractionRun.create({
        data: {
          patientId: userId,
          model: modelName,
          inputJson: runMeta.inputJson ?? {},
          outputJson: {},
          status: "ERROR",
          error: runMeta.error,
        },
      });

      return NextResponse.json(
        { error: "LLM structured output failed", detail: runMeta.error },
        { status: 502 }
      );
    }

    // Persist success run log
    await prisma.llmExtractionRun.create({
      data: {
        patientId: userId,
        model: modelName,
        inputJson: runMeta.inputJson ?? {},
        outputJson: result,
        status: "SUCCESS",
      },
    });

    // Verification links (same as your original)
    const qCore = [hints.imprint, hints.color, hints.shape].filter(Boolean).join(" ");
    const drugsQuery = encodeURIComponent(`site:drugs.com pill identifier ${qCore}`);
    const verifyLinks = [
      { label: "Drugs.com site search", url: `https://www.google.com/search?q=${drugsQuery}` },
    ];

    // Match payload
    let matchedPayload: any = null;
    if (result.is_on_user_list && typeof result.matched_index === "number" && result.matched_index >= 0) {
      const idx = result.matched_index;
      const med = idx >= 0 && idx < medications.length ? medications[idx] : undefined;
      matchedPayload = med ? { title: med.title ?? null, description: med.description ?? null } : null;
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
        medication: matchedPayload,
        message: matchedPayload ? undefined : "This pill is not on the patient's prescribed list.",
      },
      verification: {
        strategy: "Compare imprint/color/shape with official images and the medication label.",
        links: verifyLinks,
      },
    });
  } catch (err: any) {
    console.error(err);

    // Best-effort: log unexpected server error as a run too
    try {
      if (runMeta.userId && runMeta.model && runMeta.inputJson) {
        await prisma.llmExtractionRun.create({
          data: {
            patientId: runMeta.userId,
            model: runMeta.model,
            inputJson: runMeta.inputJson,
            outputJson: runMeta.outputJson ?? {},
            status: "ERROR",
            error: err?.message ?? "analysis_failed",
          },
        });
      }
    } catch {
      // swallow logging errors
    }

    return NextResponse.json({ error: err.message || "analysis_failed" }, { status: 500 });
  }
}
