import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { normalizeQuestion } from "@/lib/questions";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

async function pdfText(file: File): Promise<string> {
  // Use eval('require') so the bundler doesn't try to trace pdf-parse's test fixtures
  const pdfParse = eval("require")("pdf-parse");
  const data = await pdfParse(Buffer.from(await file.arrayBuffer()));
  return data.text as string;
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "AI extraction is not configured. Set GEMINI_API_KEY in the environment, or use JSON bulk upload instead." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const answerFile = formData.get("answerFile");
    const questionSetName = formData.get("questionSetName");
    const subject = formData.get("subject");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No question file uploaded" }, { status: 400 });
    }
    for (const f of [file, answerFile]) {
      if (f instanceof File && f.size > 0) {
        if (f.size > MAX_PDF_BYTES) return NextResponse.json({ error: "PDFs must be under 15 MB" }, { status: 400 });
        if (f.type && f.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
      }
    }

    const text = await pdfText(file);
    const answerText = answerFile instanceof File && answerFile.size > 0 ? await pdfText(answerFile) : "";

    const prompt = `You are an expert educational data extractor.
Extract every multiple-choice question from the PDF text below. For each question extract the question text and all options.
If an answer key is provided, map the correct option id for each question by its question number. If no answer is known, use an empty string.
Also infer a short "topic" (2-4 words) for each question.

Return ONLY a JSON array of objects with this schema:
[{ "qNumber": "1", "text": "...", "options": [{ "id": "A", "text": "..." }], "correctOption": "A", "topic": "...", "explanation": "" }]

Questions text:
${text.substring(0, 60000)}

Answer key text (may be empty):
${answerText.substring(0, 15000)}`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    let extracted: unknown;
    try {
      extracted = JSON.parse(response.text || "[]");
    } catch {
      return NextResponse.json({ error: "The AI returned malformed data. Please try again." }, { status: 502 });
    }
    if (!Array.isArray(extracted) || extracted.length === 0) {
      return NextResponse.json({ error: "No questions could be found in that PDF." }, { status: 400 });
    }

    const sourceFile = (typeof questionSetName === "string" && questionSetName.trim()) || file.name;
    const rows: Prisma.QuestionUncheckedCreateInput[] = [];
    let missingAnswers = 0;

    for (const raw of extracted as Record<string, unknown>[]) {
      const hasAnswer = typeof raw.correctOption === "string" && raw.correctOption.trim() !== "";
      if (!hasAnswer) missingAnswers++;
      const { data } = normalizeQuestion({
        ...raw,
        // Without a key we still import, flagged for review, with a placeholder answer
        correctOption: hasAnswer ? raw.correctOption : "A",
        subject: typeof subject === "string" && subject.trim() ? subject : "General",
        tags: hasAnswer ? "ai-extracted" : "ai-extracted,needs-answer-review",
        status: "DRAFT"
      });
      if (data) rows.push({ ...data, sourceFile, organizationId: session.user.organizationId ?? null });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Questions were found but none had usable options." }, { status: 400 });
    }

    const created = await prisma.$transaction(rows.map((data) => prisma.question.create({ data })));

    return NextResponse.json({
      success: true,
      count: created.length,
      missingAnswers,
      message: `Imported ${created.length} questions as drafts${missingAnswers ? ` (${missingAnswers} need an answer key review)` : ""}. Review and publish them in the question bank.`
    });
  } catch (error) {
    console.error("[PDF_UPLOAD_POST]", error);
    return NextResponse.json({ error: "Failed to process the PDF" }, { status: 500 });
  }
}
