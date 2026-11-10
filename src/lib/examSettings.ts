import { prisma } from "./prisma";
import { SHUFFLE_MODES, clampSetCount, type ShuffleMode } from "./paperLayout";
import { generateStartCode } from "./examCentre";

export interface InstituteExamModes {
  examCentreEnabled: boolean;
  offlineExamsEnabled: boolean;
}

export async function instituteExamModes(organizationId: string | null | undefined): Promise<InstituteExamModes> {
  if (!organizationId) return { examCentreEnabled: false, offlineExamsEnabled: false };
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { examCentreEnabled: true, offlineExamsEnabled: true },
  });
  return { examCentreEnabled: !!org?.examCentreEnabled, offlineExamsEnabled: !!org?.offlineExamsEnabled };
}

/**
 * Paper-security and Exam Centre fields from a create/edit request body. Only fields present in
 * the body are returned. Centre and offline settings are ignored unless the institute has
 * switched those modes on; offline always implies a centre exam (it needs the start code).
 */
export function examSettingsFromBody(
  body: Record<string, unknown>,
  modes: InstituteExamModes,
  current?: { centreExam: boolean; allowOffline: boolean; startCode: string | null }
) {
  const data: {
    shuffleMode?: ShuffleMode;
    shuffleOptions?: boolean;
    setCount?: number;
    centreExam?: boolean;
    allowOffline?: boolean;
    startCode?: string;
  } = {};

  if (typeof body.shuffleMode === "string" && (SHUFFLE_MODES as string[]).includes(body.shuffleMode)) {
    data.shuffleMode = body.shuffleMode as ShuffleMode;
  }
  if (typeof body.shuffleOptions === "boolean") data.shuffleOptions = body.shuffleOptions;
  if (body.setCount !== undefined) data.setCount = clampSetCount(Number(body.setCount));

  if (typeof body.centreExam === "boolean") data.centreExam = body.centreExam && modes.examCentreEnabled;
  if (typeof body.allowOffline === "boolean") data.allowOffline = body.allowOffline && modes.offlineExamsEnabled;
  if (data.allowOffline) data.centreExam = true;
  if (data.centreExam === false) data.allowOffline = false;

  // A centre exam always has a start code ready for the invigilator
  const centre = data.centreExam ?? current?.centreExam ?? false;
  if (centre && !current?.startCode) data.startCode = generateStartCode();
  return data;
}
