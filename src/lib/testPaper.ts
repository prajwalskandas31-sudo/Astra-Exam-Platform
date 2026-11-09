import { prisma } from "./prisma";

const TTL_MS = 30_000;
const MAX_ENTRIES = 200;

const loadPaper = (testId: string) =>
  prisma.test.findUnique({
    where: { id: testId },
    include: {
      template: true,
      questions: { include: { question: true }, orderBy: { order: "asc" } },
    },
  });

export type TestPaper = NonNullable<Awaited<ReturnType<typeof loadPaper>>>;

const cache = new Map<string, { at: number; paper: Promise<TestPaper | null> }>();

/**
 * A test with its template and ordered questions, cached per server instance for 30 seconds.
 * When a whole batch opens the same exam at 10:00:00, concurrent requests share one in-flight
 * query instead of each loading the full paper. Edits to questions show up within the TTL.
 */
export function getTestPaper(testId: string): Promise<TestPaper | null> {
  const now = Date.now();
  const hit = cache.get(testId);
  if (hit && now - hit.at < TTL_MS) return hit.paper;

  const paper = loadPaper(testId);
  cache.set(testId, { at: now, paper });
  // Don't cache failures
  paper.catch(() => cache.delete(testId));
  if (cache.size > MAX_ENTRIES) {
    for (const [key, entry] of cache) if (now - entry.at >= TTL_MS || cache.size > MAX_ENTRIES) cache.delete(key);
  }
  return paper;
}
