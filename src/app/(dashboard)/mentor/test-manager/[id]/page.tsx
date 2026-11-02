"use client";

import { use } from "react";
import { TestAnalysis } from "@/components/staff/TestAnalysis";

export default function TestAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TestAnalysis testId={id} backHref="/mentor/test-manager" />;
}
