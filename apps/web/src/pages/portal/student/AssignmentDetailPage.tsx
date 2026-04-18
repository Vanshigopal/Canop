import { ArrowLeft, Check, Download, Paperclip, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import {
  DateCountdown,
  Empty,
  PortalCard,
  PortalSkeleton,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SubmissionBadge,
} from "@/components/portal/PortalPrimitives";

interface AssignmentDetail {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  deadline: string;
  lateDeadline: string | null;
  allowLateSubmission: boolean;
  totalMarks: number | string;
  latePenaltyPercent: number | string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  subject: { id: string; name: string } | null;
  batch: { id: string; name: string };
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  mySubmission: null | {
    id: string;
    status: string;
    submittedAt: string | null;
    marksAwarded: number | string | null;
    feedback: string | null;
    isLate: boolean;
    files: Array<{
      id: string;
      fileName: string;
      fileSize: number;
    }>;
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/api/v1/assignments/${id}`);
      setData(data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Mark opened when viewing (fire and forget)
  useEffect(() => {
    if (data && data.mySubmission?.status === "NOT_OPENED") {
      api.post(`/api/v1/assignments/${data.id}/open`).catch(() => {});
    }
  }, [data]);

  const submit = async () => {
    if (!data || pendingFiles.length === 0) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      for (const f of pendingFiles) form.append("files", f);
      await api.post(`/api/v1/assignments/${data.id}/submit`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setToast("Submitted");
      setPendingFiles([]);
      await load();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Submit failed");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAttachment = async (attId: string, name: string) => {
    const { data: resp } = await api.get(`/api/v1/assignments/attachments/${attId}/download`);
    const url = resp.data?.url;
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  if (loading && !data)
    return (
      <div className="flex flex-col gap-3">
        <PortalSkeleton height={60} />
        <PortalSkeleton height={200} />
      </div>
    );
  if (!data) return <Empty title="Assignment not found" />;

  const submission = data.mySubmission;
  const isClosed = data.status === "CLOSED";
  const deadline = new Date(data.deadline);
  const now = new Date();
  const pastDeadline = now > deadline;
  const lateDeadline = data.lateDeadline ? new Date(data.lateDeadline) : null;
  const pastLate = lateDeadline ? now > lateDeadline : false;
  const canSubmit =
    !isClosed && (!pastDeadline || (data.allowLateSubmission && !pastLate));
  const alreadySubmitted =
    submission?.status === "SUBMITTED" ||
    submission?.status === "LATE_SUBMITTED" ||
    submission?.status === "GRADED";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "#4F46E5", minHeight: 44 }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {toast && (
        <div
          className="glass-panel p-3 text-sm font-medium"
          style={{ color: "#14532D", backgroundColor: "#DCFCE7" }}
        >
          {toast}
        </div>
      )}

      <PortalCard>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ color: "#6B6A66", fontWeight: 600 }}
            >
              {data.subject?.name ?? "Assignment"} · {data.totalMarks} marks
            </p>
            <h1
              className="text-xl mt-1"
              style={{ fontFamily: "Fraunces, serif", fontWeight: 500, color: "#2C2C2A" }}
            >
              {data.title}
            </h1>
          </div>
          <DateCountdown to={data.deadline} />
        </div>

        <p
          className="text-sm mt-3 whitespace-pre-wrap"
          style={{ color: "#3D3632" }}
        >
          {data.description}
        </p>

        {data.instructions && (
          <div
            className="mt-3 pt-3 border-t"
            style={{ borderColor: "rgba(90, 70, 50, 0.08)" }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.15em] mb-1"
              style={{ color: "#6B6A66", fontWeight: 600 }}
            >
              Instructions
            </p>
            <p
              className="text-sm whitespace-pre-wrap"
              style={{ color: "#3D3632" }}
            >
              {data.instructions}
            </p>
          </div>
        )}
      </PortalCard>

      {data.attachments.length > 0 && (
        <section>
          <SectionHeader title="Reference material" />
          <div className="flex flex-col gap-2">
            {data.attachments.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => downloadAttachment(f.id, f.fileName)}
                className="glass-panel p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#F1EFE8", color: "#2C2C2A" }}
                >
                  <Paperclip size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#2C2C2A" }}>
                    {f.fileName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B6A66" }}>
                    {formatBytes(f.fileSize)}
                  </p>
                </div>
                <Download size={16} color="#4F46E5" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Your submission" />
        {submission && alreadySubmitted ? (
          <PortalCard>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#DCFCE7", color: "#14532D" }}
              >
                <Check size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
                  {submission.status === "GRADED"
                    ? `Graded — ${submission.marksAwarded ?? 0}/${data.totalMarks}`
                    : submission.isLate
                      ? "Submitted late"
                      : "Submitted"}
                </p>
                {submission.submittedAt && (
                  <p className="text-xs mt-0.5" style={{ color: "#6B6A66" }}>
                    {new Date(submission.submittedAt).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <SubmissionBadge status={submission.status} />
            </div>
            {submission.feedback && (
              <div
                className="mt-2 pt-2 border-t"
                style={{ borderColor: "rgba(90, 70, 50, 0.08)" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#6B6A66", fontWeight: 600 }}
                >
                  Feedback
                </p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "#3D3632" }}>
                  {submission.feedback}
                </p>
              </div>
            )}
            {submission.files.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {submission.files.map((f) => (
                  <p
                    key={f.id}
                    className="text-xs flex items-center gap-2 truncate"
                    style={{ color: "#6B6A66" }}
                  >
                    <Paperclip size={12} />
                    {f.fileName} · {formatBytes(f.fileSize)}
                  </p>
                ))}
              </div>
            )}
            {canSubmit && (
              <div className="mt-4">
                <p className="text-xs mb-2" style={{ color: "#6B6A66" }}>
                  Need to resubmit?
                </p>
                <UploadArea
                  files={pendingFiles}
                  onFiles={setPendingFiles}
                  onClickPick={() => fileRef.current?.click()}
                />
                {pendingFiles.length > 0 && (
                  <PrimaryButton fullWidth className="mt-3" disabled={submitting} onClick={submit}>
                    <Upload size={16} />
                    {submitting ? "Submitting…" : "Resubmit"}
                  </PrimaryButton>
                )}
              </div>
            )}
          </PortalCard>
        ) : canSubmit ? (
          <div className="flex flex-col gap-3">
            <UploadArea
              files={pendingFiles}
              onFiles={setPendingFiles}
              onClickPick={() => fileRef.current?.click()}
            />
            <PrimaryButton
              fullWidth
              disabled={submitting || pendingFiles.length === 0}
              onClick={submit}
            >
              <Upload size={16} />
              {submitting ? "Submitting…" : "Submit"}
            </PrimaryButton>
          </div>
        ) : (
          <Empty
            title={isClosed ? "Submissions closed" : "Deadline passed"}
            body={
              data.allowLateSubmission && lateDeadline
                ? `Late submission closed ${lateDeadline.toLocaleDateString("en-IN")}`
                : "This assignment no longer accepts submissions."
            }
          />
        )}
      </section>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length > 0) setPendingFiles(list.slice(0, 5));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function UploadArea({
  files,
  onFiles,
  onClickPick,
}: {
  files: File[];
  onFiles: (f: File[]) => void;
  onClickPick: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SecondaryButton fullWidth onClick={onClickPick}>
        <Paperclip size={16} />
        {files.length === 0 ? "Choose files" : `Change (${files.length})`}
      </SecondaryButton>
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="glass-panel p-3 flex items-center gap-2"
            >
              <Paperclip size={14} color="#6B6A66" />
              <p
                className="text-xs flex-1 truncate"
                style={{ color: "#2C2C2A" }}
              >
                {f.name}
              </p>
              <button
                type="button"
                onClick={() => onFiles(files.filter((_, idx) => idx !== i))}
                className="text-xs px-2 py-1"
                style={{ color: "#DC2626", minHeight: 32 }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
