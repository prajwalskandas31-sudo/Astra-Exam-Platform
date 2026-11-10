"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Badge, Btn, Modal, inputClass } from "@/components/ui/kit";
import { apiFetch } from "@/lib/fetcher";
import { parseCsv } from "@/lib/csv";

const TEMPLATE = "student_id,name,email,phone,batch,parent_name,parent_email,parent_phone\n2027-PL-014,Priya Sharma,priya@example.com,9876543210,PLAB Jan 2027,Anil Sharma,anil@example.com,9812345678\n";

// Header aliases → field, so "Student Name", "Parent Mobile" etc. all work
const HEADERS: Record<string, string> = {
  name: "name", studentname: "name", fullname: "name",
  studentid: "studentCode", studentcode: "studentCode", rollno: "studentCode", rollnumber: "studentCode",
  admissionno: "studentCode", admissionnumber: "studentCode", enrollmentno: "studentCode", enrolmentno: "studentCode", regno: "studentCode",
  email: "email", studentemail: "email",
  phone: "phone", mobile: "phone", studentphone: "phone", studentmobile: "phone",
  batch: "batch", batchname: "batch",
  parentname: "parentName", guardianname: "parentName",
  parentemail: "parentEmail", guardianemail: "parentEmail",
  parentphone: "parentPhone", parentmobile: "parentPhone", guardianphone: "parentPhone",
};

function toRecords(text: string) {
  // Strip the byte-order mark Excel adds to UTF-8 CSVs
  const [header, ...lines] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) return { records: [], missing: ["name", "email"] };
  const keys = header.map((h) => HEADERS[h.toLowerCase().replace(/[^a-z]/g, "")] ?? null);
  const missing = ["name", "email"].filter((k) => !keys.includes(k));
  const records = lines.map((cells) => Object.fromEntries(keys.map((k, i) => [k, cells[i]?.trim() ?? ""]).filter(([k]) => k)));
  return { records, missing };
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ImportResponse {
  dryRun: boolean;
  summary: { created: number; updated: number; errors: number; parentsCreated: number; parentsLinked: number; newBatches: string[] };
  results: { row: number; email: string; status: string; message?: string }[];
  credentials: { name: string; email: string; role: string; password: string }[];
}

export function UserImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [done, setDone] = useState<ImportResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setText(""); setPreview(null); setDone(null); };
  const close = () => { reset(); onClose(); };

  const run = async (dryRun: boolean) => {
    const { records, missing } = toRecords(text);
    if (missing.length) return toast.error(`The CSV needs these columns: ${missing.join(", ")}`);
    if (!records.length) return toast.error("No data rows found");
    setBusy(true);
    try {
      const res = await apiFetch<ImportResponse>("/api/users/import", { method: "POST", json: { rows: records, dryRun } });
      if (dryRun) setPreview(res);
      else { setDone(res); onImported(); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const shown = done ?? preview;
  const credentialsCsv = done
    ? ["name,email,role,temporary_password", ...done.credentials.map((c) => [c.name, c.email, c.role, c.password].map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n")
    : "";

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import students and parents"
      description="Upload a CSV. Students are created or updated, missing batches are created, and parents are created or linked by email."
      size="lg"
      footer={
        done ? (
          <>
            {done.credentials.length > 0 && <Btn variant="success" onClick={() => download("new-account-passwords.csv", credentialsCsv)}><Download className="h-4 w-4" />Download passwords ({done.credentials.length})</Btn>}
            <Btn variant="secondary" onClick={close}>Done</Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => download("student-import-template.csv", TEMPLATE)}><Download className="h-4 w-4" />Template</Btn>
            <Btn variant="secondary" loading={busy && !preview} disabled={!text.trim() || busy} onClick={() => run(true)}>Preview</Btn>
            <Btn loading={busy && !!preview} disabled={!preview || preview.summary.created + preview.summary.updated === 0 || busy} onClick={() => run(false)}>
              <Upload className="h-4 w-4" />Import {preview ? preview.summary.created + preview.summary.updated : ""} rows
            </Btn>
          </>
        )
      }
    >
      <div className="space-y-4">
        {!done && (
          <>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-300 hover:bg-white/[0.02]">
              <Upload className="h-4 w-4" />Choose a .csv file
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) { setText(await f.text()); setPreview(null); }
                }}
              />
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => { setText(e.target.value); setPreview(null); }}
              placeholder={`…or paste CSV here.\n${TEMPLATE}`}
              className={`${inputClass} font-mono text-xs`}
              aria-label="CSV content"
            />
            <p className="text-[11px] text-slate-500">Columns: name, email (required); phone, batch, parent_name, parent_email, parent_phone (optional). Phone numbers without a country code use the institute default from Messaging settings.</p>
          </>
        )}

        {shown && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="emerald">{shown.summary.created} {done ? "created" : "to create"}</Badge>
              <Badge tone="blue">{shown.summary.updated} {done ? "updated" : "to update"}</Badge>
              <Badge tone="violet">{shown.summary.parentsCreated} new parents · {shown.summary.parentsLinked} linked</Badge>
              {shown.summary.newBatches.length > 0 && <Badge tone="amber">New batches: {shown.summary.newBatches.join(", ")}</Badge>}
              {shown.summary.errors > 0 && <Badge tone="rose">{shown.summary.errors} with errors</Badge>}
            </div>
            {done && done.credentials.length > 0 && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                Download the passwords now — they aren&apos;t stored and can&apos;t be shown again. Users can change them under Settings, or reset them by WhatsApp/SMS.
              </p>
            )}
            {shown.results.some((r) => r.status === "error") && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-rose-500/20">
                {shown.results.filter((r) => r.status === "error").map((r) => (
                  <p key={r.row} className="border-b border-white/[0.04] px-3 py-2 text-xs text-rose-200">Row {r.row} ({r.email || "no email"}): {r.message}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
