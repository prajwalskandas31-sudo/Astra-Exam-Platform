// Pure grading logic shared by the submit API and the seed script.
// Keep this file free of `@/` imports so it can run under plain tsx.

export interface GradableQuestion {
  id: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  difficulty: string | null;
  questionType: string;
  correctOption: string;
  marks: number | null;
  negativeMarks: number | null;
}

export interface GradableAnswer {
  questionId: string;
  selectedOpt: string | null;
  timeSpent?: number | null;
}

export interface BucketStats {
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  timeSpent: number;
}

export interface GradeResult {
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  subjectScores: Record<string, BucketStats>;
  chapterScores: Record<string, BucketStats>;
  topicScores: Record<string, BucketStats>;
  difficultyScores: Record<string, BucketStats>;
  weakTopics: string[];
  strongTopics: string[];
  perQuestion: Record<string, { isCorrect: boolean | null; subject: string; chapter: string; topic: string }>;
}

const emptyBucket = (): BucketStats => ({ total: 0, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0, timeSpent: 0 });

/** Multi-select answers are stored as comma-separated option ids, e.g. "A,C". */
export function normalizeMulti(value: string): string {
  return value
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function isAnswerCorrect(questionType: string, correct: string, selected: string): boolean {
  const c = correct.trim();
  const s = selected.trim();
  if (!s) return false;

  if (questionType === "NUMERICAL") {
    const cn = Number(c);
    const sn = Number(s);
    if (Number.isFinite(cn) && Number.isFinite(sn)) {
      // Allow small rounding differences (e.g. 3.14 vs 3.142)
      return Math.abs(cn - sn) <= Math.max(0.01, Math.abs(cn) * 0.001);
    }
    return c.toLowerCase() === s.toLowerCase();
  }

  if (questionType === "MULTIPLE_CHOICE") {
    return normalizeMulti(c) === normalizeMulti(s);
  }

  return c.toUpperCase() === s.toUpperCase();
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function gradeAttempt(questions: GradableQuestion[], answers: GradableAnswer[]): GradeResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const subjectScores: Record<string, BucketStats> = {};
  const chapterScores: Record<string, BucketStats> = {};
  const topicScores: Record<string, BucketStats> = {};
  const difficultyScores: Record<string, BucketStats> = {};
  const perQuestion: GradeResult["perQuestion"] = {};

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  for (const q of questions) {
    const marks = q.marks ?? 1;
    const neg = q.negativeMarks ?? 0;
    const subject = q.subject || "General";
    const chapter = q.chapter || "General";
    const topic = q.topic || "General";
    const difficulty = (q.difficulty || "MEDIUM").toUpperCase();
    const ans = answerMap.get(q.id);
    const selected = ans?.selectedOpt?.trim() || "";
    const timeSpent = ans?.timeSpent ?? 0;

    const buckets = [
      (subjectScores[subject] ??= emptyBucket()),
      (chapterScores[chapter] ??= emptyBucket()),
      (topicScores[topic] ??= emptyBucket()),
      (difficultyScores[difficulty] ??= emptyBucket()),
    ];

    maxScore += marks;
    let isCorrect: boolean | null = null;
    let delta = 0;

    if (!selected) {
      unattemptedCount++;
    } else if (isAnswerCorrect(q.questionType, q.correctOption, selected)) {
      isCorrect = true;
      correctCount++;
      delta = marks;
    } else {
      isCorrect = false;
      incorrectCount++;
      delta = -neg;
    }
    score += delta;

    for (const b of buckets) {
      b.total++;
      b.maxScore += marks;
      b.score += delta;
      b.timeSpent += timeSpent;
      if (isCorrect === true) b.correct++;
      else if (isCorrect === false) b.incorrect++;
      else b.unattempted++;
    }

    perQuestion[q.id] = { isCorrect, subject, chapter, topic };
  }

  const attemptedCount = correctCount + incorrectCount;
  const weakTopics: string[] = [];
  const strongTopics: string[] = [];
  for (const [name, stats] of Object.entries(topicScores)) {
    const topicAccuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    if (topicAccuracy < 60) weakTopics.push(name);
    else if (topicAccuracy >= 80) strongTopics.push(name);
  }

  return {
    score: round1(score),
    maxScore,
    percentage: maxScore > 0 ? round1(Math.max(0, (score / maxScore) * 100)) : 0,
    accuracy: attemptedCount > 0 ? round1((correctCount / attemptedCount) * 100) : 0,
    attemptedCount,
    correctCount,
    incorrectCount,
    unattemptedCount,
    subjectScores,
    chapterScores,
    topicScores,
    difficultyScores,
    weakTopics,
    strongTopics,
    perQuestion,
  };
}
