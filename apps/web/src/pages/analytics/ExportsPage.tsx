import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CustomSelect } from "@/components/primitives";
import type { SelectOption } from "@/components/primitives";
import { api } from "@/lib/api";

interface ExportJob {
  id: string;
  reportType: string;
  format: "CSV" | "PDF";
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileName: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface ClassOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  name: string;
  classId?: string;
  class?: { id: string; name: string };
}

const REPORT_OPTIONS: SelectOption[] = [
  { value: "attendance", label: "Attendance Report" },
  { value: "academic", label: "Academic Report" },
  { value: "financial", label: "Financial Report" },
  { value: "engagement", label: "Engagement Report" },
  { value: "students", label: "Student Roster" },
  { value: "monthly-summary", label: "Monthly Summary" },
];

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExportsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [reportType, setReportType] = useState("monthly-summary");
  const [exportFormat, setExportFormat] = useState<"CSV" | "PDF">("CSV");
  const [classId, setClassId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

  useEffect(() => {
    if (!modalOpen) return;
    api
      .get("/api/v1/classes")
      .then((r) => setClasses(r.data.data))
      .catch(() => setClasses([]));
    api
      .get("/api/v1/batches")
      .then((r) => setBatches(r.data.data))
      .catch(() => setBatches([]));
  }, [modalOpen]);

  const filteredBatches = classId
    ? batches.filter((b) => (b.classId ?? b.class?.id) === classId)
    : batches;

  useEffect(() => {
    if (batchId && !filteredBatches.some((b) => b.id === batchId)) {
      setBatchId("");
    }
  }, [classId, batchId, filteredBatches]);

  const { data: jobs, isLoading } = useQuery<ExportJob[]>({
    queryKey: ["exports"],
    queryFn: () => api.get("/api/v1/exports").then((r) => r.data.data),
  });

  const createExport = useMutation({
    mutationFn: () => {
      const filters: Record<string, string> = {};
      if (classId) filters.classId = classId;
      if (batchId) filters.batchId = batchId;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      return api
        .post("/api/v1/exports", {
          reportType,
          format: exportFormat,
          filters,
        })
        .then((r) => r.data.data);
    },
    onSuccess: () => {
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["exports"] });
    },
  });

  const deleteExport = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/exports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exports"] }),
  });

  async function handleDownload(id: string) {
    const res = await api.get(`/api/v1/exports/${id}/download`);
    const { url } = res.data.data as { url: string };
    window.open(url, "_blank");
  }

  const classOptions: SelectOption[] = [
    { value: "", label: "All Classes" },
    ...classes.map((c) => ({ value: c.id, label: c.name })),
  ];

  const batchOptions: SelectOption[] = [
    { value: "", label: "All Batches" },
    ...filteredBatches.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/analytics"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-body"
        >
          <ArrowLeft size={14} /> Analytics
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-display text-2xl">Exports</h1>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Export history</h2>
            <p className="text-xs text-text-muted">
              CSV + HTML reports · downloads available for 7 days
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} className="mr-1" /> New Export
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <p className="text-text-muted text-sm">Loading…</p>
        ) : !jobs || jobs.length === 0 ? (
          <p className="text-text-muted text-sm">No exports yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border-soft">
                  <th className="py-2 pr-3">Report</th>
                  <th className="py-2 pr-3">Format</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">File size</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border-soft/40">
                    <td className="py-2 pr-3 font-medium">{prettyReportType(job.reportType)}</td>
                    <td className="py-2 pr-3">
                      <Badge tone="neutral">{job.format}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={job.status} />
                      {job.errorMessage && (
                        <div className="text-xs text-danger mt-0.5">{job.errorMessage}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {job.fileSize ? `${Math.ceil(job.fileSize / 1024)} KB` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {format(new Date(job.createdAt), "dd MMM, hh:mm a")}
                    </td>
                    <td className="py-2 pr-3 text-right space-x-2">
                      {job.status === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleDownload(job.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo/10 text-indigo text-xs hover:bg-indigo/20"
                        >
                          <Download size={12} /> Download
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteExport.mutate(job.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-danger/10 text-danger text-xs hover:bg-danger/20"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-xl mb-4">New export</h2>

            <div className="space-y-3">
              <CustomSelect
                label="Report type"
                value={reportType}
                onChange={setReportType}
                options={REPORT_OPTIONS}
              />

              <CustomSelect
                label="Class"
                value={classId}
                onChange={setClassId}
                options={classOptions}
              />

              <CustomSelect
                label="Batch"
                value={batchId}
                onChange={setBatchId}
                options={batchOptions}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-primary">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-[10px] border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-primary">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-[10px] border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-primary">Format</label>
                <div className="flex gap-2">
                  {(["CSV", "PDF"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setExportFormat(f)}
                      className={`flex-1 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                        exportFormat === f
                          ? "bg-indigo text-white"
                          : "bg-bg-warm text-text-body hover:bg-bg-warm/70"
                      }`}
                    >
                      <FileText size={12} className="inline mr-1" /> {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {exportFormat === "PDF" && (
              <p className="text-xs text-text-muted mt-3">
                PDF exports are rendered as printable HTML. Full PDF rendering coming in a later
                release.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createExport.mutate()} disabled={createExport.isPending}>
                {createExport.isPending ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : null}
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function prettyReportType(t: string) {
  const pretty: Record<string, string> = {
    attendance: "Attendance",
    academic: "Academic",
    financial: "Financial",
    engagement: "Engagement",
    students: "Student Roster",
    "monthly-summary": "Monthly Summary",
  };
  return pretty[t] || t;
}

function StatusBadge({ status }: { status: ExportJob["status"] }) {
  if (status === "COMPLETED") return <Badge tone="success">completed</Badge>;
  if (status === "FAILED") return <Badge tone="danger">failed</Badge>;
  if (status === "PROCESSING") return <Badge tone="info">processing</Badge>;
  return <Badge tone="neutral">queued</Badge>;
}
