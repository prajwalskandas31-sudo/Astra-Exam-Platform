import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "antigravity-secure-key-2026";

export interface ReportTokenPayload {
  attemptId: string;
  studentId: string;
  expiresAt: number;
}

export function generateReportToken(attemptId: string, studentId: string): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = JSON.stringify({ attemptId, studentId, expiresAt });
  const cipher = crypto.createCipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), Buffer.alloc(16, 0));
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function verifyReportToken(token: string): ReportTokenPayload | null {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, "hex", "utf8");
    decrypted += decipher.final("utf8");
    const payload: ReportTokenPayload = JSON.parse(decrypted);

    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
