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
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function verifyReportToken(token: string): ReportTokenPayload | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
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
