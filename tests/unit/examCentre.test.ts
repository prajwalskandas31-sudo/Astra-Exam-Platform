import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyLayout, buildLayout, canShuffleOptions, hashSetIndex, paperAssignment, parseOptionList, seatSetIndex } from "../../src/lib/paperLayout";
import { decryptPaper, encryptPaper, normalizeStartCode } from "../../src/lib/paperCrypto";
import { isAnswerCorrect } from "../../src/lib/scoring";

process.env.NEXTAUTH_SECRET ??= "unit-test-secret";

const opts = (...texts: string[]) => JSON.stringify(texts.map((text, i) => ({ id: "ABCDE"[i], text })));
const q = (id: string, section: string, options = opts("one", "two", "three", "four"), questionType = "SINGLE_CHOICE") => ({
  questionId: id,
  section,
  question: { subject: section, questionType, options },
});

const paper = [
  ...Array.from({ length: 30 }, (_, i) => q(`p${i}`, "Physics")),
  ...Array.from({ length: 30 }, (_, i) => q(`c${i}`, "Chemistry")),
  q("num", "Chemistry", "[]", "NUMERICAL"),
  q("aota", "Physics", opts("red", "blue", "green", "All of the above")),
  q("ar", "Physics", opts("A and R true", "A true R false", "A false R true", "both false"), "ASSERTION_REASON"),
];
const settings = { shuffleMode: "PER_STUDENT", shuffleOptions: true };

describe("paper layouts", () => {
  it("is deterministic: the same seed gives the same paper on every machine", () => {
    assert.deepEqual(buildLayout(paper, "seed-1", settings), buildLayout(paper, "seed-1", settings));
  });

  it("gives different students different orders", () => {
    const a = buildLayout(paper, "student-a", settings).questionOrder;
    const b = buildLayout(paper, "student-b", settings).questionOrder;
    assert.notDeepEqual(a, b);
    assert.deepEqual([...a].sort(), [...b].sort(), "same questions, different order");
  });

  it("keeps sections together and in their original order", () => {
    const order = buildLayout(paper, "x", settings).questionOrder;
    const firstChem = order.findIndex((id) => id.startsWith("c") || id === "num");
    assert.ok(order.slice(0, firstChem).every((id) => !id.startsWith("c") && id !== "num"), "all Physics before Chemistry");
    assert.equal(order.length, paper.length);
  });

  it("leaves position-dependent and fixed-format options alone", () => {
    const layout = buildLayout(paper, "x", settings);
    assert.equal(layout.optionOrder["aota"], undefined, "All of the above stays last");
    assert.equal(layout.optionOrder["ar"], undefined, "assertion-reason keeps the standard order");
    assert.equal(layout.optionOrder["num"], undefined);
    assert.ok(layout.optionOrder["p0"]);
    assert.equal(canShuffleOptions("SINGLE_CHOICE", [{ text: "Both A and B" }, { text: "x" }]), false);
    assert.equal(canShuffleOptions("SINGLE_CHOICE", [{ text: "Paris" }, { text: "Rome" }]), true);
  });

  it("does not shuffle options when the test says not to", () => {
    assert.deepEqual(buildLayout(paper, "x", { shuffleMode: "PER_STUDENT", shuffleOptions: false }).optionOrder, {});
  });

  it("relabels options by position but keeps the original IDs, so grading is unchanged", () => {
    const one = [q("g1", "Physics", opts("Paris", "Rome", "Berlin", "Madrid"))];
    // find a seed that actually moves the correct answer
    let laid = applyLayout(one, buildLayout(one, "s0", settings));
    for (let i = 1; parseOptionList(laid[0].question.options)[0].id === "A"; i++) laid = applyLayout(one, buildLayout(one, `s${i}`, settings));
    const shown = parseOptionList(laid[0].question.options) as { id: string; text: string; label: string }[];
    assert.deepEqual(shown.map((o) => o.label), ["A", "B", "C", "D"]);
    const paris = shown.find((o) => o.text === "Paris")!;
    assert.equal(paris.id, "A", "Paris is still option A underneath");
    assert.notEqual(paris.label, "A", "but shown under a different letter");
    // The student clicks the button showing Paris; the stored answer is its ID, graded against "A"
    assert.equal(isAnswerCorrect("SINGLE_CHOICE", "A", paris.id), true);
  });

  it("without a layout keeps the original order", () => {
    const laid = applyLayout(paper, null);
    assert.deepEqual(laid.map((x) => x.questionId), paper.map((x) => x.questionId));
  });

  it("puts questions added after the layout at the end", () => {
    const layout = buildLayout(paper.slice(0, 5), "x", settings);
    const laid = applyLayout(paper.slice(0, 6), layout);
    assert.equal(laid[5].questionId, paper[5].questionId);
  });
});

describe("sets and seats", () => {
  it("named sets map to fixed seeds and letters", () => {
    const test = { id: "t1", shuffleMode: "SETS", setCount: 4 };
    assert.deepEqual(paperAssignment(test, { perStudentSeed: "x", setIndex: 2 }), { paperSeed: "t1:set:2", setCode: "C" });
    assert.equal(paperAssignment({ ...test, shuffleMode: "OFF" }, { perStudentSeed: "x", setIndex: 0 }), null);
    assert.deepEqual(paperAssignment({ ...test, shuffleMode: "PER_STUDENT" }, { perStudentSeed: "abc", setIndex: 0 }), { paperSeed: "abc", setCode: null });
  });

  it("no two neighbouring seats share a set with 4 sets (incl. diagonals)", () => {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const me = seatSetIndex(r, c, 4);
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          if (c + dc < 0) continue;
          assert.notEqual(me, seatSetIndex(r + dr, c + dc, 4), `seat ${r},${c} vs ${r + dr},${c + dc}`);
        }
      }
    }
  });

  it("with 2 sets, side-by-side and front/back neighbours differ", () => {
    assert.notEqual(seatSetIndex(0, 0, 2), seatSetIndex(0, 1, 2));
    assert.notEqual(seatSetIndex(0, 0, 2), seatSetIndex(1, 0, 2));
  });

  it("with 8 sets, neighbours differ and all sets are used", () => {
    const used = new Set<number>();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const me = seatSetIndex(r, c, 8);
      used.add(me);
      assert.notEqual(me, seatSetIndex(r, c + 1, 8));
      assert.notEqual(me, seatSetIndex(r + 1, c, 8));
      assert.notEqual(me, seatSetIndex(r + 1, c + 1, 8));
    }
    assert.equal(used.size, 8);
  });

  it("spreads unseated students roughly evenly across sets", () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) counts[hashSetIndex(`t:student-${i}`, 4)]++;
    for (const n of counts) assert.ok(n > 850 && n < 1150, `uneven: ${counts}`);
  });
});

describe("offline paper encryption", () => {
  it("round-trips with the right start code, in any case or spacing", async () => {
    const enc = await encryptPaper({ hello: "world" }, "7KQ2MX9P", "t1:v1");
    assert.deepEqual(await decryptPaper(enc, "7kq2-mx9p"), { hello: "world" });
    assert.equal(normalizeStartCode(" 7kq2 mx9p "), "7KQ2MX9P");
  });

  it("can't be opened with a wrong code", async () => {
    const enc = await encryptPaper({ secret: 1 }, "7KQ2MX9P", "t1:v1");
    await assert.rejects(decryptPaper(enc, "7KQ2MX9Q"));
  });

  it("doesn't contain the questions in plain text", async () => {
    const enc = await encryptPaper({ text: "What is the capital of France?" }, "CODE1234", "t1:v1");
    assert.ok(!JSON.stringify(enc).includes("capital"));
  });
});

describe("server-side timing for offline sheets", () => {
  const at = (min: number) => new Date(Date.UTC(2026, 10, 10, 10, min));
  it("uses first checkpoint → final upload when the device stayed online", async () => {
    const { serverObservedMs } = await import("../../src/lib/offlineSubmissions");
    assert.equal(serverObservedMs({ firstSeenAt: at(0), lastCheckpointAt: at(58), receivedAt: at(61) }), 61 * 60_000);
  });
  it("uses first → last checkpoint when the device went offline, so a late upload isn't counted as overtime", async () => {
    const { serverObservedMs } = await import("../../src/lib/offlineSubmissions");
    assert.equal(serverObservedMs({ firstSeenAt: at(0), lastCheckpointAt: at(30), receivedAt: at(300) }), 30 * 60_000);
  });
  it("has no evidence for a device that never checked in", async () => {
    const { serverObservedMs } = await import("../../src/lib/offlineSubmissions");
    assert.equal(serverObservedMs({ firstSeenAt: at(0), lastCheckpointAt: null, receivedAt: at(90) }), null);
  });
});

describe("offline tickets", () => {
  it("verifies its own signature and rejects tampering", async () => {
    const { signTicket, verifyTicket } = await import("../../src/lib/examCentre");
    const t = { v: 1 as const, testId: "t1", userId: "u1", paperSeed: "s", setCode: null, issuedAt: 1 };
    const token = signTicket(t);
    assert.deepEqual(verifyTicket(token), t);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...t, userId: "someone-else" })).toString("base64url");
    assert.equal(verifyTicket(`${forged}.${sig}`), null);
    assert.equal(verifyTicket(`${body}.x${sig.slice(1)}`), null);
    assert.equal(verifyTicket("garbage"), null);
  });

  it("start codes are 8 unambiguous characters and compare safely", async () => {
    const { generateStartCode, startCodeMatches } = await import("../../src/lib/examCentre");
    const code = generateStartCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(startCodeMatches(code, code.toLowerCase()), true);
    assert.equal(startCodeMatches(code, "WRONG123"), false);
    assert.equal(startCodeMatches(null, code), false);
    assert.equal(startCodeMatches(code, 42), false);
  });
});
