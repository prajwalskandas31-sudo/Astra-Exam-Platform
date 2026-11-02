// Validation/normalization for question payloads coming from the question bank UI and imports.

export const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "NUMERICAL",
  "ASSERTION_REASON",
  "MATCH_THE_FOLLOWING",
  "PASSAGE",
  "IMAGE_BASED",
] as const;
export type QuestionTypeName = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export interface QuestionOption {
  id: string;
  text: string;
}

export interface NormalizedQuestion {
  text: string;
  options: string;
  correctOption: string;
  explanation: string | null;
  subject: string;
  chapter: string | null;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  questionType: QuestionTypeName;
  marks: number;
  negativeMarks: number;
  examCategory: string | null;
  tags: string;
  estimatedTime: number;
  status: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const optStr = (v: unknown) => str(v) || null;

export function parseOptions(raw: unknown): QuestionOption[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((o, i) => ({
      id: str((o as QuestionOption)?.id) || String.fromCharCode(65 + i),
      text: str((o as QuestionOption)?.text),
    }))
    .filter((o) => o.text);
}

/** Returns a normalized question or an error message. */
export function normalizeQuestion(input: Record<string, unknown>): { data?: NormalizedQuestion; error?: string } {
  const text = str(input.text);
  if (!text) return { error: "Question text is required" };

  const questionType = (QUESTION_TYPES as readonly string[]).includes(str(input.questionType))
    ? (str(input.questionType) as QuestionTypeName)
    : "SINGLE_CHOICE";
  const options = questionType === "NUMERICAL" ? [] : parseOptions(input.options);
  const correctOption = str(input.correctOption).toUpperCase();

  if (questionType === "NUMERICAL") {
    if (!str(input.correctOption)) return { error: "Numerical questions need a correct answer value" };
  } else {
    if (options.length < 2) return { error: "At least two options are required" };
    const ids = new Set(options.map((o) => o.id.toUpperCase()));
    const picked = correctOption.split(",").map((s) => s.trim()).filter(Boolean);
    if (picked.length === 0 || picked.some((p) => !ids.has(p))) {
      return { error: "Correct option must match one of the option ids" };
    }
    if (questionType !== "MULTIPLE_CHOICE" && picked.length > 1) {
      return { error: "Only multiple-choice questions can have more than one correct option" };
    }
  }

  const difficulty = (DIFFICULTIES as readonly string[]).includes(str(input.difficulty).toUpperCase())
    ? str(input.difficulty).toUpperCase()
    : "MEDIUM";
  const marks = Number(input.marks);
  const negativeMarks = Number(input.negativeMarks);
  const estimatedTime = Number(input.estimatedTime);

  return {
    data: {
      text,
      options: JSON.stringify(options),
      correctOption: questionType === "NUMERICAL" ? str(input.correctOption) : correctOption.split(",").map((s) => s.trim()).filter(Boolean).sort().join(","),
      explanation: optStr(input.explanation),
      subject: str(input.subject) || "General",
      chapter: optStr(input.chapter),
      topic: str(input.topic) || "General",
      subtopic: optStr(input.subtopic),
      difficulty,
      questionType,
      marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
      negativeMarks: Number.isFinite(negativeMarks) && negativeMarks >= 0 ? negativeMarks : 0,
      examCategory: optStr(input.examCategory),
      tags: Array.isArray(input.tags) ? input.tags.map(String).join(",") : str(input.tags),
      estimatedTime: Number.isFinite(estimatedTime) && estimatedTime > 0 ? Math.round(estimatedTime) : 60,
      status: str(input.status) === "DRAFT" ? "DRAFT" : "PUBLISHED",
    },
  };
}
