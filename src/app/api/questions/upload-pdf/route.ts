import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const answerFile = formData.get("answerFile") as File | null;
    const questionSetName = formData.get("questionSetName") as string | null;

    if (!file) {
      return new NextResponse("No question file uploaded", { status: 400 });
    }

    // Use eval('require') to bypass Next.js Webpack intercepting pdf-parse
    const pdfParse = eval('require')('pdf-parse');

    // Parse Answer Key if provided
    const answerKeyMap: Record<string, string> = {};
    if (answerFile) {
      const ansBuffer = Buffer.from(await answerFile.arrayBuffer());
      const ansData = await pdfParse(ansBuffer);
      
      // Match "1 E", "41 A/C", etc.
      // We'll capture the number and the letter(s)
      const ansRegex = /(\d+)\s+([A-E](?:\/[A-E])?)/g;
      let match;
      while ((match = ansRegex.exec(ansData.text)) !== null) {
        answerKeyMap[match[1]] = match[2];
      }
    }

    // Parse Questions PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    const text = data.text;

    // --- DETERMINISTIC REGEX PARSER ---
    const questions: any[] = [];
    
    // Split the text by question numbers: "1. ", "2. ", "180. "
    const questionBlocks = text.split(/(?:^|\n)\s*(\d+)\.\s+/g);
    
    for (let i = 1; i < questionBlocks.length; i += 2) {
      const qNumber = questionBlocks[i];
      let qContent = questionBlocks[i + 1];

      // Clean up headers/footers in the block
      qContent = qContent.replace(/Dr\. C AK Consultancy Services[\s\S]*?Page \d+ of \d+/g, "").trim();

      const optionMatch = qContent.match(/([A-Z])\.\s/);
      if (!optionMatch) continue; // Skip if no options found

      const questionText = qContent.substring(0, optionMatch.index).replace(/\n/g, " ").trim();
      
      const optionsText = qContent.substring(optionMatch.index!);
      const optionChunks = optionsText.split(/(?:^|\n)\s*([A-Z])\.\s+/g);
      
      const options = [];
      for (let j = 1; j < optionChunks.length; j += 2) {
        options.push({
          id: optionChunks[j],
          text: optionChunks[j+1].replace(/\n/g, " ").trim()
        });
      }

      // Assign the correct option from the answer key, or default to "A" if missing
      const correctOpt = answerKeyMap[qNumber] || "A";

      if (questionText && options.length >= 2) {
        questions.push({
          text: questionText,
          options: JSON.stringify(options),
          correctOption: correctOpt, 
          subject: "General",
          topic: "Mixed",
          difficulty: "MEDIUM",
          tags: "plab1",
          estimatedTime: 60,
          sourceFile: questionSetName || file.name
        });
      }
    }

    if (questions.length === 0) {
      return new NextResponse("Could not parse any questions from the PDF format.", { status: 400 });
    }

    // Insert into DB
    const createdCount = await prisma.$transaction(
      questions.map(q => prisma.question.create({ data: q }))
    );

    return NextResponse.json({ success: true, count: createdCount.length });
  } catch (error) {
    console.error("[PDF_UPLOAD_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


