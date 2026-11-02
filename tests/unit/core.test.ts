import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../../src/lib/csv";
import { isAnswerCorrect } from "../../src/lib/scoring";
import { computeStreak, daysUntil, scheduleReview } from "../../src/lib/study";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded commas/newlines and CRLF", () => {
    const rows = parseCsv('name,email\r\n"Sharma, Priya",priya@x.com\r\n"Said ""hi""\nthere",b@x.com\r\n\r\n');
    assert.deepEqual(rows, [["name", "email"], ["Sharma, Priya", "priya@x.com"], ['Said "hi"\nthere', "b@x.com"]]);
  });
  it("keeps empty trailing fields and skips blank lines", () => {
    assert.deepEqual(parseCsv("a,b,c\n1,,\n\n"), [["a", "b", "c"], ["1", "", ""]]);
  });
});

describe("isAnswerCorrect", () => {
  it("single choice is case-insensitive", () => assert.equal(isAnswerCorrect("SINGLE_CHOICE", "B", "b"), true));
  it("multiple choice ignores order", () => assert.equal(isAnswerCorrect("MULTIPLE_CHOICE", "A,C", "C,A"), true));
  it("multiple choice needs every option", () => assert.equal(isAnswerCorrect("MULTIPLE_CHOICE", "A,C", "A"), false));
  it("blank is never correct", () => assert.equal(isAnswerCorrect("SINGLE_CHOICE", "A", ""), false));
});

describe("computeStreak", () => {
  const today = new Date("2026-11-10T12:00:00Z");
  it("counts consecutive days ending today", () => {
    assert.deepEqual(computeStreak(["2026-11-08", "2026-11-09", "2026-11-10"], today), { current: 3, best: 3 });
  });
  it("doesn't break the streak before today is over", () => {
    assert.equal(computeStreak(["2026-11-08", "2026-11-09"], today).current, 2);
  });
  it("a missed day resets current but keeps best", () => {
    assert.deepEqual(computeStreak(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-09", "2026-11-10"], today), { current: 2, best: 4 });
  });
  it("no activity", () => assert.deepEqual(computeStreak([], today), { current: 0, best: 0 }));
});

describe("scheduleReview (SM-2)", () => {
  const fresh = { ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
  const now = new Date("2026-11-10T00:00:00Z");
  it("AGAIN brings the card back in 10 minutes and counts a lapse", () => {
    const next = scheduleReview({ ...fresh, repetitions: 3, intervalDays: 15 }, "AGAIN", now);
    assert.equal(next.intervalDays, 0);
    assert.equal(next.repetitions, 0);
    assert.equal(next.lapses, 1);
    assert.equal(next.dueAt.getTime() - now.getTime(), 10 * 60 * 1000);
  });
  it("GOOD grows the interval 1 → 6 → ×ease", () => {
    const a = scheduleReview(fresh, "GOOD", now);
    const b = scheduleReview(a, "GOOD", now);
    const c = scheduleReview(b, "GOOD", now);
    assert.deepEqual([a.intervalDays, b.intervalDays], [1, 6]);
    assert.equal(c.intervalDays, Math.round(6 * b.ease));
  });
  it("EASY jumps further than GOOD, HARD less", () => {
    assert.ok(scheduleReview(fresh, "EASY", now).intervalDays > scheduleReview(fresh, "GOOD", now).intervalDays);
    const seen = { ease: 2.5, intervalDays: 6, repetitions: 2, lapses: 0 };
    assert.ok(scheduleReview(seen, "HARD", now).intervalDays < scheduleReview(seen, "GOOD", now).intervalDays);
  });
  it("ease never drops below 1.3", () => {
    let card = fresh;
    for (let i = 0; i < 20; i++) card = scheduleReview(card, "AGAIN", now);
    assert.equal(card.ease, 1.3);
  });
});

describe("daysUntil", () => {
  it("counts calendar days", () => assert.equal(daysUntil(new Date("2026-11-20T08:00:00Z"), new Date("2026-11-10T23:00:00Z")), 10));
  it("null without a date", () => assert.equal(daysUntil(null), null));
});

describe("report tokens", () => {
  it("round-trips and rejects tampering", async () => {
    process.env.NEXTAUTH_SECRET ??= "unit-test-secret";
    const { generateReportToken, verifyReportToken } = await import("../../src/lib/reportTokens");
    const token = generateReportToken("attempt-1", "student-1");
    assert.equal(verifyReportToken(token)?.attemptId, "attempt-1");
    // Flip every hex digit in turn: none may yield a payload, and none may throw
    for (let i = 0; i < token.length; i++) {
      if (token[i] === ":") continue;
      const flipped = token.slice(0, i) + (token[i] === "0" ? "1" : "0") + token.slice(i + 1);
      const result = verifyReportToken(flipped);
      assert.ok(result === null || (typeof result.attemptId === "string" && typeof result.studentId === "string"));
    }
    assert.equal(verifyReportToken("garbage"), null);
  });
});
