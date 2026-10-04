import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK
// Note: Requires GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const answerFile = formData.get("answerFile") as File | null;
    const questionSetName = formData.get("questionSetName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No question file uploaded" }, { status: 400 });
    }

    // Use eval('require') to bypass Next.js Webpack intercepting pdf-parse
    const pdfParse = eval('require')('pdf-parse');

    // Parse Questions PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    const text = data.text;
    
    let answerText = "";
    if (answerFile) {
      const ansBuffer = Buffer.from(await answerFile.arrayBuffer());
      const ansData = await pdfParse(ansBuffer);
      answerText = ansData.text;
    }

    // --- AI-POWERED EXTRACTION USING GEMINI ---
    const prompt = `
      You are an expert educational data extractor.
      Extract multiple-choice questions from the following text extracted from a PDF.
      For each question, extract the question text and all options.
      If an Answer Key text is provided below, map the correct option for each question. If not, default to "A".
      
      Output the data STRICTLY as a JSON array of objects with the following schema:
      [
        {
          "qNumber": "The original question number as a string (e.g., '1')",
          "text": "The question text",
          "options": [
            { "id": "A", "text": "Option A text" },
            { "id": "B", "text": "Option B text" }
          ],
          "correctOption": "A, B, C, D, or E"
        }
      ]
      
      Questions Text:
      ${text.substring(0, 30000)} // Limiting to avoid token overflow in extremely large documents

      Answer Key Text (if any):
      ${answerText.substring(0, 10000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "[]";
    let extractedData = [];
    try {
      extractedData = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", resultText);
      return NextResponse.json({ error: "AI failed to generate valid structured data." }, { status: 500 });
    }

    if (!Array.isArray(extractedData) || extractedData.length === 0) {
      return NextResponse.json({ error: "Could not parse any questions using AI." }, { status: 400 });
    }

    const questionsToInsert = extractedData.map((q: any) => ({
      text: q.text,
      options: JSON.stringify(q.options),
      correctOption: q.correctOption || "A", 
      subject: "General",
      topic: "Mixed",
      difficulty: "MEDIUM",
      tags: "ai-extracted",
      estimatedTime: 60,
      sourceFile: questionSetName || file.name,
      status: "DRAFT"
    }));

    // Insert into DB
    const createdCount = await prisma.$transaction(
      questionsToInsert.map(q => prisma.question.create({ data: q }))
    );

    return NextResponse.json({ success: true, count: createdCount.length });
  } catch (error) {
    console.error("[PDF_UPLOAD_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
