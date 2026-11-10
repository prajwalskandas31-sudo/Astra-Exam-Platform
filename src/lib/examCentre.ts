import crypto from "crypto";
import { prisma } from "./prisma";
import { clampSetCount, hashSetIndex, paperAssignment, seatSetIndex } from "./paperLayout";
import { normalizeStartCode } from "./paperCrypto";

const SECRET = () => process.env.NEXTAUTH_SECRET || "dev-secret";
const hmac = (value: string) => crypto.createHmac("sha256", SECRET()).update(value).digest("base64url");

/** No 0/O, 1/I/L: the code is read aloud and typed by hundreds of students. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateStartCode(): string {
  return Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export const startCodeMatches = (expected: string | null, given: unknown) =>
  !!expected &&
  typeof given === "string" &&
  normalizeStartCode(given).length === expected.length &&
  crypto.timingSafeEqual(Buffer.from(normalizeStartCode(given)), Buffer.from(expected));

/** Unique per student per test, unguessable, and the same every time it is computed. */
export const perStudentSeed = (testId: string, userId: string) => hmac(`paper:${testId}:${userId}`).slice(0, 22);

export interface CentreRoom {
  name: string;
  rows: number;
  cols: number;
}

export function parseRooms(raw: string | null | undefined): CentreRoom[] {
  try {
    const v = JSON.parse(raw || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((r) => r && typeof r.name === "string" && r.name.trim())
      .map((r) => ({ name: String(r.name).trim().slice(0, 40), rows: Math.min(50, Math.max(1, Math.floor(r.rows) || 1)), cols: Math.min(50, Math.max(1, Math.floor(r.cols) || 1)) }));
  } catch {
    return [];
  }
}

export const seatLabel = (s: { room: string; row: number; col: number }) => `${s.room} · Row ${s.row + 1}, Seat ${s.col + 1}`;

/**
 * Which paper a student gets: their seat decides the set (so neighbours differ); with no seat,
 * a stable hash spreads students evenly. Per-student shuffling ignores seats entirely.
 */
export async function studentPaper(
  test: { id: string; shuffleMode: string; setCount: number; centreExam: boolean },
  userId: string
) {
  const seat = test.centreExam ? await prisma.examSeat.findUnique({ where: { testId_userId: { testId: test.id, userId } } }) : null;
  const setIndex = seat ? seat.setIndex : hashSetIndex(`${test.id}:${userId}`, test.setCount);
  const assignment = paperAssignment(test, { perStudentSeed: perStudentSeed(test.id, userId), setIndex });
  return { assignment, seat };
}

/** Recompute every seat's set after the set count changes. */
export const reseatSetIndex = (row: number, col: number, setCount: number) => seatSetIndex(row, col, clampSetCount(setCount));

// ---- offline tickets ----
// A ticket says "this paper (seed/set) was issued to this student for this test". It is signed,
// so an uploaded answer sheet (from the device itself or from a USB export) can be trusted to
// belong to that student, and it carries the layout so the device can render offline.

export interface OfflineTicket {
  v: 1;
  testId: string;
  userId: string;
  paperSeed: string | null;
  setCode: string | null;
  issuedAt: number;
}

export function signTicket(t: OfflineTicket): string {
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  return `${body}.${hmac(`ticket:${body}`)}`;
}

export function verifyTicket(token: unknown): OfflineTicket | null {
  if (typeof token !== "string" || token.length > 2000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(`ticket:${body}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const t = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return t?.v === 1 && typeof t.testId === "string" && typeof t.userId === "string" ? (t as OfflineTicket) : null;
  } catch {
    return null;
  }
}
