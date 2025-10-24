// src/app/api/openAI/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Candidate = {
  name: string;
  possible_dose_mg?: number | null;
  reasoning: string;
  confidence_0to1: number;
  imprint?: string | null;
  color?: string | null;
  shape?: string | null;
};

export const runtime = "nodejs"; // Make sure it runs at server environment

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Use multipart/form-data" }, { status: 415 });
    }

    const form = await req.formData();
    const file = form.get("image") as File;
    if (!file) return NextResponse.json({ error: "image is required" }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detected = await fileTypeFromBuffer(buffer);
    const mime = detected?.mime || "image/jpeg";
    const base64Image = buffer.toString("base64");

    // Optimal: Front-end can choose to provide this input
    const userImprint = (form.get("imprint") as string | null)?.trim();
    const userColor = (form.get("color") as string | null)?.trim();
    const userShape = (form.get("shape") as string | null)?.trim();

    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    // Define response JSON
    const systemPrompt = `
You are a cautious medication identifier looking at photos of solid oral dosage forms (tablets/capsules).
Rules:
- Return STRICT JSON only, no extra text.
- If imprint text is unclear/missing, set "needs_imprint"=true and suggest a few likely characters.
- Never give medical advice; include a "warnings" array reminding verification by pharmacist.
JSON schema:
{
  "candidates": [
    {
      "name": "string",
      "possible_dose_mg": number|null,
      "reasoning": "string",
      "confidence_0to1": 0.0-1.0,
      "imprint": "string|null",
      "color": "string|null",
      "shape": "string|null"
    }
  ]
}
If multiple plausible names exist, include 2-4 candidates.
    `.trim();

    // User's prompt
    const userContext = `
Known (may be empty): imprint=${userImprint ?? ""}, color=${userColor ?? ""}, shape=${userShape ?? ""}.
Use these hints when ranking candidates.
`.trim();
    // Sent API to model
    const resp = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "user",
                content: [
                    { type: "input_text", text: systemPrompt },
                    { type: "input_text", text: userContext },
                    { type: "input_image", image_url: `data:${mime};base64,${base64Image}`, detail: "high", },
                ],
            },
        ],
    });

    // Parse response
    let raw = resp.output_text.trim();

    // Clean response
    if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/```$/, "").trim();
    }

    let parsed: { candidates: Candidate[] };

    try {
    parsed = JSON.parse(raw);
    } catch (e) {
    return NextResponse.json(
        { error: "LLM returned non-JSON", raw },
        { status: 502 }
    );
    }

    // Compare input with result
    const best = parsed.candidates?.[0] || {};
    const imprint = (userImprint || best.imprint || "").trim();
    const color = (userColor || best.color || "").trim();
    const shape = (userShape || best.shape || "").trim();

    // Compare response with searching keyword
    const qCore = [imprint, color, shape].filter(Boolean).join(" ");
    const drugsQuery = encodeURIComponent(`site:drugs.com pill identifier ${qCore}`);

    const verifyLinks = [
      { label: "Drugs.com site search", url: `https://www.google.com/search?q=${drugsQuery}` }
    ];

    return NextResponse.json({
      image_checked: { mime: file.type, size: file.size },
      inputs_used: { imprint, color, shape },
      llm: parsed,
      verification: {
        strategy: "Open the links and confirm imprint/appearance matches official photos/descriptions.",
        links: verifyLinks
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "analysis_failed" }, { status: 500 });
  }
}
