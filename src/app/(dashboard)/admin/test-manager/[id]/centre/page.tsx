"use client";

import { use } from "react";
import { ExamCentreConsole } from "@/components/staff/ExamCentreConsole";

export default function ExamCentrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExamCentreConsole testId={id} backHref="/admin/test-manager" />;
}
