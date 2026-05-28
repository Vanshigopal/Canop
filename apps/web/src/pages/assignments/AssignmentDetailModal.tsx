import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Download, Paperclip, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Attachment {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface SubmissionFile {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface Submission {
  id: string;
  status: string;
  submittedAt: string | null;
  marksAwarded: number | string | null;
  feedback: string | null;
  isLate: boolean;
  files: SubmissionFile[];
  student?: {
    id: string;
    user: { id: string; name: string };
  };
}

interface Detail {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  deadline: string;
  totalMarks: number | string;
  status: string;
  allowLateSubmission: boolean;
  latePenaltyPercent: number | string | null;
  lateDeadline: string | null;
  subject: { id: string; name: string } | null;
  batch?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  attachments: Attachment[];
  mySubmission?: Submission | null;
  submissions?: Submission[];
}

interface AssignmentDetailModalProps {
  assignmentId: string;
  onClose: () => void;
  onChanged: (msg?: string) => void;
}

export function AssignmentDetailModal({
  assignmentId,
  onClose,
  onChanged,
}: AssignmentDetailModalProps) {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "STUDENT";
  const canManage = user?.role === "ADMIN" || user?.role === "TEACHER";

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const openedRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/v1/assignments/${assignmentId}`)
      .then((r) => setDetail(r.data.data as Detail))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  // Student auto-opens assignment on view
  useEffect(() => {
    if (!isStudent || !detail || openedRef.current) return;
    if (!detail.mySubmission || detail.mySubmission.status === "NOT_OPENED") {
      openedRef.current = true;
      api.post(`/api/v1/assignments/${assignmentId}/open`).catch(() => {});
    }
  }, [isStudent, detail, assignmentId]);

  async function downloadAttachment(a: Attachment) {
    try {
      const r = await api.get(`/api/v1/assignments/attachments/${a.id}/download`);
      const url = r.data.data.downloadUrl as string;
      const full = url.startsWith("http")
        ? url
        : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${url}`;
      window.open(full, "_blank", "noopener,noreferrer");
    } catch {
      // swallow
    }
  }

  async function downloadSubmissionFile(submissionId: string, f: SubmissionFile) {
    try {
      const r = await api.get(
        `/api/v1/assignments/submissions/${submissionId}/files/${f.id}/download`,
      );
      const url = r.data.data.downloadUrl as string;
      const full = url.startsWith("http")
        ? url
        : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${url}`;
      window.open(full, "_blank", "noopener,noreferrer");
    } catch {
      // swallow
    }
  }

  async function submit() {
    setError("");
    if (submitFiles.length === 0) {
      setError("Select at least one file");
      return;
    }
    const fd = new FormData();
    for (const f of submitFiles) fd.append("files", f);
    setSubmitting(true);
    try {
      await api.post(`/api/v1/assignments/${assignmentId}/submit`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChanged("Submitted");
      setSubmitFiles([]);
      const r = await api.get(`/api/v1/assignments/${assignmentId}`);
      setDetail(r.data.data as Detail);
    } catch (err) {
      const e = err as { response?: { data?: { error?: { title?: string } } } };
      setError(e.response?.data?.error?.title ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function publish() {
    try {
      await api.post(`/api/v1/assignments/${assignmentId}/publish`);
      onChanged("Published — students notified");
      onClose();
    } catch {
      setError("Publish failed");
    }
  }

  async function closeAssignment() {
    if (!confirm("Close this assignment? No further submissions accepted.")) return;
    try {
      await api.post(`/api/v1/assignments/${assignmentId}/close`);
      onChanged("Closed");
      onClose();
    } catch {
      setError("Close failed");
    }
  }

  async function submitGrade(submissionId: string) {
    setError("");
    const marks = Number(gradeMarks);
    if (Number.isNaN(marks) || marks < 0) {
      setError("Valid marks required");
      return;
    }
    try {
      await api.post(`/api/v1/assignments/submissions/${submissionId}/grade`, {
        marksAwarded: marks,
        feedback: gradeFeedback || undefined,
      });
      onChanged("Graded");
      setGradingSubmissionId(null);
      setGradeMarks("");
      setGradeFeedback("");
      const r = await api.get(`/api/v1/assignments/${assignmentId}`);
      setDetail(r.data.data as Detail);
    } catch (err) {
      const e = err as { response?: { data?: { error?: { title?: string } } } };
      setError(e.response?.data?.error?.title ?? "Grade failed");
    }
  }

  const deadline = detail ? new Date(detail.deadline) : null;
  const now = new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <h2 className="font-display text-lg">
            {loading ? "Loading..." : detail?.title ?? "Assignment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-hover text-text-dim"
          >
            <X size={16} />
          </button>
        </div>

        {detail && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={detail.status === "PUBLISHED" ? "success" : "neutral"}>
                {detail.status}
              </Badge>
              {detail.subject && <Badge tone="info">{detail.subject.name}</Badge>}
              {detail.batch && <Badge tone="neutral">{detail.batch.name}</Badge>}
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-text-primary mb-1">Description</h3>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.description}</p>
            </div>

            {detail.instructions && (
              <div>
                <h3 className="text-[13px] font-medium text-text-primary mb-1">Instructions</h3>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.instructions}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[13px] font-medium text-text-primary mb-0.5">Deadline</div>
                <div
                  className={
                    deadline && deadline < now ? "text-[#DC2626] font-medium" : "text-text-primary"
                  }
                >
                  {deadline?.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[13px] font-medium text-text-primary mb-0.5">Total marks</div>
                <div className="text-text-primary">{Number(detail.totalMarks)}</div>
              </div>
              <div>
                <div className="text-[13px] font-medium text-text-primary mb-0.5">Late policy</div>
                <div className="text-text-primary">
                  {detail.allowLateSubmission
                    ? `Allowed${
                        detail.latePenaltyPercent
                          ? ` (${Number(detail.latePenaltyPercent)}% penalty)`
                          : ""
                      }`
                    : "Not allowed"}
                </div>
              </div>
            </div>

            {detail.attachments.length > 0 && (
              <div>
                <h3 className="text-[13px] font-medium text-text-primary mb-2">
                  Attached files ({detail.attachments.length})
                </h3>
                <div className="space-y-1">
                  {detail.attachments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => downloadAttachment(a)}
                      className="flex items-center gap-2 text-sm w-full p-2 rounded hover:bg-surface-hover"
                    >
                      <Paperclip size={14} className="text-text-dim" />
                      <span className="flex-1 text-left truncate">{a.fileName}</span>
                      <Download size={14} className="text-text-dim" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isStudent && detail.status === "PUBLISHED" && (
              <div className="border-t border-border-soft pt-4">
                <h3 className="text-[13px] font-medium text-text-primary mb-2">Your submission</h3>
                {detail.mySubmission?.submittedAt ? (
                  <div className="mb-3 text-sm">
                    <div>
                      Submitted {new Date(detail.mySubmission.submittedAt).toLocaleString()}{" "}
                      {detail.mySubmission.isLate && (
                        <span className="text-warning">(late)</span>
                      )}
                    </div>
                    {detail.mySubmission.status === "GRADED" && (
                      <div className="mt-1">
                        Score:{" "}
                        <strong>
                          {Number(detail.mySubmission.marksAwarded)}/
                          {Number(detail.totalMarks)}
                        </strong>
                      </div>
                    )}
                    {detail.mySubmission.feedback && (
                      <div className="mt-2 p-2 rounded bg-surface-hover text-text-muted text-xs">
                        <strong>Feedback:</strong> {detail.mySubmission.feedback}
                      </div>
                    )}
                    <div className="mt-2 space-y-1">
                      {detail.mySubmission.files.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            downloadSubmissionFile(detail.mySubmission!.id, f)
                          }
                          className="flex items-center gap-2 text-xs w-full p-1.5 rounded hover:bg-surface-hover"
                        >
                          <Download size={12} className="text-text-dim" />
                          <span className="truncate">{f.fileName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setSubmitFiles(e.target.files ? Array.from(e.target.files) : [])
                    }
                    className="text-sm"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Upload size={14} />}
                    onClick={submit}
                    disabled={submitting || submitFiles.length === 0}
                  >
                    {submitting
                      ? "Submitting..."
                      : detail.mySubmission?.submittedAt
                        ? "Resubmit"
                        : "Submit"}
                  </Button>
                </div>
              </div>
            )}

            {canManage && detail.submissions && (
              <div className="border-t border-border-soft pt-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h3 className="text-[13px] font-medium text-text-primary">
                    Submissions ({detail.submissions.length})
                  </h3>
                  <div className="flex gap-2">
                    {detail.status === "DRAFT" && (
                      <Button size="sm" variant="primary" onClick={publish}>
                        Publish
                      </Button>
                    )}
                    {detail.status === "PUBLISHED" && (
                      <Button size="sm" variant="secondary" onClick={closeAssignment}>
                        Close
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {detail.submissions.length === 0 && (
                    <div className="text-xs text-text-dim py-4 text-center">
                      No submissions yet.
                    </div>
                  )}
                  {detail.submissions.map((s) => (
                    <div
                      key={s.id}
                      className="glass-panel p-3 border border-border-soft"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="font-medium text-sm text-text-primary">
                          {s.student?.user.name ?? "Student"}
                        </div>
                        <Badge tone={s.status === "GRADED" ? "accent" : "info"}>
                          {s.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-xs text-text-dim mb-2">
                        {s.submittedAt
                          ? `Submitted ${new Date(s.submittedAt).toLocaleString()}`
                          : "Not submitted"}
                        {s.isLate && " · late"}
                      </div>
                      {s.files.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {s.files.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => downloadSubmissionFile(s.id, f)}
                              className="flex items-center gap-2 text-xs w-full p-1 rounded hover:bg-surface-hover"
                            >
                              <Download size={12} className="text-text-dim" />
                              <span className="truncate">{f.fileName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {s.status === "GRADED" && (
                        <div className="text-xs">
                          Score: <strong>{Number(s.marksAwarded)}</strong>
                          {s.feedback && <div className="mt-1">Feedback: {s.feedback}</div>}
                        </div>
                      )}
                      {s.status !== "GRADED" &&
                        (s.status === "SUBMITTED" || s.status === "LATE_SUBMITTED") && (
                          <>
                            {gradingSubmissionId === s.id ? (
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  placeholder={`Marks / ${Number(detail.totalMarks)}`}
                                  value={gradeMarks}
                                  onChange={(e) => setGradeMarks(e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-border-soft bg-white/92 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                                />
                                <textarea
                                  placeholder="Feedback (optional)"
                                  value={gradeFeedback}
                                  onChange={(e) => setGradeFeedback(e.target.value)}
                                  rows={2}
                                  className="w-full px-2 py-1 rounded border border-border-soft bg-white/92 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15 resize-y"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => submitGrade(s.id)}
                                  >
                                    Save grade
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setGradingSubmissionId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setGradingSubmissionId(s.id)}
                              >
                                Grade
                              </Button>
                            )}
                          </>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="text-xs text-danger">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
