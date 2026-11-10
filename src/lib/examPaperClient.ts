import type { ExamQuestion } from "@/store/examStore";

/** A test question as the API (or an offline paper bundle) sends it. */
export interface PaperQuestion {
  questionId?: string;
  section: string | null;
  question: {
    id: string;
    text: string;
    options: string;
    subject: string;
    chapter: string | null;
    questionType: string;
    marks: number;
    negativeMarks: number;
  };
}

export function parseOptions(raw: string): { id: string; text: string; label?: string }[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const toExamQuestions = (questions: PaperQuestion[]): ExamQuestion[] =>
  questions.map((tq) => ({
    id: tq.question.id,
    text: tq.question.text,
    options: parseOptions(tq.question.options),
    section: tq.section || tq.question.subject || "General",
    subject: tq.question.subject,
    chapter: tq.question.chapter,
    questionType: tq.question.questionType,
    marks: tq.question.marks ?? 1,
    negativeMarks: tq.question.negativeMarks ?? 0,
  }));
