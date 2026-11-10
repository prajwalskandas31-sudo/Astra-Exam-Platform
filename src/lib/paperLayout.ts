/**
 * Anti-copying paper layouts: the same questions in a different order for each student (or each
 * named set), with the options inside each question shuffled too.
 *
 * Everything is derived from a seed with a deterministic PRNG, so the server, the browser and an
 * offline exam device all compute the identical layout from the same seed and nothing but the
 * seed has to be stored. Grading never changes: answers are recorded against the option's
 * original ID, only the letter shown on screen follows the shuffled position.
 *
 * Pure TypeScript with no Node or browser APIs, so it runs everywhere.
 */

export type ShuffleMode = "OFF" | "PER_STUDENT" | "SETS";
export const SHUFFLE_MODES: ShuffleMode[] = ["OFF", "PER_STUDENT", "SETS"];
export const MIN_SETS = 2;
export const MAX_SETS = 8;
export const SET_LETTERS = "ABCDEFGH";
export const OPTION_LABELS = "ABCDEFGHIJ";

/** Question types whose options have a conventional order or no options at all. */
const FIXED_OPTION_TYPES = new Set(["NUMERICAL", "ASSERTION_REASON", "MATCH_THE_FOLLOWING"]);

/**
 * Options that only make sense in their original place: "All of the above", "Both A and B",
 * "None of these", "(a) and (c)", "Option B"... If any option in a question looks like this,
 * that question's options keep their original order.
 */
const POSITION_DEPENDENT =
  /\b(above|below|these|both|neither|either)\b|\b(all|none) of\b|\boption\s*[a-j]\b|\(\s*[a-j1-9]\s*\)|\b[a-j]\s*(,|and|&|or)\s*[a-j]\b/i;

/** 32-bit hash of a string (xmur3), used to seed the PRNG. */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32: small, fast, good enough for shuffling; identical results on every JS engine. */
function prng(seed: string) {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface LayoutQuestion {
  questionId: string;
  section: string | null;
  question: { subject: string; questionType: string; options: string };
}

export interface ShuffleSettings {
  shuffleMode: string;
  shuffleOptions: boolean;
}

export interface PaperLayout {
  /** Question IDs in the order this student sees them. */
  questionOrder: string[];
  /** Per question: original option IDs in display order. Missing = original order. */
  optionOrder: Record<string, string[]>;
}

export function parseOptionList(raw: string): { id: string; text: string }[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((o) => o && typeof o.id === "string") : [];
  } catch {
    return [];
  }
}

export const canShuffleOptions = (questionType: string, options: { text: string }[]) =>
  !FIXED_OPTION_TYPES.has(questionType) && options.length > 1 && !options.some((o) => POSITION_DEPENDENT.test(String(o.text ?? "")));

/**
 * The layout for one seed. Sections (Physics, Chemistry...) stay together and in their original
 * order, as in real exams; questions are shuffled within each section.
 */
export function buildLayout(questions: LayoutQuestion[], seed: string, settings: ShuffleSettings): PaperLayout {
  const rand = prng(seed);
  const sections = new Map<string, LayoutQuestion[]>();
  for (const q of questions) {
    const key = q.section || q.question.subject || "General";
    const list = sections.get(key);
    if (list) list.push(q);
    else sections.set(key, [q]);
  }

  const questionOrder: string[] = [];
  for (const list of sections.values()) {
    for (const q of shuffled(list, rand)) questionOrder.push(q.questionId);
  }

  const optionOrder: Record<string, string[]> = {};
  if (settings.shuffleOptions) {
    for (const q of questions) {
      const options = parseOptionList(q.question.options);
      if (!canShuffleOptions(q.question.questionType, options)) continue;
      // A per-question stream, so adding a question to the test doesn't reshuffle every other one
      optionOrder[q.questionId] = shuffled(options.map((o) => o.id), prng(`${seed}:${q.questionId}`));
    }
  }
  return { questionOrder, optionOrder };
}

/**
 * Apply a layout: reorder the questions and rewrite each question's options JSON in display
 * order, adding a positional `label` (A, B, C...) to every option. `id` stays the original
 * option ID, which is what gets stored and graded.
 */
export function applyLayout<T extends LayoutQuestion>(questions: T[], layout: PaperLayout | null): T[] {
  const ordered = layout
    ? (() => {
        const byId = new Map(questions.map((q) => [q.questionId, q]));
        const out = layout.questionOrder.map((id) => byId.get(id)).filter((q): q is T => !!q);
        // Questions added after the layout was made go at the end of the paper
        for (const q of questions) if (!layout.questionOrder.includes(q.questionId)) out.push(q);
        return out;
      })()
    : questions;

  return ordered.map((q) => {
    const options = parseOptionList(q.question.options);
    if (!options.length) return q;
    const order = layout?.optionOrder[q.questionId];
    const byId = new Map(options.map((o) => [o.id, o]));
    const display = order && order.length === options.length && order.every((id) => byId.has(id)) ? order.map((id) => byId.get(id)!) : options;
    const labelled = display.map((o, i) => ({ ...o, label: OPTION_LABELS[i] ?? o.id }));
    return { ...q, question: { ...q.question, options: JSON.stringify(labelled) } };
  });
}

/** Seed and set code for a student's paper, or null when the test isn't shuffled. */
export function paperAssignment(
  test: { id: string; shuffleMode: string; setCount: number },
  student: { perStudentSeed: string; setIndex: number }
): { paperSeed: string; setCode: string | null } | null {
  if (test.shuffleMode === "PER_STUDENT") return { paperSeed: student.perStudentSeed, setCode: null };
  if (test.shuffleMode === "SETS") {
    const n = clampSetCount(test.setCount);
    const idx = ((student.setIndex % n) + n) % n;
    return { paperSeed: `${test.id}:set:${idx}`, setCode: SET_LETTERS[idx] };
  }
  return null;
}

export const clampSetCount = (n: number) => Math.min(MAX_SETS, Math.max(MIN_SETS, Math.floor(Number(n) || 4)));

/** A stable set index for a student with no seat: spreads students evenly across sets. */
export const hashSetIndex = (key: string, setCount: number) => hashSeed(key) % clampSetCount(setCount);

/**
 * Set for a seat so no two adjacent seats (left/right, front/back or diagonal) share a set.
 * With 4+ sets a 2x2 tile does that; with 2-3 sets a checkerboard keeps side-by-side and
 * front/back neighbours apart (diagonals may match). Extra sets beyond 4 rotate by room block.
 */
export function seatSetIndex(row: number, col: number, setCount: number): number {
  const n = clampSetCount(setCount);
  if (n < 4) return (row + col) % 2;
  const tile = (row % 2) * 2 + (col % 2);
  if (n === 4) return tile;
  // More than four sets: shift the 2x2 tile every two columns so far-apart seats vary too
  const block = Math.floor(col / 2) + Math.floor(row / 2);
  return (tile + 4 * (block % Math.floor(n / 4))) % n;
}
